import {
  matchPublicationSchema,
  type CreateMatchInput,
  type DeleteMatchInput,
  type MatchListQuery,
  type PublishMatchInput,
  type UpdateMatchInput,
  type UpdateMatchResultInput,
  type UpdateMatchStatusInput,
} from "@lucarne/shared";
import { Prisma } from "../../generated/prisma/client";
import { AppError } from "../../errors/AppError";
import { getPostgresSqlState } from "../../errors/mapErrorToAppError";
import {
  createMatch,
  findMatch,
  findPublicMatch,
  listMatches,
  listPublicMatches,
  mutateMatch,
  type MatchRecord,
} from "./match.repository";

const toMatchProgramming = (match: MatchRecord) => ({
  matchdayId: match.matchdayId,
  homeTeamId: match.homeTeamId,
  awayTeamId: match.awayTeamId,
  matchDate: match.matchDate?.toISOString().slice(0, 10) ?? null,
  startTime: match.startTime?.toISOString().slice(11, 16) ?? null,
  stadium: match.stadium,
});

const assertMatchPublicationComplete = (values: unknown) => {
  if (!matchPublicationSchema.safeParse(values).success) {
    throw new AppError(
      409,
      "MATCH_PUBLICATION_INCOMPLETE",
      "Deux équipes distinctes, une date et une heure sont requises pour un match publié.",
    );
  }
};

const assertMatchPublished = (match: MatchRecord) => {
  if (!match.isPublished) {
    throw new AppError(
      409,
      "MATCH_STATUS_TRANSITION_FORBIDDEN",
      "Publiez le match avant de modifier son état ou ses scores.",
    );
  }
};

const withMatchConcurrencyError = async <T>(operation: () => Promise<T>): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      const sqlState = getPostgresSqlState(error);
      if (
        error.code === "P2034"
        || ((error.code === "P2010" || error.code === "P2039")
          && (sqlState === "40001" || sqlState === "40P01"))
      ) {
        throw new AppError(
          409,
          "RESOURCE_VERSION_CONFLICT",
          "Une modification concurrente est survenue. Rechargez le match avant de réessayer.",
        );
      }
    }

    throw error;
  }
};

const getMatchService = async (id: string) => {
  const match = await findMatch(id);

  if (!match) {
    throw new AppError(404, "RESOURCE_NOT_FOUND", "Match introuvable.");
  }

  return match;
};

const listMatchesService = (query: MatchListQuery) => listMatches(query);

const listPublicMatchesService = (query: MatchListQuery) => listPublicMatches(query);

const getPublicMatchService = async (matchPublicId: string) => {
  const match = await findPublicMatch(matchPublicId);

  if (!match) {
    throw new AppError(404, "RESOURCE_NOT_FOUND", "Match introuvable.");
  }

  return match;
};

const createMatchService = (input: CreateMatchInput) => createMatch(input.matchdayId);

const updateMatchService = (id: string, input: UpdateMatchInput) =>
  withMatchConcurrencyError(() => mutateMatch(
    id,
    input.version,
    (current) => {
      const { matchdayId, homeTeamId, awayTeamId, matchDate: date, startTime: time, stadium } = input;
      const changes = {
        ...(matchdayId !== undefined ? { matchdayId } : {}),
        ...(homeTeamId !== undefined ? { homeTeamId } : {}),
        ...(awayTeamId !== undefined ? { awayTeamId } : {}),
        ...(date !== undefined ? { matchDate: date } : {}),
        ...(time !== undefined ? { startTime: time } : {}),
        ...(stadium !== undefined ? { stadium } : {}),
      };
      const merged = { ...toMatchProgramming(current), ...changes };

      if (merged.homeTeamId && merged.homeTeamId === merged.awayTeamId) {
        throw new AppError(400, "VALIDATION_ERROR", "Les équipes domicile et extérieur doivent être distinctes.");
      }
      if (current.isPublished) {
        assertMatchPublicationComplete(merged);
      }

      const { matchDate, startTime, ...otherChanges } = changes;

      return {
        ...otherChanges,
        ...(matchDate !== undefined
          ? { matchDate: matchDate === null ? null : new Date(`${matchDate}T00:00:00.000Z`) }
          : {}),
        ...(startTime !== undefined
          ? { startTime: startTime === null ? null : new Date(`1970-01-01T${startTime}:00.000Z`) }
          : {}),
      };
    },
  ));

const publishMatchService = (id: string, input: PublishMatchInput) =>
  withMatchConcurrencyError(() => mutateMatch(
    id,
    input.version,
    (current) => {
      assertMatchPublicationComplete(toMatchProgramming(current));

      return { isPublished: true };
    },
  ));

const updateMatchStatusService = (id: string, input: UpdateMatchStatusInput) =>
  withMatchConcurrencyError(() => mutateMatch(
    id,
    input.version,
    (current) => {
      assertMatchPublished(current);

      if (input.status === "COMPLETED" && (current.homeScore === null || current.awayScore === null)) {
        throw new AppError(
          409,
          "MATCH_RESULT_REQUIRED",
          "Renseignez les deux scores avant de terminer le match.",
        );
      }

      // Product decision: admins may correct status freely, including backwards
      // transitions and direct completion, once publication/result rules hold.
      return { status: input.status };
    },
  ));

const updateMatchResultService = (id: string, input: UpdateMatchResultInput) =>
  withMatchConcurrencyError(() => mutateMatch(
    id,
    input.version,
    (current) => {
      assertMatchPublished(current);

      return { homeScore: input.homeScore, awayScore: input.awayScore };
    },
  ));

const deleteMatchService = (id: string, input: DeleteMatchInput) =>
  withMatchConcurrencyError(() => mutateMatch(id, input.version, () => ({ isActive: false })));

export {
  createMatchService,
  deleteMatchService,
  getMatchService,
  getPublicMatchService,
  listMatchesService,
  listPublicMatchesService,
  toMatchProgramming,
  publishMatchService,
  updateMatchResultService,
  updateMatchService,
  updateMatchStatusService,
};
