import "dotenv/config";
import client from "../database/client";
import prisma from "../database/prisma";
import { runSeeders } from "../database/seeders";
import { environment } from "../src/config/environment";

const seed = async (): Promise<void> => {
  try {
    if (environment.nodeEnv === "production") {
      throw new Error(
        "Database seeding is forbidden in production",
      );
    }

    await prisma.$transaction(async (database) => {
      await runSeeders(database);
    });

    console.info(
      `Database '${environment.database.name}' seeded successfully`,
    );
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "Unknown seeding error";

    console.error("Unable to seed the database:", message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
    await client.end();
  }
};

void seed();
