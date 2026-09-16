import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { requireRoles } from "../../middlewares/requireRoles";
import { validateRequest } from "../../middlewares/validateRequest";
import { createSeason, getSeason, listSeasons, setCurrentSeason, updateSeason } from "./season.controller";
import { createSeasonBodySchema, leagueIdParamsSchema, leagueSeasonParamsSchema, listSeasonsQuerySchema, seasonIdParamsSchema, updateSeasonBodySchema } from "./season.schema";
import { SEASON_CREATE_ROLES, SEASON_CURRENT_ROLES, SEASON_UPDATE_ROLES, SEASON_VIEW_ROLES } from "./season.permissions";

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

seasonRouter.get(
  "/:seasonId",
  authenticate,
  requireRoles(...SEASON_VIEW_ROLES),
  validateRequest({ params: seasonIdParamsSchema }),
  getSeason,
);

leagueSeasonRouter.post(
  "/",
  authenticate,
  requireRoles(...SEASON_CREATE_ROLES),
  validateRequest({ params: leagueIdParamsSchema, body: createSeasonBodySchema }),
  createSeason,
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
