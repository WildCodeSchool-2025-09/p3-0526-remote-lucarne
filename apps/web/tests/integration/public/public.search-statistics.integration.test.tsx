import type { PublicMatch, PublicSearchResult, PublicStandingRow } from "@lucarne/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import appRouter from "../../../src/router";
import { clearAccessToken } from "../../../src/lib/authToken";

const id = (value: number) => `00000000-0000-4000-8000-${String(value).padStart(12, "0")}`;
const league = { id: id(1), slug: "elite", name: "Élite", country: "France", logoUrl: null };
const season = { id: id(2), name: "2026-2027", startDate: "2026-08-01", endDate: "2027-06-30" };
const previous = { ...season, id: id(9), name: "2025-2026" };
const team = { id: id(3), name: "Club public", logoUrl: null, stadium: "Stade public" };
const player = { id: id(4), firstName: "Alex", lastName: "Martin", nationality: null, position: "Défenseure", pictureUrl: null, shirtNumber: 7, team };
const match: PublicMatch = { matchPublicId: id(5), league, season, matchday: { id: id(6), number: 2, name: null }, homeTeam: team, awayTeam: { id: id(7), name: "Racing", logoUrl: null }, matchDate: "2026-10-25", startTime: "18:00", timeZone: "Europe/Paris", stadium: null, status: "COMPLETED", result: { homeScore: 0, awayScore: 0 } };
const row: PublicStandingRow = { team, rank: 1, played: 1, wins: 0, draws: 1, losses: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 1, form: [{ result: "DRAW", matchPublicId: match.matchPublicId, date: match.matchDate }] };
const results: PublicSearchResult[] = [
  { type: "LEAGUE", id: league.id, slug: league.slug, label: league.name, description: "France", pictureUrl: null },
  { type: "TEAM", id: team.id, label: team.name, description: team.stadium, pictureUrl: null },
  { type: "PLAYER", id: player.id, label: "Alex Martin", description: "Défenseure · Club public", pictureUrl: null },
  { type: "SEASON", id: season.id, label: season.name, description: league.name, pictureUrl: null },
  { type: "GAME_MATCH", id: match.matchPublicId, label: "Club public – Racing", description: league.name, pictureUrl: null, matchDate: match.matchDate, startTime: match.startTime, status: match.status },
];
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const urlFor = (input: RequestInfo | URL) => new URL(typeof input === "string" || input instanceof URL ? input : input.url, window.location.origin);
const fetchMock = vi.fn<typeof fetch>();
const scrollMock = vi.fn<(...args: unknown[]) => void>();
let dispose: (() => void) | undefined;
let failSearch: boolean;
let failStatistics: boolean;
let emptyGoals: boolean;

function mount(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 30_000 } } });
  const router = createMemoryRouter(appRouter.routes, { initialEntries: [path] });
  render(<QueryClientProvider client={client}><RouterProvider router={router} /></QueryClientProvider>);
  dispose = () => { cleanup(); router.dispose(); client.clear(); };
  return router;
}

beforeEach(() => {
  clearAccessToken(); failSearch = false; failStatistics = false; emptyGoals = false;
  scrollMock.mockReset(); vi.spyOn(window, "scrollTo").mockImplementation(scrollMock);
  Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
  fetchMock.mockReset().mockImplementation((input) => Promise.resolve((() => {
    const url = urlFor(input); const path = url.pathname;
    const editionSeason = path.includes(previous.id) || url.searchParams.get("seasonId") === previous.id ? previous : season;
    const context = { league, season: editionSeason };
    if (path.endsWith("/leagues/navigation")) return json([league]);
    if (path.endsWith("/standings")) return json({ ...context, rows: editionSeason.id === season.id ? [row] : [] });
    if (path.endsWith(`/seasons/${season.id}/matchdays`)) return json([{ id: id(6), number: 2, name: null, startDate: null, endDate: null }]);
    if (/\/leagues\/by-slug\/.*\/statistics$/.test(path)) {
      if (failStatistics) return json({ error: { code: "INTERNAL_SERVER_ERROR", message: "Unavailable" } }, 500);
      return json({ ...context, completedMatches: editionSeason.id === season.id ? 1 : 0, totalGoals: 0, goalsPerMatch: editionSeason.id === season.id ? 0 : null, homeWins: 0, draws: editionSeason.id === season.id ? 1 : 0, awayWins: 0,
        scorers: { data: editionSeason.id === season.id ? [{ rank: 1, goals: 2, player: { id: player.id, firstName: player.firstName, lastName: player.lastName, pictureUrl: null, team } }] : [], pagination: { page: 1, limit: Number(url.searchParams.get("limit") ?? 20), total: editionSeason.id === season.id ? 1 : 0, totalPages: editionSeason.id === season.id ? 1 : 0 } },
      });
    }
    if (path.endsWith(`/leagues/by-slug/${league.slug}`)) return json({ ...league, seasons: [{ id: season.id, name: season.name, isCurrent: true }, { id: previous.id, name: previous.name, isCurrent: false }] });
    if (path.endsWith(`/public/players/${player.id}/statistics`)) return json({ ...context, playerId: player.id, goals: 0 });
    if (path.endsWith(`/public/teams/${team.id}/statistics`)) return json({ ...context, ...row });
    if (path.endsWith(`/public/players/${player.id}`)) return json(player);
    if (path.endsWith(`/public/teams/${team.id}`)) return json({ ...team, createdAt: "2026-01-01T00:00:00Z", editions: [{ league, season, isCurrent: true }, { league, season: previous, isCurrent: false }] });
    if (path.endsWith(`/matches/${match.matchPublicId}/events`)) return json(emptyGoals ? [] : [{ id: id(8), minute: 0, player: { id: player.id, firstName: player.firstName, lastName: player.lastName, pictureUrl: null } }]);
    if (path.endsWith(`/matches/${match.matchPublicId}`)) return json(match);
    if (path.endsWith("/matches")) return json({ data: [], pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 } });
    if (path.endsWith("/public/search")) {
      if (failSearch) return json({ error: { code: "INTERNAL_SERVER_ERROR", message: "Unavailable" } }, 500);
      const type = url.searchParams.get("type") ?? "ALL"; const q = url.searchParams.get("q"); const page = Number(url.searchParams.get("page") ?? 1);
      if (q === "clubs") {
        return json({ data: Array.from({ length: page === 1 ? 20 : 1 }, (_, index) => ({ type: "TEAM", id: id(100 + (page - 1) * 20 + index), label: `Club ${(page - 1) * 20 + index + 1}`, description: null, pictureUrl: null })), counts: { LEAGUE: 0, TEAM: 21, PLAYER: 0, SEASON: 0, GAME_MATCH: 0 }, pagination: { page, limit: 20, total: 21, totalPages: 2 } });
      }
      const onlyMatches = url.searchParams.has("status") || url.searchParams.has("dateFrom") || url.searchParams.has("dateTo");
      const base = q === "none" ? [] : results.filter((result) => !onlyMatches || result.type === "GAME_MATCH");
      const data = base.filter((result) => type === "ALL" || result.type === type);
      return json({ data, counts: Object.fromEntries(["LEAGUE", "TEAM", "PLAYER", "SEASON", "GAME_MATCH"].map((type) => [type, base.filter((result) => result.type === type).length])), pagination: { page, limit: 20, total: data.length, totalPages: data.length ? 1 : 0 } });
    }
    throw new Error(`Unexpected public request: ${path}`);
  })()));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => { dispose?.(); dispose = undefined; clearAccessToken(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it("submits search from the canonical navigation and groups five public categories", async () => {
  const user = userEvent.setup(); const router = mount("/search");
  expect(screen.getByRole("link", { name: "Recherche", current: "page" })).toBeInTheDocument();
  expect(fetchMock.mock.calls.some(([input]) => urlFor(input).pathname.endsWith("/public/search"))).toBe(false);
  await user.type(screen.getByRole("searchbox", { name: "Votre recherche" }), "Élite");
  await user.click(screen.getByRole("button", { name: "Rechercher" }));
  for (const label of ["Ligues", "Équipes", "Joueuses", "Saisons", "Matchs"]) expect(await screen.findByRole("list", { name: `Résultats — ${label}` })).toBeInTheDocument();
  expect(new URLSearchParams(router.state.location.search).get("q")).toBe("Élite");
  expect(screen.getByText(/5 résultats pour/)).toBeInTheDocument();
  expect(fetchMock.mock.calls.every(([input]) => !/\/api\/v1\/(admin|players|teams|seasons)(\/|$)/.test(urlFor(input).pathname))).toBe(true);
});

it("retains search filters and scroll position after opening a profile and returning explicitly", async () => {
  const user = userEvent.setup(); const path = "/search?q=elite&type=PLAYER"; const router = mount(path);
  const list = await screen.findByRole("list", { name: "Résultats — Joueuses" });
  Object.defineProperty(window, "scrollY", { configurable: true, value: 720 });
  await user.click(within(list).getByRole("link"));
  await screen.findByRole("heading", { name: "Alex Martin" });
  expect(screen.getByRole("link", { name: "← Retour aux résultats de recherche" })).toHaveAttribute("href", path);
  await user.click(screen.getByRole("link", { name: "← Retour aux résultats de recherche" }));
  expect(`${router.state.location.pathname}${router.state.location.search}`).toBe(path);
  await screen.findByRole("list", { name: "Résultats — Joueuses" });
  await waitFor(() => expect(scrollMock).toHaveBeenCalledWith(0, 720));
  expect(screen.getByRole("searchbox", { name: "Votre recherche" })).toHaveValue("elite");
  expect(fetchMock.mock.calls.filter(([input]) => urlFor(input).pathname.endsWith("/public/search"))).toHaveLength(1);
});

it("paginates globally ordered results and resets the page after a category change", async () => {
  const user = userEvent.setup(); const router = mount("/search?q=clubs&type=TEAM");
  await screen.findByText("Club 20");
  await user.click(within(screen.getByRole("navigation", { name: "Pagination de recherche" })).getByRole("button", { name: "Suivant" }));
  expect(await screen.findByText("Club 21")).toBeInTheDocument();
  expect(new URLSearchParams(router.state.location.search).get("page")).toBe("2");
  await user.click(screen.getByRole("button", { name: "Tout (21)" }));
  expect(new URLSearchParams(router.state.location.search).has("page")).toBe(false);
  expect(new URLSearchParams(router.state.location.search).get("q")).toBe("clubs");
});

it("recovers from a search failure without losing query and displays empty and short-query states", async () => {
  failSearch = true; const user = userEvent.setup(); const router = mount("/search?q=elite");
  await screen.findByText("Impossible de charger : recherche.");
  failSearch = false; await user.click(screen.getByRole("button", { name: "Réessayer" }));
  await screen.findByRole("list", { name: "Résultats — Ligues" });
  await act(async () => { await router.navigate("/search?q=none"); });
  expect(await screen.findByText("Aucun résultat ne correspond à votre recherche.")).toBeInTheDocument();
  const count = fetchMock.mock.calls.filter(([input]) => urlFor(input).pathname.endsWith("/public/search")).length;
  await act(async () => { await router.navigate("/search?q=x"); });
  expect(await screen.findByText(/Les critères sont invalides/)).toBeInTheDocument();
  expect(fetchMock.mock.calls.filter(([input]) => urlFor(input).pathname.endsWith("/public/search"))).toHaveLength(count);
  expect(screen.getByRole("searchbox", { name: "Votre recherche" })).toHaveValue("x");
});

it("preserves meaningful search criteria when date/status filters restrict results to matches", async () => {
  const user = userEvent.setup(); const router = mount("/search?q=elite");
  await screen.findByRole("list", { name: "Résultats — Ligues" });
  await user.click(screen.getByText("Filtres de recherche"));
  await user.selectOptions(screen.getByLabelText("Ligue"), league.id);
  await screen.findByRole("option", { name: season.name });
  await user.selectOptions(screen.getByLabelText("Saison"), season.id);
  await user.selectOptions(screen.getByLabelText("État du match"), "COMPLETED");
  await user.type(screen.getByLabelText("Matchs à partir du"), "2026-10-01");
  await waitFor(() => expect(fetchMock.mock.calls.some(([input]) => {
    const url = urlFor(input); return url.pathname.endsWith("/public/search") && url.searchParams.get("leagueId") === league.id && url.searchParams.get("seasonId") === season.id && url.searchParams.get("status") === "COMPLETED" && url.searchParams.get("dateFrom") === "2026-10-01";
  })).toBe(true));
  expect(screen.queryByRole("list", { name: "Résultats — Ligues" })).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Réinitialiser les filtres" }));
  expect(router.state.location.search).toBe("?q=elite");
});

it("shows complete league standings and keeps the selected season across statistics tabs", async () => {
  const user = userEvent.setup(); const router = mount(`/leagues/elite/standings?seasonId=${season.id}`);
  const table = await screen.findByRole("table", { name: `Classement ${league.name} — ${season.name}` });
  expect(within(table).getByRole("link", { name: team.name })).toHaveAttribute("href", `/teams/${team.id}`);
  expect(within(table).getByText("1", { selector: "strong" })).toBeInTheDocument();
  expect(await screen.findByRole("list", { name: "Meilleures buteuses" })).toHaveTextContent("2 buts");
  await user.selectOptions(screen.getByLabelText("Saison"), previous.id);
  expect(await screen.findByText("Aucune équipe inscrite dans cette édition.")).toBeInTheDocument();
  await user.click(screen.getByRole("link", { name: "Statistiques" }));
  expect(router.state.location.pathname).toBe("/leagues/elite/statistics");
  expect(new URLSearchParams(router.state.location.search).get("seasonId")).toBe(previous.id);
});

it("retries statistics independently while retaining the loaded standings", async () => {
  failStatistics = true; const user = userEvent.setup(); mount(`/leagues/elite/standings?seasonId=${season.id}`);
  await screen.findByRole("table"); await screen.findByText("Impossible de charger : statistiques.");
  failStatistics = false; await user.click(screen.getByRole("button", { name: "Réessayer" }));
  expect(await screen.findByRole("list", { name: "Meilleures buteuses" })).toBeInTheDocument();
  expect(fetchMock.mock.calls.filter(([input]) => urlFor(input).pathname.endsWith("/standings"))).toHaveLength(1);
});

it("loads player goal totals only after an edition is chosen and keeps a recorded zero visible", async () => {
  const user = userEvent.setup(); mount(`/players/${player.id}`);
  await screen.findByRole("heading", { name: "Alex Martin" });
  expect(fetchMock.mock.calls.some(([input]) => urlFor(input).pathname.endsWith(`/players/${player.id}/statistics`))).toBe(false);
  await screen.findByRole("option", { name: "Élite · France" });
  await user.selectOptions(screen.getByLabelText("Ligue des statistiques"), league.id);
  await screen.findByRole("option", { name: season.name });
  await user.selectOptions(screen.getByLabelText("Saison des statistiques"), season.id);
  expect(await screen.findByText("Buts individuels renseignés", { selector: "dt" })).toBeInTheDocument();
  expect(screen.getByText("0", { selector: "dd" })).toBeInTheDocument();
});

it("shows recorded goal minute zero and a public player link", async () => {
  mount(`/matches/${match.matchPublicId}`);
  expect(await screen.findByRole("list", { name: "Buts renseignés du match" })).toHaveTextContent("0′");
  expect(screen.getByRole("link", { name: "Alex Martin" })).toHaveAttribute("href", `/players/${player.id}`);
});

it("distinguishes absent individual goal records from a recorded match score", async () => {
  emptyGoals = true; mount(`/matches/${match.matchPublicId}`);
  expect(await screen.findByText("Aucun but individuel renseigné pour ce match.")).toBeInTheDocument();
  expect(screen.getAllByText("0 – 0").length).toBeGreaterThan(0);
  expect(screen.queryByRole("list", { name: "Buts renseignés du match" })).not.toBeInTheDocument();
});

it("rejects external search-return destinations on a directly opened public profile", async () => {
  mount(`/players/${player.id}?searchReturnTo=${encodeURIComponent("https://example.com/search?q=elite")}`);
  await screen.findByRole("heading", { name: "Alex Martin" });
  expect(screen.queryByRole("link", { name: "← Retour aux résultats de recherche" })).not.toBeInTheDocument();
});

it("revalidates the same submitted search against the server instead of relying on a fresh cached response", async () => {
  const user = userEvent.setup(); mount("/search?q=elite");
  await screen.findByRole("list", { name: "Résultats — Ligues" });
  await user.click(screen.getByRole("button", { name: "Rechercher" }));
  await waitFor(() => expect(fetchMock.mock.calls.filter(([input]) => urlFor(input).pathname.endsWith("/public/search"))).toHaveLength(2));
});

it("does not render cached scorer data for an invalid statistics page", async () => {
  const router = mount(`/leagues/elite/standings?seasonId=${season.id}`);
  await screen.findByRole("list", { name: "Meilleures buteuses" });
  await act(async () => { await router.navigate(`/leagues/elite/standings?seasonId=${season.id}&page=invalid`); });
  expect(await screen.findByText(/La page demandée est invalide/)).toBeInTheDocument();
  expect(screen.queryByRole("list", { name: "Meilleures buteuses" })).not.toBeInTheDocument();
  expect(screen.getByRole("table")).toBeInTheDocument();
});
