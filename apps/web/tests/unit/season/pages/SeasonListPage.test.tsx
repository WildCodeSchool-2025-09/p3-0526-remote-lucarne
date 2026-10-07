import type { SeasonListItem } from "@lucarne/shared";
import { MemoryRouter } from "react-router";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearAccessToken, setAccessToken } from "../../../../src/lib/authToken";
import { useSeasonList } from "../../../../src/features/season/hooks/useSeasonList";
import SeasonListPage from "../../../../src/features/season/pages/SeasonListPage";

vi.mock("../../../../src/features/season/hooks/useSeasonList", () => ({ useSeasonList: vi.fn() }));

const listQuery = vi.mocked(useSeasonList);

const seasons: SeasonListItem[] = [
  { id: "season-1", leagueSeasons: [{ id: "edition-1", seasonId: "season-1", leagueId: "league-1", isCurrent: false, matchdayCount: null, matchesPerMatchday: null, league: { id: "league-1", name: "Division 1", country: "France" } }], name: "2026-2027", startDate: "2026-08-01", endDate: "2027-06-30", version: 0, createdAt: "2026-09-16T00:00:00.000Z" },
  { id: "season-2", leagueSeasons: [{ id: "edition-2", seasonId: "season-2", leagueId: "league-1", isCurrent: false, matchdayCount: null, matchesPerMatchday: null, league: { id: "league-1", name: "Division 1", country: "France" } }], name: "2025-2026", startDate: "2025-08-01", endDate: "2026-06-30", version: 0, createdAt: "2025-09-16T00:00:00.000Z" },
];

function token(role: string): string {
  const encode = (value: string) => btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${encode(JSON.stringify({ alg: "none" }))}.${encode(JSON.stringify({ role }))}.signature`;
}

describe("SeasonListPage", () => {

  beforeEach(() => {
    setAccessToken(token("ADMIN"));
    listQuery.mockReturnValue({ data: { data: seasons, pagination: { page: 1, pageSize: 20, totalItems: 2, totalPages: 1 } }, isError: false, isPending: false, isSuccess: true, refetch: vi.fn() } as never);
  });

  afterEach(() => {
    clearAccessToken();
    vi.clearAllMocks();
  });

  it("displays seasons and role-sensitive actions", () => {
    render(<MemoryRouter initialEntries={["/dashboard/seasons"]}><SeasonListPage /></MemoryRouter>);

    expect(screen.getByRole("heading", { name: "Saisons" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "2026-2027" })).toHaveLength(2);
    expect(screen.getAllByText("Division 1").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/16\/09\/2026/).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Définir courante" })).not.toBeInTheDocument();
  });

  it.each(seasons)("links $name to its detail in the table and mobile cards", (season) => {
    render(<MemoryRouter initialEntries={["/dashboard/seasons"]}><SeasonListPage /></MemoryRouter>);

    const table = screen.getByRole("table", { name: "Liste des saisons" });
    const mobileCards = screen.getByRole("list", { name: "Liste des saisons sous forme de cartes" });

    for (const container of [table, mobileCards]) {
      const nameLink = within(container).getByRole("link", { name: season.name });
      expect(nameLink).toHaveAttribute("href", `/dashboard/seasons/${season.id}`);
    }
  });

  it("hides write actions for USER", () => {
    setAccessToken(token("USER"));
    render(<MemoryRouter initialEntries={["/dashboard/seasons"]}><SeasonListPage /></MemoryRouter>);

    expect(screen.queryByRole("link", { name: "Ajouter une saison" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Modifier" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Définir courante" })).not.toBeInTheDocument();
  });

  it("keeps the requested page instead of resetting pagination", async () => {
    listQuery.mockReturnValue({ data: { data: seasons, pagination: { page: 1, pageSize: 20, totalItems: 40, totalPages: 2 } }, isError: false, isPending: false, isSuccess: true, refetch: vi.fn() } as never);
    const user = userEvent.setup();
    render(<MemoryRouter initialEntries={["/dashboard/seasons"]}><SeasonListPage /></MemoryRouter>);
    await user.click(screen.getByRole("button", { name: "Suivant" }));
    expect(listQuery).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }));
  });

  it("keeps deletion on the edit page instead of the list", () => {
    render(<MemoryRouter initialEntries={["/dashboard/seasons"]}><SeasonListPage /></MemoryRouter>);
    expect(screen.queryByRole("button", { name: /Supprimer/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("lets moderators open season management from both list presentations", () => {
    setAccessToken(token("MODERATOR"));
    render(<MemoryRouter initialEntries={["/dashboard/seasons"]}><SeasonListPage /></MemoryRouter>);
    expect(screen.getAllByRole("link", { name: "Modifier" }).map((link) => link.getAttribute("href"))).toEqual([
      "/dashboard/seasons/season-1/edit", "/dashboard/seasons/season-2/edit",
      "/dashboard/seasons/season-1/edit", "/dashboard/seasons/season-2/edit",
    ]);
  });

});
