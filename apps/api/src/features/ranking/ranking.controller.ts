import type { RequestHandler } from "express";
import { publicLeagueStatisticsSchema, publicMatchEventsSchema, publicPlayerStatisticsSchema, publicStandingsSchema, publicStatisticsEditionQuerySchema, publicStatisticsQuerySchema, publicTeamStatisticsSchema } from "@lucarne/shared";
import { asyncHandler } from "../../utils/asyncHandler";
import { getPublicLeagueStatisticsService, getPublicMatchEventsService, getPublicPlayerStatisticsService, getPublicStandingsService, getPublicTeamStatisticsService } from "./ranking.service";

export const getPublicStandings: RequestHandler<{ leagueSlug: string; seasonId: string }> = asyncHandler(async (request, response) => {
  response.json(publicStandingsSchema.parse(await getPublicStandingsService(request.params.leagueSlug, request.params.seasonId)));
});
export const getPublicLeagueStatistics: RequestHandler<{ leagueSlug: string; seasonId: string }> = asyncHandler(async (request, response) => {
  response.json(publicLeagueStatisticsSchema.parse(await getPublicLeagueStatisticsService(request.params.leagueSlug, request.params.seasonId, publicStatisticsQuerySchema.parse(request.query))));
});
export const getPublicTeamStatistics: RequestHandler<{ teamId: string }> = asyncHandler(async (request, response) => {
  response.json(publicTeamStatisticsSchema.parse(await getPublicTeamStatisticsService(request.params.teamId, publicStatisticsEditionQuerySchema.parse(request.query))));
});
export const getPublicPlayerStatistics: RequestHandler<{ playerId: string }> = asyncHandler(async (request, response) => {
  response.json(publicPlayerStatisticsSchema.parse(await getPublicPlayerStatisticsService(request.params.playerId, publicStatisticsEditionQuerySchema.parse(request.query))));
});
export const getPublicMatchEvents: RequestHandler<{ matchPublicId: string }> = asyncHandler(async (request, response) => {
  response.json(publicMatchEventsSchema.parse(await getPublicMatchEventsService(request.params.matchPublicId)));
});
