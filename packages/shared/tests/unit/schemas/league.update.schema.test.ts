import { describe, expect, it } from "vitest";
import { updateLeagueInputSchema } from "./league.schema";

describe("updateLeagueInputSchema", () => {
  it.each([
    [{ version: 0, name: "Nouvelle Ligue" }],
    [{ version: 2, country: "France", isActive: true }],
    [{ version: 4, logoUrl: null }],
    [{ version: 1, name: "  Ligue Féminine  1  ", country: "Côte d’Ivoire" }],
  ])("accepts a valid partial update", (input) => {
    expect(updateLeagueInputSchema.safeParse(input).success).toBe(true);
  });

  it("trims only the extremities and preserves case, accents and internal spaces", () => {
    expect(updateLeagueInputSchema.parse({
      version: 0,
      name: "  Ligue  Féminine  ",
      country: " Côte d’Ivoire ",
    })).toEqual({
      version: 0,
      name: "Ligue  Féminine",
      country: "Côte d’Ivoire",
    });
  });

  it.each([
    [{}, "empty payload"],
    [{ version: 0 }, "version only"],
    [{ name: "Ligue" }, "missing version"],
    [{ version: -1, name: "Ligue" }, "negative version"],
    [{ version: 1.5, name: "Ligue" }, "decimal version"],
    [{ version: "1", name: "Ligue" }, "string version"],
    [{ version: null, name: "Ligue" }, "null version"],
    [{ version: 0, name: "" }, "empty name"],
    [{ version: 0, name: "   " }, "blank name"],
    [{ version: 0, name: "a".repeat(151) }, "long name"],
    [{ version: 0, country: "" }, "empty country"],
    [{ version: 0, country: "   " }, "blank country"],
    [{ version: 0, country: "a".repeat(101) }, "long country"],
    [{ version: 0, logoUrl: "invalid" }, "invalid logo URL"],
    [{ version: 0, isActive: "true" }, "string status"],
    [{ version: 0, isActive: 1 }, "numeric status"],
    [{ version: 0, isActive: null }, "null status"],
    [{ version: 0, logoUrl: "" }, "empty logo URL"],
    [{ version: 0, id: "league-id", name: "Ligue" }, "id"],
    [{ version: 0, createdAt: "2026-01-01", name: "Ligue" }, "createdAt"],
    [{ version: 0, seasons: [], name: "Ligue" }, "relation"],
    [{ version: 0, unknownField: true, name: "Ligue" }, "unknown field"],
  ])("rejects %s", (input, _description) => {
    void _description;
    expect(updateLeagueInputSchema.safeParse(input).success).toBe(false);
  });

  it("distinguishes absent logoUrl from null", () => {
    expect(updateLeagueInputSchema.parse({ version: 0, name: "Ligue" })).not.toHaveProperty("logoUrl");
    expect(updateLeagueInputSchema.parse({ version: 0, logoUrl: null })).toHaveProperty("logoUrl", null);
  });
});
