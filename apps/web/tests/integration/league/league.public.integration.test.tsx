import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import type { PublicLeagueNavigationItem } from "@lucarne/shared";
import appRouter from "../../../src/router";
import { clearAccessToken } from "../../../src/lib/authToken";

const leagues: PublicLeagueNavigationItem[] = Array.from({ length: 25 }, (_, index) => ({
  id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
  slug: `league-${index + 1}`,
  name: `League ${index + 1}`,
  country: "France",
  logoUrl: index === 0 ? "/api/v1/uploads/photos/league.png" : null,
}));
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const requestPath = (input: RequestInfo | URL) => new URL(typeof input === "string" || input instanceof URL ? input : input.url, window.location.origin).pathname;
let width: number;
let dispose: (() => void) | undefined;
const fetchMock = vi.fn<typeof fetch>();

function mount(path = "/unknown") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 30_000 } } });
  const router = createMemoryRouter(appRouter.routes, { initialEntries: [path] });
  render(<QueryClientProvider client={client}><RouterProvider router={router} /></QueryClientProvider>);
  dispose = () => { cleanup(); router.dispose(); client.clear(); };
  return router;
}

describe("Public league navigation", () => {
  beforeEach(() => {
    clearAccessToken(); width = 1200;
    vi.stubGlobal("matchMedia", (query: string) => ({ matches: width <= (query.includes("600") ? 600 : 900), addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    vi.stubGlobal("fetch", fetchMock); fetchMock.mockReset();
    fetchMock.mockImplementation((input) => {
      const path = requestPath(input);
      if (path.endsWith("/leagues/navigation")) return Promise.resolve(json(leagues));
      if (path.includes("/leagues/by-slug/")) {
        const league = leagues.find((item) => path.endsWith(`/${item.slug}`));
        if (!league) return Promise.resolve(json({ error: { code: "RESOURCE_NOT_FOUND", message: "Ligue introuvable." } }, 404));
        return Promise.resolve(json({ id: league.id, slug: league.slug, name: league.name, logoUrl: league.logoUrl, seasons: [] }));
      }
      if (path.endsWith("/health")) return Promise.resolve(json({ status: "ok" }));
      throw new Error(`Unexpected request: ${path}`);
    });
  });
  afterEach(() => { dispose?.(); clearAccessToken(); vi.unstubAllGlobals(); });

  it("loads navigation entries lazily and opens the canonical public league overview", async () => {
    const user = userEvent.setup(); const router = mount();
    expect(fetchMock.mock.calls.some(([input]) => requestPath(input).endsWith("/leagues/navigation"))).toBe(false);
    await user.click(screen.getByRole("button", { name: "Ligues" }));
    const list = await screen.findByRole("list", { name: "Ligues actives" });
    expect(within(list).getAllByRole("link")).toHaveLength(25);
    const link = within(list).getByRole("link", { name: "League 1 — France" });
    expect(link).toHaveAttribute("href", "/leagues/league-1");
    await user.click(link);
    expect(router.state.location.pathname).toBe("/leagues/league-1");
    const main = screen.getByRole("main");
    expect(main).toHaveFocus();
    expect(within(main).getByRole("region", { name: "Ligue League 1" })).toBeInTheDocument();
    expect(within(main).getByRole("heading", { name: "League 1" })).not.toHaveClass("sr-only");
    expect(screen.getByRole("button", { name: "Ligues" })).toHaveAttribute("aria-expanded", "false");
    await user.click(screen.getByRole("button", { name: "Ligues" }));
    expect(screen.getByRole("link", { name: "League 1 — France", current: "page" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Calendrier", current: "page" })).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.filter(([input]) => requestPath(input).endsWith("/leagues/navigation"))).toHaveLength(1);
  });

  it.each([601, 900])("uses logos with accessible labels in the tablet sidebar at %s px", async (viewport) => {
    width = viewport; const user = userEvent.setup(); mount();
    await user.click(screen.getByRole("button", { name: "Ligues" }));
    const link = await screen.findByRole("link", { name: "League 1 — France" });
    expect(link.closest("aside")).not.toBeNull();
    expect(link).toHaveAttribute("title", "League 1 — France");
    expect(link.querySelector("img")).toHaveAttribute("src", `${window.location.origin}/api/v1/uploads/photos/league.png`);
    expect(within(link).getByText("League 1")).toHaveClass("sr-only");
    link.focus(); await user.keyboard("{Escape}");
    expect(screen.getByRole("button", { name: "Ligues" })).toHaveFocus();
    expect(screen.queryByRole("link", { name: "League 1 — France" })).not.toBeInTheDocument();
  });

  it("closes the mobile menu after selecting a league, including its already active link", async () => {
    width = 390; const user = userEvent.setup(); const router = mount();
    await user.click(screen.getByRole("button", { name: "Ouvrir le menu" }));
    await user.click(screen.getByRole("button", { name: "Ligues" }));
    await user.click(await screen.findByRole("link", { name: "League 1 — France" }));
    expect(router.state.location.pathname).toBe("/leagues/league-1");
    expect(screen.getByRole("button", { name: "Ouvrir le menu" })).toHaveAttribute("aria-expanded", "false");
    await user.click(screen.getByRole("button", { name: "Ouvrir le menu" }));
    await user.click(screen.getByRole("button", { name: "Ligues" }));
    await user.click(screen.getByRole("link", { name: "League 1 — France", current: "page" }));
    expect(screen.getByRole("button", { name: "Ouvrir le menu" })).toHaveAttribute("aria-expanded", "false");
  });

  it.each(["missing", "inactive-league", "InvalidSlug"])("keeps the public navigation on unknown or unavailable slug %s", async (slug) => {
    mount(`/leagues/${slug}`);
    expect(await screen.findByRole("heading", { name: "Page introuvable" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Navigation publique" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Retour à l’accueil" })).toHaveAttribute("href", "/");
  });

  it("handles a direct league URL without authentication or administrative requests", async () => {
    const user = userEvent.setup();
    mount("/leagues/league-25");
    expect(await screen.findByRole("region", { name: "Ligue League 25" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Ligues" }));
    expect(screen.getByRole("link", { name: "League 25 — France", current: "page" })).toBeInTheDocument();
    expect(fetchMock.mock.calls.filter(([input]) => requestPath(input).endsWith("/leagues/navigation"))).toHaveLength(1);
  });

  it("replaces a missing, broken or external logo with an initial", async () => {
    fetchMock.mockImplementation((input) => Promise.resolve(json(requestPath(input).endsWith("/leagues/navigation")
      ? [leagues[0], { ...leagues[1], logoUrl: "https://external.example/logo.png" }, leagues[2]] : { status: "ok" })));
    const user = userEvent.setup(); mount(); await user.click(screen.getByRole("button", { name: "Ligues" }));
    const local = await screen.findByRole("link", { name: "League 1 — France" });
    fireEvent.error(local.querySelector("img")!);
    expect(local.querySelector("img")).toBeNull();
    expect(within(local).getByText("L")).toBeInTheDocument();
    for (const name of ["League 2 — France", "League 3 — France"]) {
      const link = screen.getByRole("link", { name });
      expect(link.querySelector("img")).toBeNull();
      expect(within(link).getByText("L")).toBeInTheDocument();
    }
  });

  it("shows a loading state and then an empty list", async () => {
    let resolve!: (response: Response) => void;
    const response = new Promise<Response>((done) => { resolve = done; });
    fetchMock.mockImplementation((input) => requestPath(input).endsWith("/leagues/navigation") ? response : Promise.resolve(json({ status: "ok" })));
    const user = userEvent.setup(); mount(); await user.click(screen.getByRole("button", { name: "Ligues" }));
    expect(screen.getByText("Chargement des ligues…")).toBeInTheDocument();
    await act(async () => { resolve(json([])); await response; });
    expect(await screen.findByText("Aucune ligue active.")).toBeInTheDocument();
  });

  it("offers retry after a public navigation failure", async () => {
    let failed = false;
    fetchMock.mockImplementation((input) => {
      if (!requestPath(input).endsWith("/leagues/navigation")) return Promise.resolve(json({ status: "ok" }));
      if (!failed) { failed = true; return Promise.resolve(json({ error: { code: "INTERNAL_SERVER_ERROR", message: "Unavailable" } }, 500)); }
      return Promise.resolve(json(leagues));
    });
    const user = userEvent.setup(); mount(); await user.click(screen.getByRole("button", { name: "Ligues" }));
    expect(await screen.findByText("Impossible de charger les ligues.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Réessayer les ligues" }));
    await waitFor(() => expect(screen.getByRole("link", { name: "League 1 — France" })).toBeInTheDocument());
  });
});
