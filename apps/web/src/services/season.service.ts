import type {
  AssignLeagueSeasonInput,
  CreateSeasonInput,
  LeagueSeason,
  ListLeagueSeasonsParams,
  ListSeasonsParams,
  PaginatedSeasonsResponse,
  PaginatedLeagueSeasonsResponse,
  Season,
  SeasonDetail,
  UpdateSeasonInput,
} from "@lucarne/shared";
import { httpClient } from "../lib/httpClient";

async function listSeasons(params: ListSeasonsParams): Promise<PaginatedSeasonsResponse> {
  const { leagueId, page, pageSize, search, sortBy, sortOrder } = params;

  return httpClient.get<PaginatedSeasonsResponse>("/seasons", {
    query: { leagueId, page, pageSize, search, sortBy, sortOrder },
  });
}

async function getSeason(seasonId: string): Promise<SeasonDetail> {
  return httpClient.get<SeasonDetail>(`/seasons/${seasonId}`);
}

async function createSeason(input: CreateSeasonInput): Promise<Season> {
  return httpClient.post<Season>("/seasons", { json: input });
}

async function updateSeason(seasonId: string, input: UpdateSeasonInput): Promise<Season> {
  return httpClient.patch<Season>(`/seasons/${seasonId}`, { json: input });
}

async function setCurrentSeason(leagueId: string, seasonId: string): Promise<LeagueSeason> {
  return httpClient.patch<LeagueSeason>(`/leagues/${leagueId}/seasons/${seasonId}/current`);
}

async function listLeagueSeasons(leagueId: string, params: ListLeagueSeasonsParams): Promise<PaginatedLeagueSeasonsResponse> {
  const { page, pageSize, search, sortOrder } = params;
  return httpClient.get<PaginatedLeagueSeasonsResponse>(`/leagues/${leagueId}/seasons`, { query: { page, pageSize, search, sortOrder } });
}

async function assignLeagueSeason(leagueId: string, input: AssignLeagueSeasonInput): Promise<LeagueSeason> {
  return httpClient.post<LeagueSeason>(`/leagues/${leagueId}/seasons`, { json: input });
}

async function removeLeagueSeason(leagueId: string, seasonId: string): Promise<void> {
  await httpClient.delete<void>(`/leagues/${leagueId}/seasons/${seasonId}`);
}

async function deleteSeason(seasonId: string): Promise<void> {
  await httpClient.delete<void>(`/seasons/${seasonId}`, { json: { confirm: true } });
}

export { assignLeagueSeason, createSeason, deleteSeason, getSeason, listLeagueSeasons, listSeasons, removeLeagueSeason, setCurrentSeason, updateSeason };
