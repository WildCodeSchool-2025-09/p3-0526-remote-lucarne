import type { Prisma } from "../../src/generated/prisma/client";
import { SEED_IDS } from "./ids";

const teams = [
  {
    id: SEED_IDS.teams[0],
    name: "FC Nantes",
    stadium: "Stade de la Beaujoire",
  },
  {
    id: SEED_IDS.teams[1],
    name: "Paris FC",
    stadium: "Stade Charlety",
  },
] as const;

const seedTeams = async (
  database: Prisma.TransactionClient,
): Promise<void> => {
  for (const team of teams) {
    await database.team.upsert({
      where: {
        id: team.id,
      },
      update: {
        name: team.name,
        stadium: team.stadium,
        isActive: true,
      },
      create: {
        id: team.id,
        name: team.name,
        stadium: team.stadium,
        isActive: true,
      },
    });

    await database.participation.upsert({
      where: {
        teamId_seasonId: {
          teamId: team.id,
          seasonId: SEED_IDS.season,
        },
      },
      update: {
        points: 0,
        rank: null,
        status: "REGISTERED",
      },
      create: {
        teamId: team.id,
        seasonId: SEED_IDS.season,
        points: 0,
        rank: null,
        status: "REGISTERED",
      },
    });
  }
};

export { seedTeams };
