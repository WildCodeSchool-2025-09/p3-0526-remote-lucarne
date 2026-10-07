import type { AdminMatch, CreateMatchInput, DeleteMatchInput, MatchListQuery, PaginatedAdminMatchesResponse, PaginatedPublicMatchesResponse, PublicMatch, PublishMatchInput, UpdateMatchInput, UpdateMatchResultInput, UpdateMatchStatusInput } from "@lucarne/shared";
import { httpClient } from "../lib/httpClient";

const base = "/admin/matches";
const listMatches = (params: MatchListQuery) => httpClient.get<PaginatedAdminMatchesResponse>(base, { query: params });
const getMatch = (id: string) => httpClient.get<AdminMatch>(`${base}/${id}`);
const createMatch = (input: CreateMatchInput) => httpClient.post<AdminMatch>(base, { json: input });
const updateMatch = (id: string, input: UpdateMatchInput) => httpClient.patch<AdminMatch>(`${base}/${id}`, { json: input });
const publishMatch = (id: string, input: PublishMatchInput) => httpClient.patch<AdminMatch>(`${base}/${id}/publication`, { json: input });
const updateMatchStatus = (id: string, input: UpdateMatchStatusInput) => httpClient.patch<AdminMatch>(`${base}/${id}/status`, { json: input });
const updateMatchResult = (id: string, input: UpdateMatchResultInput) => httpClient.patch<AdminMatch>(`${base}/${id}/result`, { json: input });
const deleteMatch = (id: string, input: DeleteMatchInput) => httpClient.delete<void>(`${base}/${id}`, { json: input });
const listPublicMatches = (params: MatchListQuery) => httpClient.get<PaginatedPublicMatchesResponse>("/matches", { query: params });
const getPublicMatch = (matchPublicId: string) => httpClient.get<PublicMatch>(`/matches/${matchPublicId}`);
export { createMatch, deleteMatch, getMatch, getPublicMatch, listMatches, listPublicMatches, publishMatch, updateMatch, updateMatchResult, updateMatchStatus };
