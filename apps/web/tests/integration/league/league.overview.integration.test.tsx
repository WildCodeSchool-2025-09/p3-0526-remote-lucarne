import type { PublicLeagueDetail, PublicMatch } from "@lucarne/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import appRouter from "../../../src/router";
import { clearAccessToken } from "../../../src/lib/authToken";
import { leagueKeys } from "../../../src/features/league/leagueKeys";
import { emptyPublicStatisticsResponse } from "../../fixtures/publicStatistics";

const leagueId = "00000000-0000-4000-8000-000000000001";
const currentId = "00000000-0000-4000-8000-000000000002";
const previousId = "00000000-0000-4000-8000-000000000003";
const detail: PublicLeagueDetail = {
  id: leagueId, slug: "elite-feminine", name: "Élite Féminine", logoUrl: "/api/v1/uploads/photos/league.png",
  seasons: [
    { id: previousId, name: "2025-2026", isCurrent: false },
    { id: currentId, name: "2026-2027", isCurrent: true },
  ],
};
const fixture = (index: number, results: boolean, seasonId = currentId): PublicMatch => ({
  matchPublicId: `00000000-0000-4000-8000-${String(index + (results ? 100 : 200)).padStart(12, "0")}`,
  league: { name: detail.name, country: "France" }, season: { name: seasonId === currentId ? "2026-2027" : "2025-2026" },
  matchday: { number: index + 1, name: null },
  homeTeam: { name: `${seasonId === currentId ? "Current" : "Previous"} Home ${index}`, logoUrl: null },
  awayTeam: { name: `Away ${index}`, logoUrl: null },
  matchDate: results ? `2026-10-${String(20 - index).padStart(2, "0")}` : `2026-10-${String(21 + index).padStart(2, "0")}`,
  startTime: "18:00", timeZone: "Europe/Paris", stadium: null,
  ...(results ? { status: "COMPLETED", result: { homeScore: index, awayScore: index } } as const
    : { status: "SCHEDULED", result: { homeScore: null, awayScore: null } } as const),
});
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const requestUrl = (input: RequestInfo | URL) => new URL(typeof input === "string" || input instanceof URL ? input : input.url, window.location.origin);
const fetchMock = vi.fn<typeof fetch>();
let league: PublicLeagueDetail;
let detailStatus: number;
let upcomingStatus: number;
let empty: boolean;
let dispose: (() => void) | undefined;

function responseFor(input: RequestInfo | URL) {
  const url = requestUrl(input);
  const statistics = emptyPublicStatisticsResponse(url, league);
  if (statistics) return statistics;
  if (url.pathname.endsWith("/leagues/navigation")) return json([{ id: detail.id, slug: detail.slug, name: detail.name, country: "France", logoUrl: detail.logoUrl }]);
  if (url.pathname.includes("/leagues/by-slug/")) return detailStatus
    ? json({ error: { code: "RESOURCE_NOT_FOUND", message: "Unavailable" } }, detailStatus) : json(league);
  if (url.pathname.endsWith("/matches")) {
    const results = url.searchParams.get("status") === "COMPLETED";
    if (!results && upcomingStatus) return json({ error: { code: "INTERNAL_SERVER_ERROR", message: "Unavailable" } }, upcomingStatus);
    return json({
      data: empty ? [] : Array.from({ length: 5 }, (_, index) => fixture(index, results, url.searchParams.get("seasonId") ?? "")),
      pagination: { page: 1, pageSize: 20, totalItems: empty ? 0 : 5, totalPages: empty ? 0 : 1 },
    });
  }
  throw new Error(`Unexpected or protected request: ${url.pathname}`);
}

function mount(path = `/leagues/${detail.slug}`, client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 30_000 } } })) {
  const router = createMemoryRouter(appRouter.routes, { initialEntries: [path] });
  render(<QueryClientProvider client={client}><RouterProvider router={router} /></QueryClientProvider>);
  dispose = () => { cleanup(); router.dispose(); client.clear(); };
  return router;
}

describe("Public league overview", () => {
  beforeEach(() => {
    clearAccessToken(); league = detail; detailStatus = 0; upcomingStatus = 0; empty = false;
    fetchMock.mockReset(); fetchMock.mockImplementation((input) => Promise.resolve(responseFor(input)));
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => { dispose?.(); dispose = undefined; clearAccessToken(); vi.unstubAllGlobals(); });

  it("resolves the slug anonymously, selects the current season and shows the first three sorted matches per card", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(leagueKeys.detail(leagueId), { id: leagueId, name: "Private dashboard", version: 8 });
    mount(undefined, client);
    expect(await screen.findByRole("heading", { level: 1, name: detail.name })).toBeInTheDocument();
    expect(screen.getByLabelText("Saison")).toHaveValue(currentId);
    const upcoming = await screen.findByRole("list", { name: "Prochains matchs" });
    const results = await screen.findByRole("list", { name: "Derniers résultats" });
    for (const list of [upcoming, results]) {
      expect(within(list).getAllByRole("listitem")).toHaveLength(3);
      expect(within(list).getAllByRole("link")[0]).toHaveTextContent("Current Home 0");
      expect(within(list).queryByText("Current Home 3")).not.toBeInTheDocument();
    }
    expect(within(results).getByText("0 – 0")).toBeInTheDocument();
    const matchLink = new URL(within(upcoming).getAllByRole("link")[0].getAttribute("href")!, window.location.origin);
    expect(matchLink.pathname).toBe(`/matches/${fixture(0, false).matchPublicId}`);
    expect(matchLink.searchParams.get("returnTo")).toBe(`/leagues/${detail.slug}/matches?seasonId=${currentId}`);
    expect(screen.queryByText("Private dashboard")).not.toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Navigation publique" })).toBeInTheDocument();
    expect(screen.getAllByRole("main")).toHaveLength(1);
    for (const [input, options] of fetchMock.mock.calls) {
      expect(new Headers(options?.headers).has("authorization")).toBe(false);
      const url = requestUrl(input);
      if (url.pathname.endsWith("/matches")) {
        expect(Object.fromEntries(url.searchParams)).toEqual({
          leagueId, seasonId: currentId, page: "1", pageSize: "20", sortBy: "matchDate",
          status: url.searchParams.get("status") === "COMPLETED" ? "COMPLETED" : "SCHEDULED",
          sortOrder: url.searchParams.get("status") === "COMPLETED" ? "desc" : "asc",
        });
      } else expect([`/api/v1/leagues/by-slug/${detail.slug}`, "/api/v1/leagues/navigation", `/api/v1/leagues/by-slug/${detail.slug}/seasons/${currentId}/standings`, `/api/v1/leagues/by-slug/${detail.slug}/seasons/${currentId}/statistics`]).toContain(url.pathname);
    }
    expect(fetchMock).toHaveBeenCalledTimes(6);
  });

  it("changes both cards together, persists the season in the URL and retains keyboard focus", async () => {
    const user = userEvent.setup(); const router = mount();
    const select = await screen.findByLabelText("Saison");
    await screen.findByRole("list", { name: "Prochains matchs" });
    await user.selectOptions(select, previousId);
    expect(router.state.location.search).toBe(`?seasonId=${previousId}`);
    expect(select).toHaveFocus();
    for (const name of ["Prochains matchs", "Derniers résultats"]) {
      const list = await screen.findByRole("list", { name });
      expect(within(list).getByText("Previous Home 0")).toBeInTheDocument();
      expect(within(list).queryByText("Current Home 0")).not.toBeInTheDocument();
    }
    expect(fetchMock.mock.calls.filter(([input]) => requestUrl(input).searchParams.get("seasonId") === previousId)).toHaveLength(2);
  });

  it("uses an explicitly selected league season on a direct URL", async () => {
    mount(`/leagues/${detail.slug}?seasonId=${previousId}`);
    expect(await screen.findByLabelText("Saison")).toHaveValue(previousId);
    await waitFor(() => expect(screen.getAllByText("Previous Home 0")).toHaveLength(2));
  });

  it("does not replace the selected season with late responses from the previous selection", async () => {
    const pending: { input: RequestInfo | URL; resolve: (response: Response) => void }[] = [];
    fetchMock.mockImplementation((input) => {
      const url = requestUrl(input);
      return url.pathname.endsWith("/matches") && url.searchParams.get("seasonId") === currentId
        ? new Promise((resolve) => { pending.push({ input, resolve }); })
        : Promise.resolve(responseFor(input));
    });
    const user = userEvent.setup(); mount();
    await user.selectOptions(await screen.findByLabelText("Saison"), previousId);
    await waitFor(() => expect(screen.getAllByText("Previous Home 0")).toHaveLength(2));
    await act(async () => {
      pending.forEach((request) => request.resolve(responseFor(request.input)));
      await Promise.resolve();
    });
    expect(screen.getByLabelText("Saison")).toHaveValue(previousId);
    expect(screen.getAllByText("Previous Home 0")).toHaveLength(2);
    expect(screen.queryByText("Current Home 0")).not.toBeInTheDocument();
  });

  it("retains full long league and team names in accessible match links", async () => {
    const longName = "Association Sportive Féminine de la Région Métropolitaine";
    league = { ...detail, name: `${longName} — Championnat régional` };
    fetchMock.mockImplementation((input) => {
      if (requestUrl(input).pathname.endsWith("/matches")) {
        const match = { ...fixture(0, false), homeTeam: { name: longName, logoUrl: null } };
        return Promise.resolve(json({ data: [match], pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 } }));
      }
      return Promise.resolve(responseFor(input));
    });
    mount();
    expect(await screen.findByRole("heading", { name: league.name })).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByRole("link", { name: new RegExp(longName) })).toHaveLength(2));
    expect(screen.getAllByText(longName)).toHaveLength(2);
  });

  it.each(["not-a-uuid", "00000000-0000-4000-8000-000000000099"])("rejects a season outside the league before requesting matches: %s", async (seasonId) => {
    const user = userEvent.setup(); mount(`/leagues/${detail.slug}?seasonId=${seasonId}`);
    expect(await screen.findByRole("alert")).toHaveTextContent("Cette saison n’appartient pas à cette ligue");
    expect(fetchMock.mock.calls.some(([input]) => requestUrl(input).pathname.endsWith("/matches"))).toBe(false);
    await user.selectOptions(screen.getByLabelText("Saison"), currentId);
    expect(await screen.findByRole("list", { name: "Prochains matchs" })).toBeInTheDocument();
  });

  it("allows manual selection when there is no current season", async () => {
    league = { ...detail, seasons: detail.seasons.map((season) => ({ ...season, isCurrent: false })) };
    const user = userEvent.setup(); mount();
    expect(await screen.findByText(/Aucune saison courante n’est définie/)).toBeInTheDocument();
    expect(screen.getByLabelText("Saison")).toHaveValue("");
    expect(fetchMock.mock.calls.some(([input]) => requestUrl(input).pathname.endsWith("/matches"))).toBe(false);
    await user.selectOptions(screen.getByLabelText("Saison"), previousId);
    expect(await screen.findByRole("list", { name: "Derniers résultats" })).toBeInTheDocument();
  });

  it("shows no seasons without requesting unscoped matches", async () => {
    league = { ...detail, seasons: [] }; mount();
    expect(await screen.findByText("Aucune saison n’est encore associée à cette ligue.")).toBeInTheDocument();
    expect(screen.getByLabelText("Saison")).toBeDisabled();
    expect(fetchMock.mock.calls.some(([input]) => requestUrl(input).pathname.endsWith("/matches"))).toBe(false);
  });

  it("opens the league calendar and results with the selected season", async () => {
    const user = userEvent.setup(); const router = mount(); await screen.findByLabelText("Saison");
    const nav = screen.getByRole("navigation", { name: "Rubriques de la ligue" });
    expect(within(nav).getByText("Vue d’ensemble")).toHaveAttribute("aria-current", "page");
    expect(within(nav).getByRole("link", { name: "Calendrier" })).toHaveAttribute("href", `/leagues/${detail.slug}/matches?seasonId=${currentId}`);
    expect(within(nav).getByRole("link", { name: "Équipes" })).toHaveAttribute("href", `/leagues/${detail.slug}/teams?seasonId=${currentId}`);
    const calendar = screen.getByRole("link", { name: "Voir le calendrier" });
    expect(calendar).toHaveAttribute("href", `/leagues/${detail.slug}/matches?seasonId=${currentId}`);
    await user.click(screen.getByRole("link", { name: "Voir les résultats" }));
    expect(router.state.location.pathname).toBe(`/leagues/${detail.slug}/matches`);
    expect(new URLSearchParams(router.state.location.search).get("seasonId")).toBe(currentId);
    expect(new URLSearchParams(router.state.location.search).get("status")).toBe("COMPLETED");
    expect(screen.queryByRole("heading", { name: /Classement|Buteuses|Sponsor/ })).not.toBeInTheDocument();
  });

  it("retries one failed card without hiding the other", async () => {
    upcomingStatus = 500; const user = userEvent.setup(); mount();
    expect(await screen.findByText("Impossible de charger les prochains matchs.")).toBeInTheDocument();
    expect(await screen.findByRole("list", { name: "Derniers résultats" })).toBeInTheDocument();
    upcomingStatus = 0; await user.click(screen.getByRole("button", { name: "Réessayer" }));
    expect(await screen.findByRole("list", { name: "Prochains matchs" })).toBeInTheDocument();
    expect(fetchMock.mock.calls.filter(([input]) => requestUrl(input).searchParams.get("status") === "COMPLETED")).toHaveLength(1);
  });

  it("shows empty cards", async () => {
    empty = true; mount();
    expect(await screen.findByText("Aucun prochain match pour cette saison.")).toBeInTheDocument();
    expect(await screen.findByText("Aucun résultat pour cette saison.")).toBeInTheDocument();
  });

  it.each([null, "/api/v1/uploads/photos/broken.png"])("replaces an absent or broken header logo with an initial: %s", async (logoUrl) => {
    league = { ...detail, logoUrl }; mount(); await screen.findByLabelText("Saison");
    const header = screen.getByRole("heading", { level: 1, name: detail.name }).closest("header")!;
    if (logoUrl) fireEvent.error(header.querySelector("img")!);
    expect(header.querySelector("img")).toBeNull();
    expect(within(header).getByText("É")).toBeInTheDocument();
  });

  it("retries a league loading failure", async () => {
    detailStatus = 500; const user = userEvent.setup(); mount();
    expect(await screen.findByText("Impossible de charger la ligue.")).toBeInTheDocument();
    detailStatus = 0; await user.click(screen.getByRole("button", { name: "Réessayer" }));
    expect(await screen.findByLabelText("Saison")).toHaveValue(currentId);
  });

  it("keeps the public shell on a missing league", async () => {
    detailStatus = 404; mount();
    expect(await screen.findByRole("heading", { name: "Page introuvable" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Navigation publique" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Retour à l’accueil" })).toHaveAttribute("href", "/");
  });

  it("does not request a malformed slug", () => {
    mount("/leagues/InvalidSlug"); expect(screen.getByRole("heading", { name: "Page introuvable" })).toBeInTheDocument();
    expect(fetchMock.mock.calls.every(([input]) => requestUrl(input).pathname.endsWith("/leagues/navigation"))).toBe(true);
  });

  it("shows loading while the league and then the two cards resolve", async () => {
    let resolve!: (response: Response) => void;
    const pending = new Promise<Response>((done) => { resolve = done; });
    fetchMock.mockImplementation((input) => requestUrl(input).pathname.endsWith("/leagues/navigation") ? Promise.resolve(responseFor(input)) : pending); mount();
    expect(screen.getByText("Chargement de la ligue…")).toBeInTheDocument();
    const cards: { input: RequestInfo | URL; resolve: (response: Response) => void }[] = [];
    fetchMock.mockImplementation((input) => new Promise((done) => { cards.push({ input, resolve: done }); }));
    await act(async () => { resolve(json(detail)); await pending; });
    expect(await screen.findByText("Chargement des prochains matchs…")).toBeInTheDocument();
    expect(screen.getByText("Chargement des résultats…")).toBeInTheDocument();
    await act(async () => {
      cards.forEach((card) => card.resolve(responseFor(card.input)));
      await Promise.resolve();
    });
    await waitFor(() => expect(screen.getByRole("list", { name: "Derniers résultats" })).toBeInTheDocument());
  });
});
