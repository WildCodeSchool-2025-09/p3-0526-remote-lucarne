import {
  createLeagueInputSchema,
  deleteLeagueInputSchema,
  leagueListQuerySchema,
  updateLeagueInputSchema,
} from "@lucarne/shared";
import type { CreateLeagueInput, DeleteLeagueInput, ListLeaguesParams, UpdateLeagueInput } from "@lucarne/shared";
import { z } from "zod";

const createLeagueBodySchema = createLeagueInputSchema;
const deleteLeagueBodySchema = deleteLeagueInputSchema;
const updateLeagueBodySchema = updateLeagueInputSchema;
const listLeaguesQuerySchema = leagueListQuerySchema;
const leagueIdParamsSchema = z.object({
  leagueId: z.string().uuid(),
}).strict();

export { createLeagueBodySchema, deleteLeagueBodySchema, leagueIdParamsSchema, listLeaguesQuerySchema, updateLeagueBodySchema };
export type { CreateLeagueInput, DeleteLeagueInput, ListLeaguesParams, UpdateLeagueInput };
