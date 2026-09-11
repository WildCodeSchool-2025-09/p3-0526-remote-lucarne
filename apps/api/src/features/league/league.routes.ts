import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { requireRoles } from "../../middlewares/requireRoles";
import { validateRequest } from "../../middlewares/validateRequest";
import { activateLeague, createLeague, deleteLeague, getLeague, listLeagueCountries, listLeagues, updateLeague } from "./league.controller";
import {
  createLeagueBodySchema,
  leagueIdParamsSchema,
  listLeaguesQuerySchema,
  updateLeagueBodySchema,
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
  "/countries",
  authenticate,
  requireRoles(...LEAGUE_VIEW_ROLES),
  listLeagueCountries,
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

leagueRouter.patch(
  "/:leagueId",
  authenticate,
  requireRoles(...LEAGUE_VIEW_ROLES),
  validateRequest({ params: leagueIdParamsSchema, body: updateLeagueBodySchema }),
  updateLeague,
);

leagueRouter.patch(
  "/:leagueId/activate",
  authenticate,
  requireRoles(APP_ROLES.ADMIN),
  validateRequest({ params: leagueIdParamsSchema }),
  activateLeague,
);

export default leagueRouter;
