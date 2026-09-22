import { z } from "zod";

export const createInvoiceSchema = z.object({
  orderId: z.string().min(1),
  dueDate: z.coerce.date(),
});

export const idParamSchema = z.object({ id: z.string().min(1) });

export const listInvoicesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(["DRAFT", "ISSUED", "PARTIALLY_PAID", "PAID", "OVERDUE", "CANCELLED"]).optional(),
  customerId: z.string().optional(),
});
