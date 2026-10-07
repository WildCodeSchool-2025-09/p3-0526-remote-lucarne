import "dotenv/config";
import client from "../database/client";
import prisma from "../database/prisma";
import { resetAndSeedDatabase } from "../database/resetAndSeed";
import { environment } from "../src/config/environment";

const seed = async (): Promise<void> => {
  try {
    await resetAndSeedDatabase(prisma);

    console.info(
      `Database '${environment.database.name}' reset and seeded successfully`,
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
