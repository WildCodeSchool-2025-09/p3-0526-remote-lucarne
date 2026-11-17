import express from "express";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { errorHandler } from "../../../src/middlewares/errorHandler";
import { AppError } from "../../../src/errors/AppError";
import { Prisma } from "../../../src/generated/prisma/client";
import { z } from "zod";

describe("errorHandler", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the common internal error without exposing details", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const app = express();

    app.get("/failure", () => {
      throw new Error("Sensitive detail");
    });
    app.use(errorHandler);

    const response = await request(app).get("/failure");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred",
      },
    });
    expect(JSON.stringify(response.body)).not.toContain("Sensitive detail");
    expect(console.error).toHaveBeenCalledWith(JSON.stringify({
      event: "request_error", method: "GET", route: "/failure", status: 500, code: "INTERNAL_SERVER_ERROR",
    }));
  });

  it.each([
    [new AppError(409, "RESOURCE_VERSION_CONFLICT", "private business context"), 409, "RESOURCE_VERSION_CONFLICT"],
    [new Prisma.PrismaClientKnownRequestError("private SQL", { code: "P2002", clientVersion: "7" }), 409, "RESOURCE_ALREADY_EXISTS"],
    [new z.ZodError([{ code: "custom", path: ["password"], message: "private validation detail" }]), 400, "VALIDATION_ERROR"],
    [Object.assign(new SyntaxError("private malformed JSON"), { status: 400 }), 400, "INVALID_JSON"],
    [Object.assign(new Error("private oversized body"), { name: "PayloadTooLargeError" }), 413, "PAYLOAD_TOO_LARGE"],
  ] as const)("logs the mapped status and code without sensitive data", async (error, status, code) => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const app = express();
    app.use(express.json());
    app.post("/failure/:secret", () => { throw error; });
    app.use(errorHandler);
    const response = await request(app).post("/failure/private-token?email=private-email")
      .set("Authorization", "Bearer private-jwt").send({ password: "private-password" });
    expect(response.status).toBe(status);
    expect(log).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith(JSON.stringify({ event: "request_error", method: "POST", route: "/failure/:secret", status, code }));
    expect(JSON.stringify(log.mock.calls)).not.toContain("private-");
    expect(JSON.stringify(log.mock.calls)).not.toContain("private ");
  });
});
