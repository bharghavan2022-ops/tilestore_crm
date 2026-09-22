import { z } from "zod";

export const stockAdjustmentSchema = z.object({
  productId: z.string().min(1),
  warehouseId: z.string().min(1),
  quantityDelta: z.coerce.number().refine((v) => v !== 0, "quantityDelta must not be zero"),
  note: z.string().max(500).optional(),
});

export const listStockQuerySchema = z.object({
  productId: z.string().optional(),
  warehouseId: z.string().optional(),
});

export const listMovementsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(200).default(50),
  productId: z.string().optional(),
  warehouseId: z.string().optional(),
  type: z.enum(["RECEIPT", "ISSUE", "ADJUSTMENT", "TRANSFER_IN", "TRANSFER_OUT", "RESERVATION", "RELEASE"]).optional(),
});

export const listShortagesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(["OPEN", "PO_CREATED", "PARTIALLY_RECEIVED", "RESOLVED", "CANCELLED"]).optional(),
  productId: z.string().optional(),
});

export const productIdParamSchema = z.object({ productId: z.string().min(1) });
