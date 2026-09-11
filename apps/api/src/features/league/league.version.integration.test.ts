import { describe, expect, it } from "vitest";
import prisma from "../../../database/prisma";
import { updateLeagueOptimistic } from "./league.repository";

const createLeague = (name: string, country: string, isActive: boolean) =>
  prisma.league.create({ data: { name, country, isActive } });

describe("League optimistic versioning", () => {
  it("initializes new leagues at version 0 and keeps version non-null", async () => {
    const league = await createLeague("Versioned League", "France", false);

    expect(league.version).toBe(0);
    await expect(prisma.league.findUnique({ where: { id: league.id } }))
      .resolves.toMatchObject({ version: 0 });

    const column = await prisma.$queryRaw<Array<{ is_nullable: string }>>`
      SELECT is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'league'
        AND column_name = 'version'
    `;

    expect(column).toEqual([{ is_nullable: "NO" }]);
  });

  it("updates conditionally, increments version and preserves id and createdAt", async () => {
    const league = await createLeague("Versioned League", "France", false);

    const count = await updateLeagueOptimistic({
      leagueId: league.id,
      expectedVersion: 0,
      changes: {
        name: "Updated League",
        country: "Belgium",
        logoUrl: "https://example.com/logo.png",
        isActive: true,
      },
    });
    const updated = await prisma.league.findUnique({ where: { id: league.id } });

    expect(count).toBe(1);
    expect(updated).toMatchObject({
      id: league.id,
      name: "Updated League",
      country: "Belgium",
      logoUrl: "https://example.com/logo.png",
      isActive: true,
      version: 1,
      createdAt: league.createdAt,
    });
  });

  it("does not update a league when the expected version is stale", async () => {
    const league = await createLeague("Versioned League", "France", false);

    expect(await updateLeagueOptimistic({
      leagueId: league.id,
      expectedVersion: 0,
      changes: {
        name: "First Update",
        country: "France",
        logoUrl: null,
        isActive: false,
      },
    })).toBe(1);

    const staleCount = await updateLeagueOptimistic({
      leagueId: league.id,
      expectedVersion: 0,
      changes: {
        name: "Stale Update",
        country: "France",
        logoUrl: null,
        isActive: true,
      },
    });
    const unchanged = await prisma.league.findUnique({ where: { id: league.id } });

    expect(staleCount).toBe(0);
    expect(unchanged).toMatchObject({ name: "First Update", isActive: false, version: 1 });
  });

  it("keeps the existing name and country uniqueness constraint for active and inactive leagues", async () => {
    await createLeague("Unique League", "France", true);

    await expect(createLeague("Unique League", "France", false)).rejects.toMatchObject({
      code: "P2002",
    });

    await expect(prisma.league.create({
      data: { name: "Unique League", country: "Belgium", isActive: false },
    })).resolves.toMatchObject({ name: "Unique League", country: "Belgium" });
  });
});
