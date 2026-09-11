import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { requireRoles } from "../../middlewares/requireRoles";
import { validateRequest } from "../../middlewares/validateRequest";
import { createTeamInputSchema } from "@lucarne/shared";
import { createTeam } from "./team.controller";
import { TEAM_CREATE_ROLES } from "./team.permissions";

const teamRouter = Router();

teamRouter.post(
  "/",
  authenticate,
  requireRoles(...TEAM_CREATE_ROLES),
  validateRequest({ body: createTeamInputSchema }),
  createTeam,
);

export default teamRouter;
