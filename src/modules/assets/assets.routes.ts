import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { requireStaff, requireManager } from "../../middleware/authorize";
import { validate } from "../../middleware/validate";
import {
  createAssetSchema,
  updateAssetSchema,
  assignAssetSchema,
  returnAssetSchema,
  recordMaintenanceSchema,
  idParamSchema,
  listAssetsQuerySchema,
} from "./assets.schema";
import * as assetsController from "./assets.controller";

export const assetsRouter = Router();

assetsRouter.use(authenticate, requireStaff);

assetsRouter.get("/", validate({ query: listAssetsQuerySchema }), assetsController.listAssetsHandler);
assetsRouter.get("/:id", validate({ params: idParamSchema }), assetsController.getAssetHandler);
assetsRouter.post("/", requireManager, validate({ body: createAssetSchema }), assetsController.createAssetHandler);
assetsRouter.patch(
  "/:id",
  requireManager,
  validate({ params: idParamSchema, body: updateAssetSchema }),
  assetsController.updateAssetHandler,
);
assetsRouter.post(
  "/:id/assign",
  requireManager,
  validate({ params: idParamSchema, body: assignAssetSchema }),
  assetsController.assignAssetHandler,
);
assetsRouter.post(
  "/:id/return",
  requireManager,
  validate({ params: idParamSchema, body: returnAssetSchema }),
  assetsController.returnAssetHandler,
);
assetsRouter.post(
  "/:id/maintenance",
  requireManager,
  validate({ params: idParamSchema, body: recordMaintenanceSchema }),
  assetsController.recordMaintenanceHandler,
);
