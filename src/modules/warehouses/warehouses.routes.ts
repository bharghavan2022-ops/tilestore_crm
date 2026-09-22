import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { requireManager, requireStaff } from "../../middleware/authorize";
import { validate } from "../../middleware/validate";
import { createWarehouseSchema, updateWarehouseSchema, idParamSchema } from "./warehouses.schema";
import * as warehousesController from "./warehouses.controller";

export const warehousesRouter = Router();

warehousesRouter.use(authenticate, requireStaff);

warehousesRouter.get("/", warehousesController.listWarehousesHandler);
warehousesRouter.get("/:id", validate({ params: idParamSchema }), warehousesController.getWarehouseHandler);
warehousesRouter.post(
  "/",
  requireManager,
  validate({ body: createWarehouseSchema }),
  warehousesController.createWarehouseHandler,
);
warehousesRouter.patch(
  "/:id",
  requireManager,
  validate({ params: idParamSchema, body: updateWarehouseSchema }),
  warehousesController.updateWarehouseHandler,
);
