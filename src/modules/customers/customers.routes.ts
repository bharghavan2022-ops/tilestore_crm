import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { requireStaff } from "../../middleware/authorize";
import { validate } from "../../middleware/validate";
import {
  createCustomerSchema,
  updateCustomerSchema,
  createContactSchema,
  idParamSchema,
  customerContactParamSchema,
  listCustomersQuerySchema,
} from "./customers.schema";
import * as customersController from "./customers.controller";

export const customersRouter = Router();

customersRouter.use(authenticate);

// Listing/creating customers is an internal (staff) operation; a client
// reaches their own record only via GET /:id, gated by assertOwnCustomerOrStaff.
customersRouter.get(
  "/",
  requireStaff,
  validate({ query: listCustomersQuerySchema }),
  customersController.listCustomersHandler,
);
customersRouter.get("/:id", validate({ params: idParamSchema }), customersController.getCustomerHandler);
customersRouter.post(
  "/",
  requireStaff,
  validate({ body: createCustomerSchema }),
  customersController.createCustomerHandler,
);
customersRouter.patch(
  "/:id",
  requireStaff,
  validate({ params: idParamSchema, body: updateCustomerSchema }),
  customersController.updateCustomerHandler,
);

customersRouter.get(
  "/:customerId/contacts",
  validate({ params: customerContactParamSchema.pick({ customerId: true }) }),
  customersController.listContactsHandler,
);
customersRouter.post(
  "/:customerId/contacts",
  requireStaff,
  validate({ params: customerContactParamSchema.pick({ customerId: true }), body: createContactSchema }),
  customersController.addContactHandler,
);
