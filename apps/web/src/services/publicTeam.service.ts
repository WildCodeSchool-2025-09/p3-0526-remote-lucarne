import { publicTeamDetailSchema, publicTeamListResponseSchema, publicTeamRosterSchema } from "@lucarne/shared";
import type { PublicTeamQuery } from "@lucarne/shared";
import { httpClient } from "../lib/httpClient";

export const listPublicTeams = async (query: PublicTeamQuery) => publicTeamListResponseSchema.parse(await httpClient.get<unknown>("/public/teams", { query }));
export const getPublicTeam = async (id: string) => publicTeamDetailSchema.parse(await httpClient.get<unknown>(`/public/teams/${encodeURIComponent(id)}`));
export const getPublicTeamRoster = async (id: string) => publicTeamRosterSchema.parse(await httpClient.get<unknown>(`/public/teams/${encodeURIComponent(id)}/roster`));
