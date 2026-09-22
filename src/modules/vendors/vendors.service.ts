import type { Prisma } from "@prisma/client";
import type { z } from "zod";
import { prisma } from "../../lib/prisma";
import { recordAudit } from "../../lib/audit";
import { NotFoundError } from "../../lib/errors";
import { toSkipTake, paginated } from "../../lib/pagination";
import type { createVendorSchema, updateVendorSchema, listVendorsQuerySchema } from "./vendors.schema";

export async function listVendors(query: z.infer<typeof listVendorsQuerySchema>) {
  const where: Prisma.VendorWhereInput = {
    isActive: query.isActive,
    ...(query.search ? { name: { contains: query.search, mode: "insensitive" } } : {}),
  };
  const [data, total] = await prisma.$transaction([
    prisma.vendor.findMany({ where, orderBy: { name: "asc" }, ...toSkipTake(query) }),
    prisma.vendor.count({ where }),
  ]);
  return paginated(data, total, query);
}

export async function getVendor(id: string) {
  const vendor = await prisma.vendor.findUnique({ where: { id } });
  if (!vendor) throw new NotFoundError("Vendor not found");
  return vendor;
}

export async function createVendor(input: z.infer<typeof createVendorSchema>, actorId: string) {
  return prisma.$transaction(async (tx) => {
    const created = await tx.vendor.create({ data: input });
    await recordAudit(tx, { userId: actorId, entityType: "Vendor", entityId: created.id, action: "CREATED", newValue: created });
    return created;
  });
}

export async function updateVendor(id: string, input: z.infer<typeof updateVendorSchema>, actorId: string) {
  const existing = await prisma.vendor.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Vendor not found");

  return prisma.$transaction(async (tx) => {
    const updated = await tx.vendor.update({ where: { id }, data: input });
    await recordAudit(tx, {
      userId: actorId,
      entityType: "Vendor",
      entityId: id,
      action: "UPDATED",
      previousValue: existing,
      newValue: updated,
    });
    return updated;
  });
}
