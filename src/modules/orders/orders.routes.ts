import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { requireStaff } from "../../middleware/authorize";
import { validate } from "../../middleware/validate";
import {
  createOrderFromQuotationSchema,
  updateFulfilmentTaskSchema,
  idParamSchema,
  orderTaskParamSchema,
  listOrdersQuerySchema,
} from "./orders.schema";
import * as ordersController from "./orders.controller";

export const ordersRouter = Router();

ordersRouter.use(authenticate);

// Clients can view their own orders; every write action is staff-only.
ordersRouter.get("/", validate({ query: listOrdersQuerySchema }), ordersController.listOrdersHandler);
ordersRouter.get("/:id", validate({ params: idParamSchema }), ordersController.getOrderHandler);

ordersRouter.post(
  "/",
  requireStaff,
  validate({ body: createOrderFromQuotationSchema }),
  ordersController.createOrderFromQuotationHandler,
);
ordersRouter.post(
  "/:id/stock-gate",
  requireStaff,
  validate({ params: idParamSchema }),
  ordersController.rerunStockGateHandler,
);
ordersRouter.post(
  "/:id/cancel",
  requireStaff,
  validate({ params: idParamSchema }),
  ordersController.cancelOrderHandler,
);
ordersRouter.patch(
  "/:id/fulfilment/:taskId",
  requireStaff,
  validate({ params: orderTaskParamSchema, body: updateFulfilmentTaskSchema }),
  ordersController.updateFulfilmentTaskHandler,
);
