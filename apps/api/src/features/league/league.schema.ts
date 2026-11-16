import {
  createLeagueInputSchema,
  deleteLeagueInputSchema,
  leagueListQuerySchema,
  leagueSlugSchema,
  publicLeagueTeamsQuerySchema,
  updateLeagueInputSchema,
} from "@lucarne/shared";
import type { CreateLeagueInput, DeleteLeagueInput, ListLeaguesParams, UpdateLeagueInput } from "@lucarne/shared";
import { z } from "zod";

const createLeagueBodySchema = createLeagueInputSchema;
const deleteLeagueBodySchema = deleteLeagueInputSchema;
const updateLeagueBodySchema = updateLeagueInputSchema;
const listLeaguesQuerySchema = leagueListQuerySchema;
const publicLeagueNavigationQuerySchema = z.object({}).strict();
const publicLeagueSlugParamsSchema = z.object({ leagueSlug: leagueSlugSchema }).strict();
const publicLeagueTeamsParamsSchema = publicLeagueSlugParamsSchema.extend({ seasonId: z.uuid() });
const leagueIdParamsSchema = z.object({
  leagueId: z.string().uuid(),
}).strict();

export { createLeagueBodySchema, deleteLeagueBodySchema, leagueIdParamsSchema, listLeaguesQuerySchema, publicLeagueNavigationQuerySchema, publicLeagueSlugParamsSchema, publicLeagueTeamsParamsSchema, publicLeagueTeamsQuerySchema, updateLeagueBodySchema };
export type { CreateLeagueInput, DeleteLeagueInput, ListLeaguesParams, UpdateLeagueInput };
