import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const originalEnvironment = process.env;

const validTestEnvironment: NodeJS.ProcessEnv = {
  ...originalEnvironment,
  NODE_ENV: "test",
  APP_SECRET: "test-secret-with-at-least-32-characters",
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
});
