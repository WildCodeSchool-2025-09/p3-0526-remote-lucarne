import type { Team as PrismaTeam } from "../../../src/generated/prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import prisma from "../../../database/prisma";
import { createTeam } from "../../../src/features/team/team.repository";

vi.mock("../../../database/prisma", () => ({
  default: {
    team: {
      create: vi.fn(),
    },
  },
}));

// The mocked delegate is intentionally extracted for readable assertions.
// eslint-disable-next-line @typescript-eslint/unbound-method
const create = vi.mocked(prisma.team.create);
const createdTeam: PrismaTeam = {
  id: "team-id",
  name: "Paris FC",
  logoUrl: null,
  stadium: null,
  isActive: true,
  createdAt: new Date("2026-09-11T12:00:00.000Z"),
};

describe("createTeam repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    create.mockResolvedValue(createdTeam);
  });

  it("creates only a team with nullable optional fields", async () => {
    await expect(createTeam({ name: "Paris FC" })).resolves.toBe(createdTeam);

    expect(create).toHaveBeenCalledOnce();
    expect(create).toHaveBeenCalledWith({
      data: {
        name: "Paris FC",
        logoUrl: null,
        stadium: null,
        isActive: true,
      },
    });
  });

  it("persists the supplied logo URL and stadium", async () => {
    await createTeam({
      name: "Paris FC",
      logoUrl: "https://example.com/logo.png",
      stadium: "Stade X",
    });

    expect(create).toHaveBeenCalledWith({
      data: {
        name: "Paris FC",
        logoUrl: "https://example.com/logo.png",
        stadium: "Stade X",
        isActive: true,
      },
    });
  });

  it("does not create a participation or relation payload", async () => {
    await createTeam({ name: "Paris FC" });

    const [[{ data }]] = create.mock.calls;
    expect(data).not.toHaveProperty("participation");
    expect(data).not.toHaveProperty("seasonId");
    expect(data).not.toHaveProperty("leagueId");
  });

  it("propagates persistence errors", async () => {
    const error = new Error("database unavailable");
    create.mockRejectedValue(error);

    await expect(createTeam({ name: "Paris FC" })).rejects.toBe(error);
  });
});
