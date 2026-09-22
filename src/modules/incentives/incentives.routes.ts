import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { requireStaff, requireManager } from "../../middleware/authorize";
import { validate } from "../../middleware/validate";
import { createRuleSchema, updateRuleSchema, idParamSchema, incentiveReportQuerySchema } from "./incentives.schema";
import * as incentivesController from "./incentives.controller";

export const incentivesRouter = Router();

incentivesRouter.use(authenticate, requireStaff);

incentivesRouter.get("/rules", requireManager, incentivesController.listRulesHandler);
incentivesRouter.post("/rules", requireManager, validate({ body: createRuleSchema }), incentivesController.createRuleHandler);
incentivesRouter.patch(
  "/rules/:id",
  requireManager,
  validate({ params: idParamSchema, body: updateRuleSchema }),
  incentivesController.updateRuleHandler,
);
incentivesRouter.get(
  "/report",
  validate({ query: incentiveReportQuerySchema }),
  incentivesController.incentiveReportHandler,
);
