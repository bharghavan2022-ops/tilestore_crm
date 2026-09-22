import type { z } from "zod";
import { prisma } from "../../lib/prisma";
import { recordAudit } from "../../lib/audit";
import { NotFoundError } from "../../lib/errors";
import type { createWarehouseSchema, updateWarehouseSchema } from "./warehouses.schema";

export function listWarehouses() {
  return prisma.warehouse.findMany({ orderBy: { name: "asc" } });
}

export async function getWarehouse(id: string) {
  const warehouse = await prisma.warehouse.findUnique({ where: { id } });
  if (!warehouse) throw new NotFoundError("Warehouse not found");
  return warehouse;
}

export async function createWarehouse(input: z.infer<typeof createWarehouseSchema>, actorId: string) {
  return prisma.$transaction(async (tx) => {
    const created = await tx.warehouse.create({ data: input });
    await recordAudit(tx, {
      userId: actorId,
      entityType: "Warehouse",
      entityId: created.id,
      action: "CREATED",
      newValue: created,
    });
    return created;
  });
}

export async function updateWarehouse(id: string, input: z.infer<typeof updateWarehouseSchema>, actorId: string) {
  const existing = await prisma.warehouse.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Warehouse not found");

  return prisma.$transaction(async (tx) => {
    const updated = await tx.warehouse.update({ where: { id }, data: input });
    await recordAudit(tx, {
      userId: actorId,
      entityType: "Warehouse",
      entityId: id,
      action: "UPDATED",
      previousValue: existing,
      newValue: updated,
    });
    return updated;
  });
}
