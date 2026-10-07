import { describe, expect, it } from "vitest";
import { z } from "zod";
import { Prisma } from "../../../src/generated/prisma/client";
import { AppError } from "../../../src/errors/AppError";
import { mapErrorToAppError } from "../../../src/errors/mapErrorToAppError";

const createPrismaError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError("Database error", {
    clientVersion: "test",
    code,
  });

describe("mapErrorToAppError", () => {
  it("keeps application errors unchanged", () => {
    const error = new AppError(403, "FORBIDDEN", "Forbidden");

    expect(mapErrorToAppError(error)).toBe(error);
  });

  it("maps Zod errors to a validation response", () => {
    const result = z.string().min(1).safeParse("");

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }

    expect(mapErrorToAppError(result.error)).toMatchObject({
      statusCode: 400,
      code: "VALIDATION_ERROR",
      message: "Request validation failed",
      details: [{ field: "request" }],
    });
  });

  it.each([
    ["P2000", 400, "INVALID_REQUEST"],
    ["P2005", 400, "INVALID_REQUEST"],
    ["P2006", 400, "INVALID_REQUEST"],
    ["P2011", 400, "INVALID_REQUEST"],
    ["P2023", 400, "INVALID_REQUEST"],
    ["P2002", 409, "RESOURCE_ALREADY_EXISTS"],
    ["P2003", 409, "RESOURCE_CONFLICT"],
    ["P2014", 409, "RESOURCE_CONFLICT"],
    ["P2025", 404, "RESOURCE_NOT_FOUND"],
  ])("maps Prisma %s to %i %s", (code, statusCode, errorCode) => {
    expect(mapErrorToAppError(createPrismaError(code))).toMatchObject({
      statusCode,
      code: errorCode,
    });
  });

  it("leaves unknown errors and Prisma codes unmapped", () => {
    expect(mapErrorToAppError(new Error("Unexpected"))).toBeNull();
    expect(mapErrorToAppError(createPrismaError("P2999"))).toBeNull();
  });

  it("maps PostgreSQL exclusion conflicts without exposing database details", () => {
    const error = new Prisma.PrismaClientKnownRequestError("conflicting key value", {
      clientVersion: "test", code: "P2039", meta: { code: "23P01" },
    });
    expect(mapErrorToAppError(error)).toMatchObject({ statusCode: 409, code: "ASSIGNMENT_PERIOD_CONFLICT" });
    expect(mapErrorToAppError(createPrismaError("P2039"))).toBeNull();
  });

  it.each([
    ["LM001", 409, "MATCH_TEAM_MATCHDAY_CONFLICT"],
    ["LM002", 409, "MATCH_TEAM_NOT_REGISTERED"],
    ["LM003", 409, "MATCH_EDITION_CHANGE_FORBIDDEN"],
    ["LM004", 409, "MATCH_PUBLICATION_INCOMPLETE"],
    ["LM005", 409, "MATCH_RESULT_REQUIRED"],
    ["LM006", 400, "VALIDATION_ERROR"],
    ["LM007", 404, "RESOURCE_NOT_FOUND"],
  ])("maps MATCH SQLSTATE %s without exposing SQL", (sqlState, statusCode, code) => {
    const error = new Prisma.PrismaClientKnownRequestError("private SQL payload", {
      clientVersion: "test", code: "P2039", meta: { code: sqlState },
    });
    expect(mapErrorToAppError(error)).toMatchObject({ statusCode, code });
    expect(mapErrorToAppError(error)?.message).not.toContain("private SQL");
    const adapterError = new Prisma.PrismaClientKnownRequestError("private SQL payload", {
      clientVersion: "test", code: "P2039",
      meta: { driverAdapterError: { cause: { code: sqlState, originalMessage: "private SQL payload" } } },
    });
    expect(mapErrorToAppError(adapterError)).toMatchObject({ statusCode, code });
  });

  it.each([undefined, null, "invalid", {}, { cause: null }, { cause: { code: 42 } }, { cause: { code: "LM999" } }])(
    "does not guess errors from malformed or unknown adapter metadata", (driverAdapterError) => {
      const error = new Prisma.PrismaClientKnownRequestError("LM001 in text is not a code", {
        clientVersion: "test", code: "P2039", meta: { driverAdapterError },
      });
      expect(mapErrorToAppError(error)).toBeNull();
    },
  );
});
