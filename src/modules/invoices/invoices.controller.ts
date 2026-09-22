import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { UnauthorizedError } from "../../lib/errors";
import * as invoicesService from "./invoices.service";

export const listInvoicesHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();
  const result = await invoicesService.listInvoices(req.user, req.query as never);
  res.status(200).json(result);
});

export const getInvoiceHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();
  const invoice = await invoicesService.getInvoice(req.user, req.params.id as string);
  res.status(200).json({ data: invoice });
});

export const createInvoiceHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();
  const invoice = await invoicesService.createInvoice(req.body, req.user.id);
  res.status(201).json({ data: invoice });
});
