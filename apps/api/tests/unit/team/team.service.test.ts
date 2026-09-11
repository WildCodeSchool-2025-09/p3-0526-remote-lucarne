import type { Team as PrismaTeam } from "../../../src/generated/prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTeam } from "../../../src/features/team/team.repository";
import { createTeamService } from "../../../src/features/team/team.service";

vi.mock("../../../src/features/team/team.repository", () => ({
  createTeam: vi.fn(),
}));

const create = vi.mocked(createTeam);
const createdTeam: PrismaTeam = {
  id: "team-id",
  name: "Paris FC",
  logoUrl: null,
  stadium: null,
  isActive: true,
  createdAt: new Date("2026-09-11T12:00:00.000Z"),
};

describe("createTeamService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    create.mockResolvedValue(createdTeam);
  });

  it("normalizes optional fields and calls the repository once", async () => {
    await expect(createTeamService({ name: "Paris FC" })).resolves.toBe(createdTeam);

    expect(create).toHaveBeenCalledOnce();
    expect(create).toHaveBeenCalledWith({
      name: "Paris FC",
      logoUrl: null,
      stadium: null,
    });
  });

  it("passes supplied optional fields to the repository", async () => {
    await createTeamService({
      name: "Paris FC",
      logoUrl: "https://example.com/logo.png",
      stadium: "Stade X",
    });

    expect(create).toHaveBeenCalledWith({
      name: "Paris FC",
      logoUrl: "https://example.com/logo.png",
      stadium: "Stade X",
    });
  });

  it("propagates repository errors", async () => {
    const error = new Error("database unavailable");
    create.mockRejectedValue(error);

    await expect(createTeamService({ name: "Paris FC" })).rejects.toBe(error);
  });
});
