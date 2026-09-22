import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { requireManager } from "../../middleware/authorize";
import { validate } from "../../middleware/validate";
import { createUserSchema, updateUserSchema, idParamSchema, listUsersQuerySchema } from "./users.schema";
import * as usersController from "./users.controller";

export const usersRouter = Router();

usersRouter.use(authenticate);

usersRouter.get("/me", usersController.getMeHandler);

// User provisioning is an Owner/Admin operation - there is no public
// self-signup, consistent with an internally-provisioned CRM.
usersRouter.get("/", requireManager, validate({ query: listUsersQuerySchema }), usersController.listUsersHandler);
usersRouter.get("/:id", requireManager, validate({ params: idParamSchema }), usersController.getUserHandler);
usersRouter.post("/", requireManager, validate({ body: createUserSchema }), usersController.createUserHandler);
usersRouter.patch(
  "/:id",
  requireManager,
  validate({ params: idParamSchema, body: updateUserSchema }),
  usersController.updateUserHandler,
);
