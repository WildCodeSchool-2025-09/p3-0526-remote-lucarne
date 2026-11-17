import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "../../../src/generated/prisma/client";
import { resetAndSeedDatabase } from "../../../database/resetAndSeed";
import { runSeeders } from "../../../database/seeders";

vi.mock("../../../src/config/environment", () => ({
  environment: { nodeEnv: "production" },
}));
vi.mock("../../../database/seeders", () => ({ runSeeders: vi.fn() }));

describe("production seed protection", () => {
  it("refuses reset before opening a transaction or running seeders", async () => {
    const transaction = vi.fn();
    const prisma = { $transaction: transaction } as unknown as PrismaClient;

    await expect(resetAndSeedDatabase(prisma)).rejects.toThrow(
      "Database seeding is forbidden in production",
    );
    expect(transaction).not.toHaveBeenCalled();
    expect(runSeeders).not.toHaveBeenCalled();
  });
});
