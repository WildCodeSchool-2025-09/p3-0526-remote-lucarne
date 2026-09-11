import type { League } from "@lucarne/shared";
import { MemoryRouter } from "react-router";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearAccessToken, setAccessToken } from "../../../../src/lib/authToken";
import { useLeagueList } from "../../../../src/features/league/hooks/useLeagueList";
import { useLeagueCountries } from "../../../../src/features/league/hooks/useLeagueCountries";
import { useLeagueMutation } from "../../../../src/features/league/hooks/useLeagueMutation";
import LeagueListPage from "../../../../src/features/league/pages/LeagueListPage";

vi.mock("../../../../src/features/league/hooks/useLeagueList", () => ({ useLeagueList: vi.fn() }));
vi.mock("../../../../src/features/league/hooks/useLeagueCountries", () => ({ useLeagueCountries: vi.fn() }));
vi.mock("../../../../src/features/league/hooks/useLeagueMutation", () => ({ useLeagueMutation: vi.fn() }));

const listQuery = vi.mocked(useLeagueList);
const countriesQuery = vi.mocked(useLeagueCountries);
const mutationHook = vi.mocked(useLeagueMutation);

const leagues: League[] = [
  {
    id: "league-1",
    name: "Ligue de France",
    country: "France",
    logoUrl: null,
    status: "ACTIVE",
    version: 0,
    createdAt: "2026-09-11T10:30:00.000Z",
  },
  {
    id: "league-2",
    name: "Liga España",
    country: "Espagne",
    logoUrl: "https://example.com/logo.png",
    status: "INACTIVE",
    version: 0,
    createdAt: "2026-01-02T10:30:00.000Z",
  },
];

function token(role: string): string {
  const encode = (value: string) => btoa(value)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return `${encode(JSON.stringify({ alg: "none" }))}.${encode(JSON.stringify({ role })).replace(/=+$/, "")}.signature`;
}

function renderPage(entry = "/dashboard/leagues") {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <LeagueListPage />
    </MemoryRouter>,
  );
}

describe("LeagueListPage", () => {
  const mutateAsync = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    setAccessToken(token("ADMIN"));
    countriesQuery.mockReturnValue({ data: ["Espagne", "France"], isError: false, isPending: false, isSuccess: true } as never);
    listQuery.mockReturnValue({
      data: {
        data: leagues,
        pagination: { page: 1, pageSize: 20, totalItems: 2, totalPages: 1 },
      },
      isError: false,
      isPending: false,
      isSuccess: true,
      refetch: vi.fn(),
    } as never);
    mutationHook.mockReturnValue({ isPending: false, mutateAsync } as never);
  });

  it.each(["ADMIN", "MODERATOR", "EDITOR"] as const)("shows edit actions for %s", (role) => {
    setAccessToken(token(role));
    renderPage();

    expect(screen.getAllByRole("link", { name: "Modifier" })).toHaveLength(2);
  });

  it("hides edit actions for USER", () => {
    setAccessToken(token("USER"));
    renderPage();

    expect(screen.queryByRole("link", { name: "Modifier" })).not.toBeInTheDocument();
  });

  it("displays the five league fields and an initial when the logo is absent", () => {
    renderPage();

    expect(screen.getByRole("heading", { name: "Ligues" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ligue de France" })).toBeInTheDocument();
    expect(screen.getAllByText("France").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Active").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Inactive").length).toBeGreaterThan(0);
    expect(screen.getByText("11/09/2026")).toBeInTheDocument();
    expect(screen.getByLabelText("Initiale de Ligue de France")).toHaveTextContent("L");
    expect(screen.getByAltText("Logo de Liga España")).toBeInTheDocument();
  });

  it("updates search, multi-country filter, status and sort, then resets criteria", async () => {
    const user = userEvent.setup();
    renderPage("/dashboard/leagues?search=France&country=France&status=ACTIVE&sortOrder=desc&page=2");

    await user.clear(screen.getByRole("searchbox", { name: "Rechercher une ligue par nom" }));
    await user.type(screen.getByRole("searchbox", { name: "Rechercher une ligue par nom" }), "Liga");
    await user.type(screen.getByRole("searchbox", { name: "Ajouter un pays" }), "Espagne");
    await user.keyboard("{Enter}");
    await user.selectOptions(screen.getByRole("combobox", { name: "Filtrer par statut" }), "INACTIVE");
    await user.selectOptions(screen.getByRole("combobox", { name: "Trier les ligues" }), "name:asc");

    expect(screen.getByRole("searchbox", { name: "Rechercher une ligue par nom" })).toHaveValue("Liga");
    expect(screen.getByRole("combobox", { name: "Filtrer par statut" })).toHaveValue("INACTIVE");
    expect(screen.getByRole("combobox", { name: "Trier les ligues" })).toHaveValue("name:asc");

    await user.click(screen.getByRole("button", { name: "Réinitialiser" }));
    expect(screen.getByRole("searchbox", { name: "Rechercher une ligue par nom" })).toHaveValue("");
    expect(screen.getByRole("combobox", { name: "Filtrer par statut" })).toHaveValue("ALL");
  });

  it("supports creation-date sorting and pagination", async () => {
    const user = userEvent.setup();
    listQuery.mockReturnValue({
      data: {
        data: leagues,
        pagination: { page: 1, pageSize: 20, totalItems: 21, totalPages: 2 },
      },
      isError: false,
      isPending: false,
      isSuccess: true,
      refetch: vi.fn(),
    } as never);
    renderPage();

    await user.selectOptions(screen.getByRole("combobox", { name: "Trier les ligues" }), "createdAt:desc");
    expect(screen.getByRole("combobox", { name: "Trier les ligues" })).toHaveValue("createdAt:desc");

    await user.click(screen.getByRole("button", { name: "Suivant" }));
    expect(
      await screen.findByText((_, element) => element?.textContent === "Page 2 sur 2"),
    ).toBeInTheDocument();
  });

  it("offers registered countries and shows an empty autocomplete state", async () => {
    const user = userEvent.setup();
    renderPage();

    const countrySearch = screen.getByRole("searchbox", { name: "Ajouter un pays" });
    await user.type(countrySearch, "Portugal");

    expect(screen.getByRole("status")).toHaveTextContent("Non disponible");
    expect(screen.getByRole("listbox", { name: "Suggestions de pays" })).toBeInTheDocument();
  });

  it("shows the admin action with an adapted confirmation and refreshes after success", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Désactiver Ligue de France" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("deviendra inactive");
    await user.click(screen.getByRole("button", { name: "Confirmer" }));

    expect(mutateAsync).toHaveBeenCalledWith({ action: "deactivate", id: "league-1" });
    expect(await screen.findByRole("alert")).toHaveTextContent("désactivée");
  });

  it("shows activate and delete actions next to an inactive league", () => {
    renderPage();

    expect(screen.getByRole("button", { name: /Activer Liga/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Supprimer Liga/ })).toBeInTheDocument();
  });

  it("confirms activation of an inactive league", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: /Activer Liga/ }));
    expect(screen.getByRole("dialog")).toHaveTextContent("redeviendra active");
    await user.click(screen.getByRole("button", { name: "Confirmer" }));

    expect(mutateAsync).toHaveBeenCalledWith({ action: "activate", id: "league-2" });
    expect(await screen.findByRole("alert")).toHaveTextContent("activée");
  });

  it("confirms permanent deletion of an inactive league", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: /Supprimer Liga/ }));
    expect(screen.getByRole("dialog")).toHaveTextContent("supprimée définitivement");
    await user.click(screen.getByRole("button", { name: "Confirmer" }));

    expect(mutateAsync).toHaveBeenCalledWith({ action: "delete", id: "league-2" });
  });

  it.each(["MODERATOR", "EDITOR"])("does not show deletion actions for %s", (role) => {
    setAccessToken(token(role));
    renderPage();

    expect(screen.queryByRole("button", { name: /Désactiver|Supprimer/ })).not.toBeInTheDocument();
  });

  it("shows loading, empty and error states", () => {
    listQuery.mockReturnValueOnce({ isPending: true, isError: false, isSuccess: false } as never);
    const { unmount } = renderPage();
    expect(screen.getByRole("status")).toHaveTextContent("Chargement");
    unmount();

    listQuery.mockReturnValueOnce({
      data: { data: [], pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 } },
      isPending: false,
      isError: false,
      isSuccess: true,
    } as never);
    renderPage();
    expect(screen.getByText("Aucune ligue n’est disponible.")).toBeInTheDocument();
  });

  it("allows retry after a loading error", async () => {
    const refetch = vi.fn();
    listQuery.mockReturnValueOnce({ isPending: false, isError: true, isSuccess: false, refetch } as never);
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: /R.*essayer/ }));
    expect(refetch).toHaveBeenCalledOnce();
  });

  afterEach(() => {
    clearAccessToken();
    vi.clearAllMocks();
  });
});
