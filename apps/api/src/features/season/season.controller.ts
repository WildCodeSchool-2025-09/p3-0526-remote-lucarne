import type { RequestHandler } from "express";
import type { CreateSeasonInput, Season, SeasonDetail, ListSeasonsParams, PaginatedSeasonsResponse, SeasonParticipatingTeam, UpdateSeasonInput } from "@lucarne/shared";
import { asyncHandler } from "../../utils/asyncHandler";
import { createSeasonService, getSeasonService, listSeasonsService, setCurrentSeasonService, updateSeasonService } from "./season.service";

const toDateOnly = (date: Date): string => date.toISOString().slice(0, 10);

const toSeasonResponse = (season: {
  id: string;
  leagueId: string;
  name: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  version: number;
  createdAt: Date;
}): Season => ({
  id: season.id,
  leagueId: season.leagueId,
  name: season.name,
  startDate: toDateOnly(season.startDate),
  endDate: toDateOnly(season.endDate),
  status: season.isActive ? "CURRENT" : "INACTIVE",
  version: season.version,
  createdAt: season.createdAt.toISOString(),
});

const toSeasonDetailResponse = (season: Awaited<ReturnType<typeof getSeasonService>>): SeasonDetail => ({
  ...toSeasonResponse(season),
  league: season.league,
  participatingTeams: season.participations.map((participation) => ({
    ...participation.team,
    registrationAt: participation.registrationAt.toISOString(),
    points: participation.points,
    rank: participation.rank,
    status: participation.status as SeasonParticipatingTeam["status"],
    scheduledMatchCount: participation.scheduledMatchCount,
  })),
  matchdays: season.matchdays.map((matchday) => ({
    id: matchday.id,
    number: matchday.number,
    name: matchday.name,
    startDate: matchday.startDate == null ? null : toDateOnly(matchday.startDate),
    endDate: matchday.endDate == null ? null : toDateOnly(matchday.endDate),
    matchCount: matchday._count.gameMatches,
  })),
});

const createSeason: RequestHandler<
  { leagueId: string },
  Season,
  CreateSeasonInput
> = asyncHandler(async (request, response) => {
  const season = await createSeasonService(request.params.leagueId, request.body);

  response.status(201).json(toSeasonResponse(season));
});

const setCurrentSeason: RequestHandler<
  { leagueId: string; seasonId: string },
  Season
> = asyncHandler(async (request, response) => {
  const season = await setCurrentSeasonService(request.params.leagueId, request.params.seasonId);

  response.json(toSeasonResponse(season));
});

const updateSeason: RequestHandler<
  { seasonId: string },
  Season,
  UpdateSeasonInput
> = asyncHandler(async (request, response) => {
  const season = await updateSeasonService(request.params.seasonId, request.body);

  response.json(toSeasonResponse(season));
});

const listSeasons: RequestHandler<
  Record<string, never>,
  PaginatedSeasonsResponse,
  never,
  ListSeasonsParams
> = asyncHandler(async (request, response) => {
  const result = await listSeasonsService(request.query);
  const page = request.query.page ?? 1;
  const pageSize = request.query.pageSize ?? 20;

  response.json({
    data: result.data.map(toSeasonResponse),
    pagination: {
      page,
      pageSize,
      totalItems: result.totalItems,
      totalPages: Math.ceil(result.totalItems / pageSize),
    },
  });
});

const getSeason: RequestHandler<{ seasonId: string }, SeasonDetail> = asyncHandler(async (request, response) => {
  response.json(toSeasonDetailResponse(await getSeasonService(request.params.seasonId)));
});

export { createSeason, getSeason, listSeasons, setCurrentSeason, toDateOnly, toSeasonDetailResponse, toSeasonResponse, updateSeason };
