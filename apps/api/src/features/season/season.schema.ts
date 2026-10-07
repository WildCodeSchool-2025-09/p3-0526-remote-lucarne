import { assignLeagueSeasonInputSchema, createSeasonInputSchema, deleteSeasonInputSchema, leagueIdParamsSchema, leagueSeasonParamsSchema, listLeagueSeasonsQuerySchema, seasonIdParamsSchema, seasonListQuerySchema, updateSeasonInputSchema } from "@lucarne/shared";
import type { CreateSeasonInput, ListLeagueSeasonsParams, ListSeasonsParams, UpdateSeasonInput } from "@lucarne/shared";

const createSeasonBodySchema = createSeasonInputSchema;
const listSeasonsQuerySchema = seasonListQuerySchema;
const updateSeasonBodySchema = updateSeasonInputSchema;

export { assignLeagueSeasonInputSchema, createSeasonBodySchema, deleteSeasonInputSchema, leagueIdParamsSchema, leagueSeasonParamsSchema, listLeagueSeasonsQuerySchema, listSeasonsQuerySchema, seasonIdParamsSchema, updateSeasonBodySchema };
export type { CreateSeasonInput, ListLeagueSeasonsParams, ListSeasonsParams, UpdateSeasonInput };
