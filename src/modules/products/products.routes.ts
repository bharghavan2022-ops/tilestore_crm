import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { requireManager } from "../../middleware/authorize";
import { validate } from "../../middleware/validate";
import {
  createBrandSchema,
  updateBrandSchema,
  createProductSchema,
  updateProductSchema,
  idParamSchema,
  listProductsQuerySchema,
} from "./products.schema";
import * as productsController from "./products.controller";

export const productsRouter = Router();

productsRouter.use(authenticate);

productsRouter.get("/brands", productsController.listBrandsHandler);
productsRouter.post("/brands", requireManager, validate({ body: createBrandSchema }), productsController.createBrandHandler);
productsRouter.patch(
  "/brands/:id",
  requireManager,
  validate({ params: idParamSchema, body: updateBrandSchema }),
  productsController.updateBrandHandler,
);

productsRouter.get("/", validate({ query: listProductsQuerySchema }), productsController.listProductsHandler);
productsRouter.get("/:id", validate({ params: idParamSchema }), productsController.getProductHandler);
productsRouter.post("/", requireManager, validate({ body: createProductSchema }), productsController.createProductHandler);
productsRouter.patch(
  "/:id",
  requireManager,
  validate({ params: idParamSchema, body: updateProductSchema }),
  productsController.updateProductHandler,
);
