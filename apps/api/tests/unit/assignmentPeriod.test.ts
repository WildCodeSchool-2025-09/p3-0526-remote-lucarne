import { describe, expect, it } from "vitest";
import { assignmentDate, prepareAssignment } from "../../src/utils/assignmentPeriod";
import { assignmentState, plannedAssignmentWhere } from "../../src/features/player/player.assignment";

const date = (value: string) => new Date(value);
const today = date("2026-10-05");
describe("inclusive assignment periods", () => {
  it("closes an open predecessor the day before a transfer", () => {
    expect(prepareAssignment([{ id: "old", joinedAt: date("2026-01-01"), leftAt: null }], date("2026-10-10"), null, today)).toEqual({ id: "old", leftAt: date("2026-10-09") });
  });
  it("refuses historical conflicts without closing the current assignment", () => {
    expect(() => prepareAssignment([{ id: "old", joinedAt: date("2026-01-01"), leftAt: null }], date("2026-09-01"), date("2026-09-30"), today)).toThrow("chevauche");
  });
  it("refuses a transfer that leaves identical predecessor dates", () => {
    expect(() => prepareAssignment([{ id: "old", joinedAt: date("2026-10-05"), leftAt: null }], date("2026-10-06"), null, today)).toThrow("postérieure");
  });
  it("allows successive dated future periods but refuses a shared end day", () => {
    const periods = [{ id: "first", joinedAt: date("2026-11-01"), leftAt: date("2026-11-10") }];
    expect(prepareAssignment(periods, date("2026-11-11"), date("2026-11-20"), today)).toBeNull();
    expect(() => prepareAssignment(periods, date("2026-11-10"), date("2026-11-20"), today)).toThrow("chevauche");
  });
  it("includes both start and end days and plans future periods with an end", () => {
    expect(assignmentState({ joinedAt: today, leftAt: date("2026-10-06") }, today)).toBe("CURRENT");
    expect(assignmentState({ joinedAt: date("2026-10-01"), leftAt: today }, today)).toBe("CURRENT");
    expect(assignmentState({ joinedAt: date("2026-10-01"), leftAt: date("2026-10-04") }, today)).toBe("HISTORICAL");
    expect(plannedAssignmentWhere(today)).toEqual({ joinedAt: { gt: today } });
    expect(assignmentDate(new Date("2026-10-04T22:30:00Z"))).toEqual(today);
  });
});
