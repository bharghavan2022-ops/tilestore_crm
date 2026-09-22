import { z } from "zod";

export const locationTypeEnum = z.enum(["WAREHOUSE", "STORE"]);

export const createWarehouseSchema = z.object({
  name: z.string().min(1).max(150),
  type: locationTypeEnum,
  address: z.string().max(500).optional(),
});

export const updateWarehouseSchema = createWarehouseSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const idParamSchema = z.object({ id: z.string().min(1) });
