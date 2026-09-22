import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { requireManager, requireStaff } from "../../middleware/authorize";
import { validate } from "../../middleware/validate";
import { createTeamSchema, updateTeamSchema, idParamSchema } from "./teams.schema";
import * as teamsController from "./teams.controller";

export const teamsRouter = Router();

teamsRouter.use(authenticate);

teamsRouter.get("/", requireStaff, teamsController.listTeamsHandler);
teamsRouter.get("/:id", requireStaff, validate({ params: idParamSchema }), teamsController.getTeamHandler);
teamsRouter.post("/", requireManager, validate({ body: createTeamSchema }), teamsController.createTeamHandler);
teamsRouter.patch(
  "/:id",
  requireManager,
  validate({ params: idParamSchema, body: updateTeamSchema }),
  teamsController.updateTeamHandler,
);
