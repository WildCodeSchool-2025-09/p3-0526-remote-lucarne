import { Router } from "express";
import { createParticipationInputSchema, leagueSeasonIdParamsSchema, leagueSeasonParticipationParamsSchema } from "@lucarne/shared";
import { authenticate } from "../../middlewares/authenticate";
import { requireRoles } from "../../middlewares/requireRoles";
import { validateRequest } from "../../middlewares/validateRequest";
import {
  createParticipation,
  getParticipationWithdrawalPreview,
  withdrawParticipation,
} from "./participation.controller";
import { PARTICIPATION_WRITE_ROLES } from "./participation.permissions";

const participationRouter = Router();

participationRouter.post(
  "/league-seasons/:leagueSeasonId/participations",
  authenticate,
  requireRoles(...PARTICIPATION_WRITE_ROLES),
  validateRequest({ params: leagueSeasonIdParamsSchema, body: createParticipationInputSchema }),
  createParticipation,
);

participationRouter.get(
  "/league-seasons/:leagueSeasonId/participations/:teamId/withdrawal-preview",
  authenticate,
  requireRoles(...PARTICIPATION_WRITE_ROLES),
  validateRequest({ params: leagueSeasonParticipationParamsSchema }),
  getParticipationWithdrawalPreview,
);

participationRouter.delete(
  "/league-seasons/:leagueSeasonId/participations/:teamId",
  authenticate,
  requireRoles(...PARTICIPATION_WRITE_ROLES),
  validateRequest({ params: leagueSeasonParticipationParamsSchema }),
  withdrawParticipation,
);

export default participationRouter;
