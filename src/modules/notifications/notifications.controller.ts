import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { UnauthorizedError } from "../../lib/errors";
import * as notificationsService from "./notifications.service";

export const listMyNotificationsHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();
  const result = await notificationsService.listMyNotifications(req.user.id, req.query as never);
  res.status(200).json(result);
});

export const markReadHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();
  const notification = await notificationsService.markRead(req.user.id, req.params.id as string);
  res.status(200).json({ data: notification });
});

export const markAllReadHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();
  await notificationsService.markAllRead(req.user.id);
  res.status(204).send();
});

export const runOverdueInvoiceCheckHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();
  const result = await notificationsService.runOverdueInvoiceCheck(req.user.id);
  res.status(200).json({ data: result });
});
