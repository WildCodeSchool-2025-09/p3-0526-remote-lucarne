import { z } from "zod";

const optionalUrlSchema = z.preprocess(
  (value) => value === "" ? undefined : value,
  z.url().optional(),
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

  CLIENT_URL: optionalUrlSchema,

  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().int().min(1).max(65_535).default(3306),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  DB_NAME: z.string().regex(/^[a-zA-Z0-9_]+$/),
});

const parsedEnvironment = environmentSchema.parse(process.env);

const environment = Object.freeze({
  nodeEnv: parsedEnvironment.NODE_ENV,
  port: parsedEnvironment.APP_PORT,
  appSecret: parsedEnvironment.APP_SECRET,
  clientUrl: parsedEnvironment.CLIENT_URL,
  database: {
    host: parsedEnvironment.DB_HOST,
    port: parsedEnvironment.DB_PORT,
    user: parsedEnvironment.DB_USER,
    password: parsedEnvironment.DB_PASSWORD,
    name: parsedEnvironment.DB_NAME,
  },
});

export { environment };
