import type { AdminMatch, SeasonDetail } from "@lucarne/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearAccessToken, setAccessToken } from "../../../src/lib/authToken";
import appRouter from "../../../src/router";
import { seasonKeys } from "../../../src/features/season/seasonKeys";
import { getCurrentAppRole } from "../../../src/auth/authRole";

const ids = Array.from({ length: 9 }, (_, index) => `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`);
const [matchId, publicId, leagueId, seasonId, editionId, dayId, nextDayId, homeId, awayId] = ids;
const teams = [{ id: homeId, name: "Paris FC", logoUrl: null }, { id: awayId, name: "Lyon", logoUrl: null }];
const league = { id: leagueId, name: "Division 1", country: "France" };
const season: SeasonDetail = {
  id: seasonId, name: "2026-2027", startDate: "2026-08-01", endDate: "2027-06-30", version: 0, createdAt: "2026-08-01T00:00:00Z",
  leagueSeasons: [{
    id: editionId, leagueId, seasonId, isCurrent: true, league, matchdayCount: 2, matchesPerMatchday: 1,
    matchdays: [dayId, nextDayId].map((id, index) => ({ id, number: index + 1, name: null, startDate: null, endDate: null, matchCount: 1 })),
    participatingTeams: teams.map((team) => ({ ...team, status: "REGISTERED", registrationAt: "2026-08-01T00:00:00Z", points: 0, rank: null, scheduledMatchCount: 0 })),
  }],
};
const initialMatch: AdminMatch = {
  id: matchId, matchPublicId: publicId, leagueId, seasonId, leagueSeasonId: editionId, matchdayId: dayId,
  version: 0, isActive: true, isPublished: false, status: "SCHEDULED", homeTeamId: null, awayTeamId: null,
  matchDate: null, startTime: null, stadium: null, result: { homeScore: null, awayScore: null },
  createdAt: "2026-08-01T00:00:00Z", timeZone: "Europe/Paris",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const page = (data: unknown[]) => ({ data, pagination: { page: 1, pageSize: 20, totalItems: data.length, totalPages: data.length ? 1 : 0 } });

describe("MATCH Dashboard management", () => {
  const fetchMock = vi.fn<typeof fetch>();
  let match: AdminMatch; let rejectCode: string; let readStatus: number;
  function mount(path = `/dashboard/matches/${matchId}`, role = "ADMIN") {
    setAccessToken(`${btoa("{}")}.${btoa(JSON.stringify({ role }))}.signature`);
    const router = createMemoryRouter(appRouter.routes, { initialEntries: ["/dashboard/teams", path], initialIndex: 1 });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    render(<QueryClientProvider client={queryClient}><RouterProvider router={router} /></QueryClientProvider>);
    return { router, queryClient };
  }
  const writes = () => fetchMock.mock.calls.filter(([, options]) => options?.method !== "GET");
  const bodyOfLastWrite = () => JSON.parse(writes()[writes().length - 1]?.[1]?.body as string) as Record<string, unknown>;
  async function expectPublicRedirect(router: ReturnType<typeof createMemoryRouter>) {
    await waitFor(() => expect(router.state.location.pathname).toBe("/"));
    expect(await screen.findByRole("navigation", { name: "Navigation publique" })).toBeInTheDocument();
    expect(fetchMock.mock.calls.every(([input]) => {
      const url = new URL(typeof input === "string" || input instanceof URL ? input : input.url, window.location.origin);
      return ["/api/v1/health", "/api/v1/auth/me", "/api/v1/matches", "/api/v1/leagues/navigation"].includes(url.pathname);
    })).toBe(true);
    expect(writes()).toHaveLength(0);
  }
  beforeEach(() => {
    match = structuredClone(initialMatch); rejectCode = ""; readStatus = 0;
    fetchMock.mockReset(); vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockImplementation(async (input, options) => {
      await Promise.resolve();
      const url = new URL(
        typeof input === "string" || input instanceof URL ? input : input.url,
        window.location.origin,
      );
      const path = url.pathname.replace("/api/v1", ""); const method = options?.method ?? "GET";
      if (path === "/health") return json({ status: "ok" });
      if (path === "/matches") return json(page([]));
      if (path === "/leagues/navigation") return json([]);
      if (path === "/auth/me") return json({ id: "session-user", firstName: "Test", lastName: "User", email: "user@lucarne.test", role: getCurrentAppRole() });
      if (path === "/leagues") return json(page([league]));
      if (path === "/seasons") return json(page([season]));
      if (path === "/teams") return json(page(teams));
      if (path === `/seasons/${seasonId}`) return json(season);
      if (path === "/admin/matches" && method === "GET") return json(page(match.isActive ? [match] : []));
      if (path === "/admin/matches" && method === "POST") return json(match, 201);
      if (path.startsWith(`/admin/matches/${matchId}`)) {
        if (method === "GET") return readStatus ? json({ error: { code: "RESOURCE_NOT_FOUND", message: "Match introuvable." } }, readStatus) : json(match);
        if (rejectCode) return json({ error: { code: rejectCode, message: "Modification refusée." } }, 409);
        const inputBody = JSON.parse(typeof options?.body === "string" ? options.body : "{}") as Record<string, unknown>;
        if (inputBody.version !== match.version) return json({ error: { code: "RESOURCE_VERSION_CONFLICT", message: "Version obsolète." } }, 409);
        if (method === "DELETE") { match = { ...match, isActive: false, version: match.version + 1 }; return new Response(null, { status: 204 }); }
        const { version: inputVersion, ...changes } = inputBody; void inputVersion;
        match = {
          ...match,
          ...(path.endsWith("/publication") ? { isPublished: true } : path.endsWith("/result") ? { result: { homeScore: changes.homeScore, awayScore: changes.awayScore } } : changes),
          version: match.version + 1,
        };
        return json(match);
      }
      throw new Error(`Unexpected request ${method} ${path}`);
    });
  });
  afterEach(() => { clearAccessToken(); vi.unstubAllGlobals(); });

  it("creates, programs, publishes, completes, corrects scores and deletes through the actual routes", async () => {
    const user = userEvent.setup(); const { router } = mount("/dashboard/matches/new");
    await screen.findByRole("option", { name: "2026-2027" });
    await user.selectOptions(screen.getByLabelText("Saison *"), seasonId);
    await screen.findByRole("option", { name: "Division 1" });
    await user.selectOptions(screen.getByLabelText("Ligue *"), leagueId);
    await user.selectOptions(screen.getByLabelText("Journée *"), dayId);
    await user.click(screen.getByRole("button", { name: "Créer l’emplacement" }));
    await screen.findByRole("heading", { name: "Modifier le match" });
    expect(bodyOfLastWrite()).toEqual({ matchdayId: dayId });
    await screen.findByLabelText("Équipe domicile");
    await user.selectOptions(screen.getByLabelText("Équipe domicile"), homeId);
    await user.selectOptions(screen.getByLabelText("Équipe extérieure"), awayId);
    await user.type(screen.getByLabelText("Date"), "2026-10-25");
    await user.type(screen.getByLabelText("Heure de Paris"), "02:30");
    await user.click(screen.getByRole("button", { name: "Enregistrer la programmation" }));
    await screen.findByRole("heading", { name: "Paris FC – Lyon" });
    expect(bodyOfLastWrite()).toEqual({ version: 0, homeTeamId: homeId, awayTeamId: awayId, matchDate: "2026-10-25", startTime: "02:30" });
    await user.click(screen.getByRole("button", { name: "Publier le match" }));
    await screen.findByLabelText("Score domicile *");
    await user.type(screen.getByLabelText("Score domicile *"), "0"); await user.type(screen.getByLabelText("Score extérieur *"), "0");
    await user.click(screen.getByRole("button", { name: "Enregistrer les scores" }));
    await waitFor(() => expect(match.version).toBe(3));
    expect(bodyOfLastWrite()).toEqual({ version: 2, homeScore: 0, awayScore: 0 });
    await user.selectOptions(screen.getByLabelText("État"), "COMPLETED");
    await user.click(screen.getByRole("button", { name: "Enregistrer l’état" }));
    await waitFor(() => expect(match.status).toBe("COMPLETED"));
    await user.clear(screen.getByLabelText("Score domicile *")); await user.type(screen.getByLabelText("Score domicile *"), "2");
    await user.click(screen.getByRole("button", { name: "Enregistrer les scores" }));
    await waitFor(() => expect(match.result.homeScore).toBe(2));
    expect(match.status).toBe("COMPLETED"); expect(bodyOfLastWrite().version).toBe(4);
    await user.click(screen.getByRole("button", { name: "Supprimer le match" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Annuler" }));
    expect(match.isActive).toBe(true);
    await user.click(screen.getByRole("button", { name: "Supprimer le match" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Supprimer" }));
    await waitFor(() => expect(router.state.location.pathname).toBe("/dashboard/matches"));
    expect(match.isActive).toBe(false); expect(bodyOfLastWrite()).toEqual({ version: 5 });
  });

  it.each(["EDITOR", "MODERATOR"])("redirects %s before reading dashboard matches", async (role) => {
    const { router } = mount(undefined, role); await expectPublicRedirect(router);
    expect(screen.queryByRole("button", { name: "Publier le match" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Modifier la programmation" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Supprimer le match" })).not.toBeInTheDocument(); expect(writes()).toHaveLength(0);
  });
  it.each(["EDITOR", "MODERATOR", "USER"])("blocks %s from edit and creation routes", async (role) => {
    const { router } = mount(`/dashboard/matches/${matchId}/edit`, role);
    await expectPublicRedirect(router);
    await act(() => router.navigate("/dashboard/matches/new"));
    await expectPublicRedirect(router);
    expect(screen.queryByRole("button", { name: "Créer l’emplacement" })).not.toBeInTheDocument(); expect(writes()).toHaveLength(0);
  });
  it("blocks USER from dashboard match reads", async () => {
    const { router } = mount("/dashboard/matches", "USER"); await expectPublicRedirect(router);
  });
  it("filters through the URL, resets pagination and clears an incompatible day", async () => {
    const user = userEvent.setup(); const { router } = mount(`/dashboard/matches?seasonId=${seasonId}&leagueId=${leagueId}&matchdayId=${dayId}`);
    await screen.findByRole("option", { name: "Lyon" });
    await user.selectOptions(screen.getByLabelText("Équipe"), awayId);
    await waitFor(() => expect(router.state.location.search).toContain(`teamId=${awayId}`));
    await user.selectOptions(screen.getByLabelText("État"), "IN_PROGRESS");
    await waitFor(() => expect(fetchMock.mock.calls.some(([input]) => (typeof input === "string" ? input : input instanceof URL ? input.href : input.url).includes("status=IN_PROGRESS"))).toBe(true));
    await user.selectOptions(screen.getByLabelText("Saison"), "");
    expect(router.state.location.search).not.toContain("matchdayId");
    await user.click(screen.getByRole("button", { name: "Réinitialiser" })); expect(router.state.location.search).toBe("");
  });
  it("keeps programming after a conflict and reloads explicitly before resubmission", async () => {
    const user = userEvent.setup(); mount(`/dashboard/matches/${matchId}/edit`);
    const venue = await screen.findByLabelText("Lieu"); await user.type(venue, "Ma saisie"); rejectCode = "RESOURCE_VERSION_CONFLICT";
    await user.click(screen.getByRole("button", { name: "Enregistrer la programmation" }));
    await screen.findByRole("button", { name: "Recharger les données" }); expect(venue).toHaveValue("Ma saisie");
    expect(screen.getByRole("button", { name: "Enregistrer la programmation" })).toBeDisabled();
    match = { ...match, stadium: "Autre admin", version: 2 }; rejectCode = "";
    await user.click(screen.getByRole("button", { name: "Recharger les données" }));
    await waitFor(() => expect(screen.getByLabelText("Lieu")).toHaveValue("Autre admin"));
    await user.clear(screen.getByLabelText("Lieu")); await user.type(screen.getByLabelText("Lieu"), "Correction");
    await user.click(screen.getByRole("button", { name: "Enregistrer la programmation" }));
    await screen.findByRole("heading", { name: "Équipe à renseigner – Équipe à renseigner" });
    expect(bodyOfLastWrite()).toEqual({ version: 2, stadium: "Correction" });
  });
  it("keeps programming on a business conflict without clearing the form", async () => {
    const user = userEvent.setup(); mount(`/dashboard/matches/${matchId}/edit`);
    const venue = await screen.findByLabelText("Lieu"); await user.type(venue, "Terrain conservé"); rejectCode = "MATCH_TEAM_MATCHDAY_CONFLICT";
    await user.click(screen.getByRole("button", { name: "Enregistrer la programmation" })); await screen.findByText("Modification refusée."); expect(venue).toHaveValue("Terrain conservé"); expect(match.version).toBe(0);
  });
  it("validates distinct teams and leaves a draft unpublished", async () => {
    const user = userEvent.setup(); mount(`/dashboard/matches/${matchId}/edit`); await screen.findByLabelText("Équipe domicile");
    await user.selectOptions(screen.getByLabelText("Équipe domicile"), homeId); await user.selectOptions(screen.getByLabelText("Équipe extérieure"), homeId);
    await user.click(screen.getByRole("button", { name: "Enregistrer la programmation" })); await screen.findByText("Choisissez deux équipes distinctes."); expect(writes()).toHaveLength(0);
  });
  it("blocks completion without scores, rejects negative scores and permits a backwards state", async () => {
    match = { ...initialMatch, isPublished: true, homeTeamId: homeId, awayTeamId: awayId, matchDate: "2026-10-25", startTime: "18:00", status: "IN_PROGRESS" };
    const user = userEvent.setup(); mount(); await screen.findByLabelText("Score domicile *");
    await user.selectOptions(screen.getByLabelText("État"), "COMPLETED");
    expect(screen.getByRole("button", { name: "Enregistrer l’état" })).toBeDisabled();
    await user.type(screen.getByLabelText("Score domicile *"), "-1"); await user.type(screen.getByLabelText("Score extérieur *"), "0");
    await user.click(screen.getByRole("button", { name: "Enregistrer les scores" }));
    await screen.findByText("Renseignez un score entier positif ou nul."); expect(writes()).toHaveLength(0);
    await user.selectOptions(screen.getByLabelText("État"), "SCHEDULED"); await user.click(screen.getByRole("button", { name: "Enregistrer l’état" }));
    await waitFor(() => expect(match.status).toBe("SCHEDULED")); expect(bodyOfLastWrite()).toEqual({ version: 0, status: "SCHEDULED" });
  });
  it("requires an explicit reload inside the confirmation after a deletion conflict", async () => {
    const user = userEvent.setup(); mount(); await screen.findByRole("button", { name: "Supprimer le match" });
    rejectCode = "RESOURCE_VERSION_CONFLICT";
    await user.click(screen.getByRole("button", { name: "Supprimer le match" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Supprimer" }));
    const reload = await within(screen.getByRole("dialog")).findByRole("button", { name: "Recharger les données" });
    expect(match.isActive).toBe(true); match = { ...match, version: 4 }; rejectCode = "";
    await user.click(reload); await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Supprimer le match" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Supprimer" }));
    await waitFor(() => expect(match.isActive).toBe(false)); expect(bodyOfLastWrite()).toEqual({ version: 4 });
  });
  it("uses canonical breadcrumb and cancellation destinations even after an unrelated page", async () => {
    const user = userEvent.setup(); const { router } = mount(`/dashboard/matches/${matchId}/edit`); await screen.findByLabelText("Lieu");
    const breadcrumb = screen.getByRole("navigation", { name: "Fil d’Ariane" });
    expect(within(breadcrumb).getByRole("link", { name: "Matchs" })).toHaveAttribute("href", "/dashboard/matches");
    expect(within(breadcrumb).getByRole("link", { name: "Match" })).toHaveAttribute("href", `/dashboard/matches/${matchId}`);
    await user.click(screen.getByRole("link", { name: "Annuler" })); expect(router.state.location.pathname).toBe(`/dashboard/matches/${matchId}`);
  });
  it("offers a list return and retry when a match is missing", async () => {
    readStatus = 404; mount(); await screen.findByText("Match introuvable."); expect(screen.getByRole("link", { name: "← Retour à la liste des matchs" })).toHaveAttribute("href", "/dashboard/matches"); expect(screen.getByRole("button", { name: "Réessayer" })).toBeInTheDocument();
  });
  it("invalidates season counters after a programming change", async () => {
    const user = userEvent.setup(); const { queryClient } = mount(`/dashboard/matches/${matchId}/edit`); await screen.findByLabelText("Lieu");
    queryClient.setQueryData(seasonKeys.list({ page: 1 }), { sentinel: true });
    await user.type(screen.getByLabelText("Lieu"), "Terrain"); await user.click(screen.getByRole("button", { name: "Enregistrer la programmation" }));
    await waitFor(() => expect(queryClient.getQueryState(seasonKeys.list({ page: 1 }))?.isInvalidated).toBe(true));
  });
});
