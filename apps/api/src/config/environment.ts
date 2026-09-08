import { z } from "zod";

const optionalUrlSchema = z.preprocess(
  (value) => value === "" ? undefined : value,
  z.url().optional(),
);

const databaseUrlSchema = z.url().refine((value) => {
  const url = new URL(value);

  return ["postgres:", "postgresql:"].includes(url.protocol)
    && url.pathname.length > 1;
}, "Must be a PostgreSQL URL containing a database name");

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

  CLIENT_URL: optionalUrlSchema,

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

  if (!testDatabaseName.toLowerCase().includes("test")) {
    throw new Error(
      "The test database name must contain 'test'",
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
  clientUrl: parsedEnvironment.CLIENT_URL,
  database: {
    connectionString: databaseUrl,
    name: databaseName,
  },
});

export { environment };
