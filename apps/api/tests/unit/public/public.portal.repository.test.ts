import { beforeEach, describe, expect, it, vi } from "vitest";
import { listPublicTeams } from "../../../src/features/team/team.public.repository";
import { findPublicPlayer, listPublicPlayers } from "../../../src/features/player/player.public.repository";
import { findPublicStaff } from "../../../src/features/staff/staff.public.repository";
import { findPublicMatch, listPublicMatches } from "../../../src/features/match/match.repository";

const db = vi.hoisted(() => ({
  team: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) },
  player: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0), findFirst: vi.fn().mockResolvedValue(null) },
  staffMember: { findFirst: vi.fn().mockResolvedValue(null) },
  gameMatch: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0), findFirst: vi.fn().mockResolvedValue(null) },
}));
const transaction = vi.hoisted(() => vi.fn());
vi.mock("../../../database/prisma", () => ({ default: { ...db, $transaction: transaction } }));
const id = "00000000-0000-4000-8000-000000000001";
const date = new Date("2026-10-19");

describe("Public repository visibility boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    transaction.mockImplementation((input: unknown[] | ((client: unknown) => unknown)) => Array.isArray(input) ? Promise.all(input) : input(db));
  });

  it("shares edition visibility between team data and totals and selects no administrative columns", async () => {
    await listPublicTeams({ page: 2, limit: 20, leagueId: id, seasonId: id });
    expect(db.team.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { isActive: true, participations: { some: { status: "REGISTERED", leagueSeason: { leagueId: id, seasonId: id, league: { isActive: true } } } } },
      select: { id: true, name: true, logoUrl: true, stadium: true }, skip: 20, take: 20,
    }));
    const query = db.team.findMany.mock.calls[0][0] as { where: unknown };
    expect(db.team.count).toHaveBeenCalledWith({ where: query.where });
    expect(transaction).toHaveBeenCalledWith(expect.any(Array), { isolationLevel: "RepeatableRead" });
  });

  it("requires inclusive current assignment dates and active teams both for player selection and returned affiliation", async () => {
    await listPublicPlayers({ page: 1, limit: 20, teamId: id, position: "Défenseure" }, date);
    const assignment = { teamId: id, joinedAt: { lte: date }, OR: [{ leftAt: null }, { leftAt: { gte: date } }], team: { isActive: true } };
    const playerQuery = db.player.findMany.mock.calls[0][0] as { where: unknown; select: { teamPlayers: { where: unknown; take: number } } };
    expect(playerQuery.where).toEqual({ isActive: true, position: "Défenseure", teamPlayers: { some: assignment } });
    expect(playerQuery.select.teamPlayers.where).toEqual(assignment);
    expect(playerQuery.select.teamPlayers.take).toBe(1);
    await findPublicPlayer(id, date);
    expect(db.player.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id, isActive: true, teamPlayers: { some: { ...assignment, teamId: undefined } } } }));
    await findPublicStaff(id, date);
    expect(db.staffMember.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id, isActive: true, teamStaffMembers: { some: {
        joinedAt: { lte: date }, OR: [{ leftAt: null }, { leftAt: { gte: date } }], team: { isActive: true },
      } } },
    }));
  });

  it("applies identical active parent visibility to match detail, list and total", async () => {
    const visibility = { isActive: true, isPublished: true, homeTeam: { isActive: true }, awayTeam: { isActive: true }, matchday: { isActive: true, leagueSeason: { league: { isActive: true } } } };
    await findPublicMatch(id);
    expect(db.gameMatch.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { matchPublicId: id, ...visibility } }));
    await listPublicMatches({ page: 1, pageSize: 20, leagueId: id, seasonId: id, sortBy: "matchDate", sortOrder: "asc" });
    const query = db.gameMatch.findMany.mock.calls[0][0] as { where: { AND: unknown[] } };
    expect(query.where.AND).toContainEqual(visibility);
    expect(query.where.AND[0]).toMatchObject({ matchday: { leagueSeason: { leagueId: id, seasonId: id } } });
    expect(db.gameMatch.count).toHaveBeenCalledWith({ where: query.where });
  });
});
