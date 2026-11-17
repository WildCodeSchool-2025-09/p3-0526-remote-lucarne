import type { z } from "zod";
import type { publicLeagueStatisticsSchema, publicMatchEventsSchema, publicPlayerStatisticsSchema, publicScorerSchema, publicStandingRowSchema, publicStandingsSchema, publicStatisticsEditionQuerySchema, publicStatisticsQuerySchema, publicTeamStatisticsSchema } from "../schemas/publicStatistics.schema";

export type PublicStatisticsQuery = z.infer<typeof publicStatisticsQuerySchema>;
export type PublicStatisticsEditionQuery = z.infer<typeof publicStatisticsEditionQuerySchema>;
export type PublicStandingRow = z.infer<typeof publicStandingRowSchema>;
export type PublicStandings = z.infer<typeof publicStandingsSchema>;
export type PublicScorer = z.infer<typeof publicScorerSchema>;
export type PublicLeagueStatistics = z.infer<typeof publicLeagueStatisticsSchema>;
export type PublicTeamStatistics = z.infer<typeof publicTeamStatisticsSchema>;
export type PublicPlayerStatistics = z.infer<typeof publicPlayerStatisticsSchema>;
export type PublicMatchEvents = z.infer<typeof publicMatchEventsSchema>;
