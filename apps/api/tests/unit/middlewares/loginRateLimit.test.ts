import express from "express";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import { clearLoginRateLimit, loginRateLimit } from "../../../src/middlewares/loginRateLimit";
import { errorHandler } from "../../../src/middlewares/errorHandler";

describe("loginRateLimit", () => {
  afterEach(clearLoginRateLimit);

  it("returns 429 with a retry delay after the configured attempt limit", async () => {
    const app = express();
    app.use(express.json());
    app.post("/login", loginRateLimit, (_request, response) => { response.sendStatus(204); });
    app.use(errorHandler);
    for (let index = 0; index < 5; index += 1) {
      await request(app).post("/login").send({ email: "user@lucarne.test" }).expect(204);
    }
    const response = await request(app).post("/login").send({ email: "user@lucarne.test" });
    expect(response.status).toBe(429);
    expect(response.headers["retry-after"]).toBeDefined();
    expect((response.body as { error: { code: string } }).error.code).toBe("TOO_MANY_LOGIN_ATTEMPTS");
  });
});
