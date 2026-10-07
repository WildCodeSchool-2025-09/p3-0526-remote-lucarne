import { describe, expect, it } from "vitest";
import {
  assignLeagueSeasonInputSchema,
  createSeasonInputSchema,
  seasonListQuerySchema,
  updateSeasonInputSchema,
} from "@lucarne/shared/schemas";

describe("assignLeagueSeasonInputSchema", () => {
  const input = {
    seasonId: "1dcb895d-ffa5-4f7e-9ec0-c210f9041f6c",
    matchdayCount: 22,
    matchesPerMatchday: 6,
  };

  it("accepts independent positive counts for a league season", () => {
    expect(assignLeagueSeasonInputSchema.parse(input)).toEqual(input);
  });

  it.each(["matchdayCount", "matchesPerMatchday"] as const)("requires %s", (field) => {
    const withoutCount: Partial<typeof input> = { ...input };
    delete withoutCount[field];
    expect(assignLeagueSeasonInputSchema.safeParse(withoutCount).success).toBe(false);
  });

  describe.each(["matchdayCount", "matchesPerMatchday"] as const)("%s", (field) => {
    it.each([1, 2_147_483_647])("accepts the storage boundary %s", (count) => {
      expect(assignLeagueSeasonInputSchema.safeParse({ ...input, [field]: count }).success).toBe(true);
    });

    it.each([undefined, null, 0, -1, 1.5, "6", "", true, NaN, Infinity, 2_147_483_648])(
      "rejects invalid count %s", (count) => {
        expect(assignLeagueSeasonInputSchema.safeParse({ ...input, [field]: count }).success).toBe(false);
      },
    );
  });

  it("rejects an invalid season identifier and unknown fields", () => {
    expect(assignLeagueSeasonInputSchema.safeParse({ ...input, seasonId: "invalid" }).success).toBe(false);
    expect(assignLeagueSeasonInputSchema.safeParse({ ...input, generateMatches: true }).success).toBe(false);
  });
});

describe("createSeasonInputSchema", () => {
  it("accepts a valid season", () => {
    expect(createSeasonInputSchema.parse({
      name: "2026-2027",
      startDate: "2026-08-01",
      endDate: "2027-06-30",
    })).toEqual({
      name: "2026-2027",
      startDate: "2026-08-01",
      endDate: "2027-06-30",
    });
  });

  it.each([
    { name: "", startDate: "2026-08-01", endDate: "2027-06-30" },
    { name: "2026-2027", startDate: "2027-06-30", endDate: "2026-08-01" },
    { name: "2026-2027", startDate: "2026-08-01", endDate: "invalid" },
  ])("rejects invalid input", (input) => {
    expect(createSeasonInputSchema.safeParse(input).success).toBe(false);
  });
});

describe("updateSeasonInputSchema", () => {
  it("requires a version and at least one business field", () => {
    expect(updateSeasonInputSchema.safeParse({ version: 0 }).success).toBe(false);
    expect(updateSeasonInputSchema.safeParse({ version: 0, name: "2026-2027" }).success).toBe(true);
  });
});

describe("seasonListQuerySchema", () => {
  it("applies defaults", () => {
    expect(seasonListQuerySchema.parse({})).toMatchObject({
      page: 1,
      pageSize: 20,
      sortBy: "startDate",
      sortOrder: "asc",
    });
  });
});
