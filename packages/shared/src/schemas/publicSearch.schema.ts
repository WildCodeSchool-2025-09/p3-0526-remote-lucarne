import { z } from "zod";
import { leagueSlugSchema } from "./league.schema";
import { matchStartTimeSchema, matchStatusSchema } from "./match.schema";
import { publicListQuerySchema, publicPaginationSchema } from "./publicPortal.schema";

export const publicSearchTypeSchema = z.enum(["LEAGUE", "TEAM", "PLAYER", "SEASON", "GAME_MATCH"]);
export const publicSearchQuerySchema = publicListQuerySchema.omit({ search: true }).extend({
  q: z.string().trim().max(100).transform((value) => value.replace(/\s+/g, " ")).refine((value) => !value || value.length >= 2, "Saisissez au moins deux caractères.").default(""),
  type: z.enum(["ALL", ...publicSearchTypeSchema.options]).default("ALL"),
  leagueId: z.uuid().optional(), seasonId: z.uuid().optional(), teamId: z.uuid().optional(),
  dateFrom: z.iso.date().optional(), dateTo: z.iso.date().optional(), status: matchStatusSchema.optional(),
}).strict().refine(({ dateFrom, dateTo }) => !dateFrom || !dateTo || dateFrom <= dateTo, "La fin de période doit suivre son début.");
const identity = z.object({ id: z.uuid(), label: z.string(), description: z.string().nullable(), pictureUrl: z.string().nullable() }).strict();
export const publicSearchResultSchema = z.discriminatedUnion("type", [
  identity.extend({ type: z.literal("LEAGUE"), slug: leagueSlugSchema }).strict(),
  identity.extend({ type: z.literal("TEAM") }).strict(),
  identity.extend({ type: z.literal("PLAYER") }).strict(),
  identity.extend({ type: z.literal("SEASON") }).strict(),
  identity.extend({ type: z.literal("GAME_MATCH"), matchDate: z.iso.date(), startTime: matchStartTimeSchema, status: matchStatusSchema }).strict(),
]);
export const publicSearchCountsSchema = z.object({ LEAGUE: z.number().int().min(0), TEAM: z.number().int().min(0), PLAYER: z.number().int().min(0), SEASON: z.number().int().min(0), GAME_MATCH: z.number().int().min(0) }).strict();
export const publicSearchResponseSchema = z.object({ data: z.array(publicSearchResultSchema), counts: publicSearchCountsSchema, pagination: publicPaginationSchema }).strict();
