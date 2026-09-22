import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { requireStaff, requireRole } from "../../middleware/authorize";
import { validate } from "../../middleware/validate";
import {
  stockAdjustmentSchema,
  listStockQuerySchema,
  listMovementsQuerySchema,
  listShortagesQuerySchema,
  productIdParamSchema,
} from "./inventory.schema";
import * as inventoryController from "./inventory.controller";

export const inventoryRouter = Router();

inventoryRouter.use(authenticate, requireStaff);

inventoryRouter.get("/stock", validate({ query: listStockQuerySchema }), inventoryController.listStockHandler);
inventoryRouter.get(
  "/supply/:productId",
  validate({ params: productIdParamSchema }),
  inventoryController.getSupplyHandler,
);
inventoryRouter.post(
  "/adjustments",
  requireRole("OWNER", "ADMIN", "TEAM_LEAD", "TEAM_MEMBER"),
  validate({ body: stockAdjustmentSchema }),
  inventoryController.adjustStockHandler,
);
inventoryRouter.get(
  "/movements",
  validate({ query: listMovementsQuerySchema }),
  inventoryController.listMovementsHandler,
);
inventoryRouter.get(
  "/shortages",
  validate({ query: listShortagesQuerySchema }),
  inventoryController.listShortagesHandler,
);
