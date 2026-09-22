import { z } from "zod";

export const createOrderFromQuotationSchema = z.object({
  quotationId: z.string().min(1),
  paymentTerms: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
});

export const fulfilmentStageEnum = z.enum(["PICK", "PACK", "LABEL", "HANDOFF"]);
export const taskStatusEnum = z.enum(["YET_TO_START", "IN_PROGRESS", "CHANGES_REQUIRED", "APPROVAL_PENDING", "COMPLETED"]);

export const updateFulfilmentTaskSchema = z.object({
  status: taskStatusEnum.optional(),
  assignedToId: z.string().nullable().optional(),
  notes: z.string().max(2000).optional(),
});

export const idParamSchema = z.object({ id: z.string().min(1) });
export const orderTaskParamSchema = z.object({ id: z.string().min(1), taskId: z.string().min(1) });

export const listOrdersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  status: z
    .enum([
      "CONFIRMED",
      "STOCK_CHECK_PENDING",
      "PARTIALLY_RESERVED",
      "RESERVED",
      "AWAITING_PURCHASE",
      "PICKING",
      "PACKED",
      "READY_FOR_DISPATCH",
      "DISPATCHED",
      "DELIVERED",
      "CLOSED",
      "CANCELLED",
    ])
    .optional(),
  customerId: z.string().optional(),
});
