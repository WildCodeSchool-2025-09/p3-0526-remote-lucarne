import { describe, expect, it } from "vitest";
import { createLeagueBodySchema } from "./league.schema";

describe("createLeagueBodySchema", () => {
  it("parses and normalizes a valid payload", () => {
    expect(createLeagueBodySchema.parse({
      name: "  Division 1  ",
      country: " France ",
      logoUrl: " https://example.com/logo.png ",
      isActive: false,
    })).toEqual({
      name: "Division 1",
      country: "France",
      logoUrl: "https://example.com/logo.png",
      isActive: false,
    });
  });

  it("accepts only the required fields", () => {
    expect(createLeagueBodySchema.parse({
      name: "Division 1",
      country: "France",
    })).toEqual({
      name: "Division 1",
      country: "France",
    });
  });

  it.each([
    [{ name: "", country: "France" }, "name"],
    [{ name: "Division 1", country: "" }, "country"],
    [{ name: "a".repeat(151), country: "France" }, "name"],
    [{ name: "Division 1", country: "a".repeat(101) }, "country"],
    [{ name: "Division 1", country: "France", logoUrl: "not-a-url" }, "logoUrl"],
    [{ name: "Division 1", country: "France", isActive: "true" }, "isActive"],
  ])("rejects an invalid %s payload", (payload, _field) => {
    void _field;
    expect(createLeagueBodySchema.safeParse(payload).success).toBe(false);
  });

  it("rejects unknown fields", () => {
    expect(createLeagueBodySchema.safeParse({
      name: "Division 1",
      country: "France",
      seasons: [],
    }).success).toBe(false);
  });
});
