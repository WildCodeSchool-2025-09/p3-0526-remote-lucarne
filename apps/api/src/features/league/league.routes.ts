import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { requireRoles } from "../../middlewares/requireRoles";
import { validateRequest } from "../../middlewares/validateRequest";
import { activateLeague, createLeague, deactivateLeague, deleteLeague, getLeague, getPublicLeague, listLeagueCountries, listLeagues, listPublicLeagueNavigation, listPublicLeagueTeamResponses, updateLeague } from "./league.controller";
import {
  createLeagueBodySchema,
  deleteLeagueBodySchema,
  leagueIdParamsSchema,
  listLeaguesQuerySchema,
  publicLeagueNavigationQuerySchema,
  publicLeagueSlugParamsSchema,
  publicLeagueTeamsParamsSchema,
  publicLeagueTeamsQuerySchema,
  updateLeagueBodySchema,
} from "./league.schema";
import { LEAGUE_DELETE_ROLES, LEAGUE_VIEW_ROLES, LEAGUE_WRITE_ROLES } from "./league.permissions";
import { listPublicMatchdayResponses } from "../season/season.public.controller";
import { getPublicLeagueStatistics, getPublicStandings } from "../ranking/ranking.controller";
import { publicStatisticsQuerySchema } from "@lucarne/shared";

const leagueRouter = Router();
leagueRouter.get("/by-slug/:leagueSlug/seasons/:seasonId/standings", validateRequest({ params: publicLeagueTeamsParamsSchema, query: publicLeagueNavigationQuerySchema }), getPublicStandings);
leagueRouter.get("/by-slug/:leagueSlug/seasons/:seasonId/statistics", validateRequest({ params: publicLeagueTeamsParamsSchema, query: publicStatisticsQuerySchema }), getPublicLeagueStatistics);

leagueRouter.get("/navigation", validateRequest({ query: publicLeagueNavigationQuerySchema }), listPublicLeagueNavigation);
leagueRouter.get("/by-slug/:leagueSlug", validateRequest({
  params: publicLeagueSlugParamsSchema, query: publicLeagueNavigationQuerySchema,
}), getPublicLeague);
leagueRouter.get("/by-slug/:leagueSlug/seasons/:seasonId/teams", validateRequest({
  params: publicLeagueTeamsParamsSchema, query: publicLeagueTeamsQuerySchema,
}), listPublicLeagueTeamResponses);
leagueRouter.get("/by-slug/:leagueSlug/seasons/:seasonId/matchdays", validateRequest({
  params: publicLeagueTeamsParamsSchema, query: publicLeagueNavigationQuerySchema,
}), listPublicMatchdayResponses);

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
  requireRoles(...LEAGUE_WRITE_ROLES),
  validateRequest({ body: createLeagueBodySchema }),
  createLeague,
);

leagueRouter.delete(
  "/:leagueId",
  authenticate,
  requireRoles(...LEAGUE_DELETE_ROLES),
  validateRequest({ params: leagueIdParamsSchema, body: deleteLeagueBodySchema }),
  deleteLeague,
);

leagueRouter.patch(
  "/:leagueId",
  authenticate,
  requireRoles(...LEAGUE_WRITE_ROLES),
  validateRequest({ params: leagueIdParamsSchema, body: updateLeagueBodySchema }),
  updateLeague,
);

leagueRouter.patch(
  "/:leagueId/activate",
  authenticate,
  requireRoles(...LEAGUE_WRITE_ROLES),
  validateRequest({ params: leagueIdParamsSchema }),
  activateLeague,
);

leagueRouter.patch(
  "/:leagueId/deactivate",
  authenticate,
  requireRoles(...LEAGUE_WRITE_ROLES),
  validateRequest({ params: leagueIdParamsSchema }),
  deactivateLeague,
);

export default leagueRouter;
