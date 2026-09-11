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
});
