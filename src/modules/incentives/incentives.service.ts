import type { z } from "zod";
import { prisma } from "../../lib/prisma";
import { recordAudit } from "../../lib/audit";
import { NotFoundError } from "../../lib/errors";
import type { createRuleSchema, updateRuleSchema, incentiveReportQuerySchema } from "./incentives.schema";

export function listRules() {
  return prisma.incentiveRule.findMany({ orderBy: { createdAt: "desc" } });
}

// Only one rule is ever "active" at a time, so the formula stays
// unambiguous - creating/activating a new rule deactivates the rest.
export async function createRule(input: z.infer<typeof createRuleSchema>, actorId: string) {
  return prisma.$transaction(async (tx) => {
    await tx.incentiveRule.updateMany({ where: { isActive: true }, data: { isActive: false } });
    const created = await tx.incentiveRule.create({ data: { ...input, isActive: true } });
    await recordAudit(tx, {
      userId: actorId,
      entityType: "IncentiveRule",
      entityId: created.id,
      action: "CREATED",
      newValue: created,
    });
    return created;
  });
}

export async function updateRule(id: string, input: z.infer<typeof updateRuleSchema>, actorId: string) {
  const existing = await prisma.incentiveRule.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Incentive rule not found");

  return prisma.$transaction(async (tx) => {
    if (input.isActive) {
      await tx.incentiveRule.updateMany({ where: { isActive: true, id: { not: id } }, data: { isActive: false } });
    }
    const updated = await tx.incentiveRule.update({ where: { id }, data: input });
    await recordAudit(tx, {
      userId: actorId,
      entityType: "IncentiveRule",
      entityId: id,
      action: "UPDATED",
      previousValue: existing,
      newValue: updated,
    });
    return updated;
  });
}

export interface IncentiveReportRow {
  userId: string;
  userName: string;
  activityCount: number;
  salesClosedAmount: number;
  collectionsAmount: number;
  activityScore: number;
  salesScore: number;
  collectionsScore: number;
  totalIncentive: number;
}

// Incentive = CRM Activity + Sales Closed + Collections, per the product's
// incentive concept - computed live from actual activity/order/payment
// data using the currently active IncentiveRule's weights, never hardcoded
// per employee and never a stored duplicate of the source data.
export async function computeIncentiveReport(
  query: z.infer<typeof incentiveReportQuerySchema>,
): Promise<{ rule: { id: string; name: string } | null; rows: IncentiveReportRow[] }> {
  const rule = await prisma.incentiveRule.findFirst({ where: { isActive: true }, orderBy: { createdAt: "desc" } });
  if (!rule) return { rule: null, rows: [] };

  const start = new Date(Date.UTC(query.year, query.month - 1, 1));
  const end = new Date(Date.UTC(query.year, query.month, 1));

  const staffWhere = { role: { not: "CLIENT" as const }, ...(query.userId ? { id: query.userId } : {}) };
  const staff = await prisma.user.findMany({ where: staffWhere, select: { id: true, name: true } });
  const staffIds = staff.map((s) => s.id);
  if (staffIds.length === 0) return { rule: { id: rule.id, name: rule.name }, rows: [] };

  const [activityGroups, salesGroups, collectionGroups] = await Promise.all([
    prisma.leadActivity.groupBy({
      by: ["createdById"],
      where: { createdById: { in: staffIds }, createdAt: { gte: start, lt: end } },
      _count: { _all: true },
    }),
    prisma.order.groupBy({
      by: ["salespersonId"],
      where: { salespersonId: { in: staffIds }, createdAt: { gte: start, lt: end }, status: { not: "CANCELLED" } },
      _sum: { grandTotal: true },
    }),
    prisma.payment.groupBy({
      by: ["recordedById"],
      where: { recordedById: { in: staffIds }, paidAt: { gte: start, lt: end }, status: { not: "BOUNCED" } },
      _sum: { amount: true },
    }),
  ]);

  const activityMap = new Map(activityGroups.map((g) => [g.createdById, g._count._all]));
  const salesMap = new Map(salesGroups.map((g) => [g.salespersonId, g._sum.grandTotal?.toNumber() ?? 0]));
  const collectionsMap = new Map(collectionGroups.map((g) => [g.recordedById, g._sum.amount?.toNumber() ?? 0]));

  const activityWeight = rule.activityWeight.toNumber();
  const salesClosedPct = rule.salesClosedPct.toNumber();
  const collectionsPct = rule.collectionsPct.toNumber();

  const rows: IncentiveReportRow[] = staff.map((user) => {
    const activityCount = activityMap.get(user.id) ?? 0;
    const salesClosedAmount = salesMap.get(user.id) ?? 0;
    const collectionsAmount = collectionsMap.get(user.id) ?? 0;
    const activityScore = activityCount * activityWeight;
    const salesScore = salesClosedAmount * salesClosedPct;
    const collectionsScore = collectionsAmount * collectionsPct;
    return {
      userId: user.id,
      userName: user.name,
      activityCount,
      salesClosedAmount,
      collectionsAmount,
      activityScore,
      salesScore,
      collectionsScore,
      totalIncentive: activityScore + salesScore + collectionsScore,
    };
  });

  rows.sort((a, b) => b.totalIncentive - a.totalIncentive);

  return { rule: { id: rule.id, name: rule.name }, rows };
}
