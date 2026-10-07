import { describe, expect, it } from "vitest";
import { assignmentDatesSchema, createPlayerAssignmentInputSchema, createPlayerInputSchema, createStaffAssignmentInputSchema, createStaffMemberInputSchema, parisDate } from "@lucarne/shared";

const teamId = "123e4567-e89b-42d3-a456-426614174000";
describe("assignment civil dates", () => {
  it.each(["1900-01-01", "2026-10-05", "2099-01-01"])("accepts past and future starts: %s", (joinedAt) => {
    expect(createPlayerAssignmentInputSchema.parse({ teamId, joinedAt }).joinedAt).toBe(joinedAt);
    expect(createStaffAssignmentInputSchema.parse({ teamId, jobTitle: "Coach", joinedAt }).joinedAt).toBe(joinedAt);
  });
  it.each([null, "", "  "])("normalizes an empty end %s", (leftAt) => {
    expect(assignmentDatesSchema.parse({ joinedAt: "2026-10-01", leftAt }).leftAt).toBeNull();
  });
  it("preserves an omitted end for PATCH and accepts a later end", () => {
    expect(assignmentDatesSchema.parse({ joinedAt: "2026-10-01" })).toEqual({ joinedAt: "2026-10-01" });
    expect(assignmentDatesSchema.parse({ joinedAt: "2026-10-01", leftAt: "2026-10-02" }).leftAt).toBe("2026-10-02");
  });
  it.each([
    {}, { joinedAt: "" }, { joinedAt: "2026-02-30" },
    { joinedAt: "2026-10-01", leftAt: "2026-10-01" },
    { joinedAt: "2026-10-01", leftAt: "2026-09-30" },
    { joinedAt: "2026-10-01", leftAt: "invalid" },
  ])("rejects invalid periods %o", (input) => {
    expect(assignmentDatesSchema.safeParse(input).success).toBe(false);
    expect(createPlayerAssignmentInputSchema.safeParse({ teamId, ...input }).success).toBe(false);
    expect(createStaffAssignmentInputSchema.safeParse({ teamId, jobTitle: "Coach", ...input }).success).toBe(false);
  });
  it("rejects an end without an initial assignment", () => {
    expect(createPlayerInputSchema.safeParse({ firstName: "Marie", lastName: "Martin", leftAt: "2026-10-31" }).success).toBe(false);
    expect(createStaffMemberInputSchema.safeParse({ firstName: "Marie", lastName: "Martin", nationality: "France", leftAt: "2026-10-31" }).success).toBe(false);
  });
  it("uses the Paris calendar across midnight and daylight saving time", () => {
    expect(parisDate(new Date("2026-10-04T22:30:00Z"))).toBe("2026-10-05");
    expect(parisDate(new Date("2026-12-31T23:30:00Z"))).toBe("2027-01-01");
    expect(parisDate(new Date("2026-03-29T00:30:00Z"))).toBe("2026-03-29");
  });
});
