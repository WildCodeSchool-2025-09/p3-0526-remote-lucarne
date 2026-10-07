import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPlayerService } from "../../../src/features/player/player.service";

const findUnique = vi.hoisted(() => vi.fn());
vi.mock("../../../database/prisma", () => ({ default: { player: { findUnique } } }));

describe("player detail assignment logos", () => {
  beforeEach(() => { findUnique.mockReset(); });

  it.each(["/club-logo.png", null])("selects and returns the existing logo %s", async (logoUrl) => {
    findUnique.mockResolvedValue({
      id: "player-id", firstName: "Alex", lastName: "Martin", nationality: null,
      position: null, birthday: null, pictureUrl: null, isActive: true, version: 0,
      createdAt: new Date("2020-01-01T00:00:00Z"),
      teamPlayers: [{
        id: "assignment-id", joinedAt: new Date("2020-01-01T00:00:00Z"),
        leftAt: null, shirtNumber: null, team: { id: "team-id", name: "Paris FC", logoUrl },
      }],
    });

    const detail = await getPlayerService("player-id");

    expect(findUnique).toHaveBeenCalledWith({
      where: { id: "player-id" },
      include: { teamPlayers: {
        select: { id: true, joinedAt: true, leftAt: true, shirtNumber: true, team: { select: { id: true, name: true, logoUrl: true } } },
        orderBy: [{ joinedAt: "desc" }, { id: "asc" }],
      } },
    });
    expect(detail.assignments[0]).toMatchObject({
      team: { id: "team-id", name: "Paris FC", logoUrl },
      joinedAt: "2020-01-01", leftAt: null, state: "CURRENT",
    });
    expect(detail.activeTeam).toEqual({ id: "team-id", name: "Paris FC" });
  });
});
