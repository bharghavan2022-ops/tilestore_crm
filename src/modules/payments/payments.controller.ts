import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { UnauthorizedError } from "../../lib/errors";
import * as paymentsService from "./payments.service";

export const listPaymentsHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();
  const result = await paymentsService.listPayments(req.user, req.query as never);
  res.status(200).json(result);
});

export const getPaymentHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();
  const payment = await paymentsService.getPayment(req.user, req.params.id as string);
  res.status(200).json({ data: payment });
});

export const createPaymentHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();
  const payment = await paymentsService.createPayment(req.body, req.user.id);
  res.status(201).json({ data: payment });
});

export const updatePaymentStatusHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();
  const payment = await paymentsService.updatePaymentStatus(req.params.id as string, req.body, req.user.id);
  res.status(200).json({ data: payment });
});
