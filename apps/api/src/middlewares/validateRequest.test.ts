import express from "express";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { errorHandler } from "./errorHandler";
import { validateRequest } from "./validateRequest";

const createTestApp = () => {
  const app = express();

  app.use(express.json());
  app.post(
    "/resources/:resourceId",
    validateRequest({
      body: z.object({ name: z.string().trim().min(1) }),
      params: z.object({ resourceId: z.string().uuid() }),
      query: z.object({ page: z.coerce.number().int().min(1) }),
    }),
    (httpRequest, response) => {
      response.json({
        body: httpRequest.body as unknown,
        params: httpRequest.params,
        query: httpRequest.query,
      });
    },
  );
  app.use(errorHandler);

  return app;
};

describe("validateRequest", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("replaces request data with the parsed Zod output", async () => {
    const response = await request(createTestApp())
      .post("/resources/123e4567-e89b-12d3-a456-426614174000?page=2")
      .send({ name: "  Lucarne  ", ignored: true });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      body: { name: "Lucarne" },
      params: { resourceId: "123e4567-e89b-12d3-a456-426614174000" },
      query: { page: 2 },
    });
  });

  it.each([
    [
      "body",
      "/resources/123e4567-e89b-12d3-a456-426614174000?page=1",
      { name: "" },
      "body.name",
    ],
    [
      "params",
      "/resources/not-a-uuid?page=1",
      { name: "Lucarne" },
      "params.resourceId",
    ],
    [
      "query",
      "/resources/123e4567-e89b-12d3-a456-426614174000?page=0",
      { name: "Lucarne" },
      "query.page",
    ],
  ])("forwards an invalid %s to the common error handler", async (
    _source,
    url,
    body,
    field,
  ) => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await request(createTestApp())
      .post(url)
      .send(body);

    expect(response.status).toBe(400);
    const responseBody = z.object({
      error: z.object({
        code: z.string(),
        message: z.string(),
        details: z.array(z.object({
          field: z.string(),
          message: z.string(),
        })),
      }),
    }).parse(response.body as unknown);

    expect(responseBody.error.code).toBe("VALIDATION_ERROR");
    expect(responseBody.error.message).toBe("Request validation failed");
    expect(responseBody.error.details.map((detail) => detail.field))
      .toContain(field);
  });
});
