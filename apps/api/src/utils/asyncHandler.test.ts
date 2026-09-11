import express from "express";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../errors/AppError";
import { errorHandler } from "../middlewares/errorHandler";
import { asyncHandler } from "./asyncHandler";

const createTestApp = () => {
  const app = express();

  app.get(
    "/success",
    asyncHandler(async (_request, response) => {
      await Promise.resolve();
      response.status(200).json({ status: "ok" });
    }),
  );
  app.get(
    "/failure",
    asyncHandler(async () => {
      await Promise.resolve();
      throw new AppError(409, "RESOURCE_CONFLICT", "Resource conflict");
    }),
  );
  app.use(errorHandler);

  return app;
};

describe("asyncHandler", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("lets a successful asynchronous controller send its response", async () => {
    const response = await request(createTestApp()).get("/success");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });

  it("forwards rejected controller promises to Express 4", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await request(createTestApp()).get("/failure");

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: {
        code: "RESOURCE_CONFLICT",
        message: "Resource conflict",
      },
    });
  });
});
