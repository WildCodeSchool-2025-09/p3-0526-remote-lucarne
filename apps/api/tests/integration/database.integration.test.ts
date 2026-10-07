import { runSeeders } from "../../database/seeders";
import prisma from "../../database/prisma";
import { resetAndSeedDatabase } from "../../database/resetAndSeed";
import { randomUUID } from "node:crypto";
import { APP_ROLES } from "../../src/auth/appRole";
import { cleanTestDatabase } from "../helpers/cleanTestDatabase";
import { describe, expect, it } from "vitest";

const seedDatabase = async (): Promise<void> => {
  await prisma.$transaction(async (database) => {
    await runSeeders(database);
  });
};

const readDataset = async () => ({
  roles: await prisma.role.findMany({ orderBy: { name: "asc" } }),
  users: await prisma.appUser.findMany({ orderBy: { id: "asc" } }),
  teams: await prisma.team.findMany({ orderBy: { id: "asc" } }),
  players: await prisma.player.findMany({ orderBy: { id: "asc" } }),
  staff: await prisma.staffMember.findMany({ orderBy: { id: "asc" } }),
});

const expectNoBusinessData = async (): Promise<void> => {
  const counts = await Promise.all([
    prisma.team.count(), prisma.player.count(), prisma.staffMember.count(),
    prisma.league.count(), prisma.season.count(), prisma.leagueSeason.count(),
    prisma.participation.count(), prisma.teamPlayer.count(), prisma.teamStaffMember.count(),
    prisma.matchday.count(), prisma.gameMatch.count(), prisma.matchEvent.count(),
    prisma.matchTeamReservation.count(),
  ]);
  expect(counts).toEqual(Array(13).fill(0));
};

const createBusinessData = async () => {
  const homeTeam = await prisma.team.create({ data: { name: "Manual home team", isActive: true } });
  const awayTeam = await prisma.team.create({ data: { name: "Manual away team", isActive: true } });
  const player = await prisma.player.create({ data: { firstName: "Manual", lastName: "Player" } });
  const staff = await prisma.staffMember.create({ data: { firstName: "Manual", lastName: "Staff", nationality: "France" } });
  const league = await prisma.league.create({ data: { name: "Manual league", country: "France" } });
  const season = await prisma.season.create({ data: {
    name: "2026-2027", startDate: new Date("2026-08-01"), endDate: new Date("2027-06-30"),
  } });
  const edition = await prisma.leagueSeason.create({ data: {
    leagueId: league.id, seasonId: season.id, isCurrent: true, matchdayCount: 22, matchesPerMatchday: 6,
  } });
  await prisma.participation.createMany({ data: [homeTeam.id, awayTeam.id].map((teamId) => ({
    teamId, leagueSeasonId: edition.id, points: 9, rank: 2, status: "REGISTERED",
  })) });
  const playerAssignment = await prisma.teamPlayer.create({ data: {
    teamId: homeTeam.id, playerId: player.id, joinedAt: new Date("2026-08-01"),
    leftAt: new Date("2026-09-01"), shirtNumber: 10,
  } });
  const staffAssignment = await prisma.teamStaffMember.create({ data: {
    teamId: homeTeam.id, staffMemberId: staff.id, joinedAt: new Date("2026-08-01"), jobTitle: "COACH",
  } });
  const matchday = await prisma.matchday.create({ data: { leagueSeasonId: edition.id, number: 1 } });
  const match = await prisma.gameMatch.create({ data: {
    matchdayId: matchday.id, homeTeamId: homeTeam.id, awayTeamId: awayTeam.id,
    matchDate: new Date("2026-09-01"), startTime: new Date("1970-01-01T18:00:00Z"),
    isPublished: true, status: "COMPLETED", homeScore: 2, awayScore: 1,
  } });
  const event = await prisma.matchEvent.create({ data: { matchId: match.id, playerId: player.id, minute: 10 } });

  return { homeTeam, awayTeam, player, staff, league, season, edition, playerAssignment, staffAssignment, matchday, match, event };
};

describe("database reset and seed command", () => {
  it("removes existing users and all business data, retaining only a newly created admin", async () => {
    await seedDatabase();
    await createBusinessData();
    const admin = await prisma.appUser.findUniqueOrThrow({ where: { email: "admin@lucarne.test" } });
    await prisma.appUser.create({ data: {
      roleId: admin.roleId, email: "old@lucarne.test", passwordHash: admin.passwordHash,
      firstName: "Old", lastName: "User",
    } });

    await resetAndSeedDatabase(prisma);

    await expectNoBusinessData();
    const dataset = await readDataset();
    expect(dataset.roles.map(({ name }) => name)).toEqual(Object.values(APP_ROLES).sort());
    expect(dataset.users).toHaveLength(1);
    expect(dataset.users[0]).toMatchObject({ email: "admin@lucarne.test", status: "ACTIVE" });
    expect(dataset.users[0]?.id).not.toBe(admin.id);
    await resetAndSeedDatabase(prisma);
    await expectNoBusinessData();
    expect(await prisma.appUser.count()).toBe(1);
  });

  it("keeps the schema and Prisma migration history", async () => {
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS public._prisma_migrations (
        id VARCHAR(36) PRIMARY KEY,
        checksum VARCHAR(64) NOT NULL,
        finished_at TIMESTAMPTZ,
        migration_name VARCHAR(255) NOT NULL,
        logs TEXT,
        rolled_back_at TIMESTAMPTZ,
        started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        applied_steps_count INTEGER NOT NULL DEFAULT 0
      )
    `;
    const id = randomUUID();
    await prisma.$executeRaw`
      INSERT INTO public._prisma_migrations (id, checksum, migration_name)
      VALUES (${id}, ${"0".repeat(64)}, 'reset_seed_test')
    `;
    const before = await prisma.$queryRaw`SELECT * FROM public._prisma_migrations ORDER BY id`;
    await resetAndSeedDatabase(prisma);
    expect(await prisma.$queryRaw`SELECT * FROM public._prisma_migrations ORDER BY id`).toEqual(before);
    await expectNoBusinessData();
    expect(await prisma.appUser.count()).toBe(1);
  });

  it("rolls back the reset if creating the admin fails", async () => {
    await seedDatabase();
    const business = await createBusinessData();
    const before = await readDataset();
    await prisma.$executeRaw`
      CREATE FUNCTION public.reject_seed_admin() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        RAISE EXCEPTION 'Simulated seed failure';
      END
      $$
    `;
    await prisma.$executeRaw`
      CREATE TRIGGER reject_seed_admin BEFORE INSERT ON public.app_user
      FOR EACH ROW EXECUTE FUNCTION public.reject_seed_admin()
    `;
    try {
      await expect(resetAndSeedDatabase(prisma)).rejects.toThrow();
      expect(await readDataset()).toEqual(before);
      expect(await prisma.gameMatch.findUnique({ where: { id: business.match.id } })).toEqual(business.match);
      expect(await prisma.matchEvent.findUnique({ where: { id: business.event.id } })).toEqual(business.event);
    } finally {
      await prisma.$executeRaw`DROP TRIGGER reject_seed_admin ON public.app_user`;
      await prisma.$executeRaw`DROP FUNCTION public.reject_seed_admin()`;
    }
  });
});

describe("test database", () => {
  it("removes application data", async () => {
    await prisma.role.create({ data: { name: "TEST_ROLE" } });
    expect(await prisma.role.count()).toBe(1);
    await cleanTestDatabase();
    expect(await prisma.role.count()).toBe(0);
  });
});

describe("database seeders", () => {
  it("creates only the active admin account and reference roles", async () => {
    await seedDatabase();
    const dataset = await readDataset();

    expect(dataset.roles.map(({ name }) => name)).toEqual(Object.values(APP_ROLES).sort());
    expect(dataset.users).toHaveLength(1);
    expect(dataset.users[0]).toMatchObject({
      email: "admin@lucarne.test", firstName: "Lucarne", lastName: "Admin", status: "ACTIVE",
      roleId: dataset.roles.find(({ name }) => name === APP_ROLES.ADMIN)?.id,
    });
    await expectNoBusinessData();
  });

  it("is idempotent, including the existing admin account", async () => {
    await seedDatabase();
    const initial = await readDataset();
    await seedDatabase();
    expect(await readDataset()).toEqual(initial);
    await expectNoBusinessData();
  });

  it("preserves manually created business data when running the seeders without a reset", async () => {
    await seedDatabase();
    const business = await createBusinessData();
    const dataset = await readDataset();
    const participations = await prisma.participation.findMany({ orderBy: { teamId: "asc" } });

    await seedDatabase();

    expect(await readDataset()).toEqual(dataset);
    expect(await prisma.league.findUnique({ where: { id: business.league.id } })).toEqual(business.league);
    expect(await prisma.season.findUnique({ where: { id: business.season.id } })).toEqual(business.season);
    expect(await prisma.leagueSeason.findUnique({ where: { id: business.edition.id } })).toEqual(business.edition);
    expect(await prisma.participation.findMany({ orderBy: { teamId: "asc" } })).toEqual(participations);
    expect(await prisma.teamPlayer.findMany()).toEqual([business.playerAssignment]);
    expect(await prisma.teamStaffMember.findMany()).toEqual([business.staffAssignment]);
    expect(await prisma.matchday.findMany()).toEqual([business.matchday]);
    expect(await prisma.gameMatch.findUnique({ where: { id: business.match.id } })).toEqual(business.match);
    expect(await prisma.matchEvent.findMany()).toEqual([business.event]);
  });
});
