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

export { mapErrorToAppError };
