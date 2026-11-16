import type { RequestHandler } from "express";
import { publicTeamDetailSchema, publicTeamListResponseSchema, publicTeamQuerySchema, publicTeamRosterSchema } from "@lucarne/shared";
import { asyncHandler } from "../../utils/asyncHandler";
import { publicPagination } from "../../utils/publicPagination";
import { getPublicTeamRosterService, getPublicTeamService, listPublicTeamsService } from "./team.public.service";

export const listPublicTeamResponses: RequestHandler = asyncHandler(async (request, response) => {
  const query = publicTeamQuerySchema.parse(request.query);
  const [data, total] = await listPublicTeamsService(query);
  response.json(publicTeamListResponseSchema.parse(publicPagination(data, total, query)));
});
export const getPublicTeamResponse: RequestHandler<{ teamId: string }> = asyncHandler(async (request, response) => {
  const { participations, createdAt, ...team } = await getPublicTeamService(request.params.teamId);
  response.json(publicTeamDetailSchema.parse({ ...team, createdAt: createdAt.toISOString(), editions: participations.map(({ leagueSeason }) => ({
    ...leagueSeason, season: { ...leagueSeason.season, startDate: leagueSeason.season.startDate.toISOString().slice(0, 10), endDate: leagueSeason.season.endDate.toISOString().slice(0, 10) },
  })) }));
});
export const getPublicTeamRosterResponse: RequestHandler<{ teamId: string }> = asyncHandler(async (request, response) => {
  const { date, roster } = await getPublicTeamRosterService(request.params.teamId);
  response.json(publicTeamRosterSchema.parse({ date: date.toISOString().slice(0, 10),
    players: roster.players.map(({ player, shirtNumber }) => ({ ...player, shirtNumber })),
    staffMembers: roster.staffMembers.map(({ staffMember, jobTitle }) => ({ ...staffMember, jobTitle })),
  }));
});
