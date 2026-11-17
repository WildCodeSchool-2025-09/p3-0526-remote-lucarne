import { describe, expect, it } from "vitest";
import { publicSearchQuerySchema, publicSearchResultSchema } from "../../../src/schemas/publicSearch.schema";

describe("Public global search contract", () => {
  it("normalizes spaces without rewriting the visible query and uses bounded pagination", () => {
    expect(publicSearchQuerySchema.parse({ q: "  Élite   féminine  " })).toEqual({ q: "Élite féminine", type: "ALL", page: 1, limit: 20 });
    expect(publicSearchQuerySchema.parse({}).q).toBe("");
    for (const query of [{ q: "x" }, { q: "a".repeat(101) }, { limit: 51 }, { page: 0 }, { isActive: false }, { includeDrafts: true }, { type: "STAFF" }, { dateFrom: "2026-10-20", dateTo: "2026-10-18" }]) {
      expect(publicSearchQuerySchema.safeParse(query).success).toBe(false);
    }
  });

  it("keeps public result variants strict and requires a league slug for real links", () => {
    const team = { id: "00000000-0000-4000-8000-000000000001", type: "TEAM", label: "Club", pictureUrl: null, description: null };
    expect(publicSearchResultSchema.parse(team)).toEqual(team);
    expect(publicSearchResultSchema.safeParse({ ...team, version: 3 }).success).toBe(false);
    expect(publicSearchResultSchema.safeParse({ ...team, type: "LEAGUE" }).success).toBe(false);
    expect(publicSearchResultSchema.safeParse({ ...team, type: "GAME_MATCH", matchDate: "2026-10-18", startTime: "18:00", status: "POSTPONED" }).success).toBe(false);
  });
});
