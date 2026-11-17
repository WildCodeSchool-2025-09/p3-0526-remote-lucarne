import { describe, expect, it } from "vitest";
import { leagueSlugSchema, publicLeagueDetailSchema, publicLeagueNavigationResponseSchema, publicLeagueTeamsQuerySchema, publicLeagueTeamsResponseSchema } from "../../../src/schemas/league.schema";

describe("Public league contract", () => {
  it("validates minimal paginated public teams and rejects administrative fields", () => {
    const response = {
      data: [{ id: "00000000-0000-4000-8000-000000000001", name: "Équipe", logoUrl: null }],
      pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
    };
    expect(publicLeagueTeamsResponseSchema.parse(response)).toEqual(response);
    for (const extra of [{ isActive: true }, { points: 5 }, { rank: 1 }, { stadium: "Private" }]) {
      expect(publicLeagueTeamsResponseSchema.safeParse({ ...response, data: [{ ...response.data[0], ...extra }] }).success).toBe(false);
    }
    expect(publicLeagueTeamsQuerySchema.parse({})).toEqual({ page: 1, pageSize: 20 });
    expect(publicLeagueTeamsQuerySchema.safeParse({ pageSize: 3 }).success).toBe(false);
    expect(publicLeagueTeamsQuerySchema.safeParse({ status: "ALL" }).success).toBe(false);
  });
  it("accepts a minimal navigation DTO and an empty list", () => {
    expect(publicLeagueNavigationResponseSchema.parse([])).toEqual([]);
    expect(publicLeagueNavigationResponseSchema.safeParse([{ id: "00000000-0000-4000-8000-000000000001", slug: "elite-feminine", name: "Élite", country: "France", logoUrl: null }]).success).toBe(true);
  });

  it.each(["", "../dashboard", "Uppercase", "league/name", "a".repeat(191)])("rejects invalid slug %s", (slug) => {
    expect(leagueSlugSchema.safeParse(slug).success).toBe(false);
  });

  it("rejects administration-only fields", () => {
    expect(publicLeagueNavigationResponseSchema.safeParse([{ id: "00000000-0000-4000-8000-000000000001", slug: "elite", name: "Élite", country: "France", logoUrl: null, version: 1 }]).success).toBe(false);
  });

  it("validates public seasons without exposing administrative configuration", () => {
    const detail = {
      id: "00000000-0000-4000-8000-000000000001", slug: "elite", name: "Élite", logoUrl: null,
      seasons: [{ id: "00000000-0000-4000-8000-000000000002", name: "2026-2027", isCurrent: true }],
    };
    expect(publicLeagueDetailSchema.parse(detail)).toEqual(detail);
    expect(publicLeagueDetailSchema.safeParse({ ...detail, seasons: [] }).success).toBe(true);
    expect(publicLeagueDetailSchema.safeParse({ ...detail, version: 1 }).success).toBe(false);
    expect(publicLeagueDetailSchema.safeParse({ ...detail, seasons: [{ ...detail.seasons[0], matchdayCount: 10 }] }).success).toBe(false);
    expect(publicLeagueDetailSchema.safeParse({ ...detail, seasons: [{ ...detail.seasons[0], id: "invalid" }] }).success).toBe(false);
  });
});
