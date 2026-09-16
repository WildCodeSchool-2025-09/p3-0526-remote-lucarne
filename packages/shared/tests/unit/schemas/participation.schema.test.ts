import { describe, expect, it } from "vitest";
import {
  createParticipationInputSchema,
  participationStatusSchema,
  seasonParticipationParamsSchema,
} from "@lucarne/shared/schemas";

const teamId = "11111111-1111-4111-8111-111111111111";
const seasonId = "22222222-2222-4222-8222-222222222222";

describe("createParticipationInputSchema", () => {
  it("accepts a valid team identifier", () => {
    expect(createParticipationInputSchema.parse({ teamId })).toEqual({ teamId });
  });

  it.each([
    {},
    { teamId: "invalid" },
    { teamId, status: "REGISTERED" },
  ])("rejects invalid input", (input) => {
    expect(createParticipationInputSchema.safeParse(input).success).toBe(false);
  });
});

describe("seasonParticipationParamsSchema", () => {
  it("accepts valid season and team identifiers", () => {
    expect(seasonParticipationParamsSchema.parse({ seasonId, teamId })).toEqual({ seasonId, teamId });
  });

  it("rejects invalid identifiers", () => {
    expect(seasonParticipationParamsSchema.safeParse({ seasonId, teamId: "invalid" }).success).toBe(false);
  });
});

describe("participationStatusSchema", () => {
  it.each(["REGISTERED", "WITHDRAWN"] as const)("accepts %s", (status) => {
    expect(participationStatusSchema.parse(status)).toBe(status);
  });

  it("rejects unknown statuses", () => {
    expect(participationStatusSchema.safeParse("PENDING").success).toBe(false);
  });
});
