import type { CreateTeamInput, ListTeamsParams, PaginatedTeamsResponse, Team, UpdateTeamInput } from "@lucarne/shared";
import { httpClient } from "../lib/httpClient";

async function createTeam(input: CreateTeamInput): Promise<Team> {
  const { logoUrl, name, stadium } = input;

  return httpClient.post<Team>("/teams", {
    json: {
      logoUrl: logoUrl ?? null,
      name,
      stadium: stadium ?? null,
    },
  });
}

async function listTeams(params: ListTeamsParams): Promise<PaginatedTeamsResponse> { return httpClient.get<PaginatedTeamsResponse>("/teams", { query: params }); }
async function getTeam(id: string): Promise<Team> { return httpClient.get<Team>(`/teams/${id}`); }
async function updateTeam(id: string, input: UpdateTeamInput): Promise<Team> { return httpClient.patch<Team>(`/teams/${id}`, { json: input }); }

export { createTeam, getTeam, listTeams, updateTeam };
