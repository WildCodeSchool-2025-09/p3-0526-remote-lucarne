import { publicLeagueStatisticsSchema, publicMatchEventsSchema, publicPlayerStatisticsSchema, publicStandingsSchema, publicTeamStatisticsSchema } from "@lucarne/shared";
import type { PublicStatisticsEditionQuery, PublicStatisticsQuery } from "@lucarne/shared";
import { httpClient } from "../lib/httpClient";

const editionPath = (slug: string, seasonId: string) => `/leagues/by-slug/${encodeURIComponent(slug)}/seasons/${encodeURIComponent(seasonId)}`;
export const getPublicStandings = async (slug: string, seasonId: string) => publicStandingsSchema.parse(await httpClient.get<unknown>(`${editionPath(slug, seasonId)}/standings`));
export const getPublicLeagueStatistics = async (slug: string, seasonId: string, query: PublicStatisticsQuery) => publicLeagueStatisticsSchema.parse(await httpClient.get<unknown>(`${editionPath(slug, seasonId)}/statistics`, { query }));
export const getPublicTeamStatistics = async (id: string, query: PublicStatisticsEditionQuery) => publicTeamStatisticsSchema.parse(await httpClient.get<unknown>(`/public/teams/${encodeURIComponent(id)}/statistics`, { query }));
export const getPublicPlayerStatistics = async (id: string, query: PublicStatisticsEditionQuery) => publicPlayerStatisticsSchema.parse(await httpClient.get<unknown>(`/public/players/${encodeURIComponent(id)}/statistics`, { query }));
export const getPublicMatchEvents = async (id: string) => publicMatchEventsSchema.parse(await httpClient.get<unknown>(`/matches/${encodeURIComponent(id)}/events`));
