import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "../../../src/generated/prisma/client";
import { createSeason } from "../../../src/features/season/season.repository";
import { createSeasonService } from "../../../src/features/season/season.service";

vi.mock("../../../src/features/season/season.repository", () => ({ createSeason: vi.fn() }));
const create = vi.mocked(createSeason);
const input = { name: "2026-2027", startDate: "2026-08-01", endDate: "2027-06-30" };

describe("createSeasonService", () => {
  beforeEach(() => vi.clearAllMocks());
  it("creates a global season without a league", async () => {
    const season = { ...input, id: "season-id", version: 0, startDate: new Date(input.startDate), endDate: new Date(input.endDate), createdAt: new Date() };
    create.mockResolvedValue(season);
    await expect(createSeasonService(input)).resolves.toBe(season);
    expect(create).toHaveBeenCalledWith(input);
  });
  it("maps global duplicate names to a conflict", async () => {
    create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError("Duplicate", { code: "P2002", clientVersion: "7" }));
    await expect(createSeasonService(input)).rejects.toMatchObject({ statusCode: 409, code: "RESOURCE_ALREADY_EXISTS" });
  });
});
