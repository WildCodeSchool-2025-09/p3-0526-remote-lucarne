import {
  createLeagueInputSchema,
  leagueListQuerySchema,
  updateLeagueInputSchema,
} from "@lucarne/shared";
import type { CreateLeagueInput, ListLeaguesParams, UpdateLeagueInput } from "@lucarne/shared";
import { z } from "zod";

const createLeagueBodySchema = createLeagueInputSchema;
const updateLeagueBodySchema = updateLeagueInputSchema;
const listLeaguesQuerySchema = leagueListQuerySchema;
const leagueIdParamsSchema = z.object({
  leagueId: z.string().uuid(),
}).strict();

export { createLeagueBodySchema, leagueIdParamsSchema, listLeaguesQuerySchema, updateLeagueBodySchema };
export type { CreateLeagueInput, ListLeaguesParams, UpdateLeagueInput };
