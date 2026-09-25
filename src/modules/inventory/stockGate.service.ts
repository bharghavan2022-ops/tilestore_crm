import type { Prisma, PrismaClient } from "@prisma/client";
import { recordAudit } from "../../lib/audit";
import { notifyTeamAndManagers, notifyUser } from "../../lib/notify";

type TxClient = PrismaClient | Prisma.TransactionClient;

function toNumber(value: Prisma.Decimal | number): number {
  return typeof value === "number" ? value : value.toNumber();
}

// Locks every StockItem row for the given products for the lifetime of the
// current transaction (SELECT ... FOR UPDATE). Concurrent transactions
// trying to reserve/adjust stock for the same product block here until this
// one commits, which is what actually prevents overselling - the
// allocation math below only runs once the lock is held.
async function lockStockItemsForProducts(tx: Prisma.TransactionClient, productIds: string[]): Promise<void> {
  if (productIds.length === 0) return;
  await tx.$queryRaw`SELECT id FROM "StockItem" WHERE "productId" = ANY(${productIds}::text[]) FOR UPDATE`;
}

export async function ensureStockItem(tx: Prisma.TransactionClient, productId: string, warehouseId: string) {
  return tx.stockItem.upsert({
    where: { productId_warehouseId: { productId, warehouseId } },
    update: {},
    create: { productId, warehouseId },
  });
}

export interface ProductSupply {
  productId: string;
  physicalAvailable: number;
  confirmedInbound: number;
  totalSupply: number;
  byWarehouse: { warehouseId: string; available: number }[];
}

// Confirmed Inbound = quantity still owed on purchase orders that have been
// sent to / confirmed by the vendor but not yet fully received.
async function getConfirmedInbound(client: TxClient, productId: string): Promise<number> {
  const items = await client.purchaseOrderItem.findMany({
    where: {
      productId,
      purchaseOrder: { status: { in: ["SENT", "CONFIRMED", "PARTIALLY_RECEIVED"] } },
    },
    select: { quantityOrdered: true, quantityReceived: true },
  });
  return items.reduce((sum, item) => sum + (toNumber(item.quantityOrdered) - toNumber(item.quantityReceived)), 0);
}

// Warehouse Stock + Store Stock + Confirmed Inbound, per the Stock Gate
// business rule. Must be called with the product's StockItem rows already
// locked (see lockStockItemsForProducts) if the caller intends to act on
// this figure within the same transaction.
export async function getProductSupply(client: TxClient, productId: string): Promise<ProductSupply> {
  const stockItems = await client.stockItem.findMany({
    where: { productId },
    select: { warehouseId: true, quantityOnHand: true, quantityReserved: true, warehouse: { select: { isActive: true } } },
  });

  const byWarehouse = stockItems
    .filter((item) => item.warehouse.isActive)
    .map((item) => ({
      warehouseId: item.warehouseId,
      available: Math.max(0, toNumber(item.quantityOnHand) - toNumber(item.quantityReserved)),
    }));

  const physicalAvailable = byWarehouse.reduce((sum, w) => sum + w.available, 0);
  const confirmedInbound = await getConfirmedInbound(client, productId);

  return { productId, physicalAvailable, confirmedInbound, totalSupply: physicalAvailable + confirmedInbound, byWarehouse };
}

interface AllocationResult {
  allocations: { warehouseId: string; quantity: number }[];
  totalAllocated: number;
}

// Greedily takes from the warehouse with the most available stock first
// (WAREHOUSE locations before STORE locations), splitting across multiple
// locations if one alone can't cover the requested quantity.
async function allocatePhysicalStock(
  tx: Prisma.TransactionClient,
  productId: string,
  quantityNeeded: number,
): Promise<AllocationResult> {
  const stockItems = await tx.stockItem.findMany({
    where: { productId },
    include: { warehouse: true },
  });

  const candidates = stockItems
    .filter((item) => item.warehouse.isActive)
    .map((item) => ({
      warehouseId: item.warehouseId,
      warehouseType: item.warehouse.type,
      available: Math.max(0, toNumber(item.quantityOnHand) - toNumber(item.quantityReserved)),
    }))
    .sort((a, b) => {
      if (a.warehouseType !== b.warehouseType) return a.warehouseType === "WAREHOUSE" ? -1 : 1;
      return b.available - a.available;
    });

  const allocations: { warehouseId: string; quantity: number }[] = [];
  let remaining = quantityNeeded;

  for (const candidate of candidates) {
    if (remaining <= 0) break;
    if (candidate.available <= 0) continue;
    const take = Math.min(candidate.available, remaining);
    allocations.push({ warehouseId: candidate.warehouseId, quantity: take });
    remaining -= take;
  }

  return { allocations, totalAllocated: quantityNeeded - remaining };
}

async function applyReservation(
  tx: Prisma.TransactionClient,
  args: { orderId: string; orderItemId: string; productId: string; warehouseId: string; quantity: number; actorId: string },
) {
  await tx.stockItem.update({
    where: { productId_warehouseId: { productId: args.productId, warehouseId: args.warehouseId } },
    data: { quantityReserved: { increment: args.quantity } },
  });
  await tx.stockReservation.create({
    data: {
      orderId: args.orderId,
      orderItemId: args.orderItemId,
      productId: args.productId,
      warehouseId: args.warehouseId,
      quantity: args.quantity,
      status: "ACTIVE",
    },
  });
  await tx.stockMovement.create({
    data: {
      productId: args.productId,
      warehouseId: args.warehouseId,
      type: "RESERVATION",
      quantity: args.quantity,
      referenceType: "Order",
      referenceId: args.orderId,
      createdById: args.actorId,
    },
  });
}

export interface StockGateItemResult {
  orderItemId: string;
  productId: string;
  requested: number;
  reserved: number;
  shortfall: number;
  shortageCreated: boolean;
}

export interface StockGateResult {
  orderId: string;
  items: StockGateItemResult[];
  orderStatus: "RESERVED" | "PARTIALLY_RESERVED" | "AWAITING_PURCHASE";
}

// The Stock Gate: for every item on the order, check Warehouse + Store +
// Confirmed Inbound supply against the requested quantity. Reserves
// whatever physical stock is available now; if physical stock alone can't
// cover an item, the remainder is covered by confirmed inbound (no new
// Shortage) or, if even that isn't enough, a Shortage is opened for the
// true gap so Purchasing can act on it.
export async function runStockGateForOrder(
  tx: Prisma.TransactionClient,
  orderId: string,
  actorId: string,
): Promise<StockGateResult> {
  const order = await tx.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { items: { include: { product: { select: { id: true, sku: true, name: true } } } } },
  });

  const productIds = [...new Set(order.items.map((i) => i.productId))];
  await lockStockItemsForProducts(tx, productIds);

  const results: StockGateItemResult[] = [];

  for (const item of order.items) {
    const requested = toNumber(item.quantity) - toNumber(item.reservedQuantity);
    if (requested <= 0) {
      results.push({ orderItemId: item.id, productId: item.productId, requested: 0, reserved: 0, shortfall: 0, shortageCreated: false });
      continue;
    }

    const { allocations, totalAllocated } = await allocatePhysicalStock(tx, item.productId, requested);

    for (const allocation of allocations) {
      await applyReservation(tx, {
        orderId,
        orderItemId: item.id,
        productId: item.productId,
        warehouseId: allocation.warehouseId,
        quantity: allocation.quantity,
        actorId,
      });
    }

    const remainingAfterPhysical = requested - totalAllocated;
    let shortageCreated = false;

    if (remainingAfterPhysical > 0) {
      const supply = await getProductSupply(tx, item.productId);
      const trueShortfall = Math.max(0, remainingAfterPhysical - supply.confirmedInbound);

      if (trueShortfall > 0) {
        const existingOpenShortage = await tx.shortage.findFirst({
          where: { orderItemId: item.id, status: { in: ["OPEN", "PO_CREATED", "PARTIALLY_RECEIVED"] } },
        });
        if (!existingOpenShortage) {
          const shortage = await tx.shortage.create({
            data: {
              orderId,
              orderItemId: item.id,
              productId: item.productId,
              requestedQuantity: requested,
              availableQuantity: totalAllocated + supply.confirmedInbound,
              shortfallQuantity: trueShortfall,
              status: "OPEN",
            },
          });
          shortageCreated = true;
          await recordAudit(tx, {
            userId: actorId,
            entityType: "Shortage",
            entityId: shortage.id,
            action: "CREATED",
            newValue: shortage,
            context: { orderId, orderItemId: item.id },
          });
          // Stock Shortage -> Sales + Warehouse + Purchase notified.
          await notifyTeamAndManagers(tx, "WAREHOUSE", {
            type: "STOCK_SHORTAGE",
            title: `Stock shortage: ${item.product.name}`,
            message: `Order ${order.orderNumber} needs ${trueShortfall} more of ${item.product.sku} than is available or already inbound.`,
            entityType: "Shortage",
            entityId: shortage.id,
          });
          await notifyTeamAndManagers(tx, "PURCHASE", {
            type: "STOCK_SHORTAGE",
            title: `Stock shortage: ${item.product.name}`,
            message: `Order ${order.orderNumber} needs ${trueShortfall} more of ${item.product.sku} than is available or already inbound.`,
            entityType: "Shortage",
            entityId: shortage.id,
          });
          await notifyUser(tx, {
            userId: order.salespersonId,
            type: "STOCK_SHORTAGE",
            title: `Stock shortage on your order`,
            message: `Order ${order.orderNumber} has a shortage of ${trueShortfall} x ${item.product.name}.`,
            entityType: "Shortage",
            entityId: shortage.id,
          });
        }
      }
    }

    await tx.orderItem.update({
      where: { id: item.id },
      data: {
        reservedQuantity: { increment: totalAllocated },
        shortfallQuantity: remainingAfterPhysical,
      },
    });

    results.push({
      orderItemId: item.id,
      productId: item.productId,
      requested,
      reserved: totalAllocated,
      shortfall: remainingAfterPhysical,
      shortageCreated,
    });
  }

  const anyTrueShortage = await tx.shortage.count({
    where: { orderId, status: { in: ["OPEN", "PO_CREATED", "PARTIALLY_RECEIVED"] } },
  });
  const allFullyReserved = results.every((r) => r.shortfall === 0);

  const orderStatus: StockGateResult["orderStatus"] = allFullyReserved
    ? "RESERVED"
    : anyTrueShortage > 0
      ? "AWAITING_PURCHASE"
      : "PARTIALLY_RESERVED";

  await tx.order.update({ where: { id: orderId }, data: { status: orderStatus } });
  await recordAudit(tx, {
    userId: actorId,
    entityType: "Order",
    entityId: orderId,
    action: "STOCK_GATE_EVALUATED",
    newValue: { orderStatus, items: results },
  });

  // Fulfilment can't start until *something* tells Warehouse stock is
  // ready - only the shortage path notified anyone before this. Fire once,
  // on the transition into a pickable state, not on every re-evaluation of
  // an order that was already there (e.g. a manual stock-gate re-run).
  const becameFulfillable =
    order.status !== orderStatus && (orderStatus === "RESERVED" || orderStatus === "PARTIALLY_RESERVED");
  if (becameFulfillable) {
    await notifyTeamAndManagers(tx, "WAREHOUSE", {
      type: "TASK_ASSIGNED",
      title: `Order ${order.orderNumber} ready for picking`,
      message:
        orderStatus === "RESERVED"
          ? `Order ${order.orderNumber} is fully reserved and ready for fulfilment.`
          : `Order ${order.orderNumber} is partially reserved - some items can be picked now.`,
      entityType: "Order",
      entityId: orderId,
    });
  }

  return { orderId, items: results, orderStatus };
}

// Releases every reservation for an order on cancellation. Two cases:
//   - ACTIVE reservations (stock held but never picked): just release the
//     hold, nothing physically moved.
//   - FULFILLED reservations (stock already picked - consumeReservedStock
//     already decremented quantityOnHand): the physical stock must come
//     back on hand, or cancelling an order after picking silently loses
//     that inventory forever (it's not on the shelf, not with a customer
//     since nothing was delivered, and not on any order anymore).
export async function releaseReservationsForOrder(
  tx: Prisma.TransactionClient,
  orderId: string,
  actorId: string,
): Promise<void> {
  const activeReservations = await tx.stockReservation.findMany({ where: { orderId, status: "ACTIVE" } });

  for (const reservation of activeReservations) {
    await tx.stockItem.update({
      where: { productId_warehouseId: { productId: reservation.productId, warehouseId: reservation.warehouseId } },
      data: { quantityReserved: { decrement: reservation.quantity } },
    });
    await tx.stockReservation.update({ where: { id: reservation.id }, data: { status: "RELEASED", releasedAt: new Date() } });
    await tx.stockMovement.create({
      data: {
        productId: reservation.productId,
        warehouseId: reservation.warehouseId,
        type: "RELEASE",
        quantity: reservation.quantity,
        referenceType: "Order",
        referenceId: orderId,
        createdById: actorId,
      },
    });
  }

  const fulfilledReservations = await tx.stockReservation.findMany({ where: { orderId, status: "FULFILLED" } });

  for (const reservation of fulfilledReservations) {
    await tx.stockItem.update({
      where: { productId_warehouseId: { productId: reservation.productId, warehouseId: reservation.warehouseId } },
      data: { quantityOnHand: { increment: reservation.quantity } },
    });
    await tx.stockReservation.update({ where: { id: reservation.id }, data: { status: "RELEASED", releasedAt: new Date() } });
    await tx.stockMovement.create({
      data: {
        productId: reservation.productId,
        warehouseId: reservation.warehouseId,
        type: "ADJUSTMENT",
        quantity: reservation.quantity,
        referenceType: "Order",
        referenceId: orderId,
        note: "Stock returned: order cancelled after picking",
        createdById: actorId,
      },
    });
  }

  await tx.shortage.updateMany({
    where: { orderId, status: { in: ["OPEN", "PO_CREATED", "PARTIALLY_RECEIVED"] } },
    data: { status: "CANCELLED", resolvedAt: new Date() },
  });
}

// Converts active reservations into a physical stock issue - called when an
// order is actually picked/packed and leaves the warehouse. Decrements both
// quantityOnHand and quantityReserved together so the two ledgers never
// drift apart.
export async function consumeReservedStock(tx: Prisma.TransactionClient, orderId: string, actorId: string): Promise<void> {
  const reservations = await tx.stockReservation.findMany({ where: { orderId, status: "ACTIVE" } });

  for (const reservation of reservations) {
    await tx.stockItem.update({
      where: { productId_warehouseId: { productId: reservation.productId, warehouseId: reservation.warehouseId } },
      data: {
        quantityOnHand: { decrement: reservation.quantity },
        quantityReserved: { decrement: reservation.quantity },
      },
    });
    await tx.stockReservation.update({ where: { id: reservation.id }, data: { status: "FULFILLED" } });
    await tx.stockMovement.create({
      data: {
        productId: reservation.productId,
        warehouseId: reservation.warehouseId,
        type: "ISSUE",
        quantity: reservation.quantity,
        referenceType: "Order",
        referenceId: orderId,
        createdById: actorId,
      },
    });
  }
}

// Re-runs the Stock Gate for every order item tied to open shortages for a
// product. Called after goods are received so the shortage/order state
// reflects the new inventory without waiting for a client to re-trigger it.
export async function reevaluateShortagesForProduct(
  tx: Prisma.TransactionClient,
  productId: string,
  actorId: string,
): Promise<void> {
  const openShortages = await tx.shortage.findMany({
    where: { productId, status: { in: ["OPEN", "PO_CREATED", "PARTIALLY_RECEIVED"] } },
    orderBy: { createdAt: "asc" },
  });

  const affectedOrderIds = new Set<string>();
  for (const shortage of openShortages) {
    affectedOrderIds.add(shortage.orderId);
  }

  for (const orderId of affectedOrderIds) {
    await runStockGateForOrder(tx, orderId, actorId);
  }

  // Any shortage whose orderItem no longer has an outstanding shortfall is resolved.
  const remaining = await tx.shortage.findMany({
    where: { productId, status: { in: ["OPEN", "PO_CREATED", "PARTIALLY_RECEIVED"] } },
    include: { orderItem: true },
  });
  for (const shortage of remaining) {
    const currentShortfall = toNumber(shortage.orderItem.shortfallQuantity);
    if (currentShortfall <= 0) {
      await tx.shortage.update({ where: { id: shortage.id }, data: { status: "RESOLVED", resolvedAt: new Date() } });
    } else if (currentShortfall !== toNumber(shortage.shortfallQuantity)) {
      await tx.shortage.update({
        where: { id: shortage.id },
        data: {
          shortfallQuantity: currentShortfall,
          status: shortage.status === "OPEN" ? "OPEN" : "PARTIALLY_RECEIVED",
        },
      });
    }
  }
}
