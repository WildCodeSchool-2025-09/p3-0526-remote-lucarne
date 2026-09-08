import { PLAYERS_PER_TEAM, SEED_IDS } from "../../database/seeders/ids";
import { runSeeders } from "../../database/seeders";
import prisma from "../../database/prisma";
import { cleanTestDatabase } from "./cleanTestDatabase";
import { describe, expect, it } from "vitest";

const seedDatabase = async (): Promise<void> => {
  await prisma.$transaction(async (database) => {
    await runSeeders(database);
  });
};

describe("test database", () => {
  it("removes application data", async () => {
    await prisma.role.create({
      data: {
        name: "TEST_ROLE",
      },
    });

    expect(await prisma.role.count()).toBe(1);

    await cleanTestDatabase();

    expect(await prisma.role.count()).toBe(0);
  });
});

describe("database seeders", () => {
  it("creates the complete demonstration dataset", async () => {
    await seedDatabase();

    const [
      leagueCount,
      seasonCount,
      teamCount,
      participationCount,
      playerCount,
      staffCount,
    ] = await Promise.all([
      prisma.league.count({ where: { id: SEED_IDS.league } }),
      prisma.season.count({ where: { id: SEED_IDS.season } }),
      prisma.team.count({ where: { id: { in: [...SEED_IDS.teams] } } }),
      prisma.participation.count({
        where: {
          seasonId: SEED_IDS.season,
          teamId: { in: [...SEED_IDS.teams] },
        },
      }),
      prisma.player.count({
        where: { id: { in: [...SEED_IDS.players] } },
      }),
      prisma.staffMember.count({
        where: { id: { in: [...SEED_IDS.staffMembers] } },
      }),
    ]);

    expect({
      leagueCount,
      seasonCount,
      teamCount,
      participationCount,
      playerCount,
      staffCount,
    }).toEqual({
      leagueCount: 1,
      seasonCount: 1,
      teamCount: 2,
      participationCount: 2,
      playerCount: PLAYERS_PER_TEAM * 2,
      staffCount: 2,
    });

    for (const teamId of SEED_IDS.teams) {
      await expect(prisma.player.count({ where: { teamId } }))
        .resolves.toBe(PLAYERS_PER_TEAM);
      await expect(prisma.staffMember.count({
        where: { teamId, jobTitle: "COACH" },
      })).resolves.toBe(1);
      await expect(prisma.participation.findUnique({
        where: {
          teamId_seasonId: {
            teamId,
            seasonId: SEED_IDS.season,
          },
        },
      })).resolves.toMatchObject({
        points: 0,
        rank: null,
        status: "REGISTERED",
      });
    }
  });

  it("is idempotent and deterministic", async () => {
    await seedDatabase();

    const initialPlayers = await prisma.player.findMany({
      where: { id: { in: [...SEED_IDS.players] } },
      orderBy: { id: "asc" },
    });

    await seedDatabase();

    const playersAfterSecondRun = await prisma.player.findMany({
      where: { id: { in: [...SEED_IDS.players] } },
      orderBy: { id: "asc" },
    });

    expect(playersAfterSecondRun).toEqual(initialPlayers);
    await expect(prisma.player.count({
      where: { id: { in: [...SEED_IDS.players] } },
    })).resolves.toBe(PLAYERS_PER_TEAM * 2);
  });
});
