import { describe, expect, it } from "vitest";
import { createStaffMemberInputSchema, updateStaffMemberInputSchema } from "@lucarne/shared/schemas";

const identity = { firstName: " Camille ", lastName: " Durand ", nationality: " France " };
const normalizedIdentity = { firstName: "Camille", lastName: "Durand", nationality: "France" };
const teamId = "123e4567-e89b-42d3-a456-426614174000";

describe("createStaffMemberInputSchema", () => {
  it("creates an independent staff member and normalizes the optional picture URL", () => {
    expect(createStaffMemberInputSchema.parse({ ...identity, pictureUrl: " " })).toEqual({ ...normalizedIdentity, pictureUrl: null });
  });

  it("accepts a complete initial assignment", () => {
    expect(createStaffMemberInputSchema.parse({
      ...identity, pictureUrl: " https://example.com/staff.png ", teamId, jobTitle: " Coach ", joinedAt: "2026-09-01",
    })).toEqual({ ...normalizedIdentity, pictureUrl: "https://example.com/staff.png", teamId, jobTitle: "Coach", joinedAt: "2026-09-01" });
  });

  it.each([
    { firstName: "Camille", lastName: "Durand" },
    { ...normalizedIdentity, nationality: "   " },
    { ...normalizedIdentity, pictureUrl: "invalid" },
    { ...normalizedIdentity, teamId },
    { ...normalizedIdentity, jobTitle: "Coach" },
    { ...normalizedIdentity, joinedAt: "2026-09-01" },
    { ...normalizedIdentity, teamId, jobTitle: "Coach", joinedAt: "not-a-date" },
  ])("rejects incomplete or invalid staff creation input %o", (input) => {
    expect(createStaffMemberInputSchema.safeParse(input).success).toBe(false);
  });
});

describe("updateStaffMemberInputSchema", () => {
  it("accepts a partial update with a version", () => {
    expect(updateStaffMemberInputSchema.parse({ nationality: " Belgium ", version: 2 })).toEqual({ nationality: "Belgium", version: 2 });
  });

  it.each([
    { version: 0 },
    { firstName: "Camille" },
    { version: 0, teamId },
    { version: -1, firstName: "Camille" },
  ])("rejects invalid staff update input %o", (input) => {
    expect(updateStaffMemberInputSchema.safeParse(input).success).toBe(false);
  });
});
