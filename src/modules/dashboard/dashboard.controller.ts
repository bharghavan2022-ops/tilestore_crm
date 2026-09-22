import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import * as dashboardService from "./dashboard.service";

export const commandCenterHandler = asyncHandler(async (_req: Request, res: Response) => {
  res.status(200).json({ data: await dashboardService.getCommandCenter() });
});

export const crmHandler = asyncHandler(async (_req: Request, res: Response) => {
  res.status(200).json({ data: await dashboardService.getCrmDashboard() });
});

export const inventoryHandler = asyncHandler(async (_req: Request, res: Response) => {
  res.status(200).json({ data: await dashboardService.getInventoryAlerts() });
});

export const purchasingHandler = asyncHandler(async (_req: Request, res: Response) => {
  res.status(200).json({ data: await dashboardService.getPurchaseTracking() });
});

export const logisticsHandler = asyncHandler(async (_req: Request, res: Response) => {
  res.status(200).json({ data: await dashboardService.getLogisticsTracker() });
});

export const peopleAssetsHandler = asyncHandler(async (_req: Request, res: Response) => {
  res.status(200).json({ data: await dashboardService.getPeopleAssets() });
});

export const hrHandler = asyncHandler(async (_req: Request, res: Response) => {
  res.status(200).json({ data: await dashboardService.getHrDashboard() });
});
