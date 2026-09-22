import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { UnauthorizedError } from "../../lib/errors";
import * as vendorsService from "./vendors.service";

export const listVendorsHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await vendorsService.listVendors(req.query as never);
  res.status(200).json(result);
});

export const getVendorHandler = asyncHandler(async (req: Request, res: Response) => {
  const vendor = await vendorsService.getVendor(req.params.id as string);
  res.status(200).json({ data: vendor });
});

export const createVendorHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();
  const vendor = await vendorsService.createVendor(req.body, req.user.id);
  res.status(201).json({ data: vendor });
});

export const updateVendorHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();
  const vendor = await vendorsService.updateVendor(req.params.id as string, req.body, req.user.id);
  res.status(200).json({ data: vendor });
});
