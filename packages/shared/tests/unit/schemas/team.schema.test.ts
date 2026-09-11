import { describe, expect, it } from "vitest";
import { createTeamInputSchema } from "./team.schema";

describe("createTeamInputSchema", () => {
  it("accepts a team with only a name", () => {
    expect(createTeamInputSchema.parse({ name: "Paris FC" })).toEqual({
      name: "Paris FC",
    });
  });

  it("accepts all allowed fields and normalizes them", () => {
    expect(createTeamInputSchema.parse({
      name: "  Paris FC  ",
      logoUrl: "  https://example.com/logo.png  ",
      stadium: "  Stade X  ",
    })).toEqual({
      name: "Paris FC",
      logoUrl: "https://example.com/logo.png",
      stadium: "Stade X",
    });
  });

  it.each([
    [{}, "missing name"],
    [{ name: "" }, "empty name"],
    [{ name: "   " }, "blank name"],
    [{ name: "a".repeat(151) }, "long name"],
    [{ name: "Paris FC", stadium: "a".repeat(151) }, "long stadium"],
    [{ name: "Paris FC", logoUrl: "not-a-url" }, "invalid logo URL"],
  ])("rejects %s", (input, _description) => {
    void _description;
    expect(createTeamInputSchema.safeParse(input).success).toBe(false);
  });

  it("accepts a 150-character name", () => {
    expect(createTeamInputSchema.safeParse({ name: "a".repeat(150) }).success).toBe(true);
  });

  it("accepts a 150-character stadium", () => {
    expect(createTeamInputSchema.safeParse({
      name: "Paris FC",
      stadium: "a".repeat(150),
    }).success).toBe(true);
  });

  it("accepts an absent logo URL", () => {
    expect(createTeamInputSchema.parse({ name: "Paris FC" })).not.toHaveProperty("logoUrl");
  });

  it.each(["", "   "])("normalizes an empty logo URL to null", (logoUrl) => {
    expect(createTeamInputSchema.parse({ name: "Paris FC", logoUrl })).toEqual({
      name: "Paris FC",
      logoUrl: null,
    });
  });

  it("normalizes an empty stadium to null", () => {
    expect(createTeamInputSchema.parse({ name: "Paris FC", stadium: "   " })).toEqual({
      name: "Paris FC",
      stadium: null,
    });
  });

  it.each([
    { name: "Paris FC", isActive: false },
    { name: "Paris FC", id: "team-id" },
    { name: "Paris FC", createdAt: "2026-01-01T00:00:00.000Z" },
    { name: "Paris FC", seasonId: "season-id" },
    { name: "Paris FC", leagueId: "league-id" },
    { name: "Paris FC", unknownField: true },
  ])("rejects generated, relational, or unknown fields: %o", (input) => {
    expect(createTeamInputSchema.safeParse(input).success).toBe(false);
  });

  it("accepts two teams with the same name", () => {
    const first = createTeamInputSchema.safeParse({ name: "Paris FC" });
    const second = createTeamInputSchema.safeParse({ name: "Paris FC" });

    expect(first.success).toBe(true);
    expect(second.success).toBe(true);
  });
});
