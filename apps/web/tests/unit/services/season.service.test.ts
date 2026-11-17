import { afterEach, describe, expect, it, vi } from "vitest";
import { httpClient } from "../../../src/lib/httpClient";
import { assignLeagueSeason, createSeason, deleteSeason, listLeagueSeasons, listSeasons, removeLeagueSeason, setCurrentSeason } from "../../../src/services/season.service";

describe("season service", () => {
  afterEach(() => vi.restoreAllMocks());

  it("creates a global season without a league URL", async () => {
    const post = vi.spyOn(httpClient, "post").mockResolvedValue({});
    const input = { name: "2026-2027", startDate: "2026-08-01", endDate: "2027-06-30" };
    await createSeason(input);
    expect(post).toHaveBeenCalledWith("/seasons", { json: input });
  });

  it("does not send a global status when listing seasons", async () => {
    const get = vi.spyOn(httpClient, "get").mockResolvedValue({});
    await listSeasons({ page: 2, leagueId: "league-id" });
    expect(get).toHaveBeenCalledWith("/seasons", {
      query: { leagueId: "league-id", page: 2, pageSize: undefined, search: undefined, sortBy: undefined, sortOrder: undefined },
    });
  });

  it("changes the current season within a league", async () => {
    const patch = vi.spyOn(httpClient, "patch").mockResolvedValue({});
    await setCurrentSeason("league-id", "season-id");
    expect(patch).toHaveBeenCalledWith("/leagues/league-id/seasons/season-id/current");
  });

  it("lists and assigns seasons for a league", async () => {
    const get = vi.spyOn(httpClient, "get").mockResolvedValue({});
    const post = vi.spyOn(httpClient, "post").mockResolvedValue({});
    await listLeagueSeasons("league-id", { search: "2026" });
    const input = { seasonId: "season-id", matchdayCount: 22, matchesPerMatchday: 6 };
    await assignLeagueSeason("league-id", input);
    expect(get).toHaveBeenCalledWith("/leagues/league-id/seasons", { query: { page: undefined, pageSize: undefined, search: "2026", sortOrder: undefined } });
    expect(post).toHaveBeenCalledWith("/leagues/league-id/seasons", { json: input });
  });

  it("removes a league association and deletes a season with explicit confirmation", async () => {
    const remove = vi.spyOn(httpClient, "delete").mockResolvedValue(undefined);
    await removeLeagueSeason("league-id", "season-id");
    await deleteSeason("season-id");
    expect(remove).toHaveBeenNthCalledWith(1, "/leagues/league-id/seasons/season-id");
    expect(remove).toHaveBeenNthCalledWith(2, "/seasons/season-id", { json: { confirm: true } });
  });
});
