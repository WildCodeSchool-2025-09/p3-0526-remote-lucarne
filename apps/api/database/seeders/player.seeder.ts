import { faker } from "@faker-js/faker";
import type { Prisma } from "../../src/generated/prisma/client";
import { PLAYERS_PER_TEAM, SEED_IDS } from "./ids";

const positions = [
  "GOALKEEPER",
  "GOALKEEPER",
  "DEFENDER",
  "DEFENDER",
  "DEFENDER",
  "DEFENDER",
  "MIDFIELDER",
  "MIDFIELDER",
  "MIDFIELDER",
  "MIDFIELDER",
  "FORWARD",
  "FORWARD",
] as const;

const seedPlayers = async (
  database: Prisma.TransactionClient,
): Promise<void> => {
  for (const [teamIndex, teamId] of SEED_IDS.teams.entries()) {
    for (let teamPlayerIndex = 0;
      teamPlayerIndex < PLAYERS_PER_TEAM;
      teamPlayerIndex += 1) {
      const playerIndex = teamIndex * PLAYERS_PER_TEAM + teamPlayerIndex;
      const player = {
        id: SEED_IDS.players[playerIndex],
        firstName: faker.person.firstName("female"),
        lastName: faker.person.lastName(),
        nationality: faker.location.country(),
        position: positions[teamPlayerIndex],
        pictureUrl: faker.image.avatar(),
        isActive: true,
      };

      await database.player.upsert({
        where: {
          id: player.id,
        },
        update: player,
        create: player,
      });

      // Never reopen or overwrite an existing assignment history when reseeding.
      const assignment = await database.teamPlayer.findFirst({ where: { playerId: player.id } });
      if (assignment == null) {
        await database.teamPlayer.create({ data: {
          id: SEED_IDS.teamPlayers[playerIndex], playerId: player.id, teamId,
          joinedAt: new Date("2026-09-01T00:00:00.000Z"), shirtNumber: teamPlayerIndex + 1,
        } });
      }
    }
  }
};

export { seedPlayers };
