import { z } from "zod";

export const createPolicySchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(5000),
  fileUrl: z.string().url().optional(),
});

export const updatePolicySchema = createPolicySchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const idParamSchema = z.object({ id: z.string().min(1) });

export const listPoliciesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  isActive: z.coerce.boolean().optional(),
});
