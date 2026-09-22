import { prisma } from "../../lib/prisma";
import { recordAudit } from "../../lib/audit";
import { NotFoundError } from "../../lib/errors";
import type { z } from "zod";
import type { createTeamSchema, updateTeamSchema } from "./teams.schema";

export function listTeams() {
  return prisma.team.findMany({ orderBy: { name: "asc" } });
}

export async function getTeam(id: string) {
  const team = await prisma.team.findUnique({ where: { id } });
  if (!team) throw new NotFoundError("Team not found");
  return team;
}

export async function createTeam(input: z.infer<typeof createTeamSchema>, actorId: string) {
  const team = await prisma.$transaction(async (tx) => {
    const created = await tx.team.create({ data: input });
    await recordAudit(tx, {
      userId: actorId,
      entityType: "Team",
      entityId: created.id,
      action: "CREATED",
      newValue: created,
    });
    return created;
  });
  return team;
}

export async function updateTeam(id: string, input: z.infer<typeof updateTeamSchema>, actorId: string) {
  const existing = await prisma.team.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Team not found");

  return prisma.$transaction(async (tx) => {
    const updated = await tx.team.update({ where: { id }, data: input });
    await recordAudit(tx, {
      userId: actorId,
      entityType: "Team",
      entityId: id,
      action: "UPDATED",
      previousValue: existing,
      newValue: updated,
    });
    return updated;
  });
}
