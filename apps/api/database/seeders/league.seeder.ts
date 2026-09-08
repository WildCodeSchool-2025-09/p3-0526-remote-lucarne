import type { Prisma } from "../../src/generated/prisma/client";
import { SEED_IDS } from "./ids";

const seedLeague = async (
  database: Prisma.TransactionClient,
): Promise<void> => {
  await database.league.upsert({
    where: {
      id: SEED_IDS.league,
    },
    update: {
      name: "Lucarne Women League",
      country: "France",
      isActive: true,
    },
    create: {
      id: SEED_IDS.league,
      name: "Lucarne Women League",
      country: "France",
      isActive: true,
    },
  });

  await database.season.upsert({
    where: {
      id: SEED_IDS.season,
    },
    update: {
      leagueId: SEED_IDS.league,
      name: "2026-2027",
      startDate: new Date("2026-08-01"),
      endDate: new Date("2027-06-30"),
      isActive: true,
    },
    create: {
      id: SEED_IDS.season,
      leagueId: SEED_IDS.league,
      name: "2026-2027",
      startDate: new Date("2026-08-01"),
      endDate: new Date("2027-06-30"),
      isActive: true,
    },
  });
};

export { seedLeague };
