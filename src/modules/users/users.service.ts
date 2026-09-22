import type { Prisma } from "@prisma/client";
import type { z } from "zod";
import { prisma } from "../../lib/prisma";
import { hashPassword } from "../../lib/password";
import { recordAudit } from "../../lib/audit";
import { ConflictError, NotFoundError } from "../../lib/errors";
import { toSkipTake, paginated } from "../../lib/pagination";
import type { createUserSchema, updateUserSchema, listUsersQuerySchema } from "./users.schema";

const SAFE_SELECT = {
  id: true,
  email: true,
  name: true,
  phone: true,
  role: true,
  status: true,
  teamId: true,
  customerId: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export async function listUsers(query: z.infer<typeof listUsersQuerySchema>) {
  const where: Prisma.UserWhereInput = {
    role: query.role,
    teamId: query.teamId,
    status: query.status,
    ...(query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: "insensitive" } },
            { email: { contains: query.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [data, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      select: SAFE_SELECT,
      orderBy: { createdAt: "desc" },
      ...toSkipTake(query),
    }),
    prisma.user.count({ where }),
  ]);

  return paginated(data, total, query);
}

export async function getUser(id: string) {
  const user = await prisma.user.findUnique({ where: { id }, select: SAFE_SELECT });
  if (!user) throw new NotFoundError("User not found");
  return user;
}

export async function createUser(input: z.infer<typeof createUserSchema>, actorId: string) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new ConflictError("A user with this email already exists");
  }

  const passwordHash = await hashPassword(input.password);

  return prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email: input.email,
        passwordHash,
        name: input.name,
        phone: input.phone,
        role: input.role,
        teamId: input.teamId,
        customerId: input.customerId,
      },
      select: SAFE_SELECT,
    });
    await recordAudit(tx, {
      userId: actorId,
      entityType: "User",
      entityId: created.id,
      action: "CREATED",
      newValue: created,
    });
    return created;
  });
}

export async function updateUser(id: string, input: z.infer<typeof updateUserSchema>, actorId: string) {
  const existing = await prisma.user.findUnique({ where: { id }, select: SAFE_SELECT });
  if (!existing) throw new NotFoundError("User not found");

  return prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({ where: { id }, data: input, select: SAFE_SELECT });
    await recordAudit(tx, {
      userId: actorId,
      entityType: "User",
      entityId: id,
      action: "UPDATED",
      previousValue: existing,
      newValue: updated,
    });
    // Suspending a user should not leave live sessions usable.
    if (input.status === "SUSPENDED") {
      await tx.refreshToken.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
    }
    return updated;
  });
}
