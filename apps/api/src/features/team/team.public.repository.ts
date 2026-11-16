import type { PublicTeamQuery } from "@lucarne/shared";
import prisma from "../../../database/prisma";
import type { Prisma } from "../../generated/prisma/client";
import { publicEditionSelect } from "../season/season.public.repository";

export const publicTeamSelect = { id: true, name: true, logoUrl: true, stadium: true } as const;

export function listPublicTeams(query: PublicTeamQuery) {
  const where: Prisma.TeamWhereInput = {
    isActive: true,
    ...(query.search ? { name: { contains: query.search, mode: "insensitive" } } : {}),
    ...(query.leagueId || query.seasonId ? { participations: { some: {
      status: "REGISTERED", leagueSeason: { leagueId: query.leagueId, seasonId: query.seasonId, league: { isActive: true } },
    } } } : {}),
  };
  return prisma.$transaction([
    prisma.team.findMany({ where, select: publicTeamSelect, orderBy: [{ name: "asc" }, { id: "asc" }], skip: (query.page - 1) * query.limit, take: query.limit }),
    prisma.team.count({ where }),
  ], { isolationLevel: "RepeatableRead" });
}

export const findPublicTeam = (id: string) => prisma.$transaction((transaction) => transaction.team.findFirst({
  where: { id, isActive: true },
  select: { ...publicTeamSelect, createdAt: true, participations: {
    where: { status: "REGISTERED", leagueSeason: { league: { isActive: true } } },
    select: { leagueSeason: { select: publicEditionSelect } },
    orderBy: [{ leagueSeason: { season: { startDate: "desc" } } }, { leagueSeasonId: "asc" }],
  } },
}), { isolationLevel: "RepeatableRead" });

export const findPublicTeamRoster = (id: string, date: Date) => prisma.$transaction((transaction) => transaction.team.findFirst({
  where: { id, isActive: true }, select: {
    players: { where: { joinedAt: { lte: date }, OR: [{ leftAt: null }, { leftAt: { gte: date } }], player: { isActive: true } },
      select: { shirtNumber: true, player: { select: { id: true, firstName: true, lastName: true, position: true, pictureUrl: true } } },
      orderBy: [{ player: { lastName: "asc" } }, { player: { firstName: "asc" } }, { playerId: "asc" }],
    },
    staffMembers: { where: { joinedAt: { lte: date }, OR: [{ leftAt: null }, { leftAt: { gte: date } }], staffMember: { isActive: true } },
      select: { jobTitle: true, staffMember: { select: { id: true, firstName: true, lastName: true, pictureUrl: true } } },
      orderBy: [{ jobTitle: "asc" }, { staffMember: { lastName: "asc" } }, { staffMemberId: "asc" }],
    },
  },
}), { isolationLevel: "RepeatableRead" });
