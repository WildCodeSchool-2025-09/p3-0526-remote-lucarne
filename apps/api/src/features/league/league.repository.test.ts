import { beforeEach, describe, expect, it, vi } from "vitest";
import prisma from "../../../database/prisma";
import { createLeague, updateLeagueOptimistic } from "./league.repository";

vi.mock("../../../database/prisma", () => ({
  default: {
    league: {
      create: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

// The mocked delegate is intentionally extracted for readable assertions.
// eslint-disable-next-line @typescript-eslint/unbound-method
const create = vi.mocked(prisma.league.create);
// eslint-disable-next-line @typescript-eslint/unbound-method
const updateMany = vi.mocked(prisma.league.updateMany);

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
    updateMany.mockResolvedValue({ count: 1 });

    await expect(updateLeagueOptimistic({
      leagueId: "league-id",
      expectedVersion: 0,
      name: "Division 1",
      country: "France",
      logoUrl: null,
      isActive: true,
    })).resolves.toBe(1);

    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "league-id", version: 0 },
      data: {
        name: "Division 1",
        country: "France",
        logoUrl: null,
        isActive: true,
        version: { increment: 1 },
      },
    });
  });

  it("reports no update when the expected version is stale", async () => {
    updateMany.mockResolvedValue({ count: 0 });

    await expect(updateLeagueOptimistic({
      leagueId: "league-id",
      expectedVersion: 0,
      name: "Division 1",
      country: "France",
      logoUrl: null,
      isActive: true,
    })).resolves.toBe(0);
  });
});
