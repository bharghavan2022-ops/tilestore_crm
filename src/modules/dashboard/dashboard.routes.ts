import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { requireStaff } from "../../middleware/authorize";
import * as dashboardController from "./dashboard.controller";

export const dashboardRouter = Router();

dashboardRouter.use(authenticate, requireStaff);

dashboardRouter.get("/command-center", dashboardController.commandCenterHandler);
dashboardRouter.get("/crm", dashboardController.crmHandler);
dashboardRouter.get("/inventory", dashboardController.inventoryHandler);
dashboardRouter.get("/purchasing", dashboardController.purchasingHandler);
dashboardRouter.get("/logistics", dashboardController.logisticsHandler);
dashboardRouter.get("/people-assets", dashboardController.peopleAssetsHandler);
dashboardRouter.get("/hr", dashboardController.hrHandler);
