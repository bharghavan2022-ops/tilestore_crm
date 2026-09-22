import { z } from "zod";

const quotationItemInput = z.object({
  productId: z.string().min(1),
  description: z.string().max(500).optional(),
  quantity: z.coerce.number().positive(),
  unitPrice: z.coerce.number().nonnegative(),
  discountPct: z.coerce.number().min(0).max(100).default(0),
  taxPct: z.coerce.number().min(0).max(100).default(0),
});

export const createQuotationSchema = z.object({
  customerId: z.string().min(1),
  leadId: z.string().optional(),
  salespersonId: z.string().optional(),
  terms: z.string().max(2000).optional(),
  validUntil: z.coerce.date().optional(),
  items: z.array(quotationItemInput).min(1, "At least one item is required"),
});

export const updateQuotationItemsSchema = z.object({
  terms: z.string().max(2000).optional(),
  validUntil: z.coerce.date().optional(),
  items: z.array(quotationItemInput).min(1, "At least one item is required"),
});

export const decideApprovalSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED", "CHANGES_REQUIRED"]),
  comment: z.string().max(2000).optional(),
});

export const idParamSchema = z.object({ id: z.string().min(1) });

export const listQuotationsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  status: z
    .enum(["DRAFT", "PENDING_APPROVAL", "APPROVED", "REJECTED", "CHANGES_REQUIRED", "CONVERTED", "EXPIRED"])
    .optional(),
  customerId: z.string().optional(),
});
