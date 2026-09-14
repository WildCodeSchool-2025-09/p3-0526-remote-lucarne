import type { Prisma } from "../../generated/prisma/client";

type AssignmentState = "HISTORICAL" | "CURRENT" | "PLANNED";

const utcDate = (date = new Date()): Date => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
const currentAssignmentWhere = (date = new Date()): Prisma.TeamStaffMemberWhereInput => ({ joinedAt: { lte: utcDate(date) }, OR: [{ leftAt: null }, { leftAt: { gt: utcDate(date) } }] });
const plannedAssignmentWhere = (date = new Date()): Prisma.TeamStaffMemberWhereInput => ({ joinedAt: { gt: utcDate(date) }, leftAt: null });
const assignmentState = (assignment: { joinedAt: Date; leftAt: Date | null }, date = new Date()): AssignmentState => {
  if (assignment.leftAt !== null && assignment.leftAt <= utcDate(date)) return "HISTORICAL";
  return assignment.joinedAt > utcDate(date) ? "PLANNED" : "CURRENT";
};

export { assignmentState, currentAssignmentWhere, plannedAssignmentWhere, utcDate };
