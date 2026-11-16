import prisma from "../../../database/prisma";
import { publicTeamSelect } from "../team/team.public.repository";

export function findPublicStaff(id: string, date: Date) {
  const where = { joinedAt: { lte: date }, OR: [{ leftAt: null }, { leftAt: { gte: date } }], team: { isActive: true } };
  return prisma.$transaction((transaction) => transaction.staffMember.findFirst({
    where: { id, isActive: true, teamStaffMembers: { some: where } },
    select: { id: true, firstName: true, lastName: true, nationality: true, pictureUrl: true,
      teamStaffMembers: { where, select: { jobTitle: true, team: { select: publicTeamSelect } }, orderBy: [{ joinedAt: "desc" }, { id: "asc" }], take: 1 },
    },
  }), { isolationLevel: "RepeatableRead" });
}
