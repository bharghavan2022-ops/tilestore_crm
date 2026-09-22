import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { UnauthorizedError } from "../../lib/errors";
import { assertOwnCustomerOrStaff } from "../../lib/authz";
import * as logisticsService from "./logistics.service";

export const listVehiclesHandler = asyncHandler(async (_req: Request, res: Response) => {
  const vehicles = await logisticsService.listVehicles();
  res.status(200).json({ data: vehicles });
});

export const createVehicleHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();
  const vehicle = await logisticsService.createVehicle(req.body, req.user.id);
  res.status(201).json({ data: vehicle });
});

export const updateVehicleHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();
  const vehicle = await logisticsService.updateVehicle(req.params.id as string, req.body, req.user.id);
  res.status(200).json({ data: vehicle });
});

export const listDeliveriesHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await logisticsService.listDeliveries(req.query as never);
  res.status(200).json(result);
});

export const getDeliveryHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();
  const delivery = await logisticsService.getDelivery(req.params.id as string);
  assertOwnCustomerOrStaff(req.user, delivery.order.customerId);
  res.status(200).json({ data: delivery });
});

export const createDeliveryHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();
  const delivery = await logisticsService.createDelivery(req.body, req.user.id);
  res.status(201).json({ data: delivery });
});

export const dispatchDeliveryHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();
  const delivery = await logisticsService.dispatchDelivery(req.params.id as string, req.body, req.user.id);
  res.status(200).json({ data: delivery });
});

export const delayDeliveryHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();
  const delivery = await logisticsService.delayDelivery(req.params.id as string, req.body, req.user.id);
  res.status(200).json({ data: delivery });
});

export const markDeliveredHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();
  const delivery = await logisticsService.markDelivered(req.params.id as string, req.user.id);
  res.status(200).json({ data: delivery });
});

export const uploadPodHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();
  const pod = await logisticsService.uploadPod(req.params.id as string, req.body, req.user.id);
  res.status(200).json({ data: pod });
});
