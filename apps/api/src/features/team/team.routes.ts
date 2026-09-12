import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { requireRoles } from "../../middlewares/requireRoles";
import { validateRequest } from "../../middlewares/validateRequest";
import { createTeamInputSchema } from "@lucarne/shared";
import { createTeam, getTeam, listTeams, updateTeam } from "./team.controller";
import { TEAM_CREATE_ROLES, TEAM_EDIT_ROLES, TEAM_VIEW_ROLES } from "./team.permissions";
import { teamIdParamsSchema, teamListQuerySchema, updateTeamInputSchema } from "@lucarne/shared";

const teamRouter = Router();

teamRouter.get("/", authenticate, requireRoles(...TEAM_VIEW_ROLES), validateRequest({ query: teamListQuerySchema }), listTeams);
teamRouter.get("/:teamId", authenticate, requireRoles(...TEAM_VIEW_ROLES), validateRequest({ params: teamIdParamsSchema }), getTeam);

teamRouter.post(
  "/",
  authenticate,
  requireRoles(...TEAM_CREATE_ROLES),
  validateRequest({ body: createTeamInputSchema }),
  createTeam,
);
teamRouter.patch("/:teamId", authenticate, requireRoles(...TEAM_EDIT_ROLES), validateRequest({ params: teamIdParamsSchema, body: updateTeamInputSchema }), updateTeam);

export default teamRouter;
