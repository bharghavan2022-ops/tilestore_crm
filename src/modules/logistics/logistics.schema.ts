import { z } from "zod";

export const createVehicleSchema = z.object({
  registrationNumber: z.string().min(1).max(30),
  type: z.string().max(50).optional(),
  capacity: z.string().max(50).optional(),
});

export const updateVehicleSchema = createVehicleSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const createDeliverySchema = z.object({
  orderId: z.string().min(1),
  vehicleId: z.string().optional(),
  driverName: z.string().max(150).optional(),
  destinationAddress: z.string().min(1).max(500),
  eta: z.coerce.date().optional(),
});

export const dispatchDeliverySchema = z.object({
  vehicleId: z.string().optional(),
  driverName: z.string().max(150).optional(),
  eta: z.coerce.date().optional(),
});

export const delayDeliverySchema = z.object({
  reason: z.string().min(1).max(1000),
});

export const uploadPodSchema = z.object({
  fileUrl: z.string().url("A valid file/link URL is required to mark POD as uploaded"),
});

export const idParamSchema = z.object({ id: z.string().min(1) });

export const listDeliveriesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  status: z
    .enum(["PENDING_DISPATCH", "IN_TRANSIT", "ON_TIME", "DELAYED", "DELIVERED", "POD_PENDING", "POD_UPLOADED"])
    .optional(),
});
