import type { PublicLeagueDetail, PublicLeagueTeam, PublicMatch } from "@lucarne/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import appRouter from "../../../src/router";
import { clearAccessToken } from "../../../src/lib/authToken";
import { leagueKeys } from "../../../src/features/league/leagueKeys";
import { teamKeys } from "../../../src/features/team/teamKeys";

const currentId = "00000000-0000-4000-8000-000000000001";
const previousId = "00000000-0000-4000-8000-000000000002";
const detail: PublicLeagueDetail = {
  id: "00000000-0000-4000-8000-000000000003", slug: "public-league", name: "Ligue publique", logoUrl: null,
  seasons: [{ id: currentId, name: "2026-2027", isCurrent: true }, { id: previousId, name: "2025-2026", isCurrent: false }],
};
const team = (index: number, seasonId = currentId): PublicLeagueTeam => ({
  id: `00000000-0000-4000-8000-${String(index + 10).padStart(12, "0")}`,
  name: `${seasonId === currentId ? "Current" : "Previous"} Club ${String(index).padStart(2, "0")}`,
  logoUrl: index === 0 ? "/api/v1/uploads/photos/team.png" : null,
});
const match: PublicMatch = {
  matchPublicId: "00000000-0000-4000-8000-000000000099", league: { name: detail.name, country: "France" },
  season: { name: "2026-2027" }, matchday: { number: 1, name: null },
  homeTeam: { name: "Home", logoUrl: null }, awayTeam: { name: "Away", logoUrl: null },
  matchDate: "2026-10-30", startTime: "18:00", timeZone: "Europe/Paris", stadium: null,
  status: "SCHEDULED", result: { homeScore: null, awayScore: null },
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const requestUrl = (input: RequestInfo | URL) => new URL(typeof input === "string" || input instanceof URL ? input : input.url, window.location.origin);
const fetchMock = vi.fn<typeof fetch>();
let league: PublicLeagueDetail;
let teamStatus: number;
let detailStatus: number;
let totalItems: number;
let dispose: (() => void) | undefined;

function responseFor(input: RequestInfo | URL) {
  const url = requestUrl(input);
  if (url.pathname.endsWith("/leagues/navigation")) return json([{ id: league.id, slug: league.slug, name: league.name, country: "France", logoUrl: null }]);
  if (url.pathname.endsWith("/teams")) {
    if (teamStatus) return json({ error: { code: "INTERNAL_SERVER_ERROR", message: "Unavailable" } }, teamStatus);
    const seasonId = url.pathname.includes(previousId) ? previousId : currentId;
    const page = Number(url.searchParams.get("page") ?? 1);
    const data = Array.from({ length: totalItems }, (_, index) => team(index, seasonId)).slice((page - 1) * 20, page * 20);
    return json({ data, pagination: { page, pageSize: 20, totalItems, totalPages: Math.ceil(totalItems / 20) } });
  }
  if (url.pathname.includes("/leagues/by-slug/")) return detailStatus
    ? json({ error: { code: "RESOURCE_NOT_FOUND", message: "Missing" } }, detailStatus) : json(league);
  if (url.pathname.endsWith("/matches")) return json({
    data: [url.searchParams.get("status") === "COMPLETED" ? { ...match, status: "COMPLETED", result: { homeScore: 0, awayScore: 0 } } : match],
    pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
  });
  throw new Error(`Unexpected or administrative request: ${url.pathname}`);
}

function mount(path = `/leagues/${detail.slug}/teams`, client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 30_000 } } })) {
  const router = createMemoryRouter(appRouter.routes, { initialEntries: [path] });
  render(<QueryClientProvider client={client}><RouterProvider router={router} /></QueryClientProvider>);
  dispose = () => { cleanup(); router.dispose(); client.clear(); };
  return router;
}
const requests = () => fetchMock.mock.calls.filter(([input]) => requestUrl(input).pathname.endsWith("/teams"));

describe("Public league teams tab", () => {
  beforeEach(() => {
    clearAccessToken(); league = detail; teamStatus = 0; detailStatus = 0; totalItems = 3;
    fetchMock.mockReset(); fetchMock.mockImplementation((input) => Promise.resolve(responseFor(input)));
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => { dispose?.(); dispose = undefined; clearAccessToken(); vi.unstubAllGlobals(); });

  it("opens anonymously, selects the current season and links to public team profiles", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(teamKeys.list({}), { data: [{ id: "private", name: "Private team", stadium: "Private" }] });
    mount(undefined, client);
    const list = await screen.findByRole("list", { name: "Équipes participantes" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(3);
    expect(within(list).getByRole("heading", { name: "Current Club 00" })).toBeInTheDocument();
    expect(within(list).getAllByRole("link")).toHaveLength(3);
    expect(within(list).getByRole("link", { name: "Current Club 00" })).toHaveAttribute("href", expect.stringMatching(/^\/teams\//));
    expect(screen.queryByText("Private team")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Saison")).toHaveValue(currentId);
    expect(screen.getByRole("link", { name: "Équipes", current: "page" })).toBeInTheDocument();
    expect(within(screen.getByRole("navigation", { name: "Rubriques de la ligue" })).getByRole("link", { name: "Calendrier" })).toHaveAttribute("href", `/leagues/${league.slug}/matches?seasonId=${currentId}`);
    expect(screen.getByRole("button", { name: "Ligues" })).toHaveClass("font-bold");
    expect(screen.getAllByRole("main")).toHaveLength(1);
    const [input] = requests()[0];
    expect(requestUrl(input).pathname).toBe(`/api/v1/leagues/by-slug/${detail.slug}/seasons/${currentId}/teams`);
    expect(Object.fromEntries(requestUrl(input).searchParams)).toEqual({ page: "1", pageSize: "20" });
    for (const [, options] of fetchMock.mock.calls) expect(new Headers(options?.headers).has("authorization")).toBe(false);
    expect(fetchMock.mock.calls.some(([input]) => requestUrl(input).pathname.endsWith("/matches"))).toBe(false);
    expect(client.getQueryData(leagueKeys.publicTeamList(detail.slug, currentId, { page: 1, pageSize: 20 }))).toBeDefined();
  });

  it("preserves the selected season between tabs and supports browser back and forward without reloading league context", async () => {
    const user = userEvent.setup(); const router = mount();
    const select = await screen.findByLabelText("Saison");
    await user.selectOptions(select, previousId);
    expect(select).toHaveFocus();
    expect(await screen.findByText("Previous Club 00")).toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: "Vue d’ensemble" }));
    expect(router.state.location.pathname).toBe(`/leagues/${detail.slug}`);
    expect(router.state.location.search).toBe(`?seasonId=${previousId}`);
    expect(screen.getByLabelText("Saison")).toHaveValue(previousId);
    expect(screen.getByRole("main")).toHaveFocus();
    expect(await screen.findByRole("list", { name: "Derniers résultats" })).toBeInTheDocument();
    expect(screen.getByText("0 – 0")).toBeInTheDocument();
    await act(async () => { await router.navigate(-1); });
    expect(await screen.findByText("Previous Club 00")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Équipes", current: "page" })).toBeInTheDocument();
    await act(async () => { await router.navigate(1); });
    expect(await screen.findByRole("list", { name: "Prochains matchs" })).toBeInTheDocument();
    expect(fetchMock.mock.calls.filter(([input]) => requestUrl(input).pathname === `/api/v1/leagues/by-slug/${detail.slug}`)).toHaveLength(1);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getAllByLabelText("Saison")).toHaveLength(1);
  });

  it("paginates all teams and resets the page when the season changes", async () => {
    totalItems = 23; const user = userEvent.setup(); const router = mount();
    const list = await screen.findByRole("list", { name: "Équipes participantes" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(20);
    await user.click(screen.getByRole("button", { name: "Suivant" }));
    expect(await screen.findByText("Current Club 22")).toBeInTheDocument();
    expect(router.state.location.search).toContain("page=2");
    expect(within(screen.getByRole("list", { name: "Équipes participantes" })).getAllByRole("listitem")).toHaveLength(3);
    await user.selectOptions(screen.getByLabelText("Saison"), previousId);
    expect(router.state.location.search).toBe(`?seasonId=${previousId}`);
    expect(await screen.findByText("Previous Club 00")).toBeInTheDocument();
    expect(screen.queryByText("Current Club 22")).not.toBeInTheDocument();
  });

  it("restores the same selection and page when a direct URL is reopened", async () => {
    totalItems = 23;
    const url = `/leagues/${detail.slug}/teams?seasonId=${previousId}&page=2`;
    mount(url); expect(await screen.findByText("Previous Club 22")).toBeInTheDocument();
    dispose?.(); dispose = undefined; mount(url);
    expect(await screen.findByText("Previous Club 22")).toBeInTheDocument();
    expect(screen.getByLabelText("Saison")).toHaveValue(previousId);
  });

  it("corrects an out-of-range page after the public total shrinks", async () => {
    totalItems = 23; const router = mount(`/leagues/${detail.slug}/teams?seasonId=${currentId}&page=99`);
    expect(await screen.findByText("Current Club 22")).toBeInTheDocument();
    expect(router.state.location.search).toContain("page=2");
  });

  it("rejects invalid pagination before requesting teams and offers recovery", async () => {
    const user = userEvent.setup(); mount(`/leagues/${detail.slug}/teams?page=invalid`);
    expect(await screen.findByText("Le numéro de page est invalide.")).toBeInTheDocument();
    expect(requests()).toHaveLength(0);
    await user.click(screen.getByRole("button", { name: "Revenir à la première page" }));
    expect(await screen.findByText("Current Club 00")).toBeInTheDocument();
  });

  it.each(["invalid", "00000000-0000-4000-8000-000000000098"])("rejects an unrelated season without requesting teams: %s", async (seasonId) => {
    mount(`/leagues/${detail.slug}/teams?seasonId=${seasonId}`);
    expect(await screen.findByRole("alert")).toHaveTextContent("Cette saison n’appartient pas à cette ligue");
    expect(requests()).toHaveLength(0);
    expect(screen.getByRole("link", { name: "Vue d’ensemble" })).toHaveAttribute("href", `/leagues/${detail.slug}?seasonId=${seasonId}`);
  });

  it("allows choosing a season when no current season exists", async () => {
    league = { ...detail, seasons: detail.seasons.map((season) => ({ ...season, isCurrent: false })) };
    const user = userEvent.setup(); mount();
    expect(await screen.findByText(/Aucune saison courante/)).toBeInTheDocument();
    expect(requests()).toHaveLength(0);
    await user.selectOptions(screen.getByLabelText("Saison"), previousId);
    expect(await screen.findByText("Previous Club 00")).toBeInTheDocument();
  });

  it("shows no seasons without requesting teams", async () => {
    league = { ...detail, seasons: [] }; mount();
    expect(await screen.findByText("Aucune saison n’est encore associée à cette ligue.")).toBeInTheDocument();
    expect(screen.getByLabelText("Saison")).toBeDisabled(); expect(requests()).toHaveLength(0);
  });

  it("shows an empty season", async () => {
    totalItems = 0; mount();
    expect(await screen.findByText("Aucune équipe active inscrite pour cette saison.")).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Pagination des équipes" })).not.toBeInTheDocument();
  });

  it("retries a teams error while preserving league controls", async () => {
    teamStatus = 500; const user = userEvent.setup(); mount();
    expect(await screen.findByText("Impossible de charger les équipes.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: detail.name })).toBeInTheDocument();
    expect(screen.getByLabelText("Saison")).toHaveValue(currentId);
    teamStatus = 0; await user.click(screen.getByRole("button", { name: "Réessayer" }));
    expect(await screen.findByText("Current Club 00")).toBeInTheDocument();
  });

  it("handles an unavailable league on the direct teams route", async () => {
    detailStatus = 404; mount();
    expect(await screen.findByRole("heading", { name: "Page introuvable" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Navigation publique" })).toBeInTheDocument();
  });

  it("replaces missing and broken team logos with initials and retains long names", async () => {
    const longName = "Association Sportive Féminine de la Région Métropolitaine";
    fetchMock.mockImplementation((input) => requestUrl(input).pathname.endsWith("/teams") ? Promise.resolve(json({
      data: [{ ...team(0), name: longName }, team(1)], pagination: { page: 1, pageSize: 20, totalItems: 2, totalPages: 1 },
    })) : Promise.resolve(responseFor(input)));
    mount(); const list = await screen.findByRole("list", { name: "Équipes participantes" });
    expect(within(list).getByRole("heading", { name: longName })).toBeInTheDocument();
    fireEvent.error(list.querySelector("img")!);
    expect(list.querySelector("img")).toBeNull();
    expect(within(list).getByText("A")).toBeInTheDocument();
    expect(within(list).getByText("C")).toBeInTheDocument();
  });

  it("ignores late responses for a season that is no longer selected", async () => {
    const pending: { input: RequestInfo | URL; resolve: (response: Response) => void }[] = [];
    fetchMock.mockImplementation((input) => requestUrl(input).pathname.endsWith(`/seasons/${currentId}/teams`)
      ? new Promise((resolve) => { pending.push({ input, resolve }); }) : Promise.resolve(responseFor(input)));
    const user = userEvent.setup(); mount();
    expect(await screen.findByText("Chargement des équipes…")).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Saison"), previousId);
    expect(await screen.findByText("Previous Club 00")).toBeInTheDocument();
    await act(async () => { pending.forEach((request) => request.resolve(responseFor(request.input))); await Promise.resolve(); });
    expect(screen.queryByText("Current Club 00")).not.toBeInTheDocument();
    expect(screen.getByText("Previous Club 00")).toBeInTheDocument();
  });

  it("allows keyboard activation of the teams tab with focus moved to the public main", async () => {
    const user = userEvent.setup(); mount(`/leagues/${detail.slug}`);
    const link = await screen.findByRole("link", { name: "Équipes" });
    link.focus(); await user.keyboard("{Enter}");
    expect(await screen.findByRole("list", { name: "Équipes participantes" })).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveFocus();
    expect(screen.getByRole("link", { name: "Équipes", current: "page" })).toBeInTheDocument();
  });
});
