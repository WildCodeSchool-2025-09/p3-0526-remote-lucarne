import type { PaginatedResponse } from "./pagination.types";
import type { z } from "zod";
import type { publicLeagueDetailSchema, publicLeagueNavigationItemSchema, publicLeagueSeasonSchema, publicLeagueTeamSchema, publicLeagueTeamsQuerySchema, publicLeagueTeamsResponseSchema } from "../schemas/league.schema";

type PublicLeagueNavigationItem = z.infer<typeof publicLeagueNavigationItemSchema>;
type PublicLeagueDetail = z.infer<typeof publicLeagueDetailSchema>;
type PublicLeagueSeason = z.infer<typeof publicLeagueSeasonSchema>;
type PublicLeagueTeam = z.infer<typeof publicLeagueTeamSchema>;
type PublicLeagueTeamsQuery = z.infer<typeof publicLeagueTeamsQuerySchema>;
type PublicLeagueTeamsResponse = z.infer<typeof publicLeagueTeamsResponseSchema>;

interface CreateLeagueInput {
  name: string;
  country: string;
  logoUrl?: string;
  isActive?: boolean;
}

interface DeleteLeagueInput {
  confirm: true;
}

interface LeagueUpdateFields {
  name?: string;
  country?: string;
  logoUrl?: string | null;
  isActive?: boolean;
}

interface UpdateLeagueInput extends LeagueUpdateFields {
  version: number;
}

interface ConditionalLeagueUpdateInput {
  leagueId: string;
  expectedVersion: number;
  changes: LeagueUpdateFields;
}

type LeagueStatus = "ACTIVE" | "INACTIVE";

interface League {
  id: string;
  name: string;
  country: string;
  logoUrl: string | null;
  status?: LeagueStatus;
  /** @deprecated Creation still exposes the persistence field until that endpoint is migrated. */
  isActive?: boolean;
  version: number;
  createdAt: string;
}

type LeagueStatusFilter = "ALL" | LeagueStatus;
type LeagueSortField = "name" | "createdAt";
type SortDirection = "asc" | "desc";

interface LeagueSearchParams {
  search?: string;
}

interface CountryFilterParams {
  countries?: string[];
}

interface LeagueSortParams {
  sortBy?: LeagueSortField;
  sortOrder?: SortDirection;
}

interface ListLeaguesParams extends LeagueSearchParams, CountryFilterParams, LeagueSortParams {
  page?: number;
  pageSize?: 20;
  status?: LeagueStatusFilter;
}

type PaginatedLeaguesResponse = PaginatedResponse<League>;

export type {
  CountryFilterParams,
  ConditionalLeagueUpdateInput,
  CreateLeagueInput,
  DeleteLeagueInput,
  League,
  LeagueUpdateFields,
  LeagueSearchParams,
  LeagueSortField,
  LeagueSortParams,
  LeagueStatus,
  LeagueStatusFilter,
  ListLeaguesParams,
  PaginatedLeaguesResponse,
  PublicLeagueNavigationItem,
  PublicLeagueDetail,
  PublicLeagueSeason,
  PublicLeagueTeam,
  PublicLeagueTeamsQuery,
  PublicLeagueTeamsResponse,
  SortDirection,
  UpdateLeagueInput,
};
