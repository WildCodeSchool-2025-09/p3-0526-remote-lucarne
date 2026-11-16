import { describe, expect, it } from "vitest";
import { publicPlayerProfileSchema, publicPlayerQuerySchema, publicStaffProfileSchema, publicTeamQuerySchema, publicTeamRosterSchema } from "../../../src/schemas/publicPortal.schema";

const id = "00000000-0000-4000-8000-000000000001";
const player = { id, firstName: "Alex", lastName: "Martin", nationality: null, position: null, pictureUrl: null, shirtNumber: null, team: { id, name: "Club", logoUrl: null, stadium: null } };

describe("Public portal contracts", () => {
  it("bounds pagination, trims search and keeps legacy pagination out of new lists", () => {
    expect(publicTeamQuerySchema.parse({ search: " Club " })).toEqual({ page: 1, limit: 20, search: "Club" });
    expect(publicPlayerQuerySchema.parse({ page: "2", limit: "50", teamId: id })).toMatchObject({ page: 2, limit: 50, teamId: id });
    for (const query of [{ page: 0 }, { limit: 51 }, { pageSize: 20 }, { isActive: false }, { includeInactive: true }, { search: "a".repeat(101) }, { leagueId: "invalid" }]) {
      expect(publicTeamQuerySchema.safeParse(query).success).toBe(false);
    }
  });

  it("accepts missing sporting information and rejects administrative fields at every level", () => {
    expect(publicPlayerProfileSchema.parse(player)).toEqual(player);
    for (const extra of [{ birthDate: "2000-01-01" }, { version: 3 }, { accountId: id }, { teamPlayerId: id }, { isActive: true }]) {
      expect(publicPlayerProfileSchema.safeParse({ ...player, ...extra }).success).toBe(false);
    }
    expect(publicPlayerProfileSchema.safeParse({ ...player, team: { ...player.team, isActive: true } }).success).toBe(false);
    expect(publicPlayerProfileSchema.safeParse({ ...player, shirtNumber: 0 }).success).toBe(false);
    expect(publicTeamRosterSchema.safeParse({ date: "2026-02-30", players: [], staffMembers: [] }).success).toBe(false);
    expect(publicStaffProfileSchema.safeParse({ id, firstName: "Sam", lastName: "Martin", nationality: "France", pictureUrl: null, jobTitle: "Coach", team: player.team, assignments: [] }).success).toBe(false);
  });
});
