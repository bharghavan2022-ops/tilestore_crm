import type { Prisma } from "@prisma/client";
import type { z } from "zod";
import { prisma } from "../../lib/prisma";
import { recordAudit } from "../../lib/audit";
import { NotFoundError } from "../../lib/errors";
import { toSkipTake, paginated } from "../../lib/pagination";
import { leadVisibilityWhere, isManager, type AuthUser } from "../../lib/authz";
import { ForbiddenError } from "../../lib/errors";
import type {
  createLeadSchema,
  updateLeadStatusSchema,
  assignLeadSchema,
  createActivitySchema,
  listLeadsQuerySchema,
} from "./leads.schema";

const LEAD_INCLUDE = {
  customer: true,
  assignedTo: { select: { id: true, name: true, email: true, teamId: true } },
  activities: { orderBy: { createdAt: "desc" as const } },
} satisfies Prisma.LeadInclude;

export async function listLeads(user: AuthUser, query: z.infer<typeof listLeadsQuerySchema>) {
  const where: Prisma.LeadWhereInput = {
    AND: [
      leadVisibilityWhere(user),
      { status: query.status, assignedToId: query.assignedToId, customerId: query.customerId },
    ],
  };

  const [data, total] = await prisma.$transaction([
    prisma.lead.findMany({ where, include: LEAD_INCLUDE, orderBy: { createdAt: "desc" }, ...toSkipTake(query) }),
    prisma.lead.count({ where }),
  ]);

  return paginated(data, total, query);
}

export async function getLead(user: AuthUser, id: string) {
  const lead = await prisma.lead.findFirst({
    where: { AND: [{ id }, leadVisibilityWhere(user)] },
    include: LEAD_INCLUDE,
  });
  if (!lead) throw new NotFoundError("Lead not found");
  return lead;
}

export async function createLead(input: z.infer<typeof createLeadSchema>, actorId: string) {
  const customer = await prisma.customer.findUnique({ where: { id: input.customerId } });
  if (!customer) throw new NotFoundError("Customer not found");

  return prisma.$transaction(async (tx) => {
    const created = await tx.lead.create({
      data: {
        customerId: input.customerId,
        assignedToId: input.assignedToId,
        source: input.source,
        createdById: actorId,
      },
      include: LEAD_INCLUDE,
    });
    await recordAudit(tx, {
      userId: actorId,
      entityType: "Lead",
      entityId: created.id,
      action: "CREATED",
      newValue: created,
    });
    return created;
  });
}

export async function assignLead(
  user: AuthUser,
  id: string,
  input: z.infer<typeof assignLeadSchema>,
  actorId: string,
) {
  const existing = await prisma.lead.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Lead not found");

  if (!isManager(user)) {
    // TEAM_LEAD: may only reassign leads already in their scope, and only
    // to a member of their own team.
    const inScope = await prisma.lead.findFirst({ where: { AND: [{ id }, leadVisibilityWhere(user)] } });
    if (!inScope) throw new ForbiddenError("You cannot reassign a lead outside your visibility");
    const assignee = await prisma.user.findUnique({ where: { id: input.assignedToId } });
    if (!assignee || assignee.teamId !== user.teamId) {
      throw new ForbiddenError("You may only assign leads to members of your own team");
    }
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.lead.update({
      where: { id },
      data: { assignedToId: input.assignedToId },
      include: LEAD_INCLUDE,
    });
    await recordAudit(tx, {
      userId: actorId,
      entityType: "Lead",
      entityId: id,
      action: "ASSIGNED",
      previousValue: { assignedToId: existing.assignedToId },
      newValue: { assignedToId: input.assignedToId },
    });
    return updated;
  });
}

export async function updateLeadStatus(
  user: AuthUser,
  id: string,
  input: z.infer<typeof updateLeadStatusSchema>,
  actorId: string,
) {
  const existing = await prisma.lead.findFirst({ where: { AND: [{ id }, leadVisibilityWhere(user)] } });
  if (!existing) throw new NotFoundError("Lead not found");

  return prisma.$transaction(async (tx) => {
    const updated = await tx.lead.update({
      where: { id },
      data: {
        status: input.status,
        lostReason: input.status === "LOST" ? input.lostReason : existing.lostReason,
        lostAt: input.status === "LOST" ? new Date() : existing.lostAt,
      },
      include: LEAD_INCLUDE,
    });
    await recordAudit(tx, {
      userId: actorId,
      entityType: "Lead",
      entityId: id,
      action: "STATUS_CHANGED",
      previousValue: { status: existing.status },
      newValue: { status: updated.status, lostReason: updated.lostReason },
    });
    return updated;
  });
}

export async function addActivity(
  user: AuthUser,
  leadId: string,
  input: z.infer<typeof createActivitySchema>,
  actorId: string,
) {
  const lead = await prisma.lead.findFirst({ where: { AND: [{ id: leadId }, leadVisibilityWhere(user)] } });
  if (!lead) throw new NotFoundError("Lead not found");

  return prisma.$transaction(async (tx) => {
    const created = await tx.leadActivity.create({
      data: { ...input, leadId, createdById: actorId },
    });
    await recordAudit(tx, {
      userId: actorId,
      entityType: "LeadActivity",
      entityId: created.id,
      action: "CREATED",
      newValue: created,
      context: { leadId },
    });
    return created;
  });
}
