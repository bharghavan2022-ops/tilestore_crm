import { z } from "zod";

export const assetTypeEnum = z.enum(["VEHICLE", "LAPTOP", "FORKLIFT", "TOOL", "DEVICE", "OTHER"]);
export const assetStatusEnum = z.enum(["AVAILABLE", "ASSIGNED", "MAINTENANCE", "RETIRED"]);

export const createAssetSchema = z.object({
  name: z.string().min(1).max(200),
  type: assetTypeEnum,
  serialNumber: z.string().max(100).optional(),
  purchaseDate: z.coerce.date().optional(),
  purchaseCost: z.coerce.number().nonnegative().optional(),
});

export const updateAssetSchema = createAssetSchema.partial().extend({
  status: assetStatusEnum.optional(),
});

export const assignAssetSchema = z.object({
  userId: z.string().min(1),
  notes: z.string().max(1000).optional(),
});

export const returnAssetSchema = z.object({
  notes: z.string().max(1000).optional(),
});

export const recordMaintenanceSchema = z.object({
  description: z.string().min(1).max(1000),
  cost: z.coerce.number().nonnegative().optional(),
  performedAt: z.coerce.date().optional(),
  nextDueAt: z.coerce.date().optional(),
});

export const idParamSchema = z.object({ id: z.string().min(1) });

export const listAssetsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  type: assetTypeEnum.optional(),
  status: assetStatusEnum.optional(),
});
