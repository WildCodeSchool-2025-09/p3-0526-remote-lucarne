import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "../../../src/generated/prisma/client";
import { createLeagueSeason, deleteSeason, removeLeagueSeason } from "../../../src/features/season/season.repository";
import { createLeagueSeasonService, deleteSeasonService, removeLeagueSeasonService } from "../../../src/features/season/season.service";

vi.mock("../../../src/features/season/season.repository", () => ({
  createLeagueSeason: vi.fn(),
  deleteSeason: vi.fn(),
  removeLeagueSeason: vi.fn(),
}));

const createAssociation = vi.mocked(createLeagueSeason);
const deleteSeasonRecord = vi.mocked(deleteSeason);
const removeAssociation = vi.mocked(removeLeagueSeason);
const input = { seasonId: "season-id", matchdayCount: 22, matchesPerMatchday: 6 };

describe("season association services", () => {
  beforeEach(() => vi.clearAllMocks());

  it("forwards the complete configuration and returns the created association", async () => {
    const edition = {
      id: "edition-id", leagueId: "league-id", ...input, isCurrent: false, createdAt: new Date(),
      league: { id: "league-id", name: "League", country: "France" },
    };
    createAssociation.mockResolvedValue({ status: "CREATED", edition });
    await expect(createLeagueSeasonService("league-id", input)).resolves.toEqual(edition);
    expect(createAssociation).toHaveBeenCalledWith("league-id", input);
  });

  it.each(["LEAGUE_NOT_FOUND", "SEASON_NOT_FOUND"] as const)("maps %s to not found", async (status) => {
    createAssociation.mockResolvedValue({ status });
    await expect(createLeagueSeasonService("league-id", input)).rejects.toMatchObject({ statusCode: 404, code: "RESOURCE_NOT_FOUND" });
  });

  it("maps transaction conflicts to a business conflict", async () => {
    createAssociation.mockRejectedValue(new Prisma.PrismaClientKnownRequestError("Conflict", { code: "P2034", clientVersion: "7" }));
    await expect(createLeagueSeasonService("league-id", input)).rejects.toMatchObject({ statusCode: 409, code: "LEAGUE_SEASON_CONFLICT" });
  });

  it("maps duplicate league-season pairs to a conflict", async () => {
    createAssociation.mockRejectedValue(new Prisma.PrismaClientKnownRequestError("Duplicate", { code: "P2002", clientVersion: "7" }));
    await expect(createLeagueSeasonService("league-id", input)).rejects.toMatchObject({ statusCode: 409, code: "RESOURCE_ALREADY_EXISTS" });
  });

  it.each([
    { code: "P2010", meta: { code: "57014" } },
    { code: "P2039", meta: { driverAdapterError: { cause: { code: "57014" } } } },
  ])("maps generation cancellation to a recoverable error", async ({ code, meta }) => {
    createAssociation.mockRejectedValue(new Prisma.PrismaClientKnownRequestError("SQL cancelled", {
      code, clientVersion: "7", meta,
    }));
    await expect(createLeagueSeasonService("league-id", input)).rejects.toMatchObject({ statusCode: 503, code: "CALENDAR_GENERATION_TIMEOUT" });
  });

  it("prevents deleting a season that remains associated", async () => {
    deleteSeasonRecord.mockResolvedValue({ status: "BLOCKED", leagues: 2 });
    await expect(deleteSeasonService("season-id")).rejects.toMatchObject({ statusCode: 409, code: "SEASON_DELETION_BLOCKED" });
  });

  it("preserves an association containing matchdays or participation history", async () => {
    removeAssociation.mockResolvedValue({ status: "BLOCKED", matchdays: 1, participations: 3 });
    await expect(removeLeagueSeasonService("league-id", "season-id")).rejects.toMatchObject({ statusCode: 409, code: "LEAGUE_SEASON_REMOVAL_BLOCKED" });
  });
});
