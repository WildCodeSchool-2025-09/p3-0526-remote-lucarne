import { randomUUID } from "node:crypto";
import prisma from "../../database/prisma";

const createSeasonForLeague = async (leagueId: string, name = `Season ${randomUUID()}`) => {
  const season = await prisma.season.create({
    data: {
      name,
      startDate: new Date("2026-08-01"),
      endDate: new Date("2027-06-30"),
      leagueSeasons: { create: { leagueId } },
    },
    include: { leagueSeasons: true },
  });
  const edition = season.leagueSeasons[0];
  if (edition == null) throw new Error("Missing test league season");
  return { ...season, leagueSeasonId: edition.id };
};

export { createSeasonForLeague };
