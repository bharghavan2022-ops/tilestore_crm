import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { requireStaff, requireTeamType } from "../../middleware/authorize";
import { validate } from "../../middleware/validate";
import {
  createPurchaseOrderSchema,
  updatePurchaseOrderStatusSchema,
  createGoodsReceiptSchema,
  idParamSchema,
  listPurchaseOrdersQuerySchema,
} from "./purchaseOrders.schema";
import * as poController from "./purchaseOrders.controller";

export const purchaseOrdersRouter = Router();

purchaseOrdersRouter.use(authenticate, requireStaff);

const purchaseTeam = requireTeamType("PURCHASE");

purchaseOrdersRouter.get("/", validate({ query: listPurchaseOrdersQuerySchema }), poController.listPurchaseOrdersHandler);
purchaseOrdersRouter.get("/:id", validate({ params: idParamSchema }), poController.getPurchaseOrderHandler);
purchaseOrdersRouter.post(
  "/",
  purchaseTeam,
  validate({ body: createPurchaseOrderSchema }),
  poController.createPurchaseOrderHandler,
);
purchaseOrdersRouter.patch(
  "/:id/status",
  purchaseTeam,
  validate({ params: idParamSchema, body: updatePurchaseOrderStatusSchema }),
  poController.updateStatusHandler,
);
purchaseOrdersRouter.post(
  "/:id/goods-receipts",
  purchaseTeam,
  validate({ params: idParamSchema, body: createGoodsReceiptSchema }),
  poController.receiveGoodsHandler,
);
