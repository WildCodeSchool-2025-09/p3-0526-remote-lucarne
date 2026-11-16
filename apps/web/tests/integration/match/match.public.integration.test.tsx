import type { PublicMatch } from "@lucarne/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearAccessToken, setAccessToken } from "../../../src/lib/authToken";
import appRouter from "../../../src/router";
import { matchKeys } from "../../../src/features/match/matchKeys";
import { getCurrentAppRole } from "../../../src/auth/authRole";

const publicId = "00000000-0000-4000-8000-000000000001";
const first: PublicMatch = {
  matchPublicId: publicId, league: { name: "Division 1", country: "France" }, season: { name: "2026-2027" },
  matchday: { number: 1, name: "Ouverture" }, homeTeam: { name: "Paris FC", logoUrl: null }, awayTeam: { name: "Lyon", logoUrl: null },
  matchDate: "2026-10-25", startTime: "02:30", timeZone: "Europe/Paris", stadium: null, status: "SCHEDULED", result: { homeScore: null, awayScore: null },
};
const second: PublicMatch = { ...first, matchPublicId: "00000000-0000-4000-8000-000000000002", status: "COMPLETED", result: { homeScore: 0, awayScore: 0 } };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const requestUrl = (input: RequestInfo | URL) => new URL(
  typeof input === "string" || input instanceof URL ? input : input.url,
  window.location.origin,
);

describe("Public MATCH pages", () => {
  const fetchMock = vi.fn<typeof fetch>(); let listStatus: number; let detailStatus: number; let empty: boolean; let pages: number;
  function mount(path = "/matches", role?: string, client = new QueryClient({ defaultOptions: { queries: { retry: false } } })) {
    if (role) setAccessToken(`${btoa("{}")}.${btoa(JSON.stringify({ role }))}.signature`);
    const router = createMemoryRouter(appRouter.routes, { initialEntries: ["/dashboard/teams", path], initialIndex: 1 });
    render(<QueryClientProvider client={client}><RouterProvider router={router} /></QueryClientProvider>);
    return { router, client };
  }
  beforeEach(() => {
    clearAccessToken(); listStatus = 0; detailStatus = 0; empty = false; pages = 1;
    fetchMock.mockReset(); vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockImplementation(async (input) => {
      await Promise.resolve(); const url = requestUrl(input); const path = url.pathname.replace("/api/v1", "");
      if (path === "/health") return json({ status: "ok" });
      if (path === "/leagues/navigation") return json([]);
      if (path.endsWith("/events")) return json([]);
      if (path === "/auth/me") return json({ id: "public-user", firstName: "Test", lastName: "User", email: "user@lucarne.test", role: getCurrentAppRole() });
      if (path === "/matches") {
        if (listStatus) return json({ error: { code: "INTERNAL_SERVER_ERROR", message: "Unavailable" } }, listStatus);
        const requestedPage = Number(url.searchParams.get("page") ?? 1);
        return json({ data: empty ? [] : requestedPage === 2 ? [second] : [first, second], pagination: { page: requestedPage, pageSize: 20, totalItems: empty ? 0 : pages === 2 ? 21 : 2, totalPages: empty ? 0 : pages } });
      }
      if (path.startsWith("/matches/")) return detailStatus ? json({ error: { code: "RESOURCE_NOT_FOUND", message: "Unavailable" } }, detailStatus) : json(path.endsWith(second.matchPublicId) ? second : first);
      throw new Error(`Public page called protected or unexpected endpoint: ${path}`);
    });
  });
  afterEach(() => { clearAccessToken(); vi.unstubAllGlobals(); });

  it("lists matches anonymously without protected lookups, distinguishing missing results from zero", async () => {
    mount(); await screen.findByRole("heading", { name: "Calendrier des matchs" });
    const list = await screen.findByRole("list", { name: "Matchs publiés" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
    expect(within(list).getByText("Résultat non renseigné")).toBeInTheDocument(); expect(within(list).getByText("0 – 0")).toBeInTheDocument();
    expect(within(list).getAllByText(/Division 1 · 2026-2027 · Journée 1/)).toHaveLength(2);
    expect(within(list).getAllByText(/02:30 \(Paris\)/)).toHaveLength(2);
    expect(screen.queryByRole("button", { name: /Publier|Supprimer|Enregistrer/ })).not.toBeInTheDocument();
    for (const [input, options] of fetchMock.mock.calls) {
      expect(["/api/v1/matches", "/api/v1/leagues/navigation"]).toContain(requestUrl(input).pathname); expect(new Headers(options?.headers).has("authorization")).toBe(false);
    }
  });
  it.each(["USER", "EDITOR", "MODERATOR", "ADMIN"])("keeps %s on the same read-only public pages", async (role) => {
    mount(`/matches/${publicId}`, role); await screen.findByRole("heading", { name: "Paris FC – Lyon" });
    expect(screen.queryByRole("link", { name: /Modifier/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Publier|Supprimer|Enregistrer/ })).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.every(([input]) => requestUrl(input).pathname.startsWith("/api/v1/matches/") || requestUrl(input).pathname === "/api/v1/auth/me")).toBe(true);
  });
  it("opens the public immutable ID and returns to the canonical calendar", async () => {
    const user = userEvent.setup(); const { router } = mount(); await screen.findByRole("list", { name: "Matchs publiés" });
    const link = screen.getAllByRole("link", { name: "Paris FC – Lyon" })[0]; expect(link).toHaveAttribute("href", `/matches/${publicId}`);
    await user.click(link); await screen.findByRole("heading", { name: "Paris FC – Lyon" });
    const breadcrumb = screen.getByRole("navigation", { name: "Fil d’Ariane" });
    expect(within(breadcrumb).getByRole("link", { name: "Matchs" })).toHaveAttribute("href", "/matches");
    await user.click(screen.getByRole("link", { name: "← Retour au calendrier des matchs" })); expect(router.state.location.pathname).toBe("/matches");
  });
  it("sends state, inclusive dates and sorting via the URL, resetting the page after criteria changes", async () => {
    const user = userEvent.setup(); pages = 2; const { router } = mount("/matches?page=2"); await screen.findByRole("list", { name: "Matchs publiés" });
    await user.selectOptions(screen.getByLabelText("État"), "COMPLETED"); expect(router.state.location.search).not.toContain("page=");
    await user.type(screen.getByLabelText("Du"), "2026-10-25"); await user.type(screen.getByLabelText("Au"), "2026-10-25");
    await user.selectOptions(screen.getByLabelText("Ordre des dates"), "desc");
    await waitFor(() => expect(fetchMock.mock.calls.some(([input]) => {
      const query = requestUrl(input).searchParams; return query.get("status") === "COMPLETED" && query.get("dateFrom") === "2026-10-25" && query.get("dateTo") === "2026-10-25" && query.get("sortOrder") === "desc" && query.get("page") === "1";
    })).toBe(true));
    await user.click(screen.getByRole("button", { name: "Suivant" })); expect(router.state.location.search).toContain("page=2");
    await user.click(screen.getByRole("button", { name: "Réinitialiser" })); expect(router.state.location.search).toBe("");
  });
  it("does not send invalid filters and allows recovering by reset", async () => {
    const user = userEvent.setup(); mount("/matches?dateFrom=2026-10-26&dateTo=2026-10-24");
    expect(screen.getByRole("alert")).toHaveTextContent("Les filtres sont invalides"); expect(fetchMock.mock.calls.some(([input]) => requestUrl(input).pathname === "/api/v1/matches")).toBe(false);
    await user.click(screen.getByRole("button", { name: "Réinitialiser" })); await screen.findByRole("list", { name: "Matchs publiés" });
  });
  it("shows an empty calendar", async () => {
    empty = true; mount(); await screen.findByText("Aucun match ne correspond à vos critères."); expect(screen.queryByRole("navigation", { name: "Pagination des matchs" })).not.toBeInTheDocument();
  });
  it("retries a failed list without requiring a session", async () => {
    listStatus = 500; const user = userEvent.setup(); mount(); await screen.findByText("Impossible de charger les matchs.");
    listStatus = 0; await user.click(screen.getByRole("button", { name: "Réessayer" })); await screen.findByRole("list", { name: "Matchs publiés" });
  });
  it.each([404, 400, 500])("handles a %s public detail error with an explicit calendar return", async (status) => {
    detailStatus = status; mount(`/matches/${publicId}`); await screen.findByRole("alert");
    expect(screen.getByRole("link", { name: "← Retour au calendrier des matchs" })).toHaveAttribute("href", "/matches");
    expect(screen.queryByRole("heading", { name: "Paris FC – Lyon" })).not.toBeInTheDocument();
  });
  it("never consumes a dashboard DTO cached for the same identifier", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(matchKeys.detail(publicId), { id: "private", isPublished: false, version: 8, homeTeamId: "private-home", awayTeamId: "private-away" });
    mount(`/matches/${publicId}`, undefined, client); await screen.findByRole("heading", { name: "Paris FC – Lyon" });
    expect(client.getQueryData(matchKeys.publicDetail(publicId))).toEqual(first);
    expect(screen.queryByText(/private/)).not.toBeInTheDocument(); expect(fetchMock.mock.calls.filter(([input]) => requestUrl(input).pathname === `/api/v1/matches/${publicId}`)).toHaveLength(1);
  });
  it("links the home page to the public calendar", async () => {
    const user = userEvent.setup(); const { router } = mount("/"); await user.click(screen.getByRole("link", { name: "Consulter le calendrier des matchs" }));
    expect(router.state.location.pathname).toBe("/matches"); await screen.findByRole("list", { name: "Matchs publiés" });
  });
});
