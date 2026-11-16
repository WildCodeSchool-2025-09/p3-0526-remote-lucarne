import { publicSearchResponseSchema } from "@lucarne/shared";
import type { PublicSearchQuery } from "@lucarne/shared";
import { httpClient } from "../lib/httpClient";

export const searchPublicResources = async (query: PublicSearchQuery) => publicSearchResponseSchema.parse(await httpClient.get<unknown>("/public/search", { query }));
