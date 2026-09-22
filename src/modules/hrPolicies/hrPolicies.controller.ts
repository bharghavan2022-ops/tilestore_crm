import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { UnauthorizedError } from "../../lib/errors";
import * as policiesService from "./hrPolicies.service";

export const listPoliciesHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await policiesService.listPolicies(req.query as never);
  res.status(200).json(result);
});

export const getPolicyHandler = asyncHandler(async (req: Request, res: Response) => {
  const policy = await policiesService.getPolicy(req.params.id as string);
  res.status(200).json({ data: policy });
});

export const createPolicyHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();
  const policy = await policiesService.createPolicy(req.body, req.user.id);
  res.status(201).json({ data: policy });
});

export const updatePolicyHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();
  const policy = await policiesService.updatePolicy(req.params.id as string, req.body, req.user.id);
  res.status(200).json({ data: policy });
});

export const acknowledgePolicyHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();
  const ack = await policiesService.acknowledgePolicy(req.params.id as string, req.user.id);
  res.status(201).json({ data: ack });
});
