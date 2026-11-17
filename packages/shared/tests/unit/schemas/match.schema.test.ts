import { describe, expect, it } from "vitest";
import {
  MATCH_TIME_ZONE,
  createMatchInputSchema,
  deleteMatchInputSchema,
  matchListQuerySchema,
  matchPublicationSchema,
  matchStartTimeSchema,
  matchStatusSchema,
  publishMatchInputSchema,
  updateMatchInputSchema,
  updateMatchResultInputSchema,
  updateMatchStatusInputSchema,
} from "@lucarne/shared";

const matchdayId = "1dcb895d-ffa5-4f7e-9ec0-c210f9041f6c";
const homeTeamId = "2dcb895d-ffa5-4f7e-9ec0-c210f9041f6c";
const awayTeamId = "3dcb895d-ffa5-4f7e-9ec0-c210f9041f6c";
const publication = { matchdayId, homeTeamId, awayTeamId, matchDate: "2026-10-05", startTime: "18:30", stadium: null };

describe("match preparation and publication", () => {
  it("creates an empty slot with only its matchday", () => {
    expect(createMatchInputSchema.parse({ matchdayId })).toEqual({ matchdayId });
    expect(createMatchInputSchema.safeParse({ matchdayId, leagueId: homeTeamId }).success).toBe(false);
    expect(createMatchInputSchema.safeParse({ matchdayId: "invalid" }).success).toBe(false);
  });

  it("accepts a complete publication with an optional venue represented as null", () => {
    expect(matchPublicationSchema.parse(publication)).toEqual(publication);
    expect(MATCH_TIME_ZONE).toBe("Europe/Paris");
  });

  it.each(["homeTeamId", "awayTeamId", "matchDate", "startTime"] as const)("requires %s before publication", (field) => {
    expect(matchPublicationSchema.safeParse({ ...publication, [field]: null }).success).toBe(false);
    expect(matchPublicationSchema.safeParse({ ...publication, [field]: undefined }).success).toBe(false);
  });

  it("rejects identical teams and invalid civil dates", () => {
    expect(matchPublicationSchema.safeParse({ ...publication, awayTeamId: homeTeamId }).success).toBe(false);
    expect(matchPublicationSchema.safeParse({ ...publication, matchDate: "2026-02-30" }).success).toBe(false);
    expect(matchPublicationSchema.safeParse({ ...publication, matchDate: "2026-10-05T16:30:00Z" }).success).toBe(false);
  });

  it.each(["00:00", "23:59"])("accepts the civil time %s", (time) => {
    expect(matchStartTimeSchema.parse(time)).toBe(time);
  });

  it.each(["24:00", "18:60", "8:30", "18:30:00", "18:30Z", "18:30+02:00"])("rejects the time %s", (time) => {
    expect(matchStartTimeSchema.safeParse(time).success).toBe(false);
  });

  it("normalizes a venue but rejects blank and oversized values", () => {
    expect(updateMatchInputSchema.parse({ version: 0, stadium: "  Stade municipal  " }).stadium).toBe("Stade municipal");
    for (const stadium of [" ", "x".repeat(151)]) {
      expect(updateMatchInputSchema.safeParse({ version: 0, stadium }).success).toBe(false);
    }
  });
});

describe("match mutation boundaries", () => {
  it("distinguishes omission from explicit clearing in a draft", () => {
    expect(updateMatchInputSchema.parse({ version: 1, stadium: null })).toEqual({ version: 1, stadium: null });
    expect(updateMatchInputSchema.parse({ version: 1, homeTeamId: null })).toEqual({ version: 1, homeTeamId: null });
    expect(updateMatchInputSchema.safeParse({ version: 1 }).success).toBe(false);
    expect(updateMatchInputSchema.safeParse({ version: 1, stadium: undefined }).success).toBe(false);
    expect(updateMatchInputSchema.safeParse({ version: 1, matchdayId: null }).success).toBe(false);
  });

  it("rejects identical submitted teams and validates the merged state separately", () => {
    expect(updateMatchInputSchema.safeParse({ version: 1, homeTeamId, awayTeamId: homeTeamId }).success).toBe(false);
    const patch = updateMatchInputSchema.parse({ version: 1, awayTeamId: homeTeamId });
    expect(matchPublicationSchema.safeParse({ ...publication, awayTeamId: patch.awayTeamId }).success).toBe(false);
  });

  it("keeps result, status and publication out of the scheduling PATCH", () => {
    for (const field of ["status", "homeScore", "isPublished", "leagueSeasonId", "isActive"]) {
      expect(updateMatchInputSchema.safeParse({ version: 0, stadium: null, [field]: true }).success).toBe(false);
    }
  });

  it.each([
    { schema: publishMatchInputSchema, payload: {} },
    { schema: deleteMatchInputSchema, payload: {} },
    { schema: updateMatchStatusInputSchema, payload: { status: "COMPLETED" } },
    { schema: updateMatchResultInputSchema, payload: { homeScore: 0, awayScore: 0 } },
    { schema: updateMatchInputSchema, payload: { stadium: null } },
  ])(
    "requires optimistic versions on every mutation", ({ schema, payload }) => {
      expect(schema.safeParse({ ...payload, version: 0 }).success).toBe(true);
      for (const version of [undefined, null, -1, 0.5, "0", 2_147_483_648]) {
        expect(schema.safeParse({ ...payload, version }).success).toBe(false);
      }
    },
  );

  it("accepts only the three sporting statuses", () => {
    for (const status of ["SCHEDULED", "IN_PROGRESS", "COMPLETED"]) {
      expect(updateMatchStatusInputSchema.parse({ version: 0, status }).status).toBe(status);
    }
    expect(matchStatusSchema.safeParse("POSTPONED").success).toBe(false);
  });

  it("accepts a real 0–0 result and requires both integer scores", () => {
    expect(updateMatchResultInputSchema.parse({ version: 2, homeScore: 0, awayScore: 0 })).toEqual({ version: 2, homeScore: 0, awayScore: 0 });
    for (const homeScore of [undefined, null, -1, 0.5, "2", 2_147_483_648]) {
      expect(updateMatchResultInputSchema.safeParse({ version: 2, homeScore, awayScore: 0 }).success).toBe(false);
    }
    expect(updateMatchResultInputSchema.safeParse({ version: 2, homeScore: 0 }).success).toBe(false);
  });
});

describe("match list filters", () => {
  it("applies the neighboring list conventions and chronological defaults", () => {
    expect(matchListQuerySchema.parse({})).toEqual({ page: 1, pageSize: 20, sortBy: "matchDate", sortOrder: "asc" });
  });

  it("parses all approved filters", () => {
    expect(matchListQuerySchema.parse({ page: "2", pageSize: "20", leagueId: matchdayId, seasonId: matchdayId,
      matchdayId, teamId: homeTeamId, status: "COMPLETED", dateFrom: "2026-10-01", dateTo: "2026-10-05", sortOrder: "desc" }))
      .toMatchObject({ page: 2, pageSize: 20, teamId: homeTeamId, status: "COMPLETED", sortOrder: "desc" });
  });

  it.each([
    { dateFrom: "2026-10-06", dateTo: "2026-10-05" }, { page: 0 }, { pageSize: 25 },
    { teamId: "invalid" }, { status: "POSTPONED" }, { sortBy: "stadium" }, { isPublished: false },
  ])("rejects invalid criteria and client visibility overrides", (query) => {
    expect(matchListQuerySchema.safeParse(query).success).toBe(false);
  });
});
