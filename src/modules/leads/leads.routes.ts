import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { requireStaff, requireRole } from "../../middleware/authorize";
import { validate } from "../../middleware/validate";
import {
  createLeadSchema,
  updateLeadStatusSchema,
  assignLeadSchema,
  createActivitySchema,
  idParamSchema,
  listLeadsQuerySchema,
} from "./leads.schema";
import * as leadsController from "./leads.controller";

export const leadsRouter = Router();

// Leads are internal CRM working data - clients never see them directly.
leadsRouter.use(authenticate, requireStaff);

leadsRouter.get("/", validate({ query: listLeadsQuerySchema }), leadsController.listLeadsHandler);
leadsRouter.get("/:id", validate({ params: idParamSchema }), leadsController.getLeadHandler);
leadsRouter.post("/", validate({ body: createLeadSchema }), leadsController.createLeadHandler);
leadsRouter.post(
  "/:id/assign",
  requireRole("OWNER", "ADMIN", "TEAM_LEAD"),
  validate({ params: idParamSchema, body: assignLeadSchema }),
  leadsController.assignLeadHandler,
);
leadsRouter.patch(
  "/:id/status",
  validate({ params: idParamSchema, body: updateLeadStatusSchema }),
  leadsController.updateLeadStatusHandler,
);
leadsRouter.post(
  "/:id/activities",
  validate({ params: idParamSchema, body: createActivitySchema }),
  leadsController.addActivityHandler,
);
