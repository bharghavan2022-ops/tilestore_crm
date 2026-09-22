import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { requireStaff, requireRole } from "../../middleware/authorize";
import { validate } from "../../middleware/validate";
import {
  createVehicleSchema,
  updateVehicleSchema,
  createDeliverySchema,
  dispatchDeliverySchema,
  delayDeliverySchema,
  uploadPodSchema,
  idParamSchema,
  listDeliveriesQuerySchema,
} from "./logistics.schema";
import * as logisticsController from "./logistics.controller";

export const logisticsRouter = Router();

logisticsRouter.use(authenticate);

const deliveryTeam = requireRole("OWNER", "ADMIN", "TEAM_LEAD", "TEAM_MEMBER");

logisticsRouter.get("/vehicles", requireStaff, logisticsController.listVehiclesHandler);
logisticsRouter.post(
  "/vehicles",
  deliveryTeam,
  validate({ body: createVehicleSchema }),
  logisticsController.createVehicleHandler,
);
logisticsRouter.patch(
  "/vehicles/:id",
  deliveryTeam,
  validate({ params: idParamSchema, body: updateVehicleSchema }),
  logisticsController.updateVehicleHandler,
);

logisticsRouter.get(
  "/deliveries",
  requireStaff,
  validate({ query: listDeliveriesQuerySchema }),
  logisticsController.listDeliveriesHandler,
);
// A client may view their own delivery status (client isolation enforced in the controller).
logisticsRouter.get("/deliveries/:id", validate({ params: idParamSchema }), logisticsController.getDeliveryHandler);
logisticsRouter.post(
  "/deliveries",
  deliveryTeam,
  validate({ body: createDeliverySchema }),
  logisticsController.createDeliveryHandler,
);
logisticsRouter.post(
  "/deliveries/:id/dispatch",
  deliveryTeam,
  validate({ params: idParamSchema, body: dispatchDeliverySchema }),
  logisticsController.dispatchDeliveryHandler,
);
logisticsRouter.post(
  "/deliveries/:id/delay",
  deliveryTeam,
  validate({ params: idParamSchema, body: delayDeliverySchema }),
  logisticsController.delayDeliveryHandler,
);
logisticsRouter.post(
  "/deliveries/:id/deliver",
  deliveryTeam,
  validate({ params: idParamSchema }),
  logisticsController.markDeliveredHandler,
);
logisticsRouter.post(
  "/deliveries/:id/pod",
  deliveryTeam,
  validate({ params: idParamSchema, body: uploadPodSchema }),
  logisticsController.uploadPodHandler,
);
