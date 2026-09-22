import type { Prisma } from "@prisma/client";
import type { z } from "zod";
import { prisma } from "../../lib/prisma";
import { recordAudit } from "../../lib/audit";
import { ConflictError, NotFoundError } from "../../lib/errors";
import { toSkipTake, paginated } from "../../lib/pagination";
import type {
  createBrandSchema,
  updateBrandSchema,
  createProductSchema,
  updateProductSchema,
  listProductsQuerySchema,
} from "./products.schema";

export function listBrands() {
  return prisma.brand.findMany({ orderBy: { name: "asc" } });
}

export async function createBrand(input: z.infer<typeof createBrandSchema>, actorId: string) {
  const existing = await prisma.brand.findUnique({ where: { name: input.name } });
  if (existing) throw new ConflictError("A brand with this name already exists");

  return prisma.$transaction(async (tx) => {
    const created = await tx.brand.create({ data: input });
    await recordAudit(tx, { userId: actorId, entityType: "Brand", entityId: created.id, action: "CREATED", newValue: created });
    return created;
  });
}

export async function updateBrand(id: string, input: z.infer<typeof updateBrandSchema>, actorId: string) {
  const existing = await prisma.brand.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Brand not found");

  return prisma.$transaction(async (tx) => {
    const updated = await tx.brand.update({ where: { id }, data: input });
    await recordAudit(tx, {
      userId: actorId,
      entityType: "Brand",
      entityId: id,
      action: "UPDATED",
      previousValue: existing,
      newValue: updated,
    });
    return updated;
  });
}

export async function listProducts(query: z.infer<typeof listProductsQuerySchema>) {
  const where: Prisma.ProductWhereInput = {
    brandId: query.brandId,
    category: query.category,
    isActive: query.isActive,
    ...(query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: "insensitive" } },
            { sku: { contains: query.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [data, total] = await prisma.$transaction([
    prisma.product.findMany({
      where,
      include: { brand: true },
      orderBy: { name: "asc" },
      ...toSkipTake(query),
    }),
    prisma.product.count({ where }),
  ]);

  return paginated(data, total, query);
}

export async function getProduct(id: string) {
  const product = await prisma.product.findUnique({ where: { id }, include: { brand: true } });
  if (!product) throw new NotFoundError("Product not found");
  return product;
}

export async function createProduct(input: z.infer<typeof createProductSchema>, actorId: string) {
  const existing = await prisma.product.findUnique({ where: { sku: input.sku } });
  if (existing) throw new ConflictError("A product with this SKU already exists");

  return prisma.$transaction(async (tx) => {
    const created = await tx.product.create({ data: input, include: { brand: true } });
    await recordAudit(tx, {
      userId: actorId,
      entityType: "Product",
      entityId: created.id,
      action: "CREATED",
      newValue: created,
    });
    return created;
  });
}

export async function updateProduct(id: string, input: z.infer<typeof updateProductSchema>, actorId: string) {
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Product not found");

  return prisma.$transaction(async (tx) => {
    const updated = await tx.product.update({ where: { id }, data: input, include: { brand: true } });
    await recordAudit(tx, {
      userId: actorId,
      entityType: "Product",
      entityId: id,
      action: "UPDATED",
      previousValue: existing,
      newValue: updated,
    });
    return updated;
  });
}
