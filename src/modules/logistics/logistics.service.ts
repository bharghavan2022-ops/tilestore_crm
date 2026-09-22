import type { Prisma } from "@prisma/client";
import type { z } from "zod";
import { prisma } from "../../lib/prisma";
import { recordAudit } from "../../lib/audit";
import { BadRequestError, ForbiddenError, NotFoundError } from "../../lib/errors";
import { toSkipTake, paginated } from "../../lib/pagination";
import type {
  createVehicleSchema,
  updateVehicleSchema,
  createDeliverySchema,
  dispatchDeliverySchema,
  delayDeliverySchema,
  uploadPodSchema,
  listDeliveriesQuerySchema,
} from "./logistics.schema";

const DELIVERY_INCLUDE = {
  order: { select: { id: true, orderNumber: true, customerId: true, status: true } },
  vehicle: true,
  delayEvents: { orderBy: { createdAt: "desc" as const } },
  pod: true,
} satisfies Prisma.DeliveryInclude;

export function listVehicles() {
  return prisma.vehicle.findMany({ orderBy: { registrationNumber: "asc" } });
}

export async function createVehicle(input: z.infer<typeof createVehicleSchema>, actorId: string) {
  return prisma.$transaction(async (tx) => {
    const created = await tx.vehicle.create({ data: input });
    await recordAudit(tx, { userId: actorId, entityType: "Vehicle", entityId: created.id, action: "CREATED", newValue: created });
    return created;
  });
}

export async function updateVehicle(id: string, input: z.infer<typeof updateVehicleSchema>, actorId: string) {
  const existing = await prisma.vehicle.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Vehicle not found");

  return prisma.$transaction(async (tx) => {
    const updated = await tx.vehicle.update({ where: { id }, data: input });
    await recordAudit(tx, {
      userId: actorId,
      entityType: "Vehicle",
      entityId: id,
      action: "UPDATED",
      previousValue: existing,
      newValue: updated,
    });
    return updated;
  });
}

export async function listDeliveries(query: z.infer<typeof listDeliveriesQuerySchema>) {
  const where: Prisma.DeliveryWhereInput = { status: query.status };
  const [data, total] = await prisma.$transaction([
    prisma.delivery.findMany({ where, include: DELIVERY_INCLUDE, orderBy: { createdAt: "desc" }, ...toSkipTake(query) }),
    prisma.delivery.count({ where }),
  ]);
  return paginated(data, total, query);
}

export async function getDelivery(id: string) {
  const delivery = await prisma.delivery.findUnique({ where: { id }, include: DELIVERY_INCLUDE });
  if (!delivery) throw new NotFoundError("Delivery not found");
  return delivery;
}

// Fulfilled Order -> Dispatch -> In Transit -> Delivered -> POD.
export async function createDelivery(input: z.infer<typeof createDeliverySchema>, actorId: string) {
  const order = await prisma.order.findUnique({ where: { id: input.orderId } });
  if (!order) throw new NotFoundError("Order not found");
  if (order.status !== "READY_FOR_DISPATCH") {
    throw new ForbiddenError(`Order must be READY_FOR_DISPATCH to schedule a delivery (currently ${order.status})`);
  }
  const existing = await prisma.delivery.findUnique({ where: { orderId: input.orderId } });
  if (existing) throw new BadRequestError("A delivery already exists for this order");

  return prisma.$transaction(async (tx) => {
    const created = await tx.delivery.create({
      data: {
        orderId: input.orderId,
        vehicleId: input.vehicleId,
        driverName: input.driverName,
        destinationAddress: input.destinationAddress,
        eta: input.eta,
      },
      include: DELIVERY_INCLUDE,
    });
    await tx.proofOfDelivery.create({ data: { deliveryId: created.id, status: "PENDING" } });
    await recordAudit(tx, {
      userId: actorId,
      entityType: "Delivery",
      entityId: created.id,
      action: "CREATED",
      newValue: created,
      context: { orderId: input.orderId },
    });
    return created;
  });
}

export async function dispatchDelivery(id: string, input: z.infer<typeof dispatchDeliverySchema>, actorId: string) {
  const delivery = await prisma.delivery.findUnique({ where: { id } });
  if (!delivery) throw new NotFoundError("Delivery not found");
  if (delivery.status !== "PENDING_DISPATCH") {
    throw new ForbiddenError(`Cannot dispatch a delivery in status ${delivery.status}`);
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.delivery.update({
      where: { id },
      data: {
        status: "IN_TRANSIT",
        dispatchedAt: new Date(),
        vehicleId: input.vehicleId ?? delivery.vehicleId,
        driverName: input.driverName ?? delivery.driverName,
        eta: input.eta ?? delivery.eta,
      },
      include: DELIVERY_INCLUDE,
    });
    await tx.order.update({ where: { id: delivery.orderId }, data: { status: "DISPATCHED" } });
    await recordAudit(tx, {
      userId: actorId,
      entityType: "Delivery",
      entityId: id,
      action: "DISPATCHED",
      previousValue: { status: delivery.status },
      newValue: { status: updated.status },
    });
    return updated;
  });
}

export async function delayDelivery(id: string, input: z.infer<typeof delayDeliverySchema>, actorId: string) {
  const delivery = await prisma.delivery.findUnique({ where: { id } });
  if (!delivery) throw new NotFoundError("Delivery not found");
  if (delivery.status === "DELIVERED") {
    throw new ForbiddenError("Cannot mark a delivered order as delayed");
  }

  return prisma.$transaction(async (tx) => {
    await tx.deliveryDelayEvent.create({ data: { deliveryId: id, reason: input.reason, delayedById: actorId } });
    const updated = await tx.delivery.update({ where: { id }, data: { status: "DELAYED" }, include: DELIVERY_INCLUDE });
    await recordAudit(tx, {
      userId: actorId,
      entityType: "Delivery",
      entityId: id,
      action: "DELAYED",
      newValue: { reason: input.reason },
    });
    return updated;
  });
}

export async function markDelivered(id: string, actorId: string) {
  const delivery = await prisma.delivery.findUnique({ where: { id } });
  if (!delivery) throw new NotFoundError("Delivery not found");
  if (delivery.status !== "IN_TRANSIT" && delivery.status !== "DELAYED") {
    throw new ForbiddenError(`Cannot mark delivered from status ${delivery.status}`);
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.delivery.update(
      { where: { id }, data: { status: "DELIVERED", deliveredAt: new Date() }, include: DELIVERY_INCLUDE },
    );
    await tx.order.update({ where: { id: delivery.orderId }, data: { status: "DELIVERED" } });
    await recordAudit(tx, {
      userId: actorId,
      entityType: "Delivery",
      entityId: id,
      action: "DELIVERED",
      previousValue: { status: delivery.status },
      newValue: { status: "DELIVERED" },
    });
    return updated;
  });
}

// "No valid file/link = POD is not uploaded" - uploadPodSchema already
// enforces fileUrl is a real URL, so reaching here means a real file exists.
export async function uploadPod(deliveryId: string, input: z.infer<typeof uploadPodSchema>, actorId: string) {
  const pod = await prisma.proofOfDelivery.findUnique({ where: { deliveryId } });
  if (!pod) throw new NotFoundError("Proof of delivery record not found");

  return prisma.$transaction(async (tx) => {
    const updated = await tx.proofOfDelivery.update({
      where: { deliveryId },
      data: { fileUrl: input.fileUrl, uploadedById: actorId, uploadedAt: new Date(), status: "UPLOADED" },
    });
    await tx.delivery.update({ where: { id: deliveryId }, data: { status: "POD_UPLOADED" } });
    await recordAudit(tx, {
      userId: actorId,
      entityType: "ProofOfDelivery",
      entityId: updated.id,
      action: "UPLOADED",
      newValue: { fileUrl: input.fileUrl },
      context: { deliveryId },
    });
    return updated;
  });
}
