import type { AssignLeagueSeasonInput, LeagueSeasonDetail, SeasonDetail } from "@lucarne/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearAccessToken, setAccessToken } from "../../../src/lib/authToken";
import appRouter from "../../../src/router";
import { seasonKeys } from "../../../src/features/season/seasonKeys";
import { leagueKeys } from "../../../src/features/league/leagueKeys";

const league = { id: "league-one", name: "Division 1", country: "France", logoUrl: null, status: "ACTIVE", version: 0, createdAt: "2026-07-01T00:00:00Z" };
const otherLeague = { ...league, id: "league-two", name: "Division 2" };
const edition: LeagueSeasonDetail = {
  id: "edition-one", leagueId: league.id, seasonId: "season-one", isCurrent: false,
  matchdayCount: null, matchesPerMatchday: null,
  league: { id: league.id, name: league.name, country: league.country },
  participatingTeams: [], matchdays: [],
};
const initialSeason: SeasonDetail = {
  id: "season-one", name: "2026-2027", startDate: "2026-08-01", endDate: "2027-06-30",
  version: 3, createdAt: "2026-07-01T00:00:00Z", leagueSeasons: [edition],
};
const team = { id: "team-one", name: "Paris FC", logoUrl: null, status: "REGISTERED" as const, registrationAt: "2026-07-02T00:00:00Z", points: 12, rank: 2, scheduledMatchCount: 3 };

function token(role: string) {
  return `${btoa("{}").replace(/=+$/, "")}.${btoa(JSON.stringify({ role })).replace(/=+$/, "")}.signature`;
}
function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } });
}
function paginated(data: unknown[]) {
  return { data, pagination: { page: 1, pageSize: 20, totalItems: data.length, totalPages: 1 } };
}
function requestPath(input: RequestInfo | URL) {
  const url = typeof input === "string" || input instanceof URL ? input : input.url;
  return new URL(url, "http://localhost").pathname;
}

describe("Season management routes", () => {
  const fetchMock = vi.fn<typeof fetch>();
  let season: SeasonDetail;
  let rejectedPath: string;
  let readStatus: number;
  let validationDetails: { field: string; message: string }[];

  async function fillConfiguration(user: ReturnType<typeof userEvent.setup>, matchdayCount = "22", matchesPerMatchday = "6") {
    await user.type(screen.getByLabelText("Nombre de journées *"), matchdayCount);
    await user.type(screen.getByLabelText("Nombre de matchs par journée *"), matchesPerMatchday);
  }

  function renderRoute(path = "/dashboard/seasons/season-one/edit", role = "ADMIN", previousPath?: string) {
    setAccessToken(token(role));
    const router = createMemoryRouter(appRouter.routes, { initialEntries: previousPath ? [previousPath, path] : [path] });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    render(<QueryClientProvider client={queryClient}><RouterProvider router={router} /></QueryClientProvider>);
    return { router, queryClient };
  }
  function writes() {
    return fetchMock.mock.calls.filter(([, request]) => request?.method !== "GET");
  }

  beforeEach(() => {
    season = structuredClone(initialSeason);
    rejectedPath = "";
    readStatus = 0;
    validationDetails = [];
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockImplementation((input, request) => {
      const path = requestPath(input).replace("/api/v1", "");
      const method = request?.method ?? "GET";
      if (method === "POST" && path === "/leagues/league-two/seasons" && validationDetails.length > 0) return Promise.resolve(json({ error: { code: "VALIDATION_ERROR", message: "Configuration refusée.", details: validationDetails } }, 400));
      if (method !== "GET" && path === rejectedPath) return Promise.resolve(json({ error: { code: "RESOURCE_CONFLICT", message: "Action refusée : historique à préserver." } }, 409));
      if (path === "/seasons/season-one") {
        if (method === "GET" && readStatus) return Promise.resolve(json({ error: { code: "RESOURCE_NOT_FOUND", message: "Season unavailable" } }, readStatus));
        if (method === "DELETE") return Promise.resolve(new Response(null, { status: 204 }));
        if (method === "PATCH") {
          if (typeof request?.body !== "string") throw new Error("Expected a JSON request body");
          const changes = JSON.parse(request.body) as { name?: string };
          season = { ...season, ...changes, version: season.version + 1 };
        }
        return Promise.resolve(json(season));
      }
      if (path === "/seasons") return Promise.resolve(json(paginated([])));
      if (path === "/leagues") return Promise.resolve(json(paginated([league, otherLeague])));
      if (path === "/leagues/league-one") return Promise.resolve(json(league));
      if (path === "/leagues/league-two") return Promise.resolve(json(otherLeague));
      if (path === "/leagues/league-one/seasons" && method === "GET") return Promise.resolve(json(paginated([{ ...season.leagueSeasons[0], season, dependencyCounts: { matchdays: 0, participations: 0 } }])));
      if (path === "/leagues/league-two/seasons" && method === "GET") return Promise.resolve(json(paginated(season.leagueSeasons.filter((item) => item.leagueId === otherLeague.id).map((item) => ({ ...item, season, dependencyCounts: { matchdays: 0, participations: 0 } })))));
      if (path === "/teams") return Promise.resolve(json(paginated([{ ...team, isActive: true, stadium: null, createdAt: team.registrationAt }])));
      if (path === "/leagues/league-two/seasons" && method === "POST") {
        if (typeof request?.body !== "string") throw new Error("Expected a JSON request body");
        const configuration = JSON.parse(request.body) as AssignLeagueSeasonInput;
        season.leagueSeasons.push({ ...structuredClone(edition), ...configuration, id: "edition-two", leagueId: otherLeague.id, league: otherLeague });
        return Promise.resolve(json(season.leagueSeasons[1], 201));
      }
      if (path === "/leagues/league-one/seasons/season-one" && method === "DELETE") {
        season.leagueSeasons = [];
        return Promise.resolve(new Response(null, { status: 204 }));
      }
      if (path === "/leagues/league-one/seasons/season-one/current" && method === "PATCH") {
        season.leagueSeasons[0].isCurrent = true;
        return Promise.resolve(json(season.leagueSeasons[0]));
      }
      if (path === "/league-seasons/edition-one/participations" && method === "POST") {
        season.leagueSeasons[0].participatingTeams = [structuredClone(team)];
        return Promise.resolve(json(team, 201));
      }
      if (path === "/league-seasons/edition-two/participations" && method === "POST") {
        season.leagueSeasons[1].participatingTeams = [structuredClone(team)];
        return Promise.resolve(json(team, 201));
      }
      if (path.endsWith("/withdrawal-preview")) return Promise.resolve(json({ participation: team, scheduledMatchCount: 3 }));
      if (path === "/league-seasons/edition-one/participations/team-one" && method === "DELETE") {
        season.leagueSeasons[0].participatingTeams[0].status = "WITHDRAWN";
        return Promise.resolve(json({ participation: season.leagueSeasons[0].participatingTeams[0], scheduledMatchCount: 3 }));
      }
      throw new Error(`Unexpected request: ${method} ${path}`);
    });
  });

  afterEach(() => {
    clearAccessToken();
    vi.unstubAllGlobals();
  });

  it.each(["ADMIN", "EDITOR", "MODERATOR"])("preserves section permissions for %s through the actual route", async (role) => {
    renderRoute(undefined, role);
    await screen.findByRole("heading", { name: "Modifier 2026-2027" });
    expect(screen.queryByRole("heading", { name: "Associer une ligue" }) != null).toBe(role === "ADMIN");
    expect(screen.getByLabelText("Inscrire une équipe")).toBeInTheDocument();
    expect(screen.queryByLabelText("Nom *") != null).toBe(role !== "MODERATOR");
    expect(screen.queryByLabelText("Date de début *") != null).toBe(role !== "MODERATOR");
    expect(screen.queryByLabelText("Date de fin *") != null).toBe(role !== "MODERATOR");
    expect(screen.getByRole("button", { name: "Retirer la ligue" })).toBeEnabled();
    await screen.findByRole("option", { name: "Paris FC" });
    expect(screen.queryByRole("button", { name: "Associer" }) != null).toBe(role === "ADMIN");
    expect(screen.getByRole("button", { name: "Inscrire" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Définir comme actuelle" }) != null).toBe(role === "ADMIN");
    expect(screen.queryByRole("button", { name: "Supprimer définitivement la saison" }) != null).toBe(role === "ADMIN");
    expect(screen.getByRole("link", { name: "← Retour au détail" })).toHaveAttribute("href", "/dashboard/seasons/season-one");
  });

  it("denies USER access before loading management data", () => {
    renderRoute(undefined, "USER");
    expect(screen.getByRole("heading", { name: "Accès refusé" })).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([false, true])("renders the canonical breadcrumb hierarchy (editing: %s)", async (editing) => {
    const path = `/dashboard/seasons/season-one${editing ? "/edit" : ""}`;
    const { router } = renderRoute(path);
    await screen.findByRole("heading", { name: editing ? "Modifier 2026-2027" : "2026-2027" });
    const breadcrumb = within(screen.getByRole("navigation", { name: "Fil d’Ariane" }));
    expect(breadcrumb.getByRole("link", { name: "Administration" })).toHaveAttribute("href", "/dashboard");
    expect(breadcrumb.getByRole("link", { name: "Saisons" })).toHaveAttribute("href", "/dashboard/seasons");
    expect(breadcrumb.getByText(editing ? "Modifier" : "2026-2027")).toHaveAttribute("aria-current", "page");
    if (editing) {
      const nameLink = breadcrumb.getByRole("link", { name: "2026-2027" });
      expect(nameLink).toHaveAttribute("href", "/dashboard/seasons/season-one");
      await userEvent.setup().click(nameLink);
      await waitFor(() => expect(router.state.location.pathname).toBe("/dashboard/seasons/season-one"));
    }
  });

  it.each([
    ["/dashboard/seasons/season-one", "Saisons"],
    ["/dashboard/seasons/season-one", "← Retour à la liste"],
    ["/dashboard/seasons/season-one/edit", "Saisons"],
    ["/dashboard/seasons/season-one/edit", "← Retour au détail"],
    ["/dashboard/seasons/season-one/edit", "Annuler"],
  ])("returns from %s via %s to its named destination regardless of previous history", async (path, label) => {
    const { router } = renderRoute(path, "ADMIN", "/dashboard/leagues/league-one");
    const user = userEvent.setup();
    if (label === "Annuler") await user.click(await screen.findByRole("button", { name: label }));
    else {
      await screen.findByRole("heading", { name: path.endsWith("/edit") ? "Modifier 2026-2027" : "2026-2027" });
      await user.click(label === "Saisons" ? within(screen.getByRole("navigation", { name: "Fil d’Ariane" })).getByRole("link", { name: label }) : screen.getByRole("link", { name: label }));
    }
    await waitFor(() => expect(router.state.location.pathname).toBe(label === "Annuler" || label === "← Retour au détail" ? "/dashboard/seasons/season-one" : "/dashboard/seasons"));
    expect(writes()).toHaveLength(0);
  });

  it.each([
    ["/dashboard/seasons/season-one", 404, "Fermer"],
    ["/dashboard/seasons/season-one", 500, "← Retour à la liste"],
    ["/dashboard/seasons/season-one/edit", 404, "Fermer"],
    ["/dashboard/seasons/season-one/edit", 500, "← Retour à la liste"],
  ] as const)("returns from %s with error %s via %s to the list", async (path, status, label) => {
    readStatus = status;
    const { router } = renderRoute(path);
    const alert = await screen.findByRole("alertdialog");
    expect(alert).toHaveTextContent(status === 404 ? "Cette saison est introuvable." : "Impossible de charger cette saison.");
    expect(within(screen.getByRole("navigation", { name: "Fil d’Ariane" })).getByRole("link", { name: "Saisons" })).toHaveAttribute("href", "/dashboard/seasons");
    const user = userEvent.setup();
    await user.click(screen.getByRole(label === "Fermer" ? "button" : "link", { name: label }));
    await waitFor(() => expect(router.state.location.pathname).toBe("/dashboard/seasons"));
  });

  it("keeps the save confirmation on the edit page and updates the breadcrumb name", async () => {
    const user = userEvent.setup();
    const { router } = renderRoute();
    const name = await screen.findByLabelText("Nom *");
    await user.clear(name);
    await user.type(name, "2026-2027 corrigée");
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(await screen.findByRole("alertdialog")).toHaveTextContent("La saison a été modifiée avec succès.");
    expect(router.state.location.pathname).toBe("/dashboard/seasons/season-one/edit");
    const breadcrumb = within(screen.getByRole("navigation", { name: "Fil d’Ariane" }));
    expect(breadcrumb.getByRole("link", { name: "2026-2027 corrigée" })).toHaveAttribute("href", "/dashboard/seasons/season-one");
    await user.click(screen.getByRole("button", { name: "Fermer" }));
    expect(router.state.location.pathname).toBe("/dashboard/seasons/season-one/edit");
  });

  it.each(["EDITOR", "MODERATOR"])("does not offer calendar-generating association creation to %s", async (role) => {
    renderRoute(undefined, role);
    await screen.findByRole("heading", { name: "Ligues associées et saison courante" });
    expect(screen.queryByRole("heading", { name: "Associer une ligue" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Associer" })).not.toBeInTheDocument();
    expect(writes()).toHaveLength(0);
  });

  it("assigns a new league, excludes existing associations and preserves unsaved season fields", async () => {
    const user = userEvent.setup();
    const { queryClient } = renderRoute();
    const cachedLeagueList = seasonKeys.leagueList("league-two", {});
    const cachedSeasonList = seasonKeys.list({});
    const cachedLeagueDetail = leagueKeys.detail("league-two");
    queryClient.setQueryData(cachedLeagueList, paginated([]));
    queryClient.setQueryData(cachedSeasonList, paginated([]));
    queryClient.setQueryData(cachedLeagueDetail, otherLeague);
    const name = await screen.findByLabelText("Nom *");
    await user.clear(name);
    await user.type(name, "Brouillon");
    await screen.findByRole("option", { name: "Division 2 — France" });
    expect(screen.queryByRole("option", { name: "Division 1 — France" })).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Ligue *"), "league-two");
    await fillConfiguration(user);
    await user.click(screen.getByRole("button", { name: "Associer" }));
    await waitFor(() => expect(screen.queryByRole("option", { name: "Division 2 — France" })).not.toBeInTheDocument());
    expect(name).toHaveValue("Brouillon");
    expect(writes()[0]).toEqual([expect.stringContaining("/leagues/league-two/seasons"), expect.objectContaining({ method: "POST", body: JSON.stringify({ seasonId: "season-one", matchdayCount: 22, matchesPerMatchday: 6 }) })]);
    expect(screen.getByLabelText("Ligue *")).toHaveValue("");
    expect(screen.getByLabelText("Nombre de journées *")).toHaveValue(null);
    expect(screen.getByLabelText("Nombre de matchs par journée *")).toHaveValue(null);
    const association = screen.getByRole("link", { name: "Division 2" }).closest("article");
    expect(association).not.toBeNull();
    expect(within(association!).getByText("22")).toBeInTheDocument();
    expect(within(association!).getByText("6")).toBeInTheDocument();
    for (const queryKey of [cachedLeagueList, cachedSeasonList, cachedLeagueDetail]) {
      expect(queryClient.getQueryState(queryKey)?.isInvalidated).toBe(true);
    }
  });

  it.each(["ADMIN", "EDITOR", "MODERATOR"])("allows %s to confirm association removal and refreshes the dependency state", async (role) => {
    const user = userEvent.setup();
    renderRoute(undefined, role);
    await user.click(await screen.findByRole("button", { name: "Retirer la ligue" }));
    expect(writes()).toHaveLength(0);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent("La saison et la ligue ne seront pas supprimées");
    await user.click(within(dialog).getByRole("button", { name: "Retirer la ligue" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByText("Aucune ligue associée.")).toBeInTheDocument();
    if (role === "ADMIN") expect(screen.getByRole("button", { name: "Supprimer définitivement la saison" })).toBeEnabled();
  });

  it("preserves the selected league and reports an assignment refusal", async () => {
    rejectedPath = "/leagues/league-two/seasons";
    const user = userEvent.setup();
    renderRoute();
    await screen.findByRole("option", { name: "Division 2 — France" });
    await user.selectOptions(screen.getByLabelText("Ligue *"), "league-two");
    await fillConfiguration(user);
    await user.click(screen.getByRole("button", { name: "Associer" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("historique à préserver");
    expect(screen.getByLabelText("Ligue *")).toHaveValue("league-two");
    expect(screen.getByLabelText("Nombre de journées *")).toHaveValue(22);
    expect(screen.getByLabelText("Nombre de matchs par journée *")).toHaveValue(6);
  });

  it("shows existing unconfigured associations explicitly", async () => {
    renderRoute();
    await screen.findByRole("heading", { name: "Modifier 2026-2027" });
    expect(screen.getAllByText("Non configuré")).toHaveLength(2);
  });

  it.each(["", "0", "-1", "1.5", "2147483648"])("rejects invalid count %s next to each field without an HTTP write", async (value) => {
    const user = userEvent.setup();
    renderRoute();
    await screen.findByRole("option", { name: "Division 2 — France" });
    await user.selectOptions(screen.getByLabelText("Ligue *"), "league-two");
    if (value !== "") await fillConfiguration(user, value, value);
    await user.click(screen.getByRole("button", { name: "Associer" }));
    await waitFor(() => expect(screen.getByLabelText("Nombre de journées *")).toHaveAttribute("aria-invalid", "true"));
    for (const label of ["Nombre de journées *", "Nombre de matchs par journée *"]) {
      const field = screen.getByLabelText(label);
      expect(field).toHaveAttribute("aria-invalid", "true");
      const errorId = field.getAttribute("aria-describedby");
      expect(errorId).not.toBeNull();
      expect(document.getElementById(errorId!)).toHaveAttribute("role", "alert");
    }
    expect(writes()).toHaveLength(0);
    expect(screen.getByLabelText("Ligue *")).toHaveValue("league-two");
  });

  it("attaches server errors with or without a body prefix and allows correction", async () => {
    validationDetails = [
      { field: "body.matchdayCount", message: "Journées refusées par le serveur." },
      { field: "matchesPerMatchday", message: "Matchs refusés par le serveur." },
    ];
    const user = userEvent.setup();
    renderRoute();
    await screen.findByRole("option", { name: "Division 2 — France" });
    await user.selectOptions(screen.getByLabelText("Ligue *"), "league-two");
    await fillConfiguration(user);
    await user.click(screen.getByRole("button", { name: "Associer" }));
    expect(await screen.findByText("Journées refusées par le serveur.")).toBeInTheDocument();
    expect(screen.getByText("Matchs refusés par le serveur.")).toBeInTheDocument();
    expect(screen.getByLabelText("Nombre de journées *")).toHaveValue(22);
    expect(screen.getByLabelText("Nombre de matchs par journée *")).toHaveValue(6);
    expect(screen.getByLabelText("Ligue *")).toHaveValue("league-two");
    validationDetails = [];
    await user.clear(screen.getByLabelText("Nombre de journées *"));
    await user.type(screen.getByLabelText("Nombre de journées *"), "18");
    await user.click(screen.getByRole("button", { name: "Associer" }));
    await waitFor(() => expect(screen.queryByRole("option", { name: "Division 2 — France" })).not.toBeInTheDocument());
    expect(screen.queryByText("Journées refusées par le serveur.")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Nombre de journées *")).toHaveValue(null);
  });

  it.each(["matchday", "withdrawn participation"])("blocks association removal when a %s remains", async (dependency) => {
    if (dependency === "matchday") season.leagueSeasons[0].matchdays = [{ id: "day", number: 1, name: null, startDate: null, endDate: null, matchCount: 0 }];
    else season.leagueSeasons[0].participatingTeams = [{ ...team, status: "WITHDRAWN" }];
    renderRoute();
    expect(await screen.findByRole("button", { name: "Retirer la ligue" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Supprimer définitivement la saison" })).toBeDisabled();
    expect(screen.getByText(/Retrait bloqué/)).toBeInTheDocument();
  });

  it("confirms setting the current season for the selected league", async () => {
    const user = userEvent.setup();
    renderRoute();
    await user.click(await screen.findByRole("button", { name: "Définir comme actuelle" }));
    expect(writes()).toHaveLength(0);
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Définir comme actuelle" }));
    await waitFor(() => expect(screen.getByText("Saison courante")).toBeInTheDocument());
    expect(writes()[0][0]).toEqual(expect.stringContaining("/leagues/league-one/seasons/season-one/current"));
  });

  it.each(["ADMIN", "EDITOR", "MODERATOR"])("allows %s to register then withdraw a team while retaining its sporting history", async (role) => {
    const user = userEvent.setup();
    renderRoute(undefined, role);
    await screen.findByRole("option", { name: "Paris FC" });
    await user.selectOptions(screen.getByLabelText("Inscrire une équipe"), "team-one");
    await user.click(screen.getByRole("button", { name: "Inscrire" }));
    await user.click(await screen.findByRole("button", { name: "Retirer" }));
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("3 match(s) planifié(s) seront conservé(s)");
    expect(dialog).toHaveTextContent("La participation de « Paris FC » à la ligue « Division 1 » pour la saison « 2026-2027 » sera retirée.");
    expect(dialog).toHaveTextContent("L’équipe reste dans le répertoire.");
    expect(dialog).toHaveTextContent("Ses matchs, leurs résultats et l’historique de participation seront conservés.");
    await user.click(within(dialog).getByRole("button", { name: "Retirer l’équipe" }));
    expect(await screen.findByText(/Paris FC — WITHDRAWN — 12 point\(s\), rang 2, 3 match\(s\) planifié\(s\)/)).toBeInTheDocument();
    expect(writes()[0][0]).toEqual(expect.stringContaining("/league-seasons/edition-one/participations"));
    expect(screen.getByRole("button", { name: "Retirer la ligue" })).toBeDisabled();
    expect(screen.getByText(/1 participation\(s\) à préserver, y compris les équipes retirées/)).toBeInTheDocument();
  });

  it("re-registers a withdrawn team using the same association endpoint", async () => {
    season.leagueSeasons[0].participatingTeams = [{ ...team, status: "WITHDRAWN" }];
    const user = userEvent.setup();
    renderRoute();
    await screen.findByRole("option", { name: "Paris FC" });
    await user.selectOptions(screen.getByLabelText("Inscrire une équipe"), "team-one");
    await user.click(screen.getByRole("button", { name: "Inscrire" }));
    expect(await screen.findByText(/Paris FC — REGISTERED — 12 point\(s\), rang 2/)).toBeInTheDocument();
  });

  it("registers a team only in the selected league association", async () => {
    season.leagueSeasons.push({ ...structuredClone(edition), id: "edition-two", leagueId: otherLeague.id, league: otherLeague });
    const user = userEvent.setup();
    renderRoute();
    const section = await screen.findByRole("region", { name: "Division 2" });
    await within(section).findByRole("option", { name: "Paris FC" });
    await user.selectOptions(within(section).getByLabelText("Inscrire une équipe"), "team-one");
    await user.click(within(section).getByRole("button", { name: "Inscrire" }));
    await within(section).findByRole("button", { name: "Retirer" });
    expect(writes()[0][0]).toEqual(expect.stringContaining("/league-seasons/edition-two/participations"));
    expect(within(screen.getByRole("region", { name: "Division 1" })).getByText("Aucune équipe participante.")).toBeInTheDocument();
  });

  it("keeps the confirmation open when the server refuses association removal", async () => {
    rejectedPath = "/leagues/league-one/seasons/season-one";
    const user = userEvent.setup();
    renderRoute();
    await user.click(await screen.findByRole("button", { name: "Retirer la ligue" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Retirer la ligue" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("historique à préserver");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("confirms deletion and returns to the list on success", async () => {
    season.leagueSeasons = [];
    const user = userEvent.setup();
    const { router } = renderRoute();
    await user.click(await screen.findByRole("button", { name: "Supprimer définitivement la saison" }));
    expect(writes()).toHaveLength(0);
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Supprimer la saison" }));
    await waitFor(() => expect(router.state.location.pathname).toBe("/dashboard/seasons"));
    expect(writes()[0]).toEqual([expect.stringContaining("/seasons/season-one"), expect.objectContaining({ method: "DELETE", body: JSON.stringify({ confirm: true }) })]);
  });

  it("keeps deletion errors visible without leaving the edit page", async () => {
    season.leagueSeasons = [];
    rejectedPath = "/seasons/season-one";
    const user = userEvent.setup();
    const { router } = renderRoute();
    await user.click(await screen.findByRole("button", { name: "Supprimer définitivement la saison" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Supprimer la saison" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("historique à préserver");
    expect(router.state.location.pathname).toBe("/dashboard/seasons/season-one/edit");
  });

  it.each(["ADMIN", "MODERATOR", "EDITOR"])("keeps league seasons strictly read-only for %s", async (role) => {
    season.leagueSeasons[0] = { ...season.leagueSeasons[0], isCurrent: true, matchdayCount: 22, matchesPerMatchday: 6 };
    renderRoute("/dashboard/leagues/league-one", role);
    const section = await screen.findByRole("region", { name: "Saisons de la ligue" });
    await within(section).findByRole("heading", { name: /2026-2027/ });
    expect(within(section).getByText("Saison actuelle")).toBeInTheDocument();
    expect(within(section).queryByRole("link")).not.toBeInTheDocument();
    expect(within(section).queryByRole("button")).not.toBeInTheDocument();
    expect(within(section).queryByRole("combobox")).not.toBeInTheDocument();
    expect(within(section).getByText("01/08/2026 – 30/06/2027")).toBeInTheDocument();
    expect(within(section).queryByText("Nombre de journées")).not.toBeInTheDocument();
    expect(within(section).queryByText("Nombre de matchs par journée")).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([url]) => requestPath(url) === "/api/v1/leagues/league-one/seasons")).toBe(true);
    expect(fetchMock.mock.calls.some(([url]) => requestPath(url) === "/api/v1/seasons")).toBe(false);
    expect(writes()).toHaveLength(0);
  });

  it("shows the current indicator of the consulted league for a shared season", async () => {
    season.leagueSeasons[0].isCurrent = true;
    season.leagueSeasons.push({ ...structuredClone(edition), id: "edition-two", leagueId: otherLeague.id, league: otherLeague });
    const { router } = renderRoute("/dashboard/leagues/league-one");
    const first = await screen.findByRole("region", { name: "Saisons de la ligue" });
    await within(first).findByText("Saison actuelle");
    await router.navigate("/dashboard/leagues/league-two");
    await screen.findByRole("heading", { name: "Division 2" });
    const second = screen.getByRole("region", { name: "Saisons de la ligue" });
    await within(second).findByRole("heading", { name: "2026-2027" });
    expect(within(second).queryByText("Saison actuelle")).not.toBeInTheDocument();
    expect(within(second).queryByRole("link")).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([url]) => requestPath(url) === "/api/v1/leagues/league-two/seasons")).toBe(true);
    expect(writes()).toHaveLength(0);
  });
});
