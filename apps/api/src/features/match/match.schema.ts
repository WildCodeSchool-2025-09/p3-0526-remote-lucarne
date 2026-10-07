import { z } from "zod";
export { createMatchInputSchema, deleteMatchInputSchema, matchListQuerySchema, publishMatchInputSchema, updateMatchInputSchema, updateMatchResultInputSchema, updateMatchStatusInputSchema } from "@lucarne/shared";
const matchIdParamsSchema = z.strictObject({ matchId: z.uuid() });
const matchPublicIdParamsSchema = z.strictObject({ matchPublicId: z.uuid() });
export { matchIdParamsSchema, matchPublicIdParamsSchema };
