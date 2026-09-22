import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { UnauthorizedError } from "../../lib/errors";
import * as poService from "./purchaseOrders.service";

export const listPurchaseOrdersHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await poService.listPurchaseOrders(req.query as never);
  res.status(200).json(result);
});

export const getPurchaseOrderHandler = asyncHandler(async (req: Request, res: Response) => {
  const po = await poService.getPurchaseOrder(req.params.id as string);
  res.status(200).json({ data: po });
});

export const createPurchaseOrderHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();
  const po = await poService.createPurchaseOrder(req.body, req.user.id);
  res.status(201).json({ data: po });
});

export const updateStatusHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();
  const po = await poService.updatePurchaseOrderStatus(req.params.id as string, req.body, req.user.id);
  res.status(200).json({ data: po });
});

export const receiveGoodsHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();
  const po = await poService.receiveGoods(req.params.id as string, req.body, req.user.id);
  res.status(201).json({ data: po });
});
