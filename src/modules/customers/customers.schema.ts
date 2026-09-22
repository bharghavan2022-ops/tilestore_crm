import { z } from "zod";

export const createCustomerSchema = z.object({
  name: z.string().min(1).max(200),
  companyName: z.string().max(200).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(30).optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  gstNumber: z.string().max(30).optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const createContactSchema = z.object({
  name: z.string().min(1).max(150),
  phone: z.string().max(30).optional(),
  email: z.string().email().optional(),
  designation: z.string().max(100).optional(),
  isPrimary: z.boolean().optional(),
});

export const idParamSchema = z.object({ id: z.string().min(1) });
export const customerContactParamSchema = z.object({
  customerId: z.string().min(1),
  contactId: z.string().min(1),
});

export const listCustomersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
});
