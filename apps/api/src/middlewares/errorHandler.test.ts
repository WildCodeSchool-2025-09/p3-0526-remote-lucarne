import express from "express";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { errorHandler } from "./errorHandler";

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
  });
});
