import type { PublicLeagueDetail, PublicLeagueNavigationItem, PublicMatch } from "@lucarne/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import appRouter from "../../../src/router";

const leagueId = "00000000-0000-4000-8000-000000000001";
const seasonId = "00000000-0000-4000-8000-000000000002";
const previousId = "00000000-0000-4000-8000-000000000003";
const leagues: PublicLeagueNavigationItem[] = [
  { id: leagueId, slug: "elite-feminine", name: "Élite Féminine", country: "France", logoUrl: null },
  { id: previousId, slug: "championship", name: "Championship", country: "Angleterre", logoUrl: null },
];
const league: PublicLeagueDetail = { id: leagueId, slug: leagues[0].slug, name: leagues[0].name, logoUrl: null,
  seasons: [{ id: seasonId, name: "2026-2027", isCurrent: true }, { id: previousId, name: "2025-2026", isCurrent: false }] };
const match = (index: number, results = false): PublicMatch => ({
  matchPublicId: `00000000-0000-4000-8000-${String(index + 10).padStart(12, "0")}`,
  league: { name: leagues[0].name, country: "France" }, season: { name: "2026-2027" }, matchday: { number: 1, name: null },
  homeTeam: { name: `Club ${index}`, logoUrl: null }, awayTeam: { name: "Racing", logoUrl: null },
  matchDate: "2026-10-25", startTime: "18:00", timeZone: "Europe/Paris", stadium: null,
  ...(results ? { status: "COMPLETED", result: { homeScore: 0, awayScore: 0 } } as const : { status: "SCHEDULED", result: { homeScore: null, awayScore: null } } as const),
});
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const urlFor = (input: RequestInfo | URL) => new URL(typeof input === "string" || input instanceof URL ? input : input.url, window.location.origin);
let dispose: (() => void) | undefined;
let failUpcoming: boolean;
const fetchMock = vi.fn<typeof fetch>();

function mount(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 30_000 } } });
  const router = createMemoryRouter(appRouter.routes, { initialEntries: [path] });
  render(<QueryClientProvider client={client}><RouterProvider router={router} /></QueryClientProvider>);
  dispose = () => { cleanup(); router.dispose(); client.clear(); };
  return router;
}

beforeEach(() => {
  failUpcoming = false;
  fetchMock.mockReset().mockImplementation((input) => Promise.resolve((() => {
    const url = urlFor(input);
    if (url.pathname.endsWith("/leagues/navigation")) return json(leagues);
    if (url.pathname.includes("/leagues/by-slug/")) return json(league);
    if (url.pathname.endsWith("/matches")) {
      const results = url.searchParams.get("status") === "COMPLETED";
      if (!results && failUpcoming) return json({ error: { code: "INTERNAL_SERVER_ERROR", message: "Unavailable" } }, 500);
      return json({ data: Array.from({ length: 8 }, (_, index) => match(index, results)), pagination: { page: 1, pageSize: 20, totalItems: 8, totalPages: 1 } });
    }
    if (url.pathname.includes("/matches/")) return json(match(0));
    throw new Error(`Unexpected public request: ${url.pathname}`);
  })()));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => { dispose?.(); vi.unstubAllGlobals(); });

it("shows five upcoming matches, results and real league links without health or private requests", async () => {
  mount("/");
  const upcoming = await screen.findByRole("list", { name: "Prochains matchs" });
  expect(within(upcoming).getAllByRole("listitem")).toHaveLength(5);
  expect(within(upcoming).queryByText("Club 5")).not.toBeInTheDocument();
  expect(await screen.findByRole("list", { name: "Derniers résultats" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Élite Féminine" })).toHaveAttribute("href", "/leagues/elite-feminine");
  expect(screen.getByRole("link", { name: "Voir toutes les ligues" })).toHaveAttribute("href", "/leagues");
  expect(fetchMock.mock.calls.every(([input]) => ["/api/v1/matches", "/api/v1/leagues/navigation"].includes(urlFor(input).pathname))).toBe(true);
  expect(screen.queryByText(/État de l’API/)).not.toBeInTheDocument();
});

it("retries a failed home section without hiding results or leagues", async () => {
  failUpcoming = true;
  const user = userEvent.setup(); mount("/");
  await screen.findByText("Impossible de charger les rencontres.");
  expect(screen.getByRole("list", { name: "Derniers résultats" })).toBeInTheDocument();
  failUpcoming = false;
  await user.click(screen.getByRole("button", { name: "Réessayer" }));
  expect(await screen.findByRole("list", { name: "Prochains matchs" })).toBeInTheDocument();
  expect(fetchMock.mock.calls.filter(([input]) => urlFor(input).searchParams.get("status") === "COMPLETED")).toHaveLength(1);
});

it("restores an accent-insensitive league search from the URL and preserves field focus", async () => {
  const user = userEvent.setup(); const router = mount("/leagues?search=ELITE");
  expect(await screen.findByRole("region", { name: "Ligues — France" })).toBeInTheDocument();
  expect(screen.queryByRole("region", { name: "Ligues — Angleterre" })).not.toBeInTheDocument();
  const field = screen.getByRole("searchbox", { name: "Rechercher une ligue ou un pays" });
  await user.clear(field); await user.type(field, "Angleterre");
  expect(field).toHaveFocus();
  expect(new URLSearchParams(router.state.location.search).get("search")).toBe("Angleterre");
  expect(screen.getByRole("region", { name: "Ligues — Angleterre" })).toBeInTheDocument();
  expect(fetchMock.mock.calls.filter(([input]) => urlFor(input).pathname.endsWith("/leagues/navigation"))).toHaveLength(1);
});

it("keeps a league calendar scoped through filtering, match details and explicit return", async () => {
  const user = userEvent.setup(); const router = mount(`/leagues/${league.slug}/matches?seasonId=${previousId}`);
  await screen.findByRole("heading", { name: "Calendrier des matchs" });
  await screen.findByRole("list", { name: /Matchs du/ });
  const status = screen.getByLabelText("État");
  await user.selectOptions(status, "COMPLETED");
  expect(status).toHaveFocus();
  await waitFor(() => expect(fetchMock.mock.calls.some(([input]) => urlFor(input).searchParams.get("status") === "COMPLETED")).toBe(true));
  const requests = fetchMock.mock.calls.map(([input]) => urlFor(input)).filter((url) => url.pathname.endsWith("/matches"));
  expect(requests.every((url) => url.searchParams.get("leagueId") === leagueId && url.searchParams.get("seasonId") === previousId)).toBe(true);
  await user.click(within(screen.getByRole("list", { name: /Matchs du/ })).getAllByRole("link")[0]);
  await screen.findByRole("heading", { name: "Club 0 – Racing" });
  await user.click(screen.getByRole("link", { name: "← Retour au calendrier des matchs" }));
  expect(router.state.location.pathname).toBe(`/leagues/${league.slug}/matches`);
  expect(new URLSearchParams(router.state.location.search).get("seasonId")).toBe(previousId);
  expect(new URLSearchParams(router.state.location.search).get("status")).toBe("COMPLETED");
});

it("does not request matches without a valid league season", async () => {
  mount(`/leagues/${league.slug}/matches?seasonId=invalid`);
  await screen.findByText("Cette saison n’appartient pas à cette ligue. Choisissez une saison disponible.");
  expect(fetchMock.mock.calls.some(([input]) => urlFor(input).pathname.endsWith("/matches"))).toBe(false);
});
