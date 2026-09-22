import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { requireStaff, requireManager } from "../../middleware/authorize";
import { validate } from "../../middleware/validate";
import { createPolicySchema, updatePolicySchema, idParamSchema, listPoliciesQuerySchema } from "./hrPolicies.schema";
import * as policiesController from "./hrPolicies.controller";

export const hrPoliciesRouter = Router();

hrPoliciesRouter.use(authenticate, requireStaff);

hrPoliciesRouter.get("/", validate({ query: listPoliciesQuerySchema }), policiesController.listPoliciesHandler);
hrPoliciesRouter.get("/:id", validate({ params: idParamSchema }), policiesController.getPolicyHandler);
hrPoliciesRouter.post("/", requireManager, validate({ body: createPolicySchema }), policiesController.createPolicyHandler);
hrPoliciesRouter.patch(
  "/:id",
  requireManager,
  validate({ params: idParamSchema, body: updatePolicySchema }),
  policiesController.updatePolicyHandler,
);
hrPoliciesRouter.post(
  "/:id/acknowledge",
  validate({ params: idParamSchema }),
  policiesController.acknowledgePolicyHandler,
);
