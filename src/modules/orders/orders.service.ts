import type { Prisma } from "@prisma/client";
import type { z } from "zod";
import { prisma } from "../../lib/prisma";
import { recordAudit } from "../../lib/audit";
import { nextDocumentNumber } from "../../lib/sequence";
import { BadRequestError, ForbiddenError, NotFoundError } from "../../lib/errors";
import { toSkipTake, paginated } from "../../lib/pagination";
import { orderVisibilityWhere, type AuthUser } from "../../lib/authz";
import { runStockGateForOrder, releaseReservationsForOrder, consumeReservedStock } from "../inventory/stockGate.service";
import type { createOrderFromQuotationSchema, updateFulfilmentTaskSchema, listOrdersQuerySchema } from "./orders.schema";

const ORDER_INCLUDE = {
  customer: true,
  salesperson: { select: { id: true, name: true, email: true } },
  items: { include: { product: { select: { id: true, sku: true, name: true, unit: true } } } },
  fulfilmentTasks: { orderBy: { stage: "asc" as const } },
  shortages: true,
} satisfies Prisma.OrderInclude;

const STAGE_ORDER = ["PICK", "PACK", "LABEL", "HANDOFF"] as const;

export async function listOrders(user: AuthUser, query: z.infer<typeof listOrdersQuerySchema>) {
  const where: Prisma.OrderWhereInput = {
    AND: [orderVisibilityWhere(user), { status: query.status, customerId: query.customerId }],
  };
  const [data, total] = await prisma.$transaction([
    prisma.order.findMany({ where, include: ORDER_INCLUDE, orderBy: { createdAt: "desc" }, ...toSkipTake(query) }),
    prisma.order.count({ where }),
  ]);
  return paginated(data, total, query);
}

export async function getOrder(user: AuthUser, id: string) {
  const order = await prisma.order.findFirst({
    where: { AND: [{ id }, orderVisibilityWhere(user)] },
    include: ORDER_INCLUDE,
  });
  if (!order) throw new NotFoundError("Order not found");
  return order;
}

// Approved Quotation -> Order -> Stock Gate -> Reservation/Shortage ->
// Fulfilment, in one transaction so an order is never left half-created.
export async function createOrderFromQuotation(
  input: z.infer<typeof createOrderFromQuotationSchema>,
  actorId: string,
) {
  const quotation = await prisma.quotation.findUnique({
    where: { id: input.quotationId },
    include: { items: true },
  });
  if (!quotation) throw new NotFoundError("Quotation not found");
  if (quotation.status !== "APPROVED") {
    throw new ForbiddenError("Only an APPROVED quotation can be converted into an order");
  }
  const alreadyConverted = await prisma.order.findUnique({ where: { quotationId: quotation.id } });
  if (alreadyConverted) {
    throw new BadRequestError("This quotation has already been converted into an order");
  }

  return prisma.$transaction(async (tx) => {
    const orderNumber = await nextDocumentNumber(tx, "order", "ORD");

    const order = await tx.order.create({
      data: {
        orderNumber,
        customerId: quotation.customerId,
        quotationId: quotation.id,
        salespersonId: quotation.salespersonId,
        paymentTerms: input.paymentTerms,
        notes: input.notes,
        subtotal: quotation.subtotal,
        taxTotal: quotation.taxTotal,
        grandTotal: quotation.grandTotal,
        items: {
          create: quotation.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal: item.lineTotal,
          })),
        },
        fulfilmentTasks: { create: STAGE_ORDER.map((stage) => ({ stage })) },
      },
      include: ORDER_INCLUDE,
    });

    await tx.quotation.update({ where: { id: quotation.id }, data: { status: "CONVERTED" } });

    await recordAudit(tx, {
      userId: actorId,
      entityType: "Order",
      entityId: order.id,
      action: "CREATED_FROM_QUOTATION",
      newValue: order,
      context: { quotationId: quotation.id },
    });

    await runStockGateForOrder(tx, order.id, actorId);

    return tx.order.findUniqueOrThrow({ where: { id: order.id }, include: ORDER_INCLUDE });
  });
}

export async function rerunStockGate(user: AuthUser, id: string, actorId: string) {
  const order = await prisma.order.findFirst({ where: { AND: [{ id }, orderVisibilityWhere(user)] } });
  if (!order) throw new NotFoundError("Order not found");
  if (order.status === "CANCELLED" || order.status === "CLOSED") {
    throw new ForbiddenError(`Cannot run the stock gate on an order in status ${order.status}`);
  }

  return prisma.$transaction(async (tx) => {
    await runStockGateForOrder(tx, id, actorId);
    return tx.order.findUniqueOrThrow({ where: { id }, include: ORDER_INCLUDE });
  });
}

export async function cancelOrder(user: AuthUser, id: string, actorId: string) {
  const order = await prisma.order.findFirst({ where: { AND: [{ id }, orderVisibilityWhere(user)] } });
  if (!order) throw new NotFoundError("Order not found");
  if (order.status === "DISPATCHED" || order.status === "DELIVERED" || order.status === "CLOSED") {
    throw new ForbiddenError(`Cannot cancel an order in status ${order.status}`);
  }

  return prisma.$transaction(async (tx) => {
    await releaseReservationsForOrder(tx, id, actorId);
    const updated = await tx.order.update({ where: { id }, data: { status: "CANCELLED" }, include: ORDER_INCLUDE });
    await recordAudit(tx, {
      userId: actorId,
      entityType: "Order",
      entityId: id,
      action: "CANCELLED",
      previousValue: { status: order.status },
      newValue: { status: "CANCELLED" },
    });
    return updated;
  });
}

export async function updateFulfilmentTask(
  id: string,
  taskId: string,
  input: z.infer<typeof updateFulfilmentTaskSchema>,
  actorId: string,
) {
  const order = await prisma.order.findUnique({ where: { id }, include: { fulfilmentTasks: true } });
  if (!order) throw new NotFoundError("Order not found");
  const task = order.fulfilmentTasks.find((t) => t.id === taskId);
  if (!task) throw new NotFoundError("Fulfilment task not found");

  if (input.status && input.status !== "YET_TO_START" && input.status !== task.status) {
    const stageIndex = STAGE_ORDER.indexOf(task.stage);
    const priorStages = STAGE_ORDER.slice(0, stageIndex);
    const priorIncomplete = order.fulfilmentTasks.find(
      (t) => priorStages.includes(t.stage) && t.status !== "COMPLETED",
    );
    if (priorIncomplete && (input.status === "IN_PROGRESS" || input.status === "COMPLETED")) {
      throw new ForbiddenError(`Cannot progress ${task.stage} until ${priorIncomplete.stage} is completed`);
    }
    if (task.stage === "PICK" && input.status === "COMPLETED" && order.status === "AWAITING_PURCHASE") {
      throw new ForbiddenError("Cannot complete picking while the order is awaiting purchase for a shortage");
    }
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.fulfilmentTask.update({
      where: { id: taskId },
      data: {
        status: input.status,
        assignedToId: input.assignedToId,
        notes: input.notes,
        completedAt: input.status === "COMPLETED" ? new Date() : task.completedAt,
      },
    });

    await recordAudit(tx, {
      userId: actorId,
      entityType: "FulfilmentTask",
      entityId: taskId,
      action: "UPDATED",
      previousValue: task,
      newValue: updated,
      context: { orderId: id },
    });

    if (task.stage === "PICK" && input.status === "COMPLETED") {
      await consumeReservedStock(tx, id, actorId);
      await tx.order.update({ where: { id }, data: { status: "PICKING" } });
    }
    if (task.stage === "PACK" && input.status === "COMPLETED") {
      await tx.order.update({ where: { id }, data: { status: "PACKED" } });
    }
    if (task.stage === "HANDOFF" && input.status === "COMPLETED") {
      await tx.order.update({ where: { id }, data: { status: "READY_FOR_DISPATCH" } });
    }

    return updated;
  });
}
