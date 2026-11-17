import { z } from "zod";
import { publicLeagueNavigationItemSchema } from "./league.schema";
import { publicListQuerySchema, publicPaginationSchema, publicSeasonIdentitySchema, publicTeamIdentitySchema } from "./publicPortal.schema";

export const publicStatisticsQuerySchema = publicListQuerySchema.omit({ search: true }).strict();
export const publicStatisticsEditionQuerySchema = z.object({ leagueId: z.uuid(), seasonId: z.uuid() }).strict();
const nonNegativeInteger = z.number().int().min(0);
const playerIdentity = z.object({ id: z.uuid(), firstName: z.string(), lastName: z.string(), pictureUrl: z.string().nullable() }).strict();
export const publicStandingRowSchema = z.object({
  team: publicTeamIdentitySchema, rank: z.number().int().min(1), played: nonNegativeInteger, wins: nonNegativeInteger,
  draws: nonNegativeInteger, losses: nonNegativeInteger, goalsFor: nonNegativeInteger, goalsAgainst: nonNegativeInteger,
  goalDifference: z.number().int(), points: nonNegativeInteger,
  form: z.array(z.object({ result: z.enum(["WIN", "DRAW", "LOSS"]), matchPublicId: z.uuid(), date: z.iso.date() }).strict()).max(5),
}).strict();
const context = z.object({ league: publicLeagueNavigationItemSchema, season: publicSeasonIdentitySchema }).strict();
export const publicStandingsSchema = context.extend({ rows: z.array(publicStandingRowSchema) }).strict();
export const publicScorerSchema = z.object({ rank: z.number().int().min(1), goals: nonNegativeInteger, player: playerIdentity.extend({ team: publicTeamIdentitySchema }).strict() }).strict();
export const publicLeagueStatisticsSchema = context.extend({
  completedMatches: nonNegativeInteger, totalGoals: nonNegativeInteger, goalsPerMatch: z.number().min(0).nullable(),
  homeWins: nonNegativeInteger, draws: nonNegativeInteger, awayWins: nonNegativeInteger,
  scorers: z.object({ data: z.array(publicScorerSchema), pagination: publicPaginationSchema }).strict(),
}).strict();
export const publicTeamStatisticsSchema = context.extend(publicStandingRowSchema.shape).strict();
export const publicPlayerStatisticsSchema = context.extend({ playerId: z.uuid(), goals: nonNegativeInteger }).strict();
export const publicMatchEventsSchema = z.array(z.object({ id: z.uuid(), minute: nonNegativeInteger, player: playerIdentity }).strict());
