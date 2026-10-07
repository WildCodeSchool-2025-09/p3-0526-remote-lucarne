import type { PaginatedResponse } from "./pagination.types";
import type { z } from "zod";
import type { assignLeagueSeasonInputSchema } from "../schemas/season.schema";

type AssignLeagueSeasonInput = z.infer<typeof assignLeagueSeasonInputSchema>;

type SeasonStatus = "CURRENT" | "INACTIVE";
type SeasonStatusFilter = "ALL" | SeasonStatus;
type SeasonSortField = "name" | "startDate" | "endDate" | "createdAt";
type SeasonSortDirection = "asc" | "desc";

type Season = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  version: number;
  createdAt: string;
};

type SeasonLeague = {
  id: string;
  name: string;
  country: string;
};

type LeagueSeason = {
  id: string;
  leagueId: string;
  seasonId: string;
  isCurrent: boolean;
  /** Null for existing associations whose configuration has not been specified. */
  matchdayCount: number | null;
  matchesPerMatchday: number | null;
  league: SeasonLeague;
};

type SeasonListItem = Season & {
  leagueSeasons: LeagueSeason[];
};

type SeasonParticipatingTeam = {
  id: string;
  name: string;
  logoUrl: string | null;
  status: "REGISTERED" | "WITHDRAWN";
  registrationAt: string;
  points: number;
  rank: number | null;
  scheduledMatchCount: number;
};

type SeasonMatchday = {
  id: string;
  number: number;
  name: string | null;
  startDate: string | null;
  endDate: string | null;
  matchCount: number;
};

type LeagueSeasonDetail = LeagueSeason & {
  participatingTeams: SeasonParticipatingTeam[];
  matchdays: SeasonMatchday[];
};

type SeasonDetail = Season & {
  leagueSeasons: LeagueSeasonDetail[];
};

type CreateSeasonInput = {
  name: string;
  startDate: string;
  endDate: string;
};

type UpdateSeasonInput = Partial<CreateSeasonInput> & {
  version: number;
};

type ListSeasonsParams = {
  page?: number;
  pageSize?: 20;
  leagueId?: string;
  search?: string;
  sortBy?: SeasonSortField;
  sortOrder?: SeasonSortDirection;
};

type PaginatedSeasonsResponse = PaginatedResponse<SeasonListItem>;

type LeagueSeasonListItem = LeagueSeason & {
  season: Season;
  dependencyCounts: { matchdays: number; participations: number };
};
type PaginatedLeagueSeasonsResponse = PaginatedResponse<LeagueSeasonListItem>;
type ListLeagueSeasonsParams = Omit<ListSeasonsParams, "leagueId">;

export type {
  AssignLeagueSeasonInput,
  LeagueSeasonListItem,
  PaginatedLeagueSeasonsResponse,
  ListLeagueSeasonsParams,
  LeagueSeason,
  LeagueSeasonDetail,
  CreateSeasonInput,
  ListSeasonsParams,
  PaginatedSeasonsResponse,
  Season,
  SeasonDetail,
  SeasonLeague,
  SeasonListItem,
  SeasonMatchday,
  SeasonParticipatingTeam,
  SeasonSortField,
  SeasonStatus,
  SeasonStatusFilter,
  SeasonSortDirection,
  UpdateSeasonInput,
};
