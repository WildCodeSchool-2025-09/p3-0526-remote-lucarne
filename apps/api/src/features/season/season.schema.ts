import { createSeasonInputSchema, leagueIdParamsSchema, leagueSeasonParamsSchema, seasonIdParamsSchema, seasonListQuerySchema, updateSeasonInputSchema } from "@lucarne/shared";
import type { CreateSeasonInput, ListSeasonsParams, UpdateSeasonInput } from "@lucarne/shared";

const createSeasonBodySchema = createSeasonInputSchema;
const listSeasonsQuerySchema = seasonListQuerySchema;
const updateSeasonBodySchema = updateSeasonInputSchema;

export { createSeasonBodySchema, leagueIdParamsSchema, leagueSeasonParamsSchema, listSeasonsQuerySchema, seasonIdParamsSchema, updateSeasonBodySchema };
export type { CreateSeasonInput, ListSeasonsParams, UpdateSeasonInput };
