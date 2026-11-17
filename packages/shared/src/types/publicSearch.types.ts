import type { z } from "zod";
import type { publicSearchCountsSchema, publicSearchQuerySchema, publicSearchResponseSchema, publicSearchResultSchema, publicSearchTypeSchema } from "../schemas/publicSearch.schema";

export type PublicSearchType = z.infer<typeof publicSearchTypeSchema>;
export type PublicSearchQuery = z.infer<typeof publicSearchQuerySchema>;
export type PublicSearchResult = z.infer<typeof publicSearchResultSchema>;
export type PublicSearchCounts = z.infer<typeof publicSearchCountsSchema>;
export type PublicSearchResponse = z.infer<typeof publicSearchResponseSchema>;
