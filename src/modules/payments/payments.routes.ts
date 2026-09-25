import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { requireTeamType } from "../../middleware/authorize";
import { validate } from "../../middleware/validate";
import { createPaymentSchema, updatePaymentStatusSchema, idParamSchema, listPaymentsQuerySchema } from "./payments.schema";
import * as paymentsController from "./payments.controller";

export const paymentsRouter = Router();

paymentsRouter.use(authenticate);

const accountsTeam = requireTeamType("ACCOUNTS");

// Clients may view their own payment history (client isolation enforced in the service).
paymentsRouter.get("/", validate({ query: listPaymentsQuerySchema }), paymentsController.listPaymentsHandler);
paymentsRouter.get("/:id", validate({ params: idParamSchema }), paymentsController.getPaymentHandler);
paymentsRouter.post("/", accountsTeam, validate({ body: createPaymentSchema }), paymentsController.createPaymentHandler);
paymentsRouter.patch(
  "/:id/status",
  accountsTeam,
  validate({ params: idParamSchema, body: updatePaymentStatusSchema }),
  paymentsController.updatePaymentStatusHandler,
);
