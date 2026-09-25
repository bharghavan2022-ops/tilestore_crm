import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { requireStaff, requireTeamType } from "../../middleware/authorize";
import { validate } from "../../middleware/validate";
import { createVendorSchema, updateVendorSchema, idParamSchema, listVendorsQuerySchema } from "./vendors.schema";
import * as vendorsController from "./vendors.controller";

export const vendorsRouter = Router();

vendorsRouter.use(authenticate, requireStaff);

const purchaseTeam = requireTeamType("PURCHASE");

vendorsRouter.get("/", validate({ query: listVendorsQuerySchema }), vendorsController.listVendorsHandler);
vendorsRouter.get("/:id", validate({ params: idParamSchema }), vendorsController.getVendorHandler);
vendorsRouter.post("/", purchaseTeam, validate({ body: createVendorSchema }), vendorsController.createVendorHandler);
vendorsRouter.patch(
  "/:id",
  purchaseTeam,
  validate({ params: idParamSchema, body: updateVendorSchema }),
  vendorsController.updateVendorHandler,
);
