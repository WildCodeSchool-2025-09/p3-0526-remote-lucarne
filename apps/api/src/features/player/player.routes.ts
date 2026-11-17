import { Router } from "express";
import { getPhoto } from "../upload/upload.controller";
import { authenticate } from "../../middlewares/authenticate";
import { requireRoles } from "../../middlewares/requireRoles";
import { validateRequest } from "../../middlewares/validateRequest";
import {
  createPlayerAssignmentInputSchema,
  createPlayerInputSchema,
  deletePlayerBodySchema,
  playerAssignmentParamsSchema,
  playerIdParamsSchema,
  playerListQuerySchema,
  updatePlayerAssignmentInputSchema,
  updatePlayerInputSchema,
} from "@lucarne/shared";
import {
  activatePlayer,
  createPlayer,
  createPlayerAssignment,
  deactivatePlayer,
  deletePlayer,
  getPlayer,
  listPlayers,
  updatePlayer,
  updatePlayerAssignment,
} from "./player.controller";
import {
  PLAYER_DELETE_ROLES,
  PLAYER_VIEW_ROLES,
  PLAYER_WRITE_ROLES,
} from "./player.permissions";

const playerRouter = Router();

// Keep permanent URLs of photos uploaded before the shared upload endpoint.
playerRouter.get("/photos/:photoId", getPhoto);

playerRouter.get(
  "/",
  authenticate,
  requireRoles(...PLAYER_VIEW_ROLES),
  validateRequest({ query: playerListQuerySchema }),
  listPlayers,
);

playerRouter.get(
  "/:playerId",
  authenticate,
  requireRoles(...PLAYER_VIEW_ROLES),
  validateRequest({ params: playerIdParamsSchema }),
  getPlayer,
);

playerRouter.post(
  "/",
  authenticate,
  requireRoles(...PLAYER_WRITE_ROLES),
  validateRequest({ body: createPlayerInputSchema }),
  createPlayer,
);

playerRouter.post(
  "/:playerId/assignments",
  authenticate,
  requireRoles(...PLAYER_WRITE_ROLES),
  validateRequest({
    params: playerIdParamsSchema,
    body: createPlayerAssignmentInputSchema,
  }),
  createPlayerAssignment,
);

playerRouter.patch(
  "/:playerId",
  authenticate,
  requireRoles(...PLAYER_WRITE_ROLES),
  validateRequest({ params: playerIdParamsSchema, body: updatePlayerInputSchema }),
  updatePlayer,
);

playerRouter.post(
  "/:playerId/deactivate",
  authenticate,
  requireRoles(...PLAYER_WRITE_ROLES),
  validateRequest({ params: playerIdParamsSchema }),
  deactivatePlayer,
);

playerRouter.post(
  "/:playerId/activate",
  authenticate,
  requireRoles(...PLAYER_WRITE_ROLES),
  validateRequest({ params: playerIdParamsSchema }),
  activatePlayer,
);

playerRouter.delete(
  "/:playerId",
  authenticate,
  requireRoles(...PLAYER_DELETE_ROLES),
  validateRequest({ params: playerIdParamsSchema, body: deletePlayerBodySchema }),
  deletePlayer,
);

playerRouter.patch(
  "/:playerId/assignments/:assignmentId",
  authenticate,
  requireRoles(...PLAYER_WRITE_ROLES),
  validateRequest({
    params: playerAssignmentParamsSchema,
    body: updatePlayerAssignmentInputSchema,
  }),
  updatePlayerAssignment,
);

export default playerRouter;
