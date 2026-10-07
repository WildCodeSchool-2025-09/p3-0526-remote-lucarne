import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import os from "node:os";
import path from "node:path";

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

    await expect(import("../../../src/config/environment")).rejects.toThrow(
      "TEST_DATABASE_URL is required when NODE_ENV=test",
    );
  });

  it("rejects a test database URL equal to the development URL", async () => {
    process.env.TEST_DATABASE_URL = process.env.DATABASE_URL;

    await expect(import("../../../src/config/environment")).rejects.toThrow(
      "TEST_DATABASE_URL must be different from DATABASE_URL",
    );
  });

  it("rejects a database whose name does not identify it as a test database", async () => {
    process.env.TEST_DATABASE_URL =
      "postgresql://test_user:test_password@localhost:5436/lucarne";

    await expect(import("../../../src/config/environment")).rejects.toThrow(
      "The test database name must use the dedicated lucarne_test prefix",
    );
  });

  it("uses the dedicated test database", async () => {
    const { environment } = await import("../../../src/config/environment");

    expect(environment.nodeEnv).toBe("test");
    expect(environment.database).toEqual({
      connectionString:
        "postgresql://test_user:test_password@localhost:5436/lucarne_test",
      name: "lucarne_test",
    });
  });

  it("exposes the configured access token TTL", async () => {
    process.env.JWT_ACCESS_TOKEN_TTL_SECONDS = "600";

    const { environment } = await import("../../../src/config/environment");

    expect(environment.jwt.accessTokenTtlSeconds).toBe(600);
  });

  it("uses a 15 minute access token TTL by default", async () => {
    delete process.env.JWT_ACCESS_TOKEN_TTL_SECONDS;

    const { environment } = await import("../../../src/config/environment");

    expect(environment.jwt.accessTokenTtlSeconds).toBe(900);
  });

  it("uses an external default path for development bug reports", async () => {
    const { environment } = await import("../../../src/config/environment");

    expect(environment.bugReports.filePath).toBe(
      path.join(os.homedir(), ".lucarne", "bug-reports.json"),
    );
  });

  it("uses the configured absolute bug reports path", async () => {
    process.env.BUG_REPORTS_FILE_PATH = path.join(
      os.tmpdir(),
      "lucarne",
      "bug-reports.json",
    );

    const { environment } = await import("../../../src/config/environment");

    expect(environment.bugReports.filePath).toBe(process.env.BUG_REPORTS_FILE_PATH);
  });

  it("rejects a relative bug reports path", async () => {
    process.env.BUG_REPORTS_FILE_PATH = "tmp/bug-reports.json";

    await expect(import("../../../src/config/environment")).rejects.toThrow();
  });

  it("uses the configured absolute upload directory", async () => {
    process.env.UPLOAD_DIRECTORY = path.join(os.tmpdir(), "lucarne-upload");
    const { environment } = await import("../../../src/config/environment");
    expect(environment.upload.directory).toBe(process.env.UPLOAD_DIRECTORY);
  });

  it("rejects a relative upload directory", async () => {
    process.env.UPLOAD_DIRECTORY = "tmp/upload";
    await expect(import("../../../src/config/environment")).rejects.toThrow();
  });

  it("rejects an invalid access token TTL", async () => {
    process.env.JWT_ACCESS_TOKEN_TTL_SECONDS = "0";

    await expect(import("../../../src/config/environment")).rejects.toThrow();
  });
});
