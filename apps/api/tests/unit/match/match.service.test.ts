import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "../../../src/generated/prisma/client";
import { mutateMatch } from "../../../src/features/match/match.repository";
import { updateMatchService } from "../../../src/features/match/match.service";

vi.mock("../../../src/features/match/match.repository", () => ({
  createMatch: vi.fn(), findMatch: vi.fn(), listMatches: vi.fn(), mutateMatch: vi.fn(),
}));

describe("MATCH service transaction failures", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    { code: "P2034" },
    { code: "P2010", meta: { code: "40P01" } },
    { code: "P2010", meta: { code: "40001" } },
    { code: "P2039", meta: { driverAdapterError: { cause: { code: "40P01" } } } },
    { code: "P2039", meta: { driverAdapterError: { cause: { code: "40001" } } } },
  ])("returns a recoverable conflict for $code / $meta", async ({ code, meta }) => {
    vi.mocked(mutateMatch).mockRejectedValue(new Prisma.PrismaClientKnownRequestError("Transaction conflict", { code, meta, clientVersion: "7" }));
    await expect(updateMatchService("match-id", { version: 0, stadium: "Terrain" })).rejects.toMatchObject({ statusCode: 409, code: "RESOURCE_VERSION_CONFLICT" });
  });

  it.each(["LM001", "LM002", "XX000"])("preserves %s for the common error mapper", async (sqlState) => {
    const error = new Prisma.PrismaClientKnownRequestError("Database error", { code: "P2039", meta: { driverAdapterError: { cause: { code: sqlState } } }, clientVersion: "7" });
    vi.mocked(mutateMatch).mockRejectedValue(error);
    await expect(updateMatchService("match-id", { version: 0, stadium: "Terrain" })).rejects.toBe(error);
  });
});
