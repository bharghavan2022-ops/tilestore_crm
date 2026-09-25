import type { Prisma } from "@prisma/client";
import type { z } from "zod";
import { prisma } from "../../lib/prisma";
import { recordAudit } from "../../lib/audit";
import { BadRequestError, ForbiddenError, NotFoundError } from "../../lib/errors";
import { toSkipTake, paginated } from "../../lib/pagination";
import type {
  createAssetSchema,
  updateAssetSchema,
  assignAssetSchema,
  returnAssetSchema,
  recordMaintenanceSchema,
  listAssetsQuerySchema,
} from "./assets.schema";

const ASSET_INCLUDE = {
  assignments: {
    include: { user: { select: { id: true, name: true } } },
    orderBy: { assignedAt: "desc" as const },
  },
  maintenances: {
    include: { performedBy: { select: { id: true, name: true } } },
    orderBy: { performedAt: "desc" as const },
  },
} satisfies Prisma.AssetInclude;

export async function listAssets(query: z.infer<typeof listAssetsQuerySchema>) {
  const where: Prisma.AssetWhereInput = { type: query.type, status: query.status };
  const [data, total] = await prisma.$transaction([
    prisma.asset.findMany({ where, orderBy: { name: "asc" }, ...toSkipTake(query) }),
    prisma.asset.count({ where }),
  ]);
  return paginated(data, total, query);
}

export async function getAsset(id: string) {
  const asset = await prisma.asset.findUnique({ where: { id }, include: ASSET_INCLUDE });
  if (!asset) throw new NotFoundError("Asset not found");
  return asset;
}

export async function createAsset(input: z.infer<typeof createAssetSchema>, actorId: string) {
  return prisma.$transaction(async (tx) => {
    const created = await tx.asset.create({ data: input });
    await recordAudit(tx, { userId: actorId, entityType: "Asset", entityId: created.id, action: "CREATED", newValue: created });
    return created;
  });
}

export async function updateAsset(id: string, input: z.infer<typeof updateAssetSchema>, actorId: string) {
  const existing = await prisma.asset.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Asset not found");

  return prisma.$transaction(async (tx) => {
    const updated = await tx.asset.update({ where: { id }, data: input });
    await recordAudit(tx, {
      userId: actorId,
      entityType: "Asset",
      entityId: id,
      action: "UPDATED",
      previousValue: existing,
      newValue: updated,
    });
    return updated;
  });
}

// Full assignment history is append-only (see schema.prisma), so an asset's
// lifecycle stays traceable rather than overwriting a single "assignedTo" field.
export async function assignAsset(id: string, input: z.infer<typeof assignAssetSchema>, actorId: string) {
  const asset = await prisma.asset.findUnique({ where: { id } });
  if (!asset) throw new NotFoundError("Asset not found");
  if (asset.status !== "AVAILABLE") {
    throw new ForbiddenError(`Asset is not available (current status: ${asset.status})`);
  }
  const user = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!user) throw new NotFoundError("User not found");

  return prisma.$transaction(async (tx) => {
    // Conditional update, not a blind write: two concurrent requests could
    // both pass the AVAILABLE check above before either commits. Only the
    // request whose UPDATE actually flips a still-AVAILABLE row wins: the
    // WHERE clause is re-checked against the current committed row at
    // execution time, so the loser's updateMany affects zero rows.
    const claimed = await tx.asset.updateMany({
      where: { id, status: "AVAILABLE" },
      data: { status: "ASSIGNED" },
    });
    if (claimed.count === 0) {
      throw new ForbiddenError("Asset was just assigned by someone else - please retry");
    }

    const assignment = await tx.assetAssignment.create({
      data: { assetId: id, userId: input.userId, notes: input.notes },
    });
    await recordAudit(tx, {
      userId: actorId,
      entityType: "AssetAssignment",
      entityId: assignment.id,
      action: "CREATED",
      newValue: assignment,
      context: { assetId: id },
    });
    return assignment;
  });
}

export async function returnAsset(id: string, input: z.infer<typeof returnAssetSchema>, actorId: string) {
  const asset = await prisma.asset.findUnique({ where: { id } });
  if (!asset) throw new NotFoundError("Asset not found");
  const activeAssignment = await prisma.assetAssignment.findFirst({
    where: { assetId: id, returnedAt: null },
    orderBy: { assignedAt: "desc" },
  });
  if (!activeAssignment) throw new BadRequestError("This asset has no active assignment to return");

  return prisma.$transaction(async (tx) => {
    const updated = await tx.assetAssignment.update({
      where: { id: activeAssignment.id },
      data: { returnedAt: new Date(), notes: input.notes ?? activeAssignment.notes },
    });
    await tx.asset.update({ where: { id }, data: { status: "AVAILABLE" } });
    await recordAudit(tx, {
      userId: actorId,
      entityType: "AssetAssignment",
      entityId: updated.id,
      action: "RETURNED",
      newValue: updated,
      context: { assetId: id },
    });
    return updated;
  });
}

export async function recordMaintenance(id: string, input: z.infer<typeof recordMaintenanceSchema>, actorId: string) {
  const asset = await prisma.asset.findUnique({ where: { id } });
  if (!asset) throw new NotFoundError("Asset not found");

  return prisma.$transaction(async (tx) => {
    const maintenance = await tx.assetMaintenance.create({
      data: { assetId: id, performedById: actorId, ...input },
    });
    await recordAudit(tx, {
      userId: actorId,
      entityType: "AssetMaintenance",
      entityId: maintenance.id,
      action: "CREATED",
      newValue: maintenance,
      context: { assetId: id },
    });
    return maintenance;
  });
}
