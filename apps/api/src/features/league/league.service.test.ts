import type { League } from "../../generated/prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createLeague } from "./league.repository";
import { createLeagueService } from "./league.service";

vi.mock("./league.repository", () => ({
  createLeague: vi.fn(),
}));

const create = vi.mocked(createLeague);
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
});
