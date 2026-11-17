import type { TeamRoster } from "@lucarne/shared";
import type { CreateTeamInput, ListTeamsParams, PaginatedTeamsResponse, Team, TeamDeletionPreview, UpdateTeamInput } from "@lucarne/shared";
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
const getTeamDeletionPreview = (id: string) => httpClient.get<TeamDeletionPreview>(`/teams/${id}/deletion-preview`);
async function deleteTeam(id: string): Promise<void> { await httpClient.delete<void>(`/teams/${id}`, { json: { confirm: true } }); }

const getTeamRoster = (id: string) => httpClient.get<TeamRoster>(`/teams/${id}/roster`);
export { getTeamRoster, createTeam, deleteTeam, getTeam, getTeamDeletionPreview, listTeams, updateTeam };
