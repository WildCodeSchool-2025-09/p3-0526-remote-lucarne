import type { League } from "@lucarne/shared";
import { MemoryRouter, Route, Routes } from "react-router";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useLeagueDetail } from "../../../../src/features/league/hooks/useLeagueDetail";
import { useLeagueMutation } from "../../../../src/features/league/hooks/useLeagueMutation";
import { useLeagueSeasons } from "../../../../src/features/season/hooks/useLeagueSeasons";
import { useSeasonList } from "../../../../src/features/season/hooks/useSeasonList";
import { useLeagueSeasonMutation } from "../../../../src/features/league/hooks/useLeagueSeasonMutation";
import LeagueDetailPage from "../../../../src/features/league/pages/LeagueDetailPage";

vi.mock("../../../../src/features/league/hooks/useLeagueDetail", () => ({ useLeagueDetail: vi.fn() }));
vi.mock("../../../../src/features/league/hooks/useLeagueMutation", () => ({ useLeagueMutation: vi.fn() }));
vi.mock("../../../../src/features/season/hooks/useLeagueSeasons", () => ({ useLeagueSeasons: vi.fn() }));
vi.mock("../../../../src/features/season/hooks/useSeasonList", () => ({ useSeasonList: vi.fn() }));
vi.mock("../../../../src/features/league/hooks/useLeagueSeasonMutation", () => ({ useLeagueSeasonMutation: vi.fn() }));

const detailQuery = vi.mocked(useLeagueDetail);
const leagueMutation = vi.mocked(useLeagueMutation);
const leagueSeasons = vi.mocked(useLeagueSeasons);
const seasonsList = vi.mocked(useSeasonList);
const associationMutation = vi.mocked(useLeagueSeasonMutation);
const league: League = {
  id: "league-1",
  name: "Ligue de France",
  country: "France",
  logoUrl: null,
  status: "ACTIVE",
  version: 0,
  createdAt: "2026-09-11T10:30:00.000Z",
};

describe("LeagueDetailPage", () => {
  const mutation = { isError: false, isPending: false, mutateAsync: vi.fn(), reset: vi.fn() };

  beforeEach(() => {
    leagueMutation.mockReturnValue(mutation as never);
    leagueSeasons.mockReturnValue({ data: { data: [], pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 } }, isPending: false, isError: false, isSuccess: true } as never);
    seasonsList.mockReturnValue({ data: { data: [], pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 } }, isPending: false, isError: false, isSuccess: true } as never);
    associationMutation.mockReturnValue({ isPending: false, isError: false, mutateAsync: vi.fn() } as never);
  });
  it("displays the detail and returns to the canonical list regardless of history", async () => {
    detailQuery.mockReturnValue({ data: league, isPending: false, isError: false, isSuccess: true } as never);
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/dashboard/seasons/season-1", "/dashboard/leagues/league-1"]} initialIndex={1}>
        <Routes>
          <Route path="/dashboard/leagues/:leagueId" element={<LeagueDetailPage />} />
          <Route path="/dashboard/leagues" element={<h1>Liste des ligues</h1>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Ligue de France" })).toBeInTheDocument();
    expect(screen.getByText("11/09/2026")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Retour à la liste/ })).toHaveAttribute("href", "/dashboard/leagues");
    await user.click(screen.getByRole("link", { name: /Retour à la liste/ }));
    expect(screen.getByRole("heading", { name: "Liste des ligues" })).toBeInTheDocument();
  });

  it("shows a friendly message when the league no longer exists", () => {
    detailQuery.mockReturnValue({
      error: { status: 404 },
      isPending: false,
      isError: true,
      isSuccess: false,
    } as never);

    render(
      <MemoryRouter initialEntries={["/dashboard/leagues/league-1"]}>
        <LeagueDetailPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("n’existe plus");
  });

  it.each([404, 500])("returns to the canonical list when closing error %s", async (status) => {
    detailQuery.mockReturnValue({ error: { status }, isPending: false, isError: true, isSuccess: false } as never);
    const user = userEvent.setup();
    render(<MemoryRouter initialEntries={["/dashboard/seasons/season-1", "/dashboard/leagues/league-1"]} initialIndex={1}>
      <Routes>
        <Route path="/dashboard/leagues/:leagueId" element={<LeagueDetailPage />} />
        <Route path="/dashboard/leagues" element={<h1>Liste des ligues</h1>} />
      </Routes>
    </MemoryRouter>);
    expect(screen.getByRole("link", { name: /Retour à la liste/ })).toHaveAttribute("href", "/dashboard/leagues");
    await user.click(screen.getByRole("button", { name: "Fermer" }));
    expect(screen.getByRole("heading", { name: "Liste des ligues" })).toBeInTheDocument();
  });
});
