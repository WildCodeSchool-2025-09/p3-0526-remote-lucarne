import { beforeEach, describe, expect, it, vi } from "vitest";
import { setCurrentSeason } from "../../../src/features/season/season.repository";
import { setCurrentSeasonService } from "../../../src/features/season/season.service";

vi.mock("../../../src/features/season/season.repository", () => ({
  setCurrentSeason: vi.fn(),
}));

const setCurrent = vi.mocked(setCurrentSeason);
const currentSeason = {
  id: "season-id",
  leagueId: "league-id",
  name: "2026-2027",
  startDate: new Date("2026-08-01T00:00:00.000Z"),
  endDate: new Date("2027-06-30T00:00:00.000Z"),
  isActive: true,
  version: 1,
  createdAt: new Date("2026-09-16T00:00:00.000Z"),
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
