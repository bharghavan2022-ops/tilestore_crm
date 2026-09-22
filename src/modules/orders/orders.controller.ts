import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { UnauthorizedError } from "../../lib/errors";
import { assertOwnCustomerOrStaff } from "../../lib/authz";
import * as ordersService from "./orders.service";

export const listOrdersHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();
  const baseQuery = req.query as Record<string, unknown>;
  const query =
    req.user.role === "CLIENT"
      ? { ...baseQuery, customerId: req.user.customerId ?? "__none__" }
      : baseQuery;
  const result = await ordersService.listOrders(req.user, query as never);
  res.status(200).json(result);
});

export const getOrderHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();
  const order = await ordersService.getOrder(req.user, req.params.id as string);
  assertOwnCustomerOrStaff(req.user, order.customerId);
  res.status(200).json({ data: order });
});

export const createOrderFromQuotationHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();
  const order = await ordersService.createOrderFromQuotation(req.body, req.user.id);
  res.status(201).json({ data: order });
});

export const rerunStockGateHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();
  const order = await ordersService.rerunStockGate(req.user, req.params.id as string, req.user.id);
  res.status(200).json({ data: order });
});

export const cancelOrderHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();
  const order = await ordersService.cancelOrder(req.user, req.params.id as string, req.user.id);
  res.status(200).json({ data: order });
});

export const updateFulfilmentTaskHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();
  const task = await ordersService.updateFulfilmentTask(
    req.params.id as string,
    req.params.taskId as string,
    req.body,
    req.user.id,
  );
  res.status(200).json({ data: task });
});
