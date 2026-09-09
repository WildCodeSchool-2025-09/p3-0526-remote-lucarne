import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { requireRoles } from "../../middlewares/requireRoles";
import { validateRequest } from "../../middlewares/validateRequest";
import { createLeague } from "./league.controller";
import { createLeagueBodySchema } from "./league.schema";
import { APP_ROLES } from "../../auth/appRole";

const leagueRouter = Router();

leagueRouter.post(
  "/",
  authenticate,
  requireRoles(APP_ROLES.ADMIN),
  validateRequest({ body: createLeagueBodySchema }),
  createLeague,
);

export default leagueRouter;
