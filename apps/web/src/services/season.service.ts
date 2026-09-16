import type {
  CreateSeasonInput,
  ListSeasonsParams,
  PaginatedSeasonsResponse,
  Season,
  SeasonDetail,
  UpdateSeasonInput,
} from "@lucarne/shared";
import { httpClient } from "../lib/httpClient";

async function listSeasons(params: ListSeasonsParams): Promise<PaginatedSeasonsResponse> {
  const { leagueId, page, pageSize, search, sortBy, sortOrder, status } = params;

  return httpClient.get<PaginatedSeasonsResponse>("/seasons", {
    query: { leagueId, page, pageSize, search, sortBy, sortOrder, status },
  });
}

async function getSeason(seasonId: string): Promise<SeasonDetail> {
  return httpClient.get<SeasonDetail>(`/seasons/${seasonId}`);
}

async function createSeason(leagueId: string, input: CreateSeasonInput): Promise<Season> {
  return httpClient.post<Season>(`/leagues/${leagueId}/seasons`, { json: input });
}

async function updateSeason(seasonId: string, input: UpdateSeasonInput): Promise<Season> {
  return httpClient.patch<Season>(`/seasons/${seasonId}`, { json: input });
}

async function setCurrentSeason(leagueId: string, seasonId: string): Promise<Season> {
  return httpClient.patch<Season>(`/leagues/${leagueId}/seasons/${seasonId}/current`);
}

export { createSeason, getSeason, listSeasons, setCurrentSeason, updateSeason };
