import {
  MATCH_TIME_ZONE,
  matchListQuerySchema,
  type AdminMatch,
  type CreateMatchInput,
  type DeleteMatchInput,
  type ListMatchesParams,
  type PaginatedAdminMatchesResponse,
  type PaginatedPublicMatchesResponse,
  type PublicMatch,
  type PublishMatchInput,
  type UpdateMatchInput,
  type UpdateMatchResultInput,
  type UpdateMatchStatusInput,
} from "@lucarne/shared";
import type { RequestHandler } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import type { MatchRecord, PublicMatchRecord } from "./match.repository";
import {
  createMatchService,
  deleteMatchService,
  getMatchService,
  getPublicMatchService,
  listMatchesService,
  listPublicMatchesService,
  toMatchProgramming,
  publishMatchService,
  updateMatchResultService,
  updateMatchService,
  updateMatchStatusService,
} from "./match.service";

const toPublicMatch = (match: PublicMatchRecord): PublicMatch => {
  if (!match.homeTeam || !match.awayTeam || !match.matchDate || !match.startTime)
    throw new Error("Incomplete published match");
  const common = {
    matchPublicId: match.matchPublicId,
    league: match.matchday.leagueSeason.league,
    season: match.matchday.leagueSeason.season,
    matchday: { id: match.matchday.id, number: match.matchday.number, name: match.matchday.name },
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    matchDate: match.matchDate.toISOString().slice(0, 10),
    startTime: match.startTime.toISOString().slice(11, 16),
    timeZone: MATCH_TIME_ZONE,
    stadium: match.stadium,
  };
  if (match.status === "COMPLETED") {
    if (match.homeScore === null || match.awayScore === null)
      throw new Error("Incomplete completed match result");
    return {
      ...common,
      status: "COMPLETED",
      result: { homeScore: match.homeScore, awayScore: match.awayScore },
    };
  }
  if (match.status !== "SCHEDULED" && match.status !== "IN_PROGRESS")
    throw new Error("Unknown match status");
  return {
    ...common,
    status: match.status,
    result: { homeScore: match.homeScore, awayScore: match.awayScore },
  };
};

const listPublicMatchResponses: RequestHandler<Record<string, never>, PaginatedPublicMatchesResponse, never, ListMatchesParams> = asyncHandler(async (request, response) => {
  const query = matchListQuerySchema.parse(request.query);
  const { data, totalItems } = await listPublicMatchesService(query);
  const { page, pageSize } = query;
  response.json({
    data: data.map(toPublicMatch),
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / pageSize),
    },
  });
});

const getPublicMatch: RequestHandler<{ matchPublicId: string }, PublicMatch> = asyncHandler(async (request, response) => {
  response.json(toPublicMatch(await getPublicMatchService(request.params.matchPublicId)));
});

const toAdminMatch = (match: MatchRecord): AdminMatch => {
  const common = {
    id: match.id,
    matchPublicId: match.matchPublicId,
    leagueSeasonId: match.matchday.leagueSeasonId,
    leagueId: match.matchday.leagueSeason.leagueId,
    seasonId: match.matchday.leagueSeason.seasonId,
    version: match.version,
    isActive: match.isActive,
    createdAt: match.createdAt.toISOString(),
    timeZone: MATCH_TIME_ZONE,
  };
  const values = toMatchProgramming(match);
  if (!match.isPublished)
    return {
      ...common,
      ...values,
      isPublished: false,
      status: "SCHEDULED",
      result: { homeScore: null, awayScore: null },
    };
  if (!values.homeTeamId || !values.awayTeamId || !values.matchDate || !values.startTime)
    throw new Error("Incomplete published match");
  const published = {
    ...common,
    ...values,
    homeTeamId: values.homeTeamId,
    awayTeamId: values.awayTeamId,
    matchDate: values.matchDate,
    startTime: values.startTime,
    isPublished: true as const,
  };
  if (match.status === "COMPLETED") {
    if (match.homeScore === null || match.awayScore === null)
      throw new Error("Incomplete completed match result");
    return {
      ...published,
      status: "COMPLETED",
      result: { homeScore: match.homeScore, awayScore: match.awayScore },
    };
  }
  if (match.status !== "SCHEDULED" && match.status !== "IN_PROGRESS")
    throw new Error("Unknown match status");
  return {
    ...published,
    status: match.status,
    result: { homeScore: match.homeScore, awayScore: match.awayScore },
  };
};

const listAdminMatches: RequestHandler<Record<string, never>, PaginatedAdminMatchesResponse, never, ListMatchesParams> = asyncHandler(async (request, response) => {
  const query = matchListQuerySchema.parse(request.query);
  const { data, totalItems } = await listMatchesService(query);
  const { page, pageSize } = query;
  response.json({
    data: data.map(toAdminMatch),
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / pageSize),
    },
  });
});

const getAdminMatch: RequestHandler<{ matchId: string }, AdminMatch> = asyncHandler(async (request, response) => {
  response.json(toAdminMatch(await getMatchService(request.params.matchId)));
});

const createAdminMatch: RequestHandler<Record<string, never>, AdminMatch, CreateMatchInput> = asyncHandler(async (request, response) => {
  response.status(201).json(toAdminMatch(await createMatchService(request.body)));
});

const updateAdminMatch: RequestHandler<{ matchId: string }, AdminMatch, UpdateMatchInput> = asyncHandler(async (request, response) => {
  response.json(toAdminMatch(await updateMatchService(request.params.matchId, request.body)));
});

const publishAdminMatch: RequestHandler<{ matchId: string }, AdminMatch, PublishMatchInput> = asyncHandler(async (request, response) => {
  response.json(toAdminMatch(await publishMatchService(request.params.matchId, request.body)));
});

const updateAdminMatchStatus: RequestHandler<{ matchId: string }, AdminMatch, UpdateMatchStatusInput> = asyncHandler(async (request, response) => {
  response.json(toAdminMatch(await updateMatchStatusService(request.params.matchId, request.body)));
});

const updateAdminMatchResult: RequestHandler<{ matchId: string }, AdminMatch, UpdateMatchResultInput> = asyncHandler(async (request, response) => {
  response.json(toAdminMatch(await updateMatchResultService(request.params.matchId, request.body)));
});

const deleteAdminMatch: RequestHandler<{ matchId: string }, never, DeleteMatchInput> = asyncHandler(async (request, response) => {
  await deleteMatchService(request.params.matchId, request.body);
  response.status(204).send();
});

export {
  createAdminMatch,
  deleteAdminMatch,
  getAdminMatch,
  getPublicMatch,
  listAdminMatches,
  listPublicMatchResponses,
  publishAdminMatch,
  toAdminMatch,
  toPublicMatch,
  updateAdminMatch,
  updateAdminMatchResult,
  updateAdminMatchStatus,
};
