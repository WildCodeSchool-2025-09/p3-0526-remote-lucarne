import type { RequestHandler } from "express";
import { publicPlayerProfileSchema, publicPlayerQuerySchema } from "@lucarne/shared";
import { asyncHandler } from "../../utils/asyncHandler";
import { publicPagination } from "../../utils/publicPagination";
import { getPublicPlayerService, listPublicPlayersService } from "./player.public.service";

const toPublicPlayer = ({ teamPlayers, ...player }: Awaited<ReturnType<typeof getPublicPlayerService>>) => {
  const assignment = teamPlayers[0];
  if (!assignment) throw new Error("Missing visible player assignment");
  return publicPlayerProfileSchema.parse({ ...player, shirtNumber: assignment.shirtNumber, team: assignment.team });
};
export const listPublicPlayerResponses: RequestHandler = asyncHandler(async (request, response) => {
  const query = publicPlayerQuerySchema.parse(request.query);
  const [players, total] = await listPublicPlayersService(query);
  response.json(publicPagination(players.map(toPublicPlayer), total, query));
});
export const getPublicPlayerResponse: RequestHandler<{ playerId: string }> = asyncHandler(async (request, response) => {
  response.json(toPublicPlayer(await getPublicPlayerService(request.params.playerId)));
});
