import { beforeEach, describe, expect, it, vi } from "vitest";
import { setCurrentSeason } from "../../../src/features/season/season.repository";
import { setCurrentSeasonService } from "../../../src/features/season/season.service";

vi.mock("../../../src/features/season/season.repository", () => ({
  setCurrentSeason: vi.fn(),
}));

const setCurrent = vi.mocked(setCurrentSeason);
const currentSeason = {
  id: "edition-id", leagueId: "league-id", seasonId: "season-id", isCurrent: true,
  matchdayCount: null, matchesPerMatchday: null,
  createdAt: new Date("2026-09-16T00:00:00.000Z"),
  league: { id: "league-id", name: "League", country: "France" },
};

describe("setCurrentSeasonService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setCurrent.mockResolvedValue(currentSeason);
  });

  it("returns the season made current for its league", async () => {
    await expect(setCurrentSeasonService("league-id", "season-id")).resolves.toBe(currentSeason);
    expect(setCurrent).toHaveBeenCalledWith("league-id", "season-id");
  });

  it("rejects a season that does not belong to the league", async () => {
    setCurrent.mockResolvedValue(null);

    await expect(setCurrentSeasonService("league-id", "other-season-id")).rejects.toMatchObject({
      statusCode: 404,
      code: "RESOURCE_NOT_FOUND",
    });
  });
});
