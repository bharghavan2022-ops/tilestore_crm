import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { requireManager, requireStaff } from "../../middleware/authorize";
import { validate } from "../../middleware/validate";
import {
  createQuotationSchema,
  updateQuotationItemsSchema,
  decideApprovalSchema,
  idParamSchema,
  listQuotationsQuerySchema,
} from "./quotations.schema";
import * as quotationsController from "./quotations.controller";

export const quotationsRouter = Router();

quotationsRouter.use(authenticate);

// Clients may view their own quotations (client portal); everything else
// (create/edit/submit/approve) is staff-only and enforced in the service
// layer via quotationVisibilityWhere + requireManager below.
quotationsRouter.get("/", validate({ query: listQuotationsQuerySchema }), quotationsController.listQuotationsHandler);
quotationsRouter.get("/:id", validate({ params: idParamSchema }), quotationsController.getQuotationHandler);
quotationsRouter.post(
  "/",
  requireStaff,
  validate({ body: createQuotationSchema }),
  quotationsController.createQuotationHandler,
);
quotationsRouter.put(
  "/:id/items",
  requireStaff,
  validate({ params: idParamSchema, body: updateQuotationItemsSchema }),
  quotationsController.updateQuotationItemsHandler,
);
quotationsRouter.post(
  "/:id/submit",
  requireStaff,
  validate({ params: idParamSchema }),
  quotationsController.submitForApprovalHandler,
);
quotationsRouter.post(
  "/:id/decision",
  requireManager,
  validate({ params: idParamSchema, body: decideApprovalSchema }),
  quotationsController.decideApprovalHandler,
);
