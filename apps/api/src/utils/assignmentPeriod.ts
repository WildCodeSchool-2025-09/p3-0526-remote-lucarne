import { parisDate } from "@lucarne/shared";
import { AppError } from "../errors/AppError";

type AssignmentPeriod = {
  id: string;
  joinedAt: Date;
  leftAt: Date | null;
};

const assignmentDate = (date = new Date()) => new Date(parisDate(date));
const previousDay = (date: Date) => new Date(date.getTime() - 86_400_000);

const assertPeriod = (joinedAt: Date, leftAt: Date | null) => {
  if (leftAt !== null && leftAt <= joinedAt) {
    throw new AppError(
      400,
      "ASSIGNMENT_INVALID_PERIOD",
      "La date de fin doit être postérieure à la date de début.",
    );
  }
};

const overlaps = (
  period: Pick<AssignmentPeriod, "joinedAt" | "leftAt">,
  otherPeriod: Pick<AssignmentPeriod, "joinedAt" | "leftAt">,
) =>
  (period.leftAt === null || otherPeriod.joinedAt <= period.leftAt)
  && (otherPeriod.leftAt === null || period.joinedAt <= otherPeriod.leftAt);

// Historical insertions never rewrite history. Present/future transfers may close
// the one open predecessor; dated periods are never silently shortened.
const prepareAssignment = (
  periods: AssignmentPeriod[],
  joinedAt: Date,
  leftAt: Date | null,
  date = assignmentDate(),
) => {
  assertPeriod(joinedAt, leftAt);

  const predecessor = joinedAt >= date
    ? periods.find((period) => period.leftAt === null && period.joinedAt < joinedAt)
    : undefined;
  const closure = predecessor ? previousDay(joinedAt) : null;

  if (predecessor && closure) {
    assertPeriod(predecessor.joinedAt, closure);
  }

  if (periods.some((period) => overlaps(
    period.id === predecessor?.id ? { ...period, leftAt: closure } : period,
    { joinedAt, leftAt },
  ))) {
    throw new AppError(
      409,
      "ASSIGNMENT_PERIOD_CONFLICT",
      "Cette période chevauche une autre affectation.",
    );
  }

  return predecessor && closure ? { id: predecessor.id, leftAt: closure } : null;
};

export { assignmentDate, assertPeriod, overlaps, prepareAssignment, previousDay };
