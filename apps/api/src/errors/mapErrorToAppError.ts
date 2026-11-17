import { z } from "zod";
import { Prisma } from "../generated/prisma/client";
import { AppError } from "./AppError";

interface ErrorDefinition {
  statusCode: number;
  code: string;
  message: string;
}

const prismaErrorMap: Record<string, ErrorDefinition> = {
  P2000: {
    statusCode: 400,
    code: "INVALID_REQUEST",
    message: "Request violates a database constraint",
  },
  P2002: {
    statusCode: 409,
    code: "RESOURCE_ALREADY_EXISTS",
    message: "Resource already exists",
  },
  P2003: {
    statusCode: 409,
    code: "RESOURCE_CONFLICT",
    message: "Resource conflicts with a related resource",
  },
  P2005: {
    statusCode: 400,
    code: "INVALID_REQUEST",
    message: "Request violates a database constraint",
  },
  P2006: {
    statusCode: 400,
    code: "INVALID_REQUEST",
    message: "Request violates a database constraint",
  },
  P2011: {
    statusCode: 400,
    code: "INVALID_REQUEST",
    message: "Request violates a database constraint",
  },
  P2014: {
    statusCode: 409,
    code: "RESOURCE_CONFLICT",
    message: "Resource conflicts with a related resource",
  },
  P2023: {
    statusCode: 400,
    code: "INVALID_REQUEST",
    message: "Request contains an invalid value",
  },
  P2025: {
    statusCode: 404,
    code: "RESOURCE_NOT_FOUND",
    message: "Resource not found",
  },
};

// Stable SQLSTATEs emitted by MATCH triggers. Never parse raw database messages.
const matchDatabaseErrorMap: Record<string, ErrorDefinition> = {
  LM001: {
    statusCode: 409,
    code: "MATCH_TEAM_MATCHDAY_CONFLICT",
    message: "Une équipe participe déjà à un match de cette journée.",
  },
  LM002: {
    statusCode: 409,
    code: "MATCH_TEAM_NOT_REGISTERED",
    message: "Une équipe n'est pas inscrite dans cette édition.",
  },
  LM003: {
    statusCode: 409,
    code: "MATCH_EDITION_CHANGE_FORBIDDEN",
    message: "Le déplacement doit rester dans la même édition ligue/saison.",
  },
  LM004: {
    statusCode: 409,
    code: "MATCH_PUBLICATION_INCOMPLETE",
    message: "La publication exige deux équipes, une date et une heure.",
  },
  LM005: {
    statusCode: 409,
    code: "MATCH_RESULT_REQUIRED",
    message: "Deux scores sont requis pour terminer le match.",
  },
  LM006: {
    statusCode: 400,
    code: "VALIDATION_ERROR",
    message: "Les informations du match sont invalides.",
  },
  LM007: {
    statusCode: 404,
    code: "RESOURCE_NOT_FOUND",
    message: "La journée est introuvable.",
  },
};

const getPostgresSqlState = (error: Prisma.PrismaClientKnownRequestError): string | undefined => {
  if (typeof error.meta?.code === "string") return error.meta.code;
  const adapter = error.meta?.driverAdapterError;
  if (adapter == null || typeof adapter !== "object" || !("cause" in adapter))
    return undefined;
  const cause = adapter.cause;
  if (cause == null || typeof cause !== "object" || !("code" in cause)) return undefined;
  return typeof cause.code === "string" ? cause.code : undefined;
};

const mapErrorToAppError = (error: unknown): AppError | null => {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof z.ZodError) {
    return new AppError(
      400,
      "VALIDATION_ERROR",
      "Request validation failed",
      error.issues.map((issue) => ({
        field: issue.path.map(String).join(".") || "request",
        message: issue.message,
      })),
    );
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2039" || error.code === "P2010") {
      const sqlState = getPostgresSqlState(error);
      const matchDefinition = sqlState === undefined ? undefined : matchDatabaseErrorMap[sqlState];
      if (matchDefinition) {
        return new AppError(matchDefinition.statusCode, matchDefinition.code, matchDefinition.message);
      }
    }
    if (error.code === "P2039" && error.meta?.code === "23P01") {
      return new AppError(409, "ASSIGNMENT_PERIOD_CONFLICT", "Cette période chevauche une autre affectation.");
    }
    const definition = prismaErrorMap[error.code];

    return definition == null
      ? null
      : new AppError(
        definition.statusCode,
        definition.code,
        definition.message,
      );
  }

  return null;
};

export { getPostgresSqlState, mapErrorToAppError };
