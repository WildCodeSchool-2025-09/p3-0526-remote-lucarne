import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { requireRoles } from "../../middlewares/requireRoles";
import { validateRequest } from "../../middlewares/validateRequest";
import { activateLeague, createLeague, deactivateLeague, deleteLeague, getLeague, listLeagueCountries, listLeagues, updateLeague } from "./league.controller";
import {
  createLeagueBodySchema,
  deleteLeagueBodySchema,
  leagueIdParamsSchema,
  listLeaguesQuerySchema,
  updateLeagueBodySchema,
} from "./league.schema";
import { LEAGUE_DELETE_ROLES, LEAGUE_VIEW_ROLES, LEAGUE_WRITE_ROLES } from "./league.permissions";

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
