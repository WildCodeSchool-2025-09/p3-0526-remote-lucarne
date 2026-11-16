import { publicPlayerListResponseSchema, publicPlayerProfileSchema } from "@lucarne/shared";
import type { PublicPlayerQuery } from "@lucarne/shared";
import { httpClient } from "../lib/httpClient";

export const listPublicPlayers = async (query: PublicPlayerQuery) => publicPlayerListResponseSchema.parse(await httpClient.get<unknown>("/public/players", { query }));
export const getPublicPlayer = async (id: string) => publicPlayerProfileSchema.parse(await httpClient.get<unknown>(`/public/players/${encodeURIComponent(id)}`));
