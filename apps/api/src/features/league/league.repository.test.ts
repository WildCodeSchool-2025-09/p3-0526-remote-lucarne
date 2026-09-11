import { beforeEach, describe, expect, it, vi } from "vitest";
import prisma from "../../../database/prisma";
import { createLeague, updateLeagueOptimistic } from "./league.repository";

vi.mock("../../../database/prisma", () => ({
  default: {
    league: {
      create: vi.fn(),
      updateManyAndReturn: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

// The mocked delegate is intentionally extracted for readable assertions.
// eslint-disable-next-line @typescript-eslint/unbound-method
const create = vi.mocked(prisma.league.create);
// eslint-disable-next-line @typescript-eslint/unbound-method
const updateManyAndReturn = vi.mocked(prisma.league.updateManyAndReturn);
// eslint-disable-next-line @typescript-eslint/unbound-method
const findUnique = vi.mocked(prisma.league.findUnique);

describe("createLeague", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates only the League through Prisma", async () => {
    const league = {
      id: "league-id",
      name: "Division 1",
      country: "France",
      logoUrl: null,
      isActive: true,
      version: 0,
      createdAt: new Date("2026-09-09T00:00:00.000Z"),
    };
    create.mockResolvedValue(league);

    await expect(createLeague({
      name: "Division 1",
      country: "France",
      isActive: true,
    })).resolves.toEqual(league);

    expect(create).toHaveBeenCalledOnce();
    expect(create).toHaveBeenCalledWith({
      data: {
        name: "Division 1",
        country: "France",
        isActive: true,
      },
    });
  });

  it("updates only when id and expected version match, then increments version atomically", async () => {
    const league = {
      id: "league-id",
      name: "Division 1",
      country: "France",
      logoUrl: null,
      isActive: true,
      version: 1,
      createdAt: new Date("2026-09-09T00:00:00.000Z"),
    };
    updateManyAndReturn.mockResolvedValue([league]);

    await expect(updateLeagueOptimistic({
      leagueId: "league-id",
      expectedVersion: 0,
      changes: { name: "Division 1" },
    })).resolves.toEqual({ status: "UPDATED", league });

    expect(updateManyAndReturn).toHaveBeenCalledWith({
      where: { id: "league-id", version: 0 },
      data: {
        name: "Division 1",
        version: { increment: 1 },
      },
    });
  });

  it("reports no update when the expected version is stale", async () => {
    updateManyAndReturn.mockResolvedValue([]);
    findUnique.mockResolvedValue({
      id: "league-id",
      name: "Division 1",
      country: "France",
      logoUrl: null,
      isActive: true,
      version: 1,
      createdAt: new Date("2026-09-09T00:00:00.000Z"),
    });

    await expect(updateLeagueOptimistic({
      leagueId: "league-id",
      expectedVersion: 0,
      changes: { name: "Division 1" },
    })).resolves.toEqual({ status: "VERSION_CONFLICT" });
  });
});
