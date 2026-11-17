import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { requireRoles } from "../../middlewares/requireRoles";
import { validateRequest } from "../../middlewares/validateRequest";
import {
  createAdminMatch,
  deleteAdminMatch,
  getAdminMatch,
  getPublicMatch,
  listAdminMatches,
  listPublicMatchResponses,
  publishAdminMatch,
  updateAdminMatch,
  updateAdminMatchResult,
  updateAdminMatchStatus,
} from "./match.controller";
import { MATCH_VIEW_ROLES, MATCH_WRITE_ROLES } from "./match.permissions";
import { getPublicMatchEvents } from "../ranking/ranking.controller";
import { z } from "zod";
import {
  createMatchInputSchema,
  deleteMatchInputSchema,
  matchIdParamsSchema,
  matchListQuerySchema,
  matchPublicIdParamsSchema,
  publishMatchInputSchema,
  updateMatchInputSchema,
  updateMatchResultInputSchema,
  updateMatchStatusInputSchema,
} from "./match.schema";

const adminMatchRouter = Router();

adminMatchRouter.use(authenticate);

adminMatchRouter.get(
  "/",
  requireRoles(...MATCH_VIEW_ROLES),
  validateRequest({ query: matchListQuerySchema }),
  listAdminMatches,
);

adminMatchRouter.get(
  "/:matchId",
  requireRoles(...MATCH_VIEW_ROLES),
  validateRequest({ params: matchIdParamsSchema }),
  getAdminMatch,
);

adminMatchRouter.post(
  "/",
  requireRoles(...MATCH_WRITE_ROLES),
  validateRequest({ body: createMatchInputSchema }),
  createAdminMatch,
);

adminMatchRouter.patch(
  "/:matchId",
  requireRoles(...MATCH_WRITE_ROLES),
  validateRequest({ params: matchIdParamsSchema, body: updateMatchInputSchema }),
  updateAdminMatch,
);

adminMatchRouter.patch(
  "/:matchId/publication",
  requireRoles(...MATCH_WRITE_ROLES),
  validateRequest({ params: matchIdParamsSchema, body: publishMatchInputSchema }),
  publishAdminMatch,
);

adminMatchRouter.patch(
  "/:matchId/status",
  requireRoles(...MATCH_WRITE_ROLES),
  validateRequest({ params: matchIdParamsSchema, body: updateMatchStatusInputSchema }),
  updateAdminMatchStatus,
);

adminMatchRouter.patch(
  "/:matchId/result",
  requireRoles(...MATCH_WRITE_ROLES),
  validateRequest({ params: matchIdParamsSchema, body: updateMatchResultInputSchema }),
  updateAdminMatchResult,
);

adminMatchRouter.delete(
  "/:matchId",
  requireRoles(...MATCH_WRITE_ROLES),
  validateRequest({ params: matchIdParamsSchema, body: deleteMatchInputSchema }),
  deleteAdminMatch,
);

const publicMatchRouter = Router();
publicMatchRouter.get("/:matchPublicId/events", validateRequest({ params: matchPublicIdParamsSchema, query: z.object({}).strict() }), getPublicMatchEvents);

publicMatchRouter.get("/", validateRequest({ query: matchListQuerySchema }), listPublicMatchResponses);

publicMatchRouter.get(
  "/:matchPublicId",
  validateRequest({ params: matchPublicIdParamsSchema }),
  getPublicMatch,
);

export { publicMatchRouter };

export default adminMatchRouter;
