import type { z } from "zod";
import { prisma } from "../../lib/prisma";
import { round2 } from "../../lib/pricing";
import type { profitabilityQuerySchema } from "./profitability.schema";

interface QualifyingOrder {
  id: string;
  customerId: string;
  customerName: string;
  customerSegment: string;
  subtotal: number;
  items: { productId: string; brandId: string | null; brandName: string | null; quantity: number; costPrice: number }[];
}

// Revenue is recognized on delivered/closed orders (i.e. actually
// fulfilled), using pre-tax subtotal rather than grandTotal since tax is
// collected on the government's behalf, not margin. Cost is the product's
// costPrice at query time (not a historical cost snapshot) - see the
// caveat surfaced in the summary response.
async function getQualifyingOrders(from: Date, to: Date): Promise<QualifyingOrder[]> {
  const orders = await prisma.order.findMany({
    where: { status: { in: ["DELIVERED", "CLOSED"] }, createdAt: { gte: from, lte: to } },
    select: {
      id: true,
      subtotal: true,
      customer: { select: { id: true, name: true, segment: true } },
      items: {
        select: {
          productId: true,
          quantity: true,
          product: { select: { costPrice: true, brandId: true, brand: { select: { name: true } } } },
        },
      },
    },
  });

  return orders.map((order) => ({
    id: order.id,
    customerId: order.customer.id,
    customerName: order.customer.name,
    customerSegment: order.customer.segment,
    subtotal: order.subtotal.toNumber(),
    items: order.items.map((item) => ({
      productId: item.productId,
      brandId: item.product.brandId,
      brandName: item.product.brand?.name ?? null,
      quantity: item.quantity.toNumber(),
      costPrice: item.product.costPrice.toNumber(),
    })),
  }));
}

function itemCost(item: QualifyingOrder["items"][number]): number {
  return item.quantity * item.costPrice;
}

export async function getSummary(query: z.infer<typeof profitabilityQuerySchema>) {
  const orders = await getQualifyingOrders(query.from, query.to);

  let revenue = 0;
  let cost = 0;
  for (const order of orders) {
    revenue += order.subtotal;
    cost += order.items.reduce((sum, item) => sum + itemCost(item), 0);
  }
  const grossMargin = revenue - cost;

  return {
    orderCount: orders.length,
    revenue: round2(revenue),
    cost: round2(cost),
    grossMargin: round2(grossMargin),
    grossMarginPct: revenue > 0 ? round2((grossMargin / revenue) * 100) : 0,
  };
}

export async function getByBrand(query: z.infer<typeof profitabilityQuerySchema>) {
  const orders = await getQualifyingOrders(query.from, query.to);
  const byBrand = new Map<string, { brandId: string | null; brandName: string; revenue: number; cost: number }>();

  for (const order of orders) {
    // Order-level subtotal split across items proportional to each item's
    // share of the order's item cost, since subtotal is discount-adjusted
    // at the order level, not per line.
    const orderCost = order.items.reduce((sum, item) => sum + itemCost(item), 0);
    for (const item of order.items) {
      const key = item.brandId ?? "unbranded";
      const entry = byBrand.get(key) ?? { brandId: item.brandId, brandName: item.brandName ?? "Unbranded", revenue: 0, cost: 0 };
      const cost = itemCost(item);
      const revenueShare = orderCost > 0 ? order.subtotal * (cost / orderCost) : 0;
      entry.revenue += revenueShare;
      entry.cost += cost;
      byBrand.set(key, entry);
    }
  }

  return [...byBrand.values()]
    .map((b) => ({
      ...b,
      revenue: round2(b.revenue),
      cost: round2(b.cost),
      grossMargin: round2(b.revenue - b.cost),
      grossMarginPct: b.revenue > 0 ? round2(((b.revenue - b.cost) / b.revenue) * 100) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

export async function getByCustomer(query: z.infer<typeof profitabilityQuerySchema>) {
  const orders = await getQualifyingOrders(query.from, query.to);
  const byCustomer = new Map<string, { customerId: string; customerName: string; revenue: number; cost: number; orderCount: number }>();

  for (const order of orders) {
    const entry = byCustomer.get(order.customerId) ?? {
      customerId: order.customerId,
      customerName: order.customerName,
      revenue: 0,
      cost: 0,
      orderCount: 0,
    };
    entry.revenue += order.subtotal;
    entry.cost += order.items.reduce((sum, item) => sum + itemCost(item), 0);
    entry.orderCount += 1;
    byCustomer.set(order.customerId, entry);
  }

  return [...byCustomer.values()]
    .map((c) => ({
      ...c,
      revenue: round2(c.revenue),
      cost: round2(c.cost),
      grossMargin: round2(c.revenue - c.cost),
      grossMarginPct: c.revenue > 0 ? round2(((c.revenue - c.cost) / c.revenue) * 100) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

export async function getBySegment(query: z.infer<typeof profitabilityQuerySchema>) {
  const orders = await getQualifyingOrders(query.from, query.to);
  const bySegment = new Map<string, { segment: string; revenue: number; cost: number; orderCount: number }>();

  for (const order of orders) {
    const entry = bySegment.get(order.customerSegment) ?? {
      segment: order.customerSegment,
      revenue: 0,
      cost: 0,
      orderCount: 0,
    };
    entry.revenue += order.subtotal;
    entry.cost += order.items.reduce((sum, item) => sum + itemCost(item), 0);
    entry.orderCount += 1;
    bySegment.set(order.customerSegment, entry);
  }

  return [...bySegment.values()].map((s) => ({
    ...s,
    revenue: round2(s.revenue),
    cost: round2(s.cost),
    grossMargin: round2(s.revenue - s.cost),
    grossMarginPct: s.revenue > 0 ? round2(((s.revenue - s.cost) / s.revenue) * 100) : 0,
  }));
}
