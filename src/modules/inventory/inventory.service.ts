import type { Prisma } from "@prisma/client";
import type { z } from "zod";
import { prisma } from "../../lib/prisma";
import { recordAudit } from "../../lib/audit";
import { NotFoundError, UnprocessableError } from "../../lib/errors";
import { toSkipTake, paginated } from "../../lib/pagination";
import { ensureStockItem, getProductSupply } from "./stockGate.service";
import type { stockAdjustmentSchema, listStockQuerySchema, listMovementsQuerySchema, listShortagesQuerySchema } from "./inventory.schema";

export async function listStock(query: z.infer<typeof listStockQuerySchema>) {
  return prisma.stockItem.findMany({
    where: { productId: query.productId, warehouseId: query.warehouseId },
    include: {
      product: { select: { id: true, sku: true, name: true, unit: true, reorderPoint: true } },
      warehouse: { select: { id: true, name: true, type: true } },
    },
    orderBy: [{ product: { name: "asc" } }],
  });
}

export async function getProductSupplySummary(productId: string) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new NotFoundError("Product not found");
  return getProductSupply(prisma, productId);
}

// Manual correction (stock take, damage write-off, etc.) - always produces
// an auditable StockMovement, never a silent StockItem edit.
export async function adjustStock(input: z.infer<typeof stockAdjustmentSchema>, actorId: string) {
  const product = await prisma.product.findUnique({ where: { id: input.productId } });
  if (!product) throw new NotFoundError("Product not found");
  const warehouse = await prisma.warehouse.findUnique({ where: { id: input.warehouseId } });
  if (!warehouse) throw new NotFoundError("Warehouse not found");

  return prisma.$transaction(async (tx) => {
    const stockItem = await ensureStockItem(tx, input.productId, input.warehouseId);
    // Lock this row for the rest of the transaction so a concurrent
    // adjustment or stock-gate reservation can't read a stale value.
    await tx.$queryRaw`SELECT id FROM "StockItem" WHERE id = ${stockItem.id} FOR UPDATE`;

    if (input.quantityDelta < 0) {
      const locked = await tx.stockItem.findUniqueOrThrow({ where: { id: stockItem.id } });
      const available = locked.quantityOnHand.toNumber() - locked.quantityReserved.toNumber();
      if (available + input.quantityDelta < 0) {
        throw new UnprocessableError(
          `Adjustment would take on-hand stock below reserved quantity (available: ${available})`,
        );
      }
    }

    const updated = await tx.stockItem.update({
      where: { productId_warehouseId: { productId: input.productId, warehouseId: input.warehouseId } },
      data: { quantityOnHand: { increment: input.quantityDelta } },
    });

    const movement = await tx.stockMovement.create({
      data: {
        productId: input.productId,
        warehouseId: input.warehouseId,
        type: "ADJUSTMENT",
        quantity: input.quantityDelta,
        note: input.note,
        createdById: actorId,
      },
    });

    await recordAudit(tx, {
      userId: actorId,
      entityType: "StockItem",
      entityId: updated.id,
      action: "ADJUSTED",
      newValue: { quantityDelta: input.quantityDelta, resultingOnHand: updated.quantityOnHand },
      context: { movementId: movement.id },
    });

    return { stockItem: updated, movement };
  });
}

export async function listMovements(query: z.infer<typeof listMovementsQuerySchema>) {
  const where: Prisma.StockMovementWhereInput = {
    productId: query.productId,
    warehouseId: query.warehouseId,
    type: query.type,
  };
  const [data, total] = await prisma.$transaction([
    prisma.stockMovement.findMany({
      where,
      include: {
        product: { select: { id: true, sku: true, name: true } },
        warehouse: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      ...toSkipTake(query),
    }),
    prisma.stockMovement.count({ where }),
  ]);
  return paginated(data, total, query);
}

export async function listShortages(query: z.infer<typeof listShortagesQuerySchema>) {
  const where: Prisma.ShortageWhereInput = { status: query.status, productId: query.productId };
  const [data, total] = await prisma.$transaction([
    prisma.shortage.findMany({
      where,
      include: {
        product: { select: { id: true, sku: true, name: true } },
        order: { select: { id: true, orderNumber: true } },
      },
      orderBy: { createdAt: "desc" },
      ...toSkipTake(query),
    }),
    prisma.shortage.count({ where }),
  ]);
  return paginated(data, total, query);
}
