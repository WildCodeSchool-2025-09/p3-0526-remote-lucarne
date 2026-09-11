import type { League } from "../../generated/prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createLeague, updateLeagueOptimistic } from "./league.repository";
import { createLeagueService, updateLeagueService } from "./league.service";

vi.mock("./league.repository", () => ({
  createLeague: vi.fn(),
  updateLeagueOptimistic: vi.fn(),
}));

const create = vi.mocked(createLeague);
const update = vi.mocked(updateLeagueOptimistic);
const createdLeague: League = {
  id: "league-id",
  name: "Division 1",
  country: "France",
  logoUrl: null,
  isActive: true,
  version: 0,
  createdAt: new Date("2026-09-09T00:00:00.000Z"),
};

describe("createLeagueService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    create.mockResolvedValue(createdLeague);
    update.mockResolvedValue({ status: "UPDATED", league: createdLeague });
  });

  it("defaults isActive to false and returns the created League", async () => {
    await expect(createLeagueService({
      name: "Division 1",
      country: "France",
    })).resolves.toBe(createdLeague);

    expect(create).toHaveBeenCalledOnce();
    expect(create).toHaveBeenCalledWith({
      name: "Division 1",
      country: "France",
      isActive: false,
    });
  });

  it("preserves an explicit isActive value", async () => {
    await createLeagueService({
      name: "Division 1",
      country: "France",
      isActive: false,
    });

    expect(create).toHaveBeenCalledWith({
      name: "Division 1",
      country: "France",
      isActive: false,
    });
  });

  it("propagates repository errors, including duplicate errors", async () => {
    const duplicateError = new Error("duplicate league");
    create.mockRejectedValue(duplicateError);

    await expect(createLeagueService({
      name: "Division 1",
      country: "France",
    })).rejects.toBe(duplicateError);
  });

  it("updates only the supplied business fields for an authorized editor", async () => {
    await expect(updateLeagueService({
      leagueId: "league-id",
      expectedVersion: 0,
      changes: { name: "Updated League" },
    }, "EDITOR")).resolves.toBe(createdLeague);

    expect(update).toHaveBeenCalledWith({
      leagueId: "league-id",
      expectedVersion: 0,
      changes: { name: "Updated League" },
    });
  });

  it.each(["MODERATOR", "EDITOR"] as const)("rejects status changes for %s", async (role) => {
    await expect(updateLeagueService({
      leagueId: "league-id",
      expectedVersion: 0,
      changes: { isActive: true },
    }, role)).rejects.toMatchObject({ statusCode: 403, code: "INSUFFICIENT_ROLE" });

    expect(update).not.toHaveBeenCalled();
  });

  it("maps a stale version to the shared conflict error", async () => {
    update.mockResolvedValue({ status: "VERSION_CONFLICT" });

    await expect(updateLeagueService({
      leagueId: "league-id",
      expectedVersion: 0,
      changes: { name: "Updated League" },
    }, "ADMIN")).rejects.toMatchObject({
      statusCode: 409,
      code: "RESOURCE_VERSION_CONFLICT",
    });
  });
});
