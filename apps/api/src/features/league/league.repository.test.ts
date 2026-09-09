import { beforeEach, describe, expect, it, vi } from "vitest";
import prisma from "../../../database/prisma";
import { createLeague } from "./league.repository";

vi.mock("../../../database/prisma", () => ({
  default: {
    league: {
      create: vi.fn(),
    },
  },
}));

const create = vi.mocked(prisma.league.create);

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
});
