import { z } from "zod";

export const paymentMethodEnum = z.enum(["CASH", "BANK_TRANSFER", "CHEQUE", "UPI", "CARD", "OTHER"]);

export const createPaymentSchema = z.object({
  invoiceId: z.string().min(1),
  amount: z.coerce.number().positive(),
  method: paymentMethodEnum,
  reference: z.string().max(200).optional(),
  paidAt: z.coerce.date().optional(),
});

export const paymentStatusEnum = z.enum(["RECORDED", "CLEARED", "BOUNCED", "REFUNDED"]);

export const updatePaymentStatusSchema = z.object({
  status: paymentStatusEnum,
});

export const idParamSchema = z.object({ id: z.string().min(1) });

export const listPaymentsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  invoiceId: z.string().optional(),
  customerId: z.string().optional(),
  status: paymentStatusEnum.optional(),
});
