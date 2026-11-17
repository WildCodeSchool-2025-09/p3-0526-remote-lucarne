import { describe, expect, it } from "vitest";
import { createPlayerInputSchema, updatePlayerInputSchema } from "@lucarne/shared/schemas";

const identity = { firstName: "Marie", lastName: "Dupont" };
const teamId = "123e4567-e89b-42d3-a456-426614174000";

describe("createPlayerInputSchema", () => {
  it("trims identity and leaves optional fields absent", () => {
    expect(createPlayerInputSchema.parse({ firstName: " Marie ", lastName: " Dupont " })).toEqual(identity);
  });

  it.each(["", "   ", null])("normalizes empty optional profile values %s to null", (value) => {
    expect(createPlayerInputSchema.parse({
      ...identity, nationality: value, position: value, birthday: value, pictureUrl: value,
    })).toEqual({ ...identity, nationality: null, position: null, birthday: null, pictureUrl: null });
  });

  it("accepts a complete profile and dated team assignment", () => {
    const input = {
      ...identity, nationality: " France ", position: " FORWARD ", birthday: "2000-02-29",
      pictureUrl: " https://example.com/player.png ", teamId, joinedAt: "2026-09-01", shirtNumber: 9,
    };
    expect(createPlayerInputSchema.parse(input)).toEqual({
      ...input, nationality: "France", position: "FORWARD", pictureUrl: "https://example.com/player.png",
    });
  });

  it.each([
    {}, { firstName: "Marie" }, { lastName: "Dupont" },
    { ...identity, firstName: "" }, { ...identity, firstName: "   " },
    { ...identity, lastName: "   " }, { ...identity, firstName: null },
    { ...identity, firstName: "a".repeat(101) },
    { ...identity, nationality: "a".repeat(101) },
    { ...identity, position: "a".repeat(51) },
    { ...identity, birthday: "2026-02-30" }, { ...identity, pictureUrl: "invalid" },
    { ...identity, teamId }, { ...identity, teamId: "invalid", joinedAt: "2026-09-01" },
    { ...identity, teamId, joinedAt: "2026-09-01", shirtNumber: 0 },
    { ...identity, teamId, joinedAt: "2026-09-01", shirtNumber: 100 },
    { ...identity, isActive: false },
  ])("rejects invalid creation input %o", (input) => {
    expect(createPlayerInputSchema.safeParse(input).success).toBe(false);
  });
});

describe("updatePlayerInputSchema", () => {
  it("accepts identity and version with optional fields absent", () => {
    expect(updatePlayerInputSchema.parse({ ...identity, version: 0 })).toEqual({ ...identity, version: 0 });
  });

  it("preserves explicit nulls while normalizing supplied profile fields", () => {
    expect(updatePlayerInputSchema.parse({
      ...identity, version: 2, nationality: " France ", position: "   ", birthday: null, pictureUrl: null,
    })).toEqual({ ...identity, version: 2, nationality: "France", position: null, birthday: null, pictureUrl: null });
  });

  it.each([
    { version: 0, firstName: "Marie" },
    { version: 0, lastName: "Dupont" },
    { version: 0, isActive: false },
  ])("accepts a partial PATCH without resending identity: %o", (input) => {
    expect(updatePlayerInputSchema.parse(input)).toEqual(input);
  });

  it.each([
    identity, { version: 0 }, { version: 0, isActive: undefined }, { ...identity, version: -1 }, { ...identity, version: 1.5 },
    { ...identity, version: null }, { ...identity, version: "1" },
    { ...identity, version: 0, firstName: "   " },
    { ...identity, version: 0, isActive: null },
    { ...identity, version: 0, teamId },
  ])("rejects invalid update input %o", (input) => {
    expect(updatePlayerInputSchema.safeParse(input).success).toBe(false);
  });
});
