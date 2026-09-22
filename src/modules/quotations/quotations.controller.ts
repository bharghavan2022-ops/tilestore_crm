import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { UnauthorizedError } from "../../lib/errors";
import { assertOwnCustomerOrStaff } from "../../lib/authz";
import * as quotationsService from "./quotations.service";

export const listQuotationsHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();
  if (req.user.role === "CLIENT") {
    const query = {
      ...(req.query as Record<string, unknown>),
      customerId: req.user.customerId ?? "__none__",
    };
    const result = await quotationsService.listQuotations(req.user, query as never);
    return res.status(200).json(result);
  }
  const result = await quotationsService.listQuotations(req.user, req.query as never);
  res.status(200).json(result);
});

export const getQuotationHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();
  const quotation = await quotationsService.getQuotation(req.user, req.params.id as string);
  assertOwnCustomerOrStaff(req.user, quotation.customerId);
  res.status(200).json({ data: quotation });
});

export const createQuotationHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();
  const quotation = await quotationsService.createQuotation(req.user, req.body, req.user.id);
  res.status(201).json({ data: quotation });
});

export const updateQuotationItemsHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();
  const quotation = await quotationsService.updateQuotationItems(req.user, req.params.id as string, req.body, req.user.id);
  res.status(200).json({ data: quotation });
});

export const submitForApprovalHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();
  const quotation = await quotationsService.submitForApproval(req.user, req.params.id as string, req.user.id);
  res.status(200).json({ data: quotation });
});

export const decideApprovalHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();
  const quotation = await quotationsService.decideApproval(req.params.id as string, req.body, req.user.id);
  res.status(200).json({ data: quotation });
});
