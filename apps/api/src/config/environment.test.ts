import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const originalEnvironment = process.env;

const validTestEnvironment: NodeJS.ProcessEnv = {
  ...originalEnvironment,
  NODE_ENV: "test",
  APP_SECRET: "test-secret-with-at-least-32-characters",
  JWT_ACCESS_TOKEN_TTL_SECONDS: "900",
  DATABASE_URL:
    "postgresql://user:password@localhost:5435/lucarne",
  TEST_DATABASE_URL:
    "postgresql://test_user:test_password@localhost:5436/lucarne_test",
};

describe("environment", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...validTestEnvironment };
  });

  afterAll(() => {
    process.env = originalEnvironment;
  });

  it("rejects a missing test database URL", async () => {
    delete process.env.TEST_DATABASE_URL;

    await expect(import("./environment")).rejects.toThrow(
      "TEST_DATABASE_URL is required when NODE_ENV=test",
    );
  });

  it("rejects a test database URL equal to the development URL", async () => {
    process.env.TEST_DATABASE_URL = process.env.DATABASE_URL;

    await expect(import("./environment")).rejects.toThrow(
      "TEST_DATABASE_URL must be different from DATABASE_URL",
    );
  });

  it("rejects a database whose name does not identify it as a test database", async () => {
    process.env.TEST_DATABASE_URL =
      "postgresql://test_user:test_password@localhost:5436/lucarne";

    await expect(import("./environment")).rejects.toThrow(
      "The test database name must contain 'test'",
    );
  });

  it("uses the dedicated test database", async () => {
    const { environment } = await import("./environment");

    expect(environment.nodeEnv).toBe("test");
    expect(environment.database).toEqual({
      connectionString:
        "postgresql://test_user:test_password@localhost:5436/lucarne_test",
      name: "lucarne_test",
    });
  });

  it("exposes the configured access token TTL", async () => {
    process.env.JWT_ACCESS_TOKEN_TTL_SECONDS = "600";

    const { environment } = await import("./environment");

    expect(environment.jwt.accessTokenTtlSeconds).toBe(600);
  });

  it("uses a 15 minute access token TTL by default", async () => {
    delete process.env.JWT_ACCESS_TOKEN_TTL_SECONDS;

    const { environment } = await import("./environment");

    expect(environment.jwt.accessTokenTtlSeconds).toBe(900);
  });

  it("rejects an invalid access token TTL", async () => {
    process.env.JWT_ACCESS_TOKEN_TTL_SECONDS = "0";

    await expect(import("./environment")).rejects.toThrow();
  });
});
