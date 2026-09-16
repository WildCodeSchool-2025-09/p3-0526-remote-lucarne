import type { PaginatedResponse } from "./pagination.types";

type SeasonStatus = "CURRENT" | "INACTIVE";
type SeasonStatusFilter = "ALL" | SeasonStatus;
type SeasonSortField = "name" | "startDate" | "endDate" | "createdAt";
type SeasonSortDirection = "asc" | "desc";

type Season = {
  id: string;
  leagueId: string;
  name: string;
  startDate: string;
  endDate: string;
  status: SeasonStatus;
  version: number;
  createdAt: string;
};

type SeasonLeague = {
  id: string;
  name: string;
  country: string;
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

type SeasonDetail = Season & {
  league: SeasonLeague;
  participatingTeams: SeasonParticipatingTeam[];
  matchdays: SeasonMatchday[];
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
  status?: SeasonStatusFilter;
  sortBy?: SeasonSortField;
  sortOrder?: SeasonSortDirection;
};

type PaginatedSeasonsResponse = PaginatedResponse<Season>;

export type {
  CreateSeasonInput,
  ListSeasonsParams,
  PaginatedSeasonsResponse,
  Season,
  SeasonDetail,
  SeasonLeague,
  SeasonMatchday,
  SeasonParticipatingTeam,
  SeasonSortField,
  SeasonStatus,
  SeasonStatusFilter,
  SeasonSortDirection,
  UpdateSeasonInput,
};
