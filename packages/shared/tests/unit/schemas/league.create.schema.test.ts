import { describe, expect, it } from "vitest";
import { createLeagueInputSchema } from "@lucarne/shared/schemas";

describe("createLeagueInputSchema", () => {
  it("normalizes required fields without adding optional values", () => {
    expect(createLeagueInputSchema.parse({ name: "  Ligue  Féminine  ", country: " France " }))
      .toEqual({ name: "Ligue  Féminine", country: "France" });
  });

  it("normalizes a supplied logo and preserves an explicit inactive status", () => {
    expect(createLeagueInputSchema.parse({
      name: "Ligue", country: "France", logoUrl: " https://example.com/logo.png ", isActive: false,
    })).toEqual({ name: "Ligue", country: "France", logoUrl: "https://example.com/logo.png", isActive: false });
  });

  it.each([
    {}, { name: "Ligue" }, { country: "France" },
    { name: "", country: "France" }, { name: "   ", country: "France" },
    { name: null, country: "France" }, { name: "Ligue", country: "" },
    { name: "Ligue", country: "   " }, { name: "Ligue", country: null },
    { name: "Ligue", country: "France", logoUrl: null },
    { name: "Ligue", country: "France", logoUrl: "   " },
    { name: "Ligue", country: "France", logoUrl: "invalid" },
    { name: "Ligue", country: "France", isActive: null },
    { name: "Ligue", country: "France", id: "generated-id" },
  ])("rejects invalid creation input %o", (input) => {
    expect(createLeagueInputSchema.safeParse(input).success).toBe(false);
  });
});
