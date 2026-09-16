import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSeason, findLeagueForSeasonCreation } from "../../../src/features/season/season.repository";
import { createSeasonService } from "../../../src/features/season/season.service";

vi.mock("../../../src/features/season/season.repository", () => ({
  createSeason: vi.fn(),
  findLeagueForSeasonCreation: vi.fn(),
}));

const findLeague = vi.mocked(findLeagueForSeasonCreation);
const create = vi.mocked(createSeason);
const createdSeason = {
  id: "season-id",
  leagueId: "league-id",
  name: "2026-2027",
  startDate: new Date("2026-08-01T00:00:00.000Z"),
  endDate: new Date("2027-06-30T00:00:00.000Z"),
  isActive: false,
  version: 0,
  createdAt: new Date("2026-09-16T00:00:00.000Z"),
};

describe("createSeasonService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findLeague.mockResolvedValue({ id: "league-id", isActive: true });
    create.mockResolvedValue(createdSeason);
  });

  it("creates an inactive season for an active league", async () => {
    await expect(createSeasonService("league-id", {
      name: "2026-2027",
      startDate: "2026-08-01",
      endDate: "2027-06-30",
    })).resolves.toBe(createdSeason);

    expect(create).toHaveBeenCalledWith("league-id", {
      name: "2026-2027",
      startDate: "2026-08-01",
      endDate: "2027-06-30",
    });
  });

  it("rejects a missing league", async () => {
    findLeague.mockResolvedValue(null);

    await expect(createSeasonService("missing-league", {
      name: "2026-2027",
      startDate: "2026-08-01",
      endDate: "2027-06-30",
    })).rejects.toMatchObject({
      statusCode: 404,
      code: "RESOURCE_NOT_FOUND",
    });

    expect(create).not.toHaveBeenCalled();
  });

  it("rejects an inactive league", async () => {
    findLeague.mockResolvedValue({ id: "league-id", isActive: false });

    await expect(createSeasonService("league-id", {
      name: "2026-2027",
      startDate: "2026-08-01",
      endDate: "2027-06-30",
    })).rejects.toMatchObject({
      statusCode: 409,
      code: "LEAGUE_INACTIVE",
    });

    expect(create).not.toHaveBeenCalled();
  });
});
