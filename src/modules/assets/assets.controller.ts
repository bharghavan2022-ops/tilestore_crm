import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { UnauthorizedError } from "../../lib/errors";
import * as assetsService from "./assets.service";

export const listAssetsHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await assetsService.listAssets(req.query as never);
  res.status(200).json(result);
});

export const getAssetHandler = asyncHandler(async (req: Request, res: Response) => {
  const asset = await assetsService.getAsset(req.params.id as string);
  res.status(200).json({ data: asset });
});

export const createAssetHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();
  const asset = await assetsService.createAsset(req.body, req.user.id);
  res.status(201).json({ data: asset });
});

export const updateAssetHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();
  const asset = await assetsService.updateAsset(req.params.id as string, req.body, req.user.id);
  res.status(200).json({ data: asset });
});

export const assignAssetHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();
  const assignment = await assetsService.assignAsset(req.params.id as string, req.body, req.user.id);
  res.status(201).json({ data: assignment });
});

export const returnAssetHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();
  const assignment = await assetsService.returnAsset(req.params.id as string, req.body, req.user.id);
  res.status(200).json({ data: assignment });
});

export const recordMaintenanceHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();
  const maintenance = await assetsService.recordMaintenance(req.params.id as string, req.body, req.user.id);
  res.status(201).json({ data: maintenance });
});
