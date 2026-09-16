import { describe, expect, it } from "vitest";
import {
  createSeasonInputSchema,
  seasonListQuerySchema,
  updateSeasonInputSchema,
} from "@lucarne/shared/schemas";

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
      status: "ALL",
      sortBy: "startDate",
      sortOrder: "asc",
    });
  });
});
