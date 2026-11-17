import type { Prisma } from "../../generated/prisma/client";
import { assignmentDate } from "../../utils/assignmentPeriod";

const currentAssignmentWhere = (
  date = assignmentDate(),
): Prisma.TeamPlayerWhereInput => ({
  joinedAt: { lte: date },
  OR: [{ leftAt: null }, { leftAt: { gte: date } }],
});

const plannedAssignmentWhere = (
  date = assignmentDate(),
): Prisma.TeamPlayerWhereInput => ({ joinedAt: { gt: date } });

const assignmentState = (
  assignment: { joinedAt: Date; leftAt: Date | null },
  date = assignmentDate(),
): "HISTORICAL" | "CURRENT" | "PLANNED" => {
  if (assignment.leftAt !== null && assignment.leftAt < date) return "HISTORICAL";

  return assignment.joinedAt > date ? "PLANNED" : "CURRENT";
};

export {
  assignmentState,
  currentAssignmentWhere,
  plannedAssignmentWhere,
  assignmentDate,
};
