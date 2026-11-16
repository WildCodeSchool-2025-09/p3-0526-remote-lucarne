import type { PublicMatch, PublicPlayerProfile, PublicStaffProfile, PublicTeamDetail } from "@lucarne/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import appRouter from "../../../src/router";
import { playerKeys } from "../../../src/features/player/playerKeys";

const id = (value: number) => `00000000-0000-4000-8000-${String(value).padStart(12, "0")}`;
const league = { id: id(1), slug: "elite", name: "Élite", country: "France", logoUrl: null };
const season = { id: id(2), name: "2026-2027", startDate: "2026-08-01", endDate: "2027-06-30" };
const team = { id: id(3), name: "Club public", logoUrl: null, stadium: "Stade public" };
const detail: PublicTeamDetail = { ...team, createdAt: "2026-01-01T00:00:00Z", editions: [{ league, season, isCurrent: true }] };
const player: PublicPlayerProfile = { id: id(4), firstName: "Alex", lastName: "Martin", nationality: null, position: "Défenseure", pictureUrl: null, shirtNumber: 7, team };
const staff: PublicStaffProfile = { id: id(5), firstName: "Sam", lastName: "Coach", nationality: "France", pictureUrl: null, jobTitle: "Entraîneuse", team };
const day = { id: id(6), number: 2, name: null, startDate: null, endDate: null, league, season };
const match: PublicMatch = { matchPublicId: id(7), league, season, matchday: day, homeTeam: team, awayTeam: { id: id(8), name: "Racing", logoUrl: null },
  matchDate: "2026-10-25", startTime: "18:00", timeZone: "Europe/Paris", stadium: null, status: "SCHEDULED", result: { homeScore: null, awayScore: null } };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const urlFor = (input: RequestInfo | URL) => new URL(typeof input === "string" || input instanceof URL ? input : input.url, window.location.origin);
const fetchMock = vi.fn<typeof fetch>();
let dispose: (() => void) | undefined;
let rosterError: boolean;
let missingPlayer: boolean;
let emptyRoster: boolean;
let pagedTeams: boolean;

function mount(path: string, client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 30_000 } } })) {
  const router = createMemoryRouter(appRouter.routes, { initialEntries: [path] });
  render(<QueryClientProvider client={client}><RouterProvider router={router} /></QueryClientProvider>);
  dispose = () => { cleanup(); router.dispose(); client.clear(); };
  return router;
}

beforeEach(() => {
  rosterError = false; missingPlayer = false; emptyRoster = false; pagedTeams = false;
  fetchMock.mockReset().mockImplementation((input) => Promise.resolve((() => {
    const url = urlFor(input); const path = url.pathname;
    if (path.endsWith("/leagues/navigation")) return json([league]);
    if (path.endsWith(`/leagues/by-slug/${league.slug}`)) return json({ ...league, seasons: [{ id: season.id, name: season.name, isCurrent: true }] });
    if (path.endsWith(`/seasons/${season.id}/matchdays`)) return json([{ id: day.id, number: day.number, name: null, startDate: null, endDate: null }]);
    if (path.endsWith(`/public/teams/${team.id}/roster`)) {
      if (rosterError) return json({ error: { code: "INTERNAL_SERVER_ERROR", message: "Unavailable" } }, 500);
      const rosterPlayer = { id: player.id, firstName: player.firstName, lastName: player.lastName, position: player.position, pictureUrl: player.pictureUrl, shirtNumber: player.shirtNumber };
      const rosterStaff = { id: staff.id, firstName: staff.firstName, lastName: staff.lastName, jobTitle: staff.jobTitle, pictureUrl: staff.pictureUrl };
      return json({ date: "2026-10-18", players: emptyRoster ? [] : [rosterPlayer], staffMembers: emptyRoster ? [] : [rosterStaff] });
    }
    if (path.endsWith(`/public/teams/${team.id}`)) return json(detail);
    if (path.endsWith(`/public/teams/${id(9)}`)) return json({ ...detail, id: id(9), name: "Second Club" });
    if (path.endsWith("/public/teams")) {
      const page = Number(url.searchParams.get("page") ?? 1);
      return json({ data: page === 1 ? [team] : pagedTeams && page === 2 ? [{ ...team, id: id(9), name: "Second Club" }] : [], pagination: { page, limit: 20, total: pagedTeams ? 21 : 1, totalPages: pagedTeams ? 2 : 1 } });
    }
    if (path.endsWith(`/public/players/${player.id}`)) return missingPlayer ? json({ error: { code: "RESOURCE_NOT_FOUND", message: "Introuvable" } }, 404) : json(player);
    if (path.endsWith("/public/players")) return json({ data: [player], pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } });
    if (path.endsWith(`/public/staff-members/${staff.id}`)) return json(staff);
    if (path.endsWith(`/public/seasons/${season.id}`)) return json({ ...season, editions: [{ league, season, isCurrent: true }] });
    if (path.endsWith(`/public/matchdays/${day.id}`)) return json(day);
    if (path.endsWith("/matches")) return json({ data: [match], pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 } });
    if (path.endsWith(`/matches/${match.matchPublicId}`)) return json(match);
    throw new Error(`Unexpected public request: ${path}`);
  })()));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => { dispose?.(); dispose = undefined; vi.unstubAllGlobals(); });

it("opens a team, roster, player and current team without administrative requests", async () => {
  const user = userEvent.setup(); const router = mount("/teams");
  await user.click(within(await screen.findByRole("list", { name: "Équipes disponibles" })).getByRole("link"));
  expect(await screen.findByRole("heading", { level: 1, name: team.name })).toBeInTheDocument();
  expect(within(screen.getByRole("list", { name: "Compétitions" })).getByRole("link")).toHaveAttribute("href", `/leagues/elite?seasonId=${season.id}`);
  await user.click(screen.getByRole("link", { name: "Effectif" }));
  const roster = await screen.findByRole("list", { name: "Joueuses de l’équipe" });
  await user.click(within(roster).getByRole("link", { name: /Alex Martin/ }));
  expect(await screen.findByRole("heading", { name: "Alex Martin" })).toBeInTheDocument();
  expect(screen.getByText("Non renseignée")).toBeInTheDocument();
  expect(screen.queryByText(/Date de naissance|Temps de jeu/)).not.toBeInTheDocument();
  await user.click(screen.getByRole("link", { name: `Voir l’effectif de ${team.name}` }));
  expect(router.state.location.pathname).toBe(`/teams/${team.id}/roster`);
  expect(await screen.findByRole("list", { name: "Staff de l’équipe" })).toBeInTheDocument();
  expect(fetchMock.mock.calls.every(([input]) => !/\/admin\/|\/api\/v1\/(teams|players|staff-members|seasons)(\/|$)/.test(urlFor(input).pathname))).toBe(true);
});

it("opens staff directly and returns explicitly to its current roster", async () => {
  const user = userEvent.setup(); const router = mount(`/staff-members/${staff.id}`);
  expect(await screen.findByRole("heading", { name: "Sam Coach" })).toBeInTheDocument();
  expect(screen.getAllByText("Entraîneuse").length).toBeGreaterThan(0);
  await user.click(screen.getByRole("link", { name: "← Retour à l’effectif" }));
  expect(router.state.location.pathname).toBe(`/teams/${team.id}/roster`);
  await screen.findByRole("list", { name: "Staff de l’équipe" });
});

it("keeps a team calendar scoped through a match and a direct named return", async () => {
  const user = userEvent.setup(); const router = mount(`/teams/${team.id}/matches?teamId=${id(99)}&status=SCHEDULED`);
  const list = await screen.findByRole("list", { name: /Matchs du/ });
  const requests = fetchMock.mock.calls.map(([input]) => urlFor(input)).filter((url) => url.pathname.endsWith("/matches"));
  expect(requests.every((url) => url.searchParams.get("teamId") === team.id)).toBe(true);
  await user.click(within(list).getByRole("link"));
  await screen.findByRole("heading", { name: "Club public – Racing" });
  expect(screen.getByRole("link", { name: "Journée 2" })).toHaveAttribute("href", `/matchdays/${day.id}`);
  expect(screen.getByRole("link", { name: season.name })).toHaveAttribute("href", `/seasons/${season.id}`);
  await user.click(screen.getByRole("link", { name: "← Retour au calendrier des matchs" }));
  expect(router.state.location.pathname).toBe(`/teams/${team.id}/matches`);
  expect(new URLSearchParams(router.state.location.search).get("status")).toBe("SCHEDULED");
});

it("isolates matchday matches and links to season and league context", async () => {
  mount(`/matchdays/${day.id}?matchdayId=${id(99)}`);
  await screen.findByRole("heading", { name: "Journée 2" });
  await screen.findByRole("list", { name: /Matchs du/ });
  const request = fetchMock.mock.calls.map(([input]) => urlFor(input)).find((url) => url.pathname.endsWith("/matches"));
  expect(Object.fromEntries(request!.searchParams)).toMatchObject({ matchdayId: day.id, leagueId: league.id, seasonId: season.id });
  expect(screen.getByRole("link", { name: `Saison ${season.name}` })).toHaveAttribute("href", `/seasons/${season.id}`);
  expect(screen.getByRole("link", { name: "← Retour au calendrier des matchs" })).toHaveAttribute("href", `/leagues/elite/matches?seasonId=${season.id}`);
});

it("shows visible season editions with canonical league links", async () => {
  mount(`/seasons/${season.id}`);
  await screen.findByRole("heading", { name: `Saison ${season.name}` });
  expect(within(screen.getByRole("list", { name: "Compétitions" })).getByRole("link")).toHaveAttribute("href", `/leagues/elite?seasonId=${season.id}`);
});

it("retains an empty roster after retrying a failed public request", async () => {
  rosterError = true; emptyRoster = true;
  const user = userEvent.setup(); mount(`/teams/${team.id}/roster`);
  await screen.findByText("Impossible de charger : effectif.");
  rosterError = false;
  await user.click(screen.getByRole("button", { name: "Réessayer" }));
  expect(await screen.findByText("Aucune joueuse dans l’effectif actuel.")).toBeInTheDocument();
  expect(screen.getByText("Aucun membre du staff dans l’effectif actuel.")).toBeInTheDocument();
});

it("keeps public lists separate from administrative cached data and restores filters in the URL", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(playerKeys.list({}), { data: [{ ...player, firstName: "Private" }] });
  const user = userEvent.setup(); const router = mount(`/players?teamId=${team.id}`, client);
  expect(await screen.findByRole("list", { name: "Joueuses disponibles" })).toHaveTextContent("Alex Martin");
  expect(screen.queryByText("Private")).not.toBeInTheDocument();
  const field = screen.getByRole("searchbox", { name: "Rechercher une joueuse" });
  await user.type(field, "Alex");
  expect(field).toHaveFocus();
  expect(new URLSearchParams(router.state.location.search).get("search")).toBe("Alex");
  await user.click(screen.getByRole("button", { name: "Réinitialiser" }));
  expect(router.state.location.search).toBe("");
});

it("corrects an out-of-range team page without losing its league filter", async () => {
  const router = mount(`/teams?page=99&leagueId=${league.id}`);
  await screen.findByRole("list", { name: "Équipes disponibles" });
  expect(new URLSearchParams(router.state.location.search).get("page")).toBe("1");
  expect(new URLSearchParams(router.state.location.search).get("leagueId")).toBe(league.id);
});

it("rejects invalid list filters without starting a list request and can reset", async () => {
  const user = userEvent.setup(); mount("/players?isActive=false");
  expect(await screen.findByText("Les filtres sont invalides. Réinitialisez les critères.")).toBeInTheDocument();
  expect(fetchMock.mock.calls.some(([input]) => urlFor(input).pathname.endsWith("/public/players"))).toBe(false);
  await user.click(screen.getByRole("button", { name: "Réinitialiser" }));
  expect(await screen.findByRole("list", { name: "Joueuses disponibles" })).toBeInTheDocument();
});

it("shows a removed player with a canonical return without stale private profile data", async () => {
  missingPlayer = true; const router = mount(`/players/${player.id}`);
  await screen.findByText("Joueuse introuvable ou indisponible.");
  expect(screen.queryByRole("heading", { name: "Alex Martin" })).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "← Retour aux joueuses" })).toHaveAttribute("href", "/players");
  await act(async () => { await router.navigate("/players"); });
  await waitFor(() => expect(screen.getByRole("list", { name: "Joueuses disponibles" })).toBeInTheDocument());
});

it("combines public calendar league, season and matchday filters and clears dependent filters", async () => {
  const user = userEvent.setup(); const router = mount("/matches");
  await screen.findByRole("list", { name: "Matchs publiés" });
  await user.selectOptions(screen.getByLabelText("Ligue"), league.id);
  await user.selectOptions(await screen.findByLabelText("Saison du calendrier"), season.id);
  const daySelect = await screen.findByLabelText("Journée");
  await screen.findByRole("option", { name: "Journée 2" });
  await user.selectOptions(daySelect, day.id);
  await waitFor(() => expect(fetchMock.mock.calls.some(([input]) => {
    const url = urlFor(input); return url.pathname.endsWith("/matches") && url.searchParams.get("matchdayId") === day.id && url.searchParams.get("leagueId") === league.id && url.searchParams.get("seasonId") === season.id;
  })).toBe(true));
  await user.selectOptions(screen.getByLabelText("Ligue"), "");
  expect(router.state.location.search).toBe("");
  expect(screen.queryByLabelText("Journée")).not.toBeInTheDocument();
});

it("searches and paginates a public team selector before applying the chosen team", async () => {
  pagedTeams = true; const user = userEvent.setup(); const router = mount("/players");
  await screen.findByRole("list", { name: "Joueuses disponibles" });
  await user.click(screen.getByText("Choisir une équipe"));
  const search = await screen.findByRole("searchbox", { name: "Rechercher une équipe dans le filtre" });
  await user.type(search, "Club");
  await screen.findByRole("list", { name: "Équipes du filtre" });
  await user.click(within(screen.getByRole("navigation", { name: "Pagination du filtre des équipes" })).getByRole("button", { name: "Suivant" }));
  await user.click(await screen.findByRole("button", { name: "Second Club" }));
  expect(new URLSearchParams(router.state.location.search).get("teamId")).toBe(id(9));
  expect(screen.getByText("Changer d’équipe")).toHaveFocus();
  await waitFor(() => expect(fetchMock.mock.calls.some(([input]) => {
    const url = urlFor(input); return url.pathname.endsWith("/public/players") && url.searchParams.get("teamId") === id(9);
  })).toBe(true));
  expect(fetchMock.mock.calls.some(([input]) => { const url = urlFor(input); return url.pathname.endsWith("/public/teams") && url.searchParams.get("page") === "2" && url.searchParams.get("search") === "Club"; })).toBe(true);
});
