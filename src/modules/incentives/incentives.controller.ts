import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { UnauthorizedError } from "../../lib/errors";
import { isManager } from "../../lib/authz";
import * as incentivesService from "./incentives.service";

export const listRulesHandler = asyncHandler(async (_req: Request, res: Response) => {
  const rules = await incentivesService.listRules();
  res.status(200).json({ data: rules });
});

export const createRuleHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();
  const rule = await incentivesService.createRule(req.body, req.user.id);
  res.status(201).json({ data: rule });
});

export const updateRuleHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();
  const rule = await incentivesService.updateRule(req.params.id as string, req.body, req.user.id);
  res.status(200).json({ data: rule });
});

export const incentiveReportHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();
  // Non-managers can only ever see their own incentive breakdown.
  const query = isManager(req.user) ? req.query : { ...req.query, userId: req.user.id };
  const report = await incentivesService.computeIncentiveReport(query as never);
  res.status(200).json({ data: report });
});
