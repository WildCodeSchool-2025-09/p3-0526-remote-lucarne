import { createSeasonForLeague } from "../../helpers/season";
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import prisma from "../../../database/prisma";

const createLeague = () => prisma.league.create({
  data: { name: `League ${randomUUID()}`, country: "France", isActive: true },
});

const createSeason = createSeasonForLeague;

describe("participation database constraints", () => {
  it("allows registration in a future season and rejects a duplicate", async () => {
    const league = await createLeague();
    const season = await createSeason(league.id);
    const team = await prisma.team.create({ data: { name: `Active team ${randomUUID()}` } });

    await expect(prisma.participation.create({
      data: { teamId: team.id, leagueSeasonId: season.leagueSeasonId },
    })).resolves.toMatchObject({
      teamId: team.id,
      leagueSeasonId: season.leagueSeasonId,
      points: 0,
      rank: null,
      status: "REGISTERED",
    });

    await expect(prisma.participation.create({
      data: { teamId: team.id, leagueSeasonId: season.leagueSeasonId },
    })).rejects.toBeDefined();
  });

  it("rejects registration for an inactive team", async () => {
    const league = await createLeague();
    const season = await createSeason(league.id);
    const team = await prisma.team.create({
      data: { name: `Inactive team ${randomUUID()}`, isActive: false },
    });

    await expect(prisma.participation.create({
      data: { teamId: team.id, leagueSeasonId: season.leagueSeasonId },
    })).rejects.toBeDefined();
  });

  it("preserves the participation history when its status is withdrawn and restored", async () => {
    const league = await createLeague();
    const season = await createSeason(league.id);
    const team = await prisma.team.create({ data: { name: `Historical team ${randomUUID()}` } });
    const registrationAt = new Date("2026-08-01T12:00:00.000Z");

    const participation = await prisma.participation.create({
      data: {
        teamId: team.id,
        leagueSeasonId: season.leagueSeasonId,
        registrationAt,
        points: 7,
        rank: 2,
      },
    });

    await prisma.participation.update({
      where: { teamId_leagueSeasonId: { teamId: team.id, leagueSeasonId: season.leagueSeasonId } },
      data: { status: "WITHDRAWN" },
    });
    const restored = await prisma.participation.update({
      where: { teamId_leagueSeasonId: { teamId: team.id, leagueSeasonId: season.leagueSeasonId } },
      data: { status: "REGISTERED" },
    });

    expect(restored).toMatchObject({
      teamId: participation.teamId,
      leagueSeasonId: participation.leagueSeasonId,
      registrationAt,
      points: 7,
      rank: 2,
      status: "REGISTERED",
    });
    await expect(prisma.participation.count({ where: { teamId: team.id, leagueSeasonId: season.leagueSeasonId } })).resolves.toBe(1);
  });

  it("keeps existing matches but blocks new matches after withdrawal", async () => {
    const league = await createLeague();
    const season = await createSeason(league.id);
    const homeTeam = await prisma.team.create({ data: { name: `Home team ${randomUUID()}` } });
    const awayTeam = await prisma.team.create({ data: { name: `Away team ${randomUUID()}` } });
    const matchday = await prisma.matchday.create({
      data: { leagueSeasonId: season.leagueSeasonId, number: 1, startDate: new Date("2030-08-15"), endDate: new Date("2030-08-16") },
    });
    const secondMatchday = await prisma.matchday.create({
      data: { leagueSeasonId: season.leagueSeasonId, number: 2, startDate: new Date("2030-08-22"), endDate: new Date("2030-08-23") },
    });

    await prisma.participation.createMany({
      data: [
        { teamId: homeTeam.id, leagueSeasonId: season.leagueSeasonId },
        { teamId: awayTeam.id, leagueSeasonId: season.leagueSeasonId },
      ],
    });

    const existingMatch = await prisma.gameMatch.create({
      data: {
        matchdayId: matchday.id,
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
        matchDate: new Date("2030-08-15"),
        startTime: new Date("1970-01-01T18:00:00.000Z"),
        status: "SCHEDULED",
      },
    });
    const completedMatch = await prisma.gameMatch.create({
      data: {
        matchdayId: secondMatchday.id,
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
        matchDate: new Date("2030-08-16"),
        startTime: new Date("1970-01-01T18:00:00.000Z"),
        status: "COMPLETED",
        isPublished: true,
        homeScore: 1,
        awayScore: 0,
      },
    });

    await prisma.participation.update({
      where: { teamId_leagueSeasonId: { teamId: homeTeam.id, leagueSeasonId: season.leagueSeasonId } },
      data: { status: "WITHDRAWN" },
    });

    await expect(prisma.gameMatch.create({
      data: {
        matchdayId: matchday.id,
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
        matchDate: new Date("2030-08-22"),
        startTime: new Date("1970-01-01T18:00:00.000Z"),
        status: "SCHEDULED",
      },
    })).rejects.toBeDefined();

    await expect(prisma.gameMatch.update({
      where: { id: existingMatch.id },
      data: { matchdayId: secondMatchday.id },
    })).rejects.toBeDefined();

    await expect(prisma.gameMatch.findUnique({ where: { id: existingMatch.id } })).resolves.toMatchObject({ status: "SCHEDULED" });
    await expect(prisma.gameMatch.findUnique({ where: { id: completedMatch.id } })).resolves.toMatchObject({ status: "COMPLETED", homeScore: 1, awayScore: 0 });
  });
});
