import { z } from "zod";

export const createRuleSchema = z.object({
  name: z.string().min(1).max(150),
  activityWeight: z.coerce.number().nonnegative().default(10),
  salesClosedPct: z.coerce.number().min(0).max(1).default(0.01),
  collectionsPct: z.coerce.number().min(0).max(1).default(0.005),
});

export const updateRuleSchema = createRuleSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const idParamSchema = z.object({ id: z.string().min(1) });

export const incentiveReportQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  userId: z.string().optional(),
});
