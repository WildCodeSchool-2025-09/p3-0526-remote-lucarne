import type { SeasonDetail } from "@lucarne/shared";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { APP_ROLES, getCurrentAppRole } from "../../../../src/auth/authRole";
import type * as AuthRoleModule from "../../../../src/auth/authRole";
import SeasonDetailPage from "../../../../src/features/season/pages/SeasonDetailPage";
import { useSeasonDetail } from "../../../../src/features/season/hooks/useSeasonDetail";
import { useTeamList } from "../../../../src/hooks/useTeamList";
import { formatDateTime } from "../../../../src/lib/dateTimeFormat";

vi.mock("../../../../src/auth/authRole", async (importOriginal) => ({
  ...await importOriginal<typeof AuthRoleModule>(),
  getCurrentAppRole: vi.fn(),
}));
vi.mock("../../../../src/features/season/hooks/useSeasonDetail", () => ({ useSeasonDetail: vi.fn() }));
vi.mock("../../../../src/hooks/useTeamList", () => ({ useTeamList: vi.fn() }));

const season: SeasonDetail = {
  id: "season-id", name: "2026-2027", startDate: "2026-08-01", endDate: "2027-06-30",
  createdAt: "2026-07-01T10:30:00Z", version: 42,
  leagueSeasons: [
    {
      id: "edition-france", leagueId: "league-france", seasonId: "season-id", isCurrent: true,
      matchdayCount: null, matchesPerMatchday: null,
      league: { id: "league-france", name: "Division France", country: "France" },
      participatingTeams: [
        { id: "team-paris", name: "Paris FC", logoUrl: "https://example.com/paris.png", status: "REGISTERED", registrationAt: "2026-07-02T09:00:00Z", points: 12, rank: 2, scheduledMatchCount: 3 },
        { id: "team-lyon", name: "Lyon FC", logoUrl: null, status: "WITHDRAWN", registrationAt: "2026-07-03T09:00:00Z", points: 0, rank: null, scheduledMatchCount: 0 },
      ],
      matchdays: [
        { id: "day-1", number: 1, name: "Ouverture", startDate: "2026-08-01", endDate: "2026-08-02", matchCount: 4 },
        { id: "day-2", number: 2, name: null, startDate: null, endDate: "2026-08-09", matchCount: 0 },
        { id: "day-3", number: 3, name: null, startDate: "2026-08-15", endDate: null, matchCount: 0 },
        { id: "day-4", number: 4, name: null, startDate: null, endDate: null, matchCount: 0 },
      ],
    },
    {
      id: "edition-belgium", leagueId: "league-belgium", seasonId: "season-id", isCurrent: false,
      matchdayCount: null, matchesPerMatchday: null,
      league: { id: "league-belgium", name: "Division Belgique", country: "Belgique" },
      participatingTeams: [], matchdays: [],
    },
  ],
};

function renderPage() {
  return render(<MemoryRouter initialEntries={["/dashboard/seasons/season-id"]}>
    <Routes><Route path="/dashboard/seasons/:seasonId" element={<SeasonDetailPage />} /></Routes>
  </MemoryRouter>);
}

function detailsFor(heading: string) {
  const item = screen.getByRole("heading", { name: heading }).closest("li");
  expect(item).not.toBeNull();
  return within(item!);
}

describe("SeasonDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentAppRole).mockReturnValue(APP_ROLES.ADMIN);
    vi.mocked(useSeasonDetail).mockReturnValue({ data: season, isPending: false, isError: false } as never);
  });

  it("displays the season and all associated leagues with their own current status", () => {
    renderPage();
    expect(useSeasonDetail).toHaveBeenCalledWith("season-id");
    expect(screen.getByRole("heading", { name: "2026-2027" })).toBeInTheDocument();
    expect(screen.getByText("01/08/2026 – 30/06/2027")).toBeInTheDocument();
    expect(screen.getByText(formatDateTime(season.createdAt))).toBeInTheDocument();
    for (const edition of season.leagueSeasons) {
      const link = screen.getByRole("link", { name: edition.league.name });
      expect(link).toHaveAttribute("href", `/dashboard/leagues/${edition.leagueId}`);
      const header = within(link.closest("header")!);
      expect(header.getByText(edition.league.country)).toBeInTheDocument();
      expect(header.getByText(edition.isCurrent ? "Saison courante" : "Saison non courante")).toBeInTheDocument();
    }
    expect(screen.queryByText(season.id)).not.toBeInTheDocument();
    expect(screen.queryByText("42")).not.toBeInTheDocument();
  });

  it("keeps withdrawn teams and displays participation information and missing-value fallbacks", () => {
    renderPage();
    const paris = detailsFor("Paris FC");
    expect(paris.getByRole("img", { name: "Logo de Paris FC" })).toHaveAttribute("src", "https://example.com/paris.png");
    for (const value of ["Inscrite", formatDateTime(season.leagueSeasons[0].participatingTeams[0].registrationAt), "12", "2", "3"]) {
      expect(paris.getByText(value)).toBeInTheDocument();
    }
    const lyon = detailsFor("Lyon FC");
    expect(lyon.getByLabelText("Initiale de Lyon FC")).toBeInTheDocument();
    expect(lyon.getByText("Retirée")).toBeInTheDocument();
    expect(lyon.getByText(formatDateTime(season.leagueSeasons[0].participatingTeams[1].registrationAt))).toBeInTheDocument();
    expect(lyon.getByText("Non renseigné")).toBeInTheDocument();
    expect(lyon.getAllByText("0")).toHaveLength(2);
    expect(screen.getByText("Aucune équipe participante.")).toBeInTheDocument();
  });

  it("displays matchday names, dates and match counts, including incomplete periods", () => {
    renderPage();
    const firstDay = detailsFor("Journée 1");
    for (const value of ["Ouverture", "01/08/2026", "02/08/2026", "4"]) {
      expect(firstDay.getByText(value)).toBeInTheDocument();
    }
    expect(detailsFor("Journée 2").getByText("09/08/2026")).toBeInTheDocument();
    expect(detailsFor("Journée 2").getByText("Non renseignée")).toBeInTheDocument();
    expect(detailsFor("Journée 3").getByText("15/08/2026")).toBeInTheDocument();
    expect(detailsFor("Journée 3").getByText("Non renseignée")).toBeInTheDocument();
    expect(detailsFor("Journée 4").getAllByText("Non renseignée")).toHaveLength(2);
    expect(detailsFor("Journée 4").getByText("Non renseigné")).toBeInTheDocument();
    expect(detailsFor("Journée 4").getByText("0")).toBeInTheDocument();
    expect(screen.getByText("Aucune journée.")).toBeInTheDocument();
  });

  it.each([APP_ROLES.ADMIN, APP_ROLES.MODERATOR, APP_ROLES.EDITOR])("is consultative for %s without loading team candidates or mutation hooks", (role) => {
    vi.mocked(getCurrentAppRole).mockReturnValue(role);
    const { container } = renderPage();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Inscrire|Retirer|Supprimer|Définir/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(container.querySelector("form")).toBeNull();
    expect(useTeamList).not.toHaveBeenCalled();
    // Mutation hooks require a QueryClientProvider; this read-only render needs none.
    expect(screen.getByRole("link", { name: "Modifier" })).toHaveAttribute("href", "/dashboard/seasons/season-id/edit");
  });

  it("handles a season without associated leagues", () => {
    vi.mocked(useSeasonDetail).mockReturnValue({ data: { ...season, leagueSeasons: [] }, isPending: false, isError: false } as never);
    renderPage();
    expect(screen.getByText("Aucune ligue associée.")).toBeInTheDocument();
  });
});
