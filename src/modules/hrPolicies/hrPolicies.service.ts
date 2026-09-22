import type { Prisma } from "@prisma/client";
import type { z } from "zod";
import { prisma } from "../../lib/prisma";
import { recordAudit } from "../../lib/audit";
import { ConflictError, NotFoundError } from "../../lib/errors";
import { toSkipTake, paginated } from "../../lib/pagination";
import type { createPolicySchema, updatePolicySchema, listPoliciesQuerySchema } from "./hrPolicies.schema";

export async function listPolicies(query: z.infer<typeof listPoliciesQuerySchema>) {
  const where: Prisma.HrPolicyWhereInput = { isActive: query.isActive };
  const [data, total] = await prisma.$transaction([
    prisma.hrPolicy.findMany({ where, orderBy: { createdAt: "desc" }, ...toSkipTake(query) }),
    prisma.hrPolicy.count({ where }),
  ]);
  return paginated(data, total, query);
}

export async function getPolicy(id: string) {
  const policy = await prisma.hrPolicy.findUnique({
    where: { id },
    include: { acknowledgements: { include: { user: { select: { id: true, name: true } } } } },
  });
  if (!policy) throw new NotFoundError("Policy not found");
  return policy;
}

export async function createPolicy(input: z.infer<typeof createPolicySchema>, actorId: string) {
  return prisma.$transaction(async (tx) => {
    const created = await tx.hrPolicy.create({ data: input });
    await recordAudit(tx, { userId: actorId, entityType: "HrPolicy", entityId: created.id, action: "CREATED", newValue: created });
    return created;
  });
}

export async function updatePolicy(id: string, input: z.infer<typeof updatePolicySchema>, actorId: string) {
  const existing = await prisma.hrPolicy.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Policy not found");

  return prisma.$transaction(async (tx) => {
    const updated = await tx.hrPolicy.update({ where: { id }, data: input });
    await recordAudit(tx, {
      userId: actorId,
      entityType: "HrPolicy",
      entityId: id,
      action: "UPDATED",
      previousValue: existing,
      newValue: updated,
    });
    return updated;
  });
}

export async function acknowledgePolicy(policyId: string, userId: string) {
  const policy = await prisma.hrPolicy.findUnique({ where: { id: policyId } });
  if (!policy) throw new NotFoundError("Policy not found");

  const existing = await prisma.policyAcknowledgement.findUnique({
    where: { policyId_userId: { policyId, userId } },
  });
  if (existing) throw new ConflictError("You have already acknowledged this policy");

  return prisma.policyAcknowledgement.create({ data: { policyId, userId } });
}
