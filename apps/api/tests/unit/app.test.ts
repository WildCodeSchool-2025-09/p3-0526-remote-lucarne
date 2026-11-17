import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import app from "../../src/app";

describe("app", () => {
  it("returns the API health status", async () => {
    const response = await request(app).get("/api/v1/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });

  it("returns the common error format for an unknown route", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    const response = await request(app).get("/api/v1/unknown");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: {
        code: "RESOURCE_NOT_FOUND",
        message: "Resource not found",
      },
    });
    expect(consoleError).toHaveBeenCalled();

    consoleError.mockRestore();
  });

  it("does not expose bug reports outside development", async () => {
    const response = await request(app).get("/api/v1/bug-reports");

    expect(response.status).toBe(404);
  });

  it("returns 400 for malformed JSON", async () => {
    const response = await request(app)
      .post("/api/v1/auth/login")
      .set("content-type", "application/json")
      .send("{");
    expect(response.status).toBe(400);
    expect((response.body as { error: { code: string } }).error.code).toBe("INVALID_JSON");
  });
});
