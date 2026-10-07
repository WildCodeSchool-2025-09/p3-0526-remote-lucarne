import { z } from "zod";
import os from "node:os";
import path from "node:path";

const optionalUrlSchema = z.preprocess(
  (value) => value === "" ? undefined : value,
  z.url().optional(),
);

const databaseUrlSchema = z.url().refine((value) => {
  const url = new URL(value);

  return ["postgres:", "postgresql:"].includes(url.protocol)
    && url.pathname.length > 1;
}, "Must be a PostgreSQL URL containing a database name");

const absolutePathSchema = z.preprocess(
  (value) => value === "" ? undefined : value,
  z.string()
    .trim()
    .min(1)
    .refine((value) => path.isAbsolute(value), "Must be an absolute path"),
);

const environmentSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  APP_PORT: z.coerce
    .number()
    .int()
    .min(1)
    .max(65_535)
    .default(3310),

  APP_SECRET: z.string().min(32),

  JWT_ACCESS_TOKEN_TTL_SECONDS: z.coerce
    .number()
    .int()
    .min(1)
    .max(86_400)
    .default(900),

  LOGIN_RATE_LIMIT_MAX_ATTEMPTS: z.coerce.number().int().min(0).max(100).default(5),
  LOGIN_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1_000).max(3_600_000).default(60_000),

  CLIENT_URL: optionalUrlSchema,

  BUG_REPORTS_FILE_PATH: absolutePathSchema.optional(),
  UPLOAD_DIRECTORY: absolutePathSchema.optional(),

  DATABASE_URL: databaseUrlSchema,
  TEST_DATABASE_URL: databaseUrlSchema.optional(),
});

const parsedEnvironment = environmentSchema.parse(process.env);

let databaseUrl = parsedEnvironment.DATABASE_URL;

if (parsedEnvironment.NODE_ENV === "test") {
  const testDatabaseUrl = parsedEnvironment.TEST_DATABASE_URL;

  if (testDatabaseUrl == null) {
    throw new Error(
      "TEST_DATABASE_URL is required when NODE_ENV=test",
    );
  }

  const normalizedTestDatabaseUrl = new URL(testDatabaseUrl).href;
  const normalizedDatabaseUrl = new URL(
    parsedEnvironment.DATABASE_URL,
  ).href;

  if (normalizedTestDatabaseUrl === normalizedDatabaseUrl) {
    throw new Error(
      "TEST_DATABASE_URL must be different from DATABASE_URL",
    );
  }

  const testDatabaseName = decodeURIComponent(
    new URL(testDatabaseUrl).pathname.slice(1),
  );

  if (!/^lucarne_test(?:_|$)/i.test(testDatabaseName)) {
    throw new Error(
      "The test database name must use the dedicated lucarne_test prefix",
    );
  }

  databaseUrl = testDatabaseUrl;
}

const databaseName = decodeURIComponent(
  new URL(databaseUrl).pathname.slice(1),
);

const environment = Object.freeze({
  nodeEnv: parsedEnvironment.NODE_ENV,
  port: parsedEnvironment.APP_PORT,
  appSecret: parsedEnvironment.APP_SECRET,
  jwt: {
    accessTokenTtlSeconds:
      parsedEnvironment.JWT_ACCESS_TOKEN_TTL_SECONDS,
  },
  loginRateLimit: {
    maxAttempts: parsedEnvironment.LOGIN_RATE_LIMIT_MAX_ATTEMPTS,
    windowMs: parsedEnvironment.LOGIN_RATE_LIMIT_WINDOW_MS,
  },
  clientUrl: parsedEnvironment.CLIENT_URL,
  database: {
    connectionString: databaseUrl,
    name: databaseName,
  },
  bugReports: {
    filePath: parsedEnvironment.BUG_REPORTS_FILE_PATH
      ?? path.join(os.homedir(), ".lucarne", "bug-reports.json"),
  },
  upload: {
    directory: parsedEnvironment.UPLOAD_DIRECTORY
      ?? path.join(os.homedir(), ".lucarne", "upload"),
  },
});

export { environment };
