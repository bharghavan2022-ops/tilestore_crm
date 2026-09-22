import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { UnauthorizedError } from "../../lib/errors";
import * as warehousesService from "./warehouses.service";

export const listWarehousesHandler = asyncHandler(async (_req: Request, res: Response) => {
  const warehouses = await warehousesService.listWarehouses();
  res.status(200).json({ data: warehouses });
});

export const getWarehouseHandler = asyncHandler(async (req: Request, res: Response) => {
  const warehouse = await warehousesService.getWarehouse(req.params.id as string);
  res.status(200).json({ data: warehouse });
});

export const createWarehouseHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();
  const warehouse = await warehousesService.createWarehouse(req.body, req.user.id);
  res.status(201).json({ data: warehouse });
});

export const updateWarehouseHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();
  const warehouse = await warehousesService.updateWarehouse(req.params.id as string, req.body, req.user.id);
  res.status(200).json({ data: warehouse });
});
