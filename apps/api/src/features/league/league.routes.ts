import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { requireRoles } from "../../middlewares/requireRoles";
import { validateRequest } from "../../middlewares/validateRequest";
import { createLeague, deleteLeague, listLeagues } from "./league.controller";
import {
  createLeagueBodySchema,
  leagueIdParamsSchema,
  listLeaguesQuerySchema,
} from "./league.schema";
import { APP_ROLES } from "../../auth/appRole";

const leagueRouter = Router();

leagueRouter.get(
  "/",
  authenticate,
  requireRoles(APP_ROLES.ADMIN, APP_ROLES.MODERATOR, APP_ROLES.EDITOR),
  validateRequest({ query: listLeaguesQuerySchema }),
  listLeagues,
);

leagueRouter.post(
  "/",
  authenticate,
  requireRoles(APP_ROLES.ADMIN),
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
