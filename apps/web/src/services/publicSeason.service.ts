import { publicMatchdayDetailSchema, publicMatchdayListResponseSchema, publicSeasonDetailSchema } from "@lucarne/shared";
import { httpClient } from "../lib/httpClient";

export const getPublicSeason = async (id: string) => publicSeasonDetailSchema.parse(await httpClient.get<unknown>(`/public/seasons/${encodeURIComponent(id)}`));
export const getPublicMatchday = async (id: string) => publicMatchdayDetailSchema.parse(await httpClient.get<unknown>(`/public/matchdays/${encodeURIComponent(id)}`));
export const listPublicMatchdays = async (slug: string, seasonId: string) => publicMatchdayListResponseSchema.parse(await httpClient.get<unknown>(`/leagues/by-slug/${encodeURIComponent(slug)}/seasons/${encodeURIComponent(seasonId)}/matchdays`));
