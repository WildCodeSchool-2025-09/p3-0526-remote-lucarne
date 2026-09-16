import { Router } from "express";
import { createParticipationInputSchema, seasonIdParamsSchema, seasonParticipationParamsSchema } from "@lucarne/shared";
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
  "/seasons/:seasonId/participations",
  authenticate,
  requireRoles(...PARTICIPATION_WRITE_ROLES),
  validateRequest({ params: seasonIdParamsSchema, body: createParticipationInputSchema }),
  createParticipation,
);

participationRouter.get(
  "/seasons/:seasonId/participations/:teamId/withdrawal-preview",
  authenticate,
  requireRoles(...PARTICIPATION_WRITE_ROLES),
  validateRequest({ params: seasonParticipationParamsSchema }),
  getParticipationWithdrawalPreview,
);

participationRouter.delete(
  "/seasons/:seasonId/participations/:teamId",
  authenticate,
  requireRoles(...PARTICIPATION_WRITE_ROLES),
  validateRequest({ params: seasonParticipationParamsSchema }),
  withdrawParticipation,
);

export default participationRouter;
