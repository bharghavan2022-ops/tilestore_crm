import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { requireStaff, requireManager } from "../../middleware/authorize";
import { validate } from "../../middleware/validate";
import { upsertEmployeeProfileSchema, userIdParamSchema, listEmployeesQuerySchema } from "./employees.schema";
import * as employeesController from "./employees.controller";

export const employeesRouter = Router();

employeesRouter.use(authenticate, requireStaff);

employeesRouter.get("/", validate({ query: listEmployeesQuerySchema }), employeesController.listEmployeesHandler);
employeesRouter.get(
  "/:userId",
  validate({ params: userIdParamSchema }),
  employeesController.getEmployeeHandler,
);
employeesRouter.put(
  "/:userId/profile",
  requireManager,
  validate({ params: userIdParamSchema, body: upsertEmployeeProfileSchema }),
  employeesController.upsertEmployeeProfileHandler,
);
