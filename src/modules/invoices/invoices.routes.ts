import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { requireTeamType } from "../../middleware/authorize";
import { validate } from "../../middleware/validate";
import { createInvoiceSchema, idParamSchema, listInvoicesQuerySchema } from "./invoices.schema";
import * as invoicesController from "./invoices.controller";

export const invoicesRouter = Router();

invoicesRouter.use(authenticate);

// Clients may view their own invoices (client isolation enforced in the service).
invoicesRouter.get("/", validate({ query: listInvoicesQuerySchema }), invoicesController.listInvoicesHandler);
invoicesRouter.get("/:id", validate({ params: idParamSchema }), invoicesController.getInvoiceHandler);
invoicesRouter.post(
  "/",
  requireTeamType("ACCOUNTS"),
  validate({ body: createInvoiceSchema }),
  invoicesController.createInvoiceHandler,
);
