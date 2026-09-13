import type { Prisma } from "../../generated/prisma/client";

type AssignmentState = "HISTORICAL" | "CURRENT" | "PLANNED";

const utcDate = (date = new Date()): Date => new Date(date.toISOString().slice(0, 10));

const currentAssignmentWhere = (date = new Date()): Prisma.TeamPlayerWhereInput => ({
  leftAt: null,
  joinedAt: { lte: utcDate(date) },
});

const plannedAssignmentWhere = (date = new Date()): Prisma.TeamPlayerWhereInput => ({
  leftAt: null,
  joinedAt: { gt: utcDate(date) },
});

const assignmentState = (
  assignment: { joinedAt: Date; leftAt: Date | null },
  date = new Date(),
): AssignmentState => {
  if (assignment.leftAt !== null) return "HISTORICAL";
  return assignment.joinedAt > utcDate(date) ? "PLANNED" : "CURRENT";
};

export { assignmentState, currentAssignmentWhere, plannedAssignmentWhere, utcDate };
