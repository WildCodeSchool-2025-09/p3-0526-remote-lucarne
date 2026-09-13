import { describe, expect, it } from "vitest";
import { updateTeamInputSchema } from "@lucarne/shared/schemas";

describe("updateTeamInputSchema", () => {
  it.each([
    [{ name: " Paris FC " }, { name: "Paris FC" }],
    [{ stadium: " Stade X " }, { stadium: "Stade X" }],
    [{ logoUrl: " https://example.com/logo.png " }, { logoUrl: "https://example.com/logo.png" }],
    [{ isActive: false }, { isActive: false }],
    [{ stadium: null }, { stadium: null }],
    [{ logoUrl: null }, { logoUrl: null }],
  ])("accepts and normalizes a partial PATCH %o", (input, expected) => {
    expect(updateTeamInputSchema.parse(input)).toEqual(expected);
  });

  it("preserves absent optional fields and explicit clearing separately", () => {
    const unchanged = updateTeamInputSchema.parse({ name: "Paris FC" });
    expect(unchanged).not.toHaveProperty("stadium");
    expect(unchanged).not.toHaveProperty("logoUrl");
    expect(updateTeamInputSchema.parse({ stadium: null, logoUrl: null }))
      .toEqual({ stadium: null, logoUrl: null });
  });

  it.each([
    {}, { name: "" }, { name: "   " }, { name: null },
    { name: "a".repeat(151) }, { stadium: "a".repeat(151) },
    { logoUrl: "" }, { logoUrl: "   " }, { logoUrl: "invalid" },
    { isActive: null }, { isActive: "false" }, { id: "team-id" },
  ])("rejects invalid partial input %o", (input) => {
    expect(updateTeamInputSchema.safeParse(input).success).toBe(false);
  });
});
