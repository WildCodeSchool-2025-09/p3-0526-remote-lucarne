import type { PaginatedResponse } from "./pagination.types";

interface CreateLeagueInput {
  name: string;
  country: string;
  logoUrl?: string;
  isActive?: boolean;
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
  createdAt: string;
}

type LeagueStatusFilter = "ALL" | LeagueStatus;
type LeagueSortField = "name";
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

interface LeaguePermissions {
  canView: boolean;
  canDelete: boolean;
}

type PaginatedLeaguesResponse = PaginatedResponse<League>;

export type {
  CountryFilterParams,
  CreateLeagueInput,
  League,
  LeaguePermissions,
  LeagueSearchParams,
  LeagueSortField,
  LeagueSortParams,
  LeagueStatus,
  LeagueStatusFilter,
  ListLeaguesParams,
  PaginatedLeaguesResponse,
  SortDirection,
};
