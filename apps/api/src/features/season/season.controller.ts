import type { RequestHandler } from "express";
import type { AssignLeagueSeasonInput, CreateSeasonInput, LeagueSeason, LeagueSeasonListItem, Season, SeasonDetail, SeasonListItem, ListLeagueSeasonsParams, ListSeasonsParams, PaginatedLeagueSeasonsResponse, PaginatedSeasonsResponse, SeasonParticipatingTeam, UpdateSeasonInput } from "@lucarne/shared";
import { asyncHandler } from "../../utils/asyncHandler";
import { createLeagueSeasonService, createSeasonService, deleteSeasonService, getSeasonService, listLeagueSeasonsService, listSeasonsService, removeLeagueSeasonService, setCurrentSeasonService, updateSeasonService } from "./season.service";

const toDateOnly = (date: Date): string => date.toISOString().slice(0, 10);

const toSeasonResponse = (season: {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  version: number;
  createdAt: Date;
}): Season => ({
  id: season.id,
  name: season.name,
  startDate: toDateOnly(season.startDate),
  endDate: toDateOnly(season.endDate),
  version: season.version,
  createdAt: season.createdAt.toISOString(),
});

const toLeagueSeasonResponse = (edition: {
  id: string; leagueId: string; seasonId: string; isCurrent: boolean; league: LeagueSeason["league"];
  matchdayCount: number | null; matchesPerMatchday: number | null;
}): LeagueSeason => ({
  id: edition.id, leagueId: edition.leagueId, seasonId: edition.seasonId,
  isCurrent: edition.isCurrent, league: edition.league,
  matchdayCount: edition.matchdayCount, matchesPerMatchday: edition.matchesPerMatchday,
});

const toSeasonDetailResponse = (season: Awaited<ReturnType<typeof getSeasonService>>): SeasonDetail => ({
  ...toSeasonResponse(season),
  leagueSeasons: season.leagueSeasons.map((edition) => ({
    ...toLeagueSeasonResponse(edition),
    participatingTeams: edition.participations.map((participation) => ({
      ...participation.team,
      registrationAt: participation.registrationAt.toISOString(),
      points: participation.points, rank: participation.rank,
      status: participation.status as SeasonParticipatingTeam["status"],
      scheduledMatchCount: participation.scheduledMatchCount,
    })),
    matchdays: edition.matchdays.map((matchday) => ({
      id: matchday.id, number: matchday.number, name: matchday.name,
      startDate: matchday.startDate == null ? null : toDateOnly(matchday.startDate),
      endDate: matchday.endDate == null ? null : toDateOnly(matchday.endDate),
      matchCount: matchday._count.gameMatches,
    })),
  })),
});

const toSeasonListItemResponse = (
  season: Awaited<ReturnType<typeof listSeasonsService>>["data"][number],
): SeasonListItem => ({
  ...toSeasonResponse(season),
  leagueSeasons: season.leagueSeasons.map(toLeagueSeasonResponse),
});

const createSeason: RequestHandler<
  Record<string, never>,
  Season,
  CreateSeasonInput
> = asyncHandler(async (request, response) => {
  const season = await createSeasonService(request.body);

  response.status(201).json(toSeasonResponse(season));
});

const setCurrentSeason: RequestHandler<
  { leagueId: string; seasonId: string },
  LeagueSeason
> = asyncHandler(async (request, response) => {
  const season = await setCurrentSeasonService(request.params.leagueId, request.params.seasonId);

  response.json(toLeagueSeasonResponse(season));
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
    data: result.data.map(toSeasonListItemResponse),
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

const deleteSeason: RequestHandler<{ seasonId: string }> = asyncHandler(async (request, response) => {
  await deleteSeasonService(request.params.seasonId);
  response.status(204).send();
});

const getLeagueSeasons: RequestHandler<{ leagueId: string }, PaginatedLeagueSeasonsResponse, never, ListLeagueSeasonsParams> = asyncHandler(async (request, response) => {
  const result = await listLeagueSeasonsService(request.params.leagueId, request.query);
  const page = request.query.page ?? 1;
  const pageSize = request.query.pageSize ?? 20;
  response.json({
    data: result.data.map((edition): LeagueSeasonListItem => ({
      ...toLeagueSeasonResponse(edition),
      season: toSeasonResponse(edition.season),
      dependencyCounts: { matchdays: edition._count.matchdays, participations: edition._count.participations },
    })),
    pagination: { page, pageSize, totalItems: result.totalItems, totalPages: Math.ceil(result.totalItems / pageSize) },
  });
});

const createLeagueSeason: RequestHandler<{ leagueId: string }, LeagueSeason, AssignLeagueSeasonInput> = asyncHandler(async (request, response) => {
  const edition = await createLeagueSeasonService(request.params.leagueId, request.body);
  response.status(201).json(toLeagueSeasonResponse(edition));
});

const deleteLeagueSeason: RequestHandler<{ leagueId: string; seasonId: string }> = asyncHandler(async (request, response) => {
  await removeLeagueSeasonService(request.params.leagueId, request.params.seasonId);
  response.status(204).send();
});

export { createLeagueSeason, createSeason, deleteLeagueSeason, deleteSeason, getLeagueSeasons, getSeason, listSeasons, setCurrentSeason, toDateOnly, toLeagueSeasonResponse, toSeasonDetailResponse, toSeasonListItemResponse, toSeasonResponse, updateSeason };
