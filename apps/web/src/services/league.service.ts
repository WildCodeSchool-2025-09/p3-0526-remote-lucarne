import type {
  CreateLeagueInput,
  League,
  ListLeaguesParams,
  PaginatedLeaguesResponse,
} from "@lucarne/shared";
import { httpClient } from "../lib/httpClient";

async function createLeague(input: CreateLeagueInput): Promise<League> {
  const { country, isActive, logoUrl, name } = input;

  return httpClient.post<League>("/leagues", {
    json: { country, isActive, logoUrl, name },
  });
}

async function listLeagues(params: ListLeaguesParams): Promise<PaginatedLeaguesResponse> {
  const { countries, page, pageSize, search, sortBy, sortOrder, status } = params;

  return httpClient.get<PaginatedLeaguesResponse>("/leagues", {
    query: { countries, page, pageSize, search, sortBy, sortOrder, status },
  });
}

async function listLeagueCountries(): Promise<string[]> {
  return httpClient.get<string[]>("/leagues/countries");
}

async function getLeague(id: string): Promise<League> {
  return httpClient.get<League>(`/leagues/${id}`);
}

async function deleteLeague(id: string): Promise<void> {
  await httpClient.delete<void>(`/leagues/${id}`);
}

async function activateLeague(id: string): Promise<League> {
  return httpClient.patch<League>(`/leagues/${id}/activate`);
}

export { activateLeague, createLeague, deleteLeague, getLeague, listLeagueCountries, listLeagues };
