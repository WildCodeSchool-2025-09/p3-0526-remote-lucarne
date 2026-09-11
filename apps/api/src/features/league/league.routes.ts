import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { requireRoles } from "../../middlewares/requireRoles";
import { validateRequest } from "../../middlewares/validateRequest";
import { createLeague, deleteLeague, getLeague, listLeagues } from "./league.controller";
import {
  createLeagueBodySchema,
  leagueIdParamsSchema,
  listLeaguesQuerySchema,
} from "./league.schema";
import {
  LEAGUE_DELETE_ROLES,
  LEAGUE_VIEW_ROLES,
  APP_ROLES,
} from "../../auth/appRole";

const leagueRouter = Router();

leagueRouter.get(
  "/",
  authenticate,
  requireRoles(...LEAGUE_VIEW_ROLES),
  validateRequest({ query: listLeaguesQuerySchema }),
  listLeagues,
);

leagueRouter.get(
  "/:leagueId",
  authenticate,
  requireRoles(...LEAGUE_VIEW_ROLES),
  validateRequest({ params: leagueIdParamsSchema }),
  getLeague,
);

leagueRouter.post(
  "/",
  authenticate,
  requireRoles(...LEAGUE_DELETE_ROLES),
  validateRequest({ body: createLeagueBodySchema }),
  createLeague,
);

leagueRouter.delete(
  "/:leagueId",
  authenticate,
  requireRoles(APP_ROLES.ADMIN),
  validateRequest({ params: leagueIdParamsSchema }),
  deleteLeague,
);

export default leagueRouter;
