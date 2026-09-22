import type { Prisma } from "@prisma/client";
import type { z } from "zod";
import { prisma } from "../../lib/prisma";
import { recordAudit } from "../../lib/audit";
import { nextDocumentNumber } from "../../lib/sequence";
import { BadRequestError, ForbiddenError, NotFoundError } from "../../lib/errors";
import { toSkipTake, paginated } from "../../lib/pagination";
import { ensureStockItem, reevaluateShortagesForProduct } from "../inventory/stockGate.service";
import { notifyTeamAndManagers } from "../../lib/notify";
import type {
  createPurchaseOrderSchema,
  updatePurchaseOrderStatusSchema,
  createGoodsReceiptSchema,
  listPurchaseOrdersQuerySchema,
} from "./purchaseOrders.schema";

const PO_INCLUDE = {
  vendor: true,
  items: { include: { product: { select: { id: true, sku: true, name: true, unit: true } } } },
  createdBy: { select: { id: true, name: true } },
  goodsReceipts: { include: { items: true }, orderBy: { receivedAt: "desc" as const } },
} satisfies Prisma.PurchaseOrderInclude;

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["SENT", "CANCELLED"],
  SENT: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PARTIALLY_RECEIVED", "RECEIVED", "CANCELLED"],
  PARTIALLY_RECEIVED: ["RECEIVED"],
  RECEIVED: [],
  CANCELLED: [],
};

export async function listPurchaseOrders(query: z.infer<typeof listPurchaseOrdersQuerySchema>) {
  const where: Prisma.PurchaseOrderWhereInput = { status: query.status, vendorId: query.vendorId };
  const [data, total] = await prisma.$transaction([
    prisma.purchaseOrder.findMany({ where, include: PO_INCLUDE, orderBy: { createdAt: "desc" }, ...toSkipTake(query) }),
    prisma.purchaseOrder.count({ where }),
  ]);
  return paginated(data, total, query);
}

export async function getPurchaseOrder(id: string) {
  const po = await prisma.purchaseOrder.findUnique({ where: { id }, include: PO_INCLUDE });
  if (!po) throw new NotFoundError("Purchase order not found");
  return po;
}

// Shortage -> PO -> Vendor ETA -> Goods Received -> Inventory Updated ->
// Shortage Re-evaluated. This creates the PO and links the shortages it is
// meant to resolve (status -> PO_CREATED) in one transaction.
export async function createPurchaseOrder(input: z.infer<typeof createPurchaseOrderSchema>, actorId: string) {
  const vendor = await prisma.vendor.findUnique({ where: { id: input.vendorId } });
  if (!vendor) throw new NotFoundError("Vendor not found");

  const productIds = [...new Set(input.items.map((i) => i.productId))];
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
  if (products.length !== productIds.length) throw new BadRequestError("One or more products do not exist");

  return prisma.$transaction(async (tx) => {
    const poNumber = await nextDocumentNumber(tx, "purchaseOrder", "PO");
    const po = await tx.purchaseOrder.create({
      data: {
        poNumber,
        vendorId: input.vendorId,
        expectedAt: input.expectedAt,
        createdById: actorId,
        items: { create: input.items.map((item) => ({ ...item })) },
      },
      include: PO_INCLUDE,
    });

    if (input.shortageIds?.length) {
      await tx.shortage.updateMany({
        where: { id: { in: input.shortageIds }, status: "OPEN" },
        data: { status: "PO_CREATED", purchaseOrderId: po.id },
      });
    }

    await recordAudit(tx, {
      userId: actorId,
      entityType: "PurchaseOrder",
      entityId: po.id,
      action: "CREATED",
      newValue: po,
      context: { shortageIds: input.shortageIds },
    });

    return po;
  });
}

export async function updatePurchaseOrderStatus(
  id: string,
  input: z.infer<typeof updatePurchaseOrderStatusSchema>,
  actorId: string,
) {
  const existing = await prisma.purchaseOrder.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Purchase order not found");

  const allowed = ALLOWED_TRANSITIONS[existing.status] ?? [];
  if (!allowed.includes(input.status)) {
    throw new ForbiddenError(`Cannot move purchase order from ${existing.status} to ${input.status}`);
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.purchaseOrder.update({ where: { id }, data: { status: input.status }, include: PO_INCLUDE });
    await recordAudit(tx, {
      userId: actorId,
      entityType: "PurchaseOrder",
      entityId: id,
      action: "STATUS_CHANGED",
      previousValue: { status: existing.status },
      newValue: { status: input.status },
    });
    if (input.status === "CANCELLED") {
      await tx.shortage.updateMany({
        where: { purchaseOrderId: id, status: "PO_CREATED" },
        data: { status: "OPEN", purchaseOrderId: null },
      });
    }
    await notifyTeamAndManagers(tx, "PURCHASE", {
      type: "PO_UPDATE",
      title: `PO ${updated.poNumber} is now ${input.status}`,
      message: `Purchase order ${updated.poNumber} to ${updated.vendor.name} moved from ${existing.status} to ${input.status}.`,
      entityType: "PurchaseOrder",
      entityId: id,
    });
    return updated;
  });
}

// PO -> Goods Receipt -> Inventory Movement -> Stock Updated -> Related
// Shortages Re-evaluated. Never touches StockItem without an accompanying
// StockMovement + GoodsReceiptItem record.
export async function receiveGoods(
  purchaseOrderId: string,
  input: z.infer<typeof createGoodsReceiptSchema>,
  actorId: string,
) {
  const po = await prisma.purchaseOrder.findUnique({ where: { id: purchaseOrderId }, include: { items: true } });
  if (!po) throw new NotFoundError("Purchase order not found");
  if (!["SENT", "CONFIRMED", "PARTIALLY_RECEIVED"].includes(po.status)) {
    throw new ForbiddenError(`Cannot receive goods against a purchase order in status ${po.status}`);
  }

  const poItemMap = new Map(po.items.map((item) => [item.id, item]));
  for (const line of input.items) {
    const poItem = poItemMap.get(line.purchaseOrderItemId);
    if (!poItem) throw new BadRequestError(`Purchase order item ${line.purchaseOrderItemId} does not belong to this PO`);
    const remaining = poItem.quantityOrdered.toNumber() - poItem.quantityReceived.toNumber();
    if (line.quantityReceived > remaining) {
      throw new BadRequestError(
        `Cannot receive ${line.quantityReceived} for ${poItem.id}; only ${remaining} remains outstanding`,
      );
    }
  }

  return prisma.$transaction(async (tx) => {
    const receipt = await tx.goodsReceipt.create({
      data: { purchaseOrderId, receivedById: actorId, note: input.note },
    });

    const affectedProductIds = new Set<string>();

    for (const line of input.items) {
      const poItem = poItemMap.get(line.purchaseOrderItemId)!;
      await ensureStockItem(tx, poItem.productId, line.warehouseId);

      await tx.goodsReceiptItem.create({
        data: {
          goodsReceiptId: receipt.id,
          purchaseOrderItemId: poItem.id,
          productId: poItem.productId,
          warehouseId: line.warehouseId,
          quantityReceived: line.quantityReceived,
        },
      });

      await tx.purchaseOrderItem.update({
        where: { id: poItem.id },
        data: { quantityReceived: { increment: line.quantityReceived } },
      });

      await tx.stockItem.update({
        where: { productId_warehouseId: { productId: poItem.productId, warehouseId: line.warehouseId } },
        data: { quantityOnHand: { increment: line.quantityReceived } },
      });

      await tx.stockMovement.create({
        data: {
          productId: poItem.productId,
          warehouseId: line.warehouseId,
          type: "RECEIPT",
          quantity: line.quantityReceived,
          referenceType: "PurchaseOrder",
          referenceId: purchaseOrderId,
          createdById: actorId,
        },
      });

      affectedProductIds.add(poItem.productId);
    }

    await recordAudit(tx, {
      userId: actorId,
      entityType: "GoodsReceipt",
      entityId: receipt.id,
      action: "CREATED",
      newValue: { purchaseOrderId, items: input.items },
    });

    await notifyTeamAndManagers(tx, "WAREHOUSE", {
      type: "GOODS_RECEIVED",
      title: `Goods received for PO ${po.poNumber}`,
      message: `${input.items.length} line item(s) received against purchase order ${po.poNumber}.`,
      entityType: "GoodsReceipt",
      entityId: receipt.id,
    });

    const refreshedItems = await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId } });
    const fullyReceived = refreshedItems.every((item) => item.quantityReceived.gte(item.quantityOrdered));
    const anyReceived = refreshedItems.some((item) => item.quantityReceived.gt(0));
    const newStatus = fullyReceived ? "RECEIVED" : anyReceived ? "PARTIALLY_RECEIVED" : po.status;

    if (newStatus !== po.status) {
      await tx.purchaseOrder.update({ where: { id: purchaseOrderId }, data: { status: newStatus } });
    }

    for (const productId of affectedProductIds) {
      await reevaluateShortagesForProduct(tx, productId, actorId);
    }

    return tx.purchaseOrder.findUniqueOrThrow({ where: { id: purchaseOrderId }, include: PO_INCLUDE });
  });
}
