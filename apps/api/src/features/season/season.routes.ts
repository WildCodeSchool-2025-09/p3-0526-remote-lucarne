import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { requireRoles } from "../../middlewares/requireRoles";
import { validateRequest } from "../../middlewares/validateRequest";
import { createLeagueSeason, createSeason, deleteLeagueSeason, deleteSeason, getLeagueSeasons, getSeason, listSeasons, setCurrentSeason, updateSeason } from "./season.controller";
import { assignLeagueSeasonInputSchema, createSeasonBodySchema, deleteSeasonInputSchema, leagueIdParamsSchema, leagueSeasonParamsSchema, listLeagueSeasonsQuerySchema, listSeasonsQuerySchema, seasonIdParamsSchema, updateSeasonBodySchema } from "./season.schema";
import { LEAGUE_SEASON_CREATE_ROLES, SEASON_CREATE_ROLES, SEASON_CURRENT_ROLES, SEASON_DELETE_ROLES, SEASON_UPDATE_ROLES, SEASON_VIEW_ROLES } from "./season.permissions";
import { LEAGUE_WRITE_ROLES } from "../league/league.permissions";

const seasonRouter = Router();
const leagueSeasonRouter = Router({ mergeParams: true });

seasonRouter.get(
  "/",
  authenticate,
  requireRoles(...SEASON_VIEW_ROLES),
  validateRequest({ query: listSeasonsQuerySchema }),
  listSeasons,
);

seasonRouter.patch(
  "/:seasonId",
  authenticate,
  requireRoles(...SEASON_UPDATE_ROLES),
  validateRequest({ params: seasonIdParamsSchema, body: updateSeasonBodySchema }),
  updateSeason,
);

seasonRouter.delete(
  "/:seasonId",
  authenticate,
  requireRoles(...SEASON_DELETE_ROLES),
  validateRequest({ params: seasonIdParamsSchema, body: deleteSeasonInputSchema }),
  deleteSeason,
);

seasonRouter.get(
  "/:seasonId",
  authenticate,
  requireRoles(...SEASON_VIEW_ROLES),
  validateRequest({ params: seasonIdParamsSchema }),
  getSeason,
);

seasonRouter.post(
  "/",
  authenticate,
  requireRoles(...SEASON_CREATE_ROLES),
  validateRequest({ body: createSeasonBodySchema }),
  createSeason,
);

leagueSeasonRouter.get(
  "/",
  authenticate,
  requireRoles(...SEASON_VIEW_ROLES),
  validateRequest({ params: leagueIdParamsSchema, query: listLeagueSeasonsQuerySchema }),
  getLeagueSeasons,
);

leagueSeasonRouter.post(
  "/",
  authenticate,
  requireRoles(...LEAGUE_SEASON_CREATE_ROLES),
  validateRequest({ params: leagueIdParamsSchema, body: assignLeagueSeasonInputSchema }),
  createLeagueSeason,
);

leagueSeasonRouter.delete(
  "/:seasonId",
  authenticate,
  requireRoles(...LEAGUE_WRITE_ROLES),
  validateRequest({ params: leagueSeasonParamsSchema }),
  deleteLeagueSeason,
);

leagueSeasonRouter.patch(
  "/:seasonId/current",
  authenticate,
  requireRoles(...SEASON_CURRENT_ROLES),
  validateRequest({ params: leagueSeasonParamsSchema }),
  setCurrentSeason,
);

export { leagueSeasonRouter };
export default seasonRouter;
