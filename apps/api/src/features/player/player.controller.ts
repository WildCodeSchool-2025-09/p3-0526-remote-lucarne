import type { RequestHandler } from "express";
import type { CreatePlayerAssignmentInput, CreatePlayerInput, ListPlayersParams, PaginatedPlayersResponse, PlayerDetail, UpdatePlayerInput } from "@lucarne/shared";
import { asyncHandler } from "../../utils/asyncHandler";
import { activatePlayerService, createPlayerAssignmentService, createPlayerService, deactivatePlayerService, deletePlayerService, getPlayerService, listPlayersService, updatePlayerService } from "./player.service";

const createPlayer: RequestHandler<Record<string, never>, PlayerDetail, CreatePlayerInput> = asyncHandler(async (request, response) => {
  response.status(201).json(await createPlayerService(request.body));
});
const createPlayerAssignment: RequestHandler<{ playerId: string }, PlayerDetail, CreatePlayerAssignmentInput> = asyncHandler(async (request, response) => {
  response.status(201).json(await createPlayerAssignmentService(request.params.playerId, request.body));
});
const listPlayers: RequestHandler<Record<string, never>, PaginatedPlayersResponse, never, ListPlayersParams> = asyncHandler(async (request, response) => {
  const result = await listPlayersService(request.query);
  const page = request.query.page ?? 1;
  const pageSize = request.query.pageSize ?? 20;
  response.json({ data: result.data, pagination: { page, pageSize, totalItems: result.totalItems, totalPages: Math.ceil(result.totalItems / pageSize) } });
});
const getPlayer: RequestHandler<{ playerId: string }, PlayerDetail> = asyncHandler(async (request, response) => {
  response.json(await getPlayerService(request.params.playerId));
});
const updatePlayer: RequestHandler<{ playerId: string }, PlayerDetail, UpdatePlayerInput> = asyncHandler(async (request, response) => {
  response.json(await updatePlayerService(request.params.playerId, request.body));
});
const deactivatePlayer: RequestHandler<{ playerId: string }, PlayerDetail> = asyncHandler(async (request, response) => {
  response.json(await deactivatePlayerService(request.params.playerId));
});
const activatePlayer: RequestHandler<{ playerId: string }, PlayerDetail> = asyncHandler(async (request, response) => {
  response.json(await activatePlayerService(request.params.playerId));
});
const deletePlayer: RequestHandler<{ playerId: string }> = asyncHandler(async (request, response) => {
  await deletePlayerService(request.params.playerId, request.user!.role);
  response.status(204).send();
});
export { activatePlayer, createPlayer, createPlayerAssignment, deactivatePlayer, deletePlayer, getPlayer, listPlayers, updatePlayer };
