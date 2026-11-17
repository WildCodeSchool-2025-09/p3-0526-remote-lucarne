import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateSeasonOptimistic } from "../../../src/features/season/season.repository";
import { updateSeasonService } from "../../../src/features/season/season.service";

vi.mock("../../../src/features/season/season.repository", () => ({
  updateSeasonOptimistic: vi.fn(),
}));

const update = vi.mocked(updateSeasonOptimistic);
const updatedSeason = {
  id: "season-id",
  leagueId: "league-id",
  name: "2026-2027 revised",
  startDate: new Date("2026-08-01T00:00:00.000Z"),
  endDate: new Date("2027-06-30T00:00:00.000Z"),
  isActive: false,
  version: 1,
  createdAt: new Date("2026-09-16T00:00:00.000Z"),
};

describe("updateSeasonService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    update.mockResolvedValue({ status: "UPDATED", season: updatedSeason });
  });

  it("updates a season with the expected version", async () => {
    await expect(updateSeasonService("season-id", { version: 0, name: "2026-2027 revised" })).resolves.toBe(updatedSeason);
    expect(update).toHaveBeenCalledWith("season-id", { version: 0, name: "2026-2027 revised" });
  });

  it("maps a stale version to the shared conflict error", async () => {
    update.mockResolvedValue({ status: "VERSION_CONFLICT" });

    await expect(updateSeasonService("season-id", { version: 0, name: "Updated" })).rejects.toMatchObject({
      statusCode: 409,
      code: "RESOURCE_VERSION_CONFLICT",
    });
  });

  it("rejects a period that excludes existing records", async () => {
    update.mockResolvedValue({ status: "PERIOD_CONFLICT", matchdays: 1, matches: 2 });

    await expect(updateSeasonService("season-id", { version: 0, endDate: "2026-01-01" })).rejects.toMatchObject({
      statusCode: 409,
      code: "SEASON_PERIOD_CONFLICT",
    });
  });
});
