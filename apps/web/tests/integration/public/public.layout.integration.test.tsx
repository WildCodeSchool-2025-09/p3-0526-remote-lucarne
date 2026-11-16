import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import appRouter from "../../../src/router";
import { clearAccessToken, setAccessToken } from "../../../src/lib/authToken";
import { AuthProvider } from "../../../src/features/auth/AuthProvider";
import PublicRouteLayout from "../../../src/components/public/PublicRouteLayout";

let width: number;
let dispose: (() => void) | undefined;
const mediaListeners = new Set<() => void>();

function mount(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(appRouter.routes, { initialEntries: [path] });
  render(<QueryClientProvider client={client}><RouterProvider router={router} /></QueryClientProvider>);
  dispose = () => { cleanup(); router.dispose(); client.clear(); };
  return router;
}

function resize(nextWidth: number) {
  act(() => {
    width = nextWidth;
    mediaListeners.forEach((listener) => listener());
  });
}

describe("Public layout", () => {
  beforeEach(() => {
    clearAccessToken();
    width = 1200;
    mediaListeners.clear();
    vi.stubGlobal("matchMedia", (query: string) => ({
      get matches() { return width <= (query.includes("600") ? 600 : 900); },
      addEventListener: (_type: string, listener: () => void) => mediaListeners.add(listener),
      removeEventListener: (_type: string, listener: () => void) => mediaListeners.delete(listener),
    }));
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(() => {})));
  });

  afterEach(() => {
    dispose?.();
    clearAccessToken();
    vi.unstubAllGlobals();
  });

  it.each(["/", "/matches", "/matches/public-id", "/unknown"])("renders an anonymous public shell on %s", (path) => {
    mount(path);
    expect(screen.getAllByRole("main")).toHaveLength(1);
    expect(screen.getAllByRole("navigation", { name: "Navigation publique" })).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Lucarne — Accueil" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Calendrier" })).toHaveAttribute("href", "/matches");
    expect(screen.getAllByRole("button", { name: "Compte" })).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Compte" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Connexion" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Créer un compte" })).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Navigation du dashboard" })).not.toBeInTheDocument();
  });

  it("preserves the calendar and public navigation when the API is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { code: "INTERNAL_SERVER_ERROR", message: "Unavailable" } }), { status: 500, headers: { "content-type": "application/json" } })));
    mount("/matches");
    await screen.findByText("Impossible de charger les matchs.");
    expect(screen.getByRole("link", { name: "Calendrier", current: "page" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Réessayer" })).toBeInTheDocument();
  });

  it.each([360, 600, 601, 900, 901, 1200])("keeps one accessible account trigger at %s px", async (viewportWidth) => {
    const user = userEvent.setup(); width = viewportWidth; mount("/");
    const trigger = screen.getByRole("button", { name: "Compte" });
    expect(screen.getAllByRole("button", { name: "Compte" })).toHaveLength(1);
    expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
    expect(trigger).toHaveAttribute("title", "Compte");
    if (viewportWidth <= 600) {
      expect(trigger.closest("header")).not.toBeNull();
      await user.click(screen.getByRole("button", { name: "Ouvrir le menu" }));
      expect(screen.getAllByRole("button", { name: "Compte" })).toHaveLength(1);
    }
    await user.click(trigger);
    expect(screen.getByRole("dialog", { name: "Connexion" })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(trigger).toHaveFocus();
  });

  it("returns focus to the visible account entry when the viewport changes while a dialog is open", async () => {
    const user = userEvent.setup(); mount("/");
    const originalTrigger = screen.getByRole("button", { name: "Compte" });
    await user.click(originalTrigger);
    resize(600);
    expect(originalTrigger).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Connexion" })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.getByRole("button", { name: "Compte" })).toHaveFocus();
  });

  it("retains the shell after an unexpected public route error", async () => {
    const client = new QueryClient();
    const publicRoute = appRouter.routes[0].children?.find((route) => {
      const handle: unknown = route.handle;
      return typeof handle === "object" && handle !== null && "usesPublicLayout" in handle && handle.usesPublicLayout === true;
    });
    if (!publicRoute || publicRoute.index) throw new Error("Public layout route missing");
    const errorRoute = publicRoute.children?.[0];
    if (!errorRoute || errorRoute.index) throw new Error("Public error boundary missing");
    const router = createMemoryRouter([{
      ...publicRoute,
      Component: () => <AuthProvider><PublicRouteLayout /></AuthProvider>,
      id: "public-test-layout",
      children: [{ ...errorRoute, id: "public-test-errors", children: [{ index: true, id: "public-test-failure", loader: () => { throw new Error("Simulated public page failure"); } }] }],
    }]);
    render(<QueryClientProvider client={client}><RouterProvider router={router} /></QueryClientProvider>);
    dispose = () => { cleanup(); router.dispose(); client.clear(); };
    await screen.findByRole("heading", { name: "Impossible de charger cette page" });
    expect(screen.getByRole("navigation", { name: "Navigation publique" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Retour à l’accueil" })).toHaveAttribute("href", "/");
    expect(screen.getAllByRole("main")).toHaveLength(1);
  });

  it("resets mobile and league disclosures after navigation and responsive mode changes", async () => {
    const user = userEvent.setup();
    width = 600;
    const router = mount("/");
    await user.click(screen.getByRole("button", { name: "Ouvrir le menu" }));
    await user.click(screen.getByRole("button", { name: "Ligues" }));
    await act(() => router.navigate("/matches"));
    expect(screen.getByRole("button", { name: "Ouvrir le menu" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("main")).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Ouvrir le menu" }));
    expect(screen.getByRole("button", { name: "Ligues" })).toHaveAttribute("aria-expanded", "false");
    resize(601);
    expect(screen.queryByRole("button", { name: "Ouvrir le menu" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ligues" })).toHaveAccessibleName("Ligues");
    await user.click(screen.getByRole("button", { name: "Ligues" }));
    resize(901);
    expect(screen.getByRole("button", { name: "Ligues" })).toHaveAttribute("aria-expanded", "false");
    resize(600);
    expect(screen.getByRole("button", { name: "Ouvrir le menu" })).toHaveAttribute("aria-expanded", "false");
  });

  it("closes the menu after browser history navigation", async () => {
    const user = userEvent.setup();
    width = 400;
    const router = mount("/");
    await act(() => router.navigate("/matches"));
    await user.click(screen.getByRole("button", { name: "Ouvrir le menu" }));
    await act(() => router.navigate(-1));
    expect(screen.getByRole("button", { name: "Ouvrir le menu" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("main")).toHaveFocus();
  });

  it("does not move focus when calendar filters change the query string", async () => {
    const user = userEvent.setup();
    mount("/matches");
    const field = screen.getByLabelText("État");
    await user.selectOptions(field, "COMPLETED");
    expect(field).toHaveFocus();
  });

  it("redirects an anonymous dashboard visit to the public layout", async () => {
    const router = mount("/dashboard/leagues");
    await screen.findByRole("navigation", { name: "Navigation publique" });
    expect(router.state.location.pathname).toBe("/");
    expect(screen.queryByRole("navigation", { name: "Navigation du dashboard" })).not.toBeInTheDocument();
  });

  it.each(["USER", "EDITOR", "MODERATOR", "ADMIN"])("keeps the same public shell for %s", (role) => {
    setAccessToken(`${btoa("{}")}.${btoa(JSON.stringify({ role }))}.signature`);
    mount("/matches");
    expect(screen.getByRole("navigation", { name: "Navigation publique" })).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Navigation du dashboard" })).not.toBeInTheDocument();
  });
});
