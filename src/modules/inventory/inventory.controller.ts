import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { UnauthorizedError } from "../../lib/errors";
import * as inventoryService from "./inventory.service";

export const listStockHandler = asyncHandler(async (req: Request, res: Response) => {
  const data = await inventoryService.listStock(req.query as never);
  res.status(200).json({ data });
});

export const getSupplyHandler = asyncHandler(async (req: Request, res: Response) => {
  const supply = await inventoryService.getProductSupplySummary(req.params.productId as string);
  res.status(200).json({ data: supply });
});

export const adjustStockHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();
  const result = await inventoryService.adjustStock(req.body, req.user.id);
  res.status(201).json({ data: result });
});

export const listMovementsHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await inventoryService.listMovements(req.query as never);
  res.status(200).json(result);
});

export const listShortagesHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await inventoryService.listShortages(req.query as never);
  res.status(200).json(result);
});
