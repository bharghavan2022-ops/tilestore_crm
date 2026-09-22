import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { requireManager } from "../../middleware/authorize";
import { validate } from "../../middleware/validate";
import { listNotificationsQuerySchema, idParamSchema } from "./notifications.schema";
import * as notificationsController from "./notifications.controller";

export const notificationsRouter = Router();

notificationsRouter.use(authenticate);

notificationsRouter.get(
  "/",
  validate({ query: listNotificationsQuerySchema }),
  notificationsController.listMyNotificationsHandler,
);
notificationsRouter.post(
  "/:id/read",
  validate({ params: idParamSchema }),
  notificationsController.markReadHandler,
);
notificationsRouter.post("/read-all", notificationsController.markAllReadHandler);
notificationsRouter.post(
  "/run-overdue-check",
  requireManager,
  notificationsController.runOverdueInvoiceCheckHandler,
);
