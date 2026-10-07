import type { z } from "zod";
import type {
  MATCH_TIME_ZONE,
  createMatchInputSchema,
  deleteMatchInputSchema,
  matchListQuerySchema,
  matchPublicationSchema,
  matchStatusSchema,
  publishMatchInputSchema,
  updateMatchInputSchema,
  updateMatchResultInputSchema,
  updateMatchStatusInputSchema,
} from "../schemas/match.schema";
import type { PaginatedResponse } from "./pagination.types";

type MatchStatus = z.infer<typeof matchStatusSchema>;
type CreateMatchInput = z.infer<typeof createMatchInputSchema>;
type UpdateMatchInput = z.infer<typeof updateMatchInputSchema>;
type MatchPublication = z.infer<typeof matchPublicationSchema>;
type PublishMatchInput = z.infer<typeof publishMatchInputSchema>;
type UpdateMatchStatusInput = z.infer<typeof updateMatchStatusInputSchema>;
type UpdateMatchResultInput = z.infer<typeof updateMatchResultInputSchema>;
type DeleteMatchInput = z.infer<typeof deleteMatchInputSchema>;
type ListMatchesParams = z.input<typeof matchListQuerySchema>;
type MatchListQuery = z.output<typeof matchListQuerySchema>;

type MatchTeamSummary = { name: string; logoUrl: string | null };
type MatchResult = { homeScore: number | null; awayScore: number | null };
type MatchSportingState =
  | { status: "SCHEDULED" | "IN_PROGRESS"; result: MatchResult }
  | { status: "COMPLETED"; result: { homeScore: number; awayScore: number } };

// Public DTO omits internal IDs, version, publication and deletion flags.
type PublicMatch = MatchSportingState & {
  matchPublicId: string;
  league: { name: string; country: string };
  season: { name: string };
  matchday: { number: number; name: string | null };
  homeTeam: MatchTeamSummary;
  awayTeam: MatchTeamSummary;
  matchDate: string;
  startTime: string;
  timeZone: typeof MATCH_TIME_ZONE;
  stadium: string | null;
};

type AdminMatch = {
  id: string;
  matchPublicId: string;
  leagueSeasonId: string;
  leagueId: string;
  seasonId: string;
  version: number;
  isActive: boolean;
  createdAt: string;
  timeZone: typeof MATCH_TIME_ZONE;
} & (
  | (MatchPublication & MatchSportingState & { isPublished: true })
  | {
    isPublished: false;
    status: "SCHEDULED";
    matchdayId: string;
    homeTeamId: string | null;
    awayTeamId: string | null;
    matchDate: string | null;
    startTime: string | null;
    stadium: string | null;
    result: { homeScore: null; awayScore: null };
  }
);

type PaginatedPublicMatchesResponse = PaginatedResponse<PublicMatch>;
type PaginatedAdminMatchesResponse = PaginatedResponse<AdminMatch>;

export type {
  AdminMatch,
  CreateMatchInput,
  DeleteMatchInput,
  ListMatchesParams,
  MatchListQuery,
  MatchPublication,
  MatchResult,
  MatchStatus,
  MatchTeamSummary,
  PaginatedAdminMatchesResponse,
  PaginatedPublicMatchesResponse,
  PublicMatch,
  PublishMatchInput,
  UpdateMatchInput,
  UpdateMatchResultInput,
  UpdateMatchStatusInput,
};
