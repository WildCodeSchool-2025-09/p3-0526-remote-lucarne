import { environment } from "../src/config/environment";
import type { PrismaClient } from "../src/generated/prisma/client";
import { runSeeders } from "./seeders";

const resetAndSeedDatabase = async (prisma: PrismaClient): Promise<void> => {
  if (environment.nodeEnv === "production") {
    throw new Error("Database seeding is forbidden in production");
  }

  await prisma.$transaction(async (database) => {
    // Keep the schema and migration history. Truncate all application tables
    // together so foreign keys do not depend on the order of deletion.
    await database.$executeRaw`
      DO $$
      DECLARE
        application_tables text;
      BEGIN
        SELECT string_agg(format('%I.%I', schemaname, tablename), ', ' ORDER BY tablename)
        INTO application_tables
        FROM pg_tables
        WHERE schemaname = 'public' AND tablename <> '_prisma_migrations';

        IF application_tables IS NOT NULL THEN
          EXECUTE 'TRUNCATE TABLE ' || application_tables || ' RESTART IDENTITY';
        END IF;
      END
      $$;
    `;
    await runSeeders(database);
  }, { timeout: 30_000 });
};

export { resetAndSeedDatabase };
