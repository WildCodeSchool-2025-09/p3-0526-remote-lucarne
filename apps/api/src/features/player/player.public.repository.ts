import type { PublicPlayerQuery } from "@lucarne/shared";
import prisma from "../../../database/prisma";
import type { Prisma } from "../../generated/prisma/client";
import { publicTeamSelect } from "../team/team.public.repository";

function assignmentWhere(date: Date, teamId?: string): Prisma.TeamPlayerWhereInput {
  return { teamId, joinedAt: { lte: date }, OR: [{ leftAt: null }, { leftAt: { gte: date } }], team: { isActive: true } };
}
export { assignmentWhere as publicPlayerAssignmentWhere };
function playerSelect(date: Date, teamId?: string) {
  return {
    id: true, firstName: true, lastName: true, nationality: true, position: true, pictureUrl: true,
    teamPlayers: { where: assignmentWhere(date, teamId), select: { shirtNumber: true, team: { select: publicTeamSelect } }, orderBy: [{ joinedAt: "desc" }, { id: "asc" }], take: 1 },
  } satisfies Prisma.PlayerSelect;
}
export function listPublicPlayers(query: PublicPlayerQuery, date: Date) {
  const where: Prisma.PlayerWhereInput = {
    isActive: true, position: query.position, teamPlayers: { some: assignmentWhere(date, query.teamId) },
    ...(query.search ? { AND: query.search.split(/\s+/).map((word) => ({ OR: [
      { firstName: { contains: word, mode: "insensitive" as const } }, { lastName: { contains: word, mode: "insensitive" as const } },
    ] })) } : {}),
  };
  return prisma.$transaction([
    prisma.player.findMany({ where, select: playerSelect(date, query.teamId), orderBy: [{ lastName: "asc" }, { firstName: "asc" }, { id: "asc" }], skip: (query.page - 1) * query.limit, take: query.limit }),
    prisma.player.count({ where }),
  ], { isolationLevel: "RepeatableRead" });
}
export const findPublicPlayer = (id: string, date: Date) => prisma.$transaction((transaction) => transaction.player.findFirst({
  where: { id, isActive: true, teamPlayers: { some: assignmentWhere(date) } }, select: playerSelect(date),
}), { isolationLevel: "RepeatableRead" });
