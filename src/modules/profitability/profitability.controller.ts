import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import * as profitabilityService from "./profitability.service";

export const summaryHandler = asyncHandler(async (req: Request, res: Response) => {
  const data = await profitabilityService.getSummary(req.query as never);
  res.status(200).json({ data });
});

export const byBrandHandler = asyncHandler(async (req: Request, res: Response) => {
  const data = await profitabilityService.getByBrand(req.query as never);
  res.status(200).json({ data });
});

export const byCustomerHandler = asyncHandler(async (req: Request, res: Response) => {
  const data = await profitabilityService.getByCustomer(req.query as never);
  res.status(200).json({ data });
});

export const bySegmentHandler = asyncHandler(async (req: Request, res: Response) => {
  const data = await profitabilityService.getBySegment(req.query as never);
  res.status(200).json({ data });
});
