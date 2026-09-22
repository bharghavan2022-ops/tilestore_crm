import { z } from "zod";

export const createBrandSchema = z.object({
  name: z.string().min(1).max(150),
});

export const updateBrandSchema = z.object({
  name: z.string().min(1).max(150).optional(),
  isActive: z.boolean().optional(),
});

export const createProductSchema = z.object({
  sku: z.string().min(1).max(60),
  name: z.string().min(1).max(200),
  brandId: z.string().optional(),
  category: z.string().max(100).optional(),
  variant: z.string().max(100).optional(),
  size: z.string().max(100).optional(),
  unit: z.string().min(1).max(30),
  costPrice: z.coerce.number().nonnegative().default(0),
  sellingPrice: z.coerce.number().nonnegative().default(0),
  reorderPoint: z.coerce.number().nonnegative().default(0),
});

export const updateProductSchema = createProductSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const idParamSchema = z.object({ id: z.string().min(1) });

export const listProductsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  brandId: z.string().optional(),
  category: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
});
