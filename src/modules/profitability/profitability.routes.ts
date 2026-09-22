import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { requireManager } from "../../middleware/authorize";
import { validate } from "../../middleware/validate";
import { profitabilityQuerySchema } from "./profitability.schema";
import * as profitabilityController from "./profitability.controller";

export const profitabilityRouter = Router();

// Margins and cost data are commercially sensitive - Owner/Admin only.
profitabilityRouter.use(authenticate, requireManager);

profitabilityRouter.get("/summary", validate({ query: profitabilityQuerySchema }), profitabilityController.summaryHandler);
profitabilityRouter.get("/by-brand", validate({ query: profitabilityQuerySchema }), profitabilityController.byBrandHandler);
profitabilityRouter.get(
  "/by-customer",
  validate({ query: profitabilityQuerySchema }),
  profitabilityController.byCustomerHandler,
);
profitabilityRouter.get(
  "/by-segment",
  validate({ query: profitabilityQuerySchema }),
  profitabilityController.bySegmentHandler,
);
