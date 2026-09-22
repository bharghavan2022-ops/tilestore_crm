import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { UnauthorizedError } from "../../lib/errors";
import * as leadsService from "./leads.service";

export const listLeadsHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();
  const result = await leadsService.listLeads(req.user, req.query as never);
  res.status(200).json(result);
});

export const getLeadHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();
  const lead = await leadsService.getLead(req.user, req.params.id as string);
  res.status(200).json({ data: lead });
});

export const createLeadHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();
  const lead = await leadsService.createLead(req.body, req.user.id);
  res.status(201).json({ data: lead });
});

export const assignLeadHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();
  const lead = await leadsService.assignLead(req.user, req.params.id as string, req.body, req.user.id);
  res.status(200).json({ data: lead });
});

export const updateLeadStatusHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();
  const lead = await leadsService.updateLeadStatus(req.user, req.params.id as string, req.body, req.user.id);
  res.status(200).json({ data: lead });
});

export const addActivityHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();
  const activity = await leadsService.addActivity(req.user, req.params.id as string, req.body, req.user.id);
  res.status(201).json({ data: activity });
});
