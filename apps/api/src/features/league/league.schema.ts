import {
  createLeagueInputSchema,
  leagueListQuerySchema,
} from "@lucarne/shared";
import type { CreateLeagueInput, ListLeaguesParams } from "@lucarne/shared";
import { z } from "zod";

const createLeagueBodySchema = createLeagueInputSchema;
const listLeaguesQuerySchema = leagueListQuerySchema;
const leagueIdParamsSchema = z.object({
  leagueId: z.string().uuid(),
}).strict();

export { createLeagueBodySchema, leagueIdParamsSchema, listLeaguesQuerySchema };
export type { CreateLeagueInput, ListLeaguesParams };
