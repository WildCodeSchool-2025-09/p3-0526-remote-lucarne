import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "../../../src/generated/prisma/client";
import { updateSeasonOptimistic } from "../../../src/features/season/season.repository";
import { updateSeasonService } from "../../../src/features/season/season.service";

vi.mock("../../../src/features/season/season.repository", () => ({ updateSeasonOptimistic: vi.fn() }));

describe("season update concurrency errors", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    { code: "P2034" },
    { code: "P2010", meta: { code: "40001" } },
    { code: "P2010", meta: { code: "40P01" } },
    { code: "P2039", meta: { driverAdapterError: { cause: { code: "40001" } } } },
    { code: "P2039", meta: { driverAdapterError: { cause: { code: "40P01" } } } },
  ])("translates $code into a recoverable version conflict without retry", async ({ code, meta }) => {
    vi.mocked(updateSeasonOptimistic).mockRejectedValue(new Prisma.PrismaClientKnownRequestError("Private SQL", { code, meta, clientVersion: "7" }));
    await expect(updateSeasonService("season-id", { version: 0, name: "Revised" })).rejects.toMatchObject({
      statusCode: 409,
      code: "RESOURCE_VERSION_CONFLICT",
    });
    expect(updateSeasonOptimistic).toHaveBeenCalledTimes(1);
  });

  it("preserves errors unrelated to concurrency", async () => {
    const error = new Prisma.PrismaClientKnownRequestError("Unknown", { code: "P2039", meta: { code: "XX000" }, clientVersion: "7" });
    vi.mocked(updateSeasonOptimistic).mockRejectedValue(error);
    await expect(updateSeasonService("season-id", { version: 0, name: "Revised" })).rejects.toBe(error);
  });
});
