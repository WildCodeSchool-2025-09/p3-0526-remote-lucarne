import client from "../../database/client";
import { environment } from "../../src/config/environment";

const assertSafeTestDatabase = (): void => {
  if (environment.nodeEnv !== "test") {
    throw new Error(
      "Database cleanup is only allowed when NODE_ENV=test",
    );
  }

  if (!environment.database.name.toLowerCase().includes("test")) {
    throw new Error(
      `Refusing to clean non-test database: ${environment.database.name}`,
    );
  }
};

const cleanTestDatabase = async (): Promise<void> => {
  assertSafeTestDatabase();

  await client.query(`
    DO $$
    DECLARE
      target_table text;
    BEGIN
      FOR target_table IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename <> '_prisma_migrations'
      LOOP
        EXECUTE format(
          'TRUNCATE TABLE %I.%I RESTART IDENTITY CASCADE',
          'public',
          target_table
        );
      END LOOP;
    END
    $$;
  `);
};

export { cleanTestDatabase };
