import { prisma } from "../../lib/prisma";
import { computeIncentiveReport } from "../incentives/incentives.service";

// Every number below is a live query against real data - nothing here is a
// hardcoded or cached metric, per the project's dashboard rules.

export async function getCommandCenter() {
  const [openLeads, pendingApprovals, ordersInProgress, openShortages, deliveriesInTransit, receivables] =
    await Promise.all([
      prisma.lead.count({ where: { status: { notIn: ["WON", "LOST"] } } }),
      prisma.quotation.count({ where: { status: "PENDING_APPROVAL" } }),
      prisma.order.count({ where: { status: { notIn: ["CLOSED", "CANCELLED"] } } }),
      prisma.shortage.count({ where: { status: { in: ["OPEN", "PO_CREATED", "PARTIALLY_RECEIVED"] } } }),
      prisma.delivery.count({ where: { status: { in: ["IN_TRANSIT", "DELAYED"] } } }),
      prisma.invoice.aggregate({
        where: { status: { in: ["ISSUED", "PARTIALLY_PAID", "OVERDUE"] } },
        _sum: { amountDue: true },
      }),
    ]);

  return {
    openLeads,
    pendingApprovals,
    ordersInProgress,
    openShortages,
    deliveriesInTransit,
    outstandingReceivables: receivables._sum.amountDue?.toNumber() ?? 0,
  };
}

export async function getCrmDashboard() {
  const grouped = await prisma.lead.groupBy({ by: ["status"], _count: { _all: true } });
  const byStatus = Object.fromEntries(grouped.map((g) => [g.status, g._count._all]));
  const won = byStatus.WON ?? 0;
  const lost = byStatus.LOST ?? 0;
  const closed = won + lost;

  return {
    byStatus,
    totalLeads: grouped.reduce((sum, g) => sum + g._count._all, 0),
    winRatePct: closed > 0 ? Math.round((won / closed) * 1000) / 10 : null,
  };
}

export async function getInventoryAlerts() {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: { id: true, sku: true, name: true, reorderPoint: true, stockItems: { select: { quantityOnHand: true, quantityReserved: true } } },
  });

  const belowReorderPoint = products
    .map((product) => {
      const available = product.stockItems.reduce(
        (sum, s) => sum + (s.quantityOnHand.toNumber() - s.quantityReserved.toNumber()),
        0,
      );
      return { id: product.id, sku: product.sku, name: product.name, available, reorderPoint: product.reorderPoint.toNumber() };
    })
    .filter((p) => p.available < p.reorderPoint)
    .sort((a, b) => a.available - b.available);

  const openShortages = await prisma.shortage.count({ where: { status: { in: ["OPEN", "PO_CREATED", "PARTIALLY_RECEIVED"] } } });

  return { belowReorderPoint, openShortagesCount: openShortages };
}

export async function getPurchaseTracking() {
  const [byStatus, overdue] = await Promise.all([
    prisma.purchaseOrder.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.purchaseOrder.findMany({
      where: { status: { notIn: ["RECEIVED", "CANCELLED"] }, expectedAt: { lt: new Date() } },
      select: { id: true, poNumber: true, expectedAt: true, vendor: { select: { name: true } } },
      orderBy: { expectedAt: "asc" },
    }),
  ]);

  return {
    byStatus: Object.fromEntries(byStatus.map((g) => [g.status, g._count._all])),
    overdue,
  };
}

export async function getLogisticsTracker() {
  const byStatus = await prisma.delivery.groupBy({ by: ["status"], _count: { _all: true } });
  return { byStatus: Object.fromEntries(byStatus.map((g) => [g.status, g._count._all])) };
}

export async function getPeopleAssets() {
  const [byStatus, maintenanceDue] = await Promise.all([
    prisma.asset.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.assetMaintenance.findMany({
      where: { nextDueAt: { lte: new Date(Date.now() + 30 * 86400000) } },
      select: { id: true, description: true, nextDueAt: true, asset: { select: { id: true, name: true } } },
      orderBy: { nextDueAt: "asc" },
    }),
  ]);

  return {
    byStatus: Object.fromEntries(byStatus.map((g) => [g.status, g._count._all])),
    maintenanceDueSoon: maintenanceDue,
  };
}

export async function getHrDashboard() {
  const now = new Date();
  const [activePolicies, staffCount, incentiveReport] = await Promise.all([
    prisma.hrPolicy.count({ where: { isActive: true } }),
    prisma.user.count({ where: { role: { not: "CLIENT" }, status: "ACTIVE" } }),
    computeIncentiveReport({ year: now.getFullYear(), month: now.getMonth() + 1 }),
  ]);

  return {
    activePolicies,
    staffCount,
    topPerformersThisMonth: incentiveReport.rows.slice(0, 5),
  };
}
