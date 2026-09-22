import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { requireStaff, requireRole } from "../../middleware/authorize";
import { validate } from "../../middleware/validate";
import { createVendorSchema, updateVendorSchema, idParamSchema, listVendorsQuerySchema } from "./vendors.schema";
import * as vendorsController from "./vendors.controller";

export const vendorsRouter = Router();

vendorsRouter.use(authenticate, requireStaff);

vendorsRouter.get("/", validate({ query: listVendorsQuerySchema }), vendorsController.listVendorsHandler);
vendorsRouter.get("/:id", validate({ params: idParamSchema }), vendorsController.getVendorHandler);
vendorsRouter.post(
  "/",
  requireRole("OWNER", "ADMIN", "TEAM_LEAD", "TEAM_MEMBER"),
  validate({ body: createVendorSchema }),
  vendorsController.createVendorHandler,
);
vendorsRouter.patch(
  "/:id",
  requireRole("OWNER", "ADMIN", "TEAM_LEAD", "TEAM_MEMBER"),
  validate({ params: idParamSchema, body: updateVendorSchema }),
  vendorsController.updateVendorHandler,
);
