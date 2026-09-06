import request from "supertest";
import app from "./app";

describe("app", () => {
  it("returns the API health status", async () => {
    const response = await request(app).get("/api/v1/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });

  it("returns the common error format for an unknown route", async () => {
    const consoleError = jest
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
});
