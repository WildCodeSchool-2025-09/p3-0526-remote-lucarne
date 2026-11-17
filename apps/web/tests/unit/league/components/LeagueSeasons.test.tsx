import type { LeagueSeasonListItem } from "@lucarne/shared";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LeagueSeasons from "../../../../src/features/league/components/LeagueSeasons";
import { useLeagueSeasons } from "../../../../src/features/season/hooks/useLeagueSeasons";

vi.mock("../../../../src/features/season/hooks/useLeagueSeasons", () => ({ useLeagueSeasons: vi.fn() }));
const query = vi.mocked(useLeagueSeasons);
const edition: LeagueSeasonListItem = {
  id: "edition-id", leagueId: "league-id", seasonId: "season-id", isCurrent: true,
  matchdayCount: 22, matchesPerMatchday: 6,
  league: { id: "league-id", name: "League", country: "France" },
  season: { id: "season-id", name: "2026-2027", startDate: "2026-08-01", endDate: "2027-06-30", version: 0, createdAt: "2026-07-01T00:00:00Z" },
  dependencyCounts: { matchdays: 2, participations: 4 },
};

describe("LeagueSeasons", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    query.mockReturnValue({ data: { data: [edition], pagination: { totalPages: 1 } }, isSuccess: true, isPending: false, isError: false } as never);
  });

  it("reads the selected league and shows only the season name, dates and current indicator", () => {
    render(<LeagueSeasons leagueId="league-id" />);
    expect(query).toHaveBeenCalledWith("league-id", { page: 1, pageSize: 20, sortBy: "startDate", sortOrder: "desc" });
    expect(screen.getByRole("heading", { name: /2026-2027/ })).toBeInTheDocument();
    expect(screen.getByText("01/08/2026 – 30/06/2027")).toBeInTheDocument();
    expect(screen.getByText("Saison actuelle")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
    expect(screen.queryByText("Nombre de journées")).not.toBeInTheDocument();
    expect(screen.queryByText("Nombre de matchs par journée")).not.toBeInTheDocument();
  });

  it("does not label a non-current association as current", () => {
    query.mockReturnValue({ data: { data: [{ ...edition, isCurrent: false }], pagination: { totalPages: 1 } }, isSuccess: true } as never);
    render(<LeagueSeasons leagueId="league-id" />);
    expect(screen.queryByText("Saison actuelle")).not.toBeInTheDocument();
  });

  it("keeps the loading state", () => {
    query.mockReturnValue({ isPending: true } as never);
    render(<LeagueSeasons leagueId="league-id" />);
    expect(screen.getByText("Chargement des saisons…")).toBeInTheDocument();
  });

  it("keeps the empty state", () => {
    query.mockReturnValue({ data: { data: [], pagination: { totalPages: 0 } }, isSuccess: true } as never);
    render(<LeagueSeasons leagueId="league-id" />);
    expect(screen.getByText("Aucune saison n’est encore associée à cette ligue.")).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("allows retrying a failed read", async () => {
    const refetch = vi.fn();
    query.mockReturnValue({ isError: true, refetch } as never);
    render(<LeagueSeasons leagueId="league-id" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Impossible de charger les saisons de cette ligue.");
    await userEvent.setup().click(screen.getByRole("button", { name: "Réessayer" }));
    expect(refetch).toHaveBeenCalledOnce();
  });

  it("keeps pagination scoped to the league", async () => {
    query.mockReturnValue({ data: { data: [edition], pagination: { totalPages: 2 } }, isSuccess: true } as never);
    render(<LeagueSeasons leagueId="league-id" />);
    const user = userEvent.setup();
    expect(screen.getByRole("button", { name: "Précédent" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Suivant" }));
    expect(query).toHaveBeenLastCalledWith("league-id", { page: 2, pageSize: 20, sortBy: "startDate", sortOrder: "desc" });
    expect(screen.getByText("Page 2 sur 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Suivant" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Précédent" }));
    expect(screen.getByText("Page 1 sur 2")).toBeInTheDocument();
  });
});
