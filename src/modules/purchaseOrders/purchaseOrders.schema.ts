import { z } from "zod";

const poItemInput = z.object({
  productId: z.string().min(1),
  quantityOrdered: z.coerce.number().positive(),
  unitCost: z.coerce.number().nonnegative(),
});

export const createPurchaseOrderSchema = z.object({
  vendorId: z.string().min(1),
  expectedAt: z.coerce.date().optional(),
  items: z.array(poItemInput).min(1, "At least one item is required"),
  shortageIds: z.array(z.string()).optional(),
});

export const purchaseOrderStatusEnum = z.enum(["DRAFT", "SENT", "CONFIRMED", "PARTIALLY_RECEIVED", "RECEIVED", "CANCELLED"]);

export const updatePurchaseOrderStatusSchema = z.object({
  status: purchaseOrderStatusEnum,
});

const grnItemInput = z.object({
  purchaseOrderItemId: z.string().min(1),
  warehouseId: z.string().min(1),
  quantityReceived: z.coerce.number().positive(),
});

export const createGoodsReceiptSchema = z.object({
  items: z.array(grnItemInput).min(1, "At least one item is required"),
  note: z.string().max(1000).optional(),
});

export const idParamSchema = z.object({ id: z.string().min(1) });

export const listPurchaseOrdersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  status: purchaseOrderStatusEnum.optional(),
  vendorId: z.string().optional(),
});
