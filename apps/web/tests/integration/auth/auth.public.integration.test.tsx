import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import appRouter from "../../../src/router";
import { clearAccessToken, getAccessToken, setAccessToken } from "../../../src/lib/authToken";
import { useAuth } from "../../../src/features/auth/AuthContext";
import { AuthProvider } from "../../../src/features/auth/AuthProvider";
import { StrictMode } from "react";
import sharedQueryClient from "../../../src/lib/queryClient";

const token = (role = "USER", expires = Math.floor(Date.now() / 1000) + 60) => `${btoa("{}")}.${btoa(JSON.stringify({ sub: "user-id", role, exp: expires }))}.signature`;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const profile = (role = "USER") => ({ id: "user-id", firstName: "Jane", lastName: "Doe", email: "jane@example.com", role });
const requestPath = (input: RequestInfo | URL) => new URL(typeof input === "string" || input instanceof URL ? input : input.url, window.location.origin).pathname;
const fetchMock = vi.fn<typeof fetch>();
let dispose: (() => void) | undefined;
let role: string;
let authStatus: number;

function mount(path = "/") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(appRouter.routes, { initialEntries: [path] });
  render(<StrictMode><QueryClientProvider client={client}><RouterProvider router={router} /></QueryClientProvider></StrictMode>);
  dispose = () => { cleanup(); router.dispose(); client.clear(); };
  return { router, client };
}

async function fillLogin() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Email", { exact: false }), "jane@example.com");
  await user.type(screen.getByLabelText("Mot de passe", { exact: false }), "Password1");
  return user;
}

describe("Public account flows", () => {
  beforeEach(() => {
    clearAccessToken(); role = "USER"; authStatus = 200;
    fetchMock.mockReset(); vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockImplementation((input) => {
      const path = requestPath(input);
      if (path.endsWith("/health")) return Promise.resolve(json({ status: "ok" }));
      if (path.endsWith("/auth/me")) return Promise.resolve(json(profile(role)));
      if (path.endsWith("/auth/login") || path.endsWith("/auth/register")) return Promise.resolve(authStatus === 200 ? json({ accessToken: token(role) }) : json({ error: { code: "INVALID_CREDENTIALS", message: "Couple mot de passe/Email inexistant" } }, authStatus));
      return Promise.resolve(json({ data: [], pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 } }));
    });
  });
  afterEach(() => { dispose?.(); clearAccessToken(); vi.unstubAllGlobals(); vi.useRealTimers(); });

  it("opens a modal without navigating, traps focus and restores the trigger on Escape", async () => {
    const user = userEvent.setup(); const { router } = mount();
    const trigger = screen.getByRole("button", { name: "Compte" });
    await user.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "Connexion" });
    expect(screen.getByLabelText("Email", { exact: false })).toHaveFocus();
    expect(screen.getByRole("main", { hidden: true }).closest("[inert]")).not.toBeNull();
    const close = within(dialog).getByRole("button", { name: "Fermer le formulaire" }); close.focus();
    await user.tab({ shift: true });
    expect(within(dialog).getByRole("button", { name: "Créer un compte" })).toHaveFocus();
    await user.tab(); expect(close).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(trigger).toHaveFocus(); expect(router.state.location.pathname).toBe("/");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("logs in on the current page and displays logout directly in the sidebar", async () => {
    const user = userEvent.setup(); const { router } = mount();
    await user.click(screen.getByRole("button", { name: "Compte" }));
    await fillLogin(); await user.click(screen.getByRole("button", { name: "Se connecter" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(getAccessToken()).not.toBeNull(); expect(router.state.location.pathname).toBe("/");
    expect(screen.queryByRole("button", { name: "Compte" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Connexion" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Créer un compte" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Dashboard" })).not.toBeInTheDocument();
    expect(within(screen.getByRole("complementary", { name: "Lucarne" })).getByRole("button", { name: "Déconnexion" })).toBeInTheDocument();
  });

  it("promotes registration within the login dialog and switches forms without navigating", async () => {
    const user = userEvent.setup(); const { router } = mount();
    const trigger = screen.getByRole("button", { name: "Compte" });
    await user.click(trigger);
    const registration = screen.getByRole("region", { name: "Pas encore inscrit ?" });
    await user.click(within(registration).getByRole("button", { name: "Créer un compte" }));
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(screen.getByRole("dialog", { name: "Créer un compte" })).toBeInTheDocument();
    expect(screen.getByLabelText("Prénom", { exact: false })).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Déjà un compte ? Se connecter" }));
    expect(screen.getByRole("dialog", { name: "Connexion" })).toBeInTheDocument();
    expect(screen.getByLabelText("Email", { exact: false })).toHaveFocus();
    expect(router.state.location.pathname).toBe("/");
    await user.click(screen.getByRole("button", { name: "Fermer le formulaire" }));
    expect(trigger).toHaveFocus();
  });

  it.each(["USER", "EDITOR", "MODERATOR", "ADMIN"])("restores %s using the current database role", async (currentRole) => {
    role = currentRole; setAccessToken(token("ADMIN")); mount();
    await screen.findByRole("button", { name: "Déconnexion" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Compte" })).not.toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText("Vérification de la session…")).not.toBeInTheDocument());
    if (role === "ADMIN") {
      const dashboard = screen.getByRole("link", { name: "Dashboard" });
      expect(dashboard).toHaveAttribute("href", "/dashboard");
      expect(dashboard.closest("aside")).not.toBeNull();
      expect(dashboard.compareDocumentPosition(screen.getByRole("button", { name: "Déconnexion" })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    } else expect(screen.queryByRole("link", { name: "Dashboard" })).not.toBeInTheDocument();
  });

  it("orders the sidebar actions for keyboard navigation and keeps the ADMIN session when entering Dashboard", async () => {
    const user = userEvent.setup(); role = "ADMIN";
    const accessToken = token("ADMIN"); setAccessToken(accessToken);
    const { router } = mount();
    const sidebar = screen.getByRole("complementary", { name: "Lucarne" });
    const dashboard = await within(sidebar).findByRole("link", { name: "Dashboard" });
    dashboard.focus();
    await user.tab();
    expect(within(sidebar).getByRole("button", { name: "Déconnexion" })).toHaveFocus();
    await user.tab({ shift: true });
    expect(dashboard).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(router.state.location.pathname).toBe("/dashboard");
    expect(getAccessToken()).toBe(accessToken);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Navigation du dashboard" })).toBeInTheDocument();
  });

  it.each(["USER", "ADMIN"])("keeps %s actions accessible in the compact tablet sidebar", async (currentRole) => {
    vi.stubGlobal("matchMedia", (query: string) => ({ matches: query.includes("900"), addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    role = currentRole; setAccessToken(token(currentRole)); mount();
    const sidebar = screen.getByRole("complementary", { name: "Lucarne" });
    const logout = within(sidebar).getByRole("button", { name: "Déconnexion" });
    expect(logout).toHaveAttribute("title", "Déconnexion");
    expect(screen.queryByRole("button", { name: "Compte" })).not.toBeInTheDocument();
    if (currentRole === "ADMIN") {
      const dashboard = await within(sidebar).findByRole("link", { name: "Dashboard" });
      expect(dashboard).toHaveAttribute("title", "Dashboard");
      expect(dashboard).toHaveAttribute("href", "/dashboard");
      expect(dashboard.compareDocumentPosition(logout) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    } else expect(screen.queryByRole("link", { name: "Dashboard" })).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("allows logout in the sidebar while checking the session without exposing Dashboard prematurely", async () => {
    role = "ADMIN"; setAccessToken(token("ADMIN"));
    let resolve!: (value: Response) => void;
    const response = new Promise<Response>((done) => { resolve = done; });
    const defaultFetch = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation((input, init) => requestPath(input).endsWith("/auth/me") ? response : defaultFetch(input, init));
    mount();
    expect(within(screen.getByRole("region", { name: "Votre compte" })).getByRole("status")).toHaveTextContent("Vérification de la session…");
    expect(screen.getByRole("button", { name: "Déconnexion" })).toBeEnabled();
    expect(screen.queryByRole("link", { name: "Dashboard" })).not.toBeInTheDocument();
    await act(async () => { resolve(json(profile("ADMIN"))); await response; });
    expect(await screen.findByRole("link", { name: "Dashboard" })).toBeInTheDocument();
  });

  it("keeps logout available and offers session verification retry in the sidebar", async () => {
    const user = userEvent.setup(); role = "ADMIN"; setAccessToken(token("ADMIN"));
    let failed = false;
    const defaultFetch = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation((input, init) => {
      if (requestPath(input).endsWith("/auth/me") && !failed) {
        failed = true;
        return Promise.resolve(json({ error: { code: "INTERNAL_SERVER_ERROR", message: "Unavailable" } }, 500));
      }
      return defaultFetch(input, init);
    });
    mount();
    expect(await screen.findByText("Impossible de vérifier la session.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Dashboard" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Déconnexion" })).toBeEnabled();
    await user.click(within(screen.getByRole("region", { name: "Votre compte" })).getByRole("button", { name: "Réessayer" }));
    expect(await screen.findByRole("link", { name: "Dashboard" })).toBeInTheDocument();
  });

  it("registers, omits UI-only confirmation and privileges, and starts a session", async () => {
    const user = userEvent.setup(); mount();
    await user.click(screen.getByRole("button", { name: "Compte" }));
    await user.click(screen.getByRole("button", { name: "Créer un compte" }));
    await user.type(screen.getByLabelText("Prénom", { exact: false }), "Jane");
    await user.type(screen.getByLabelText(/^Nom/), "Doe");
    await user.type(screen.getByLabelText("Email", { exact: false }), "jane@example.com");
    await user.type(screen.getByLabelText(/^Mot de passe/), "Password1");
    await user.type(screen.getByLabelText("Confirmer le mot de passe", { exact: false }), "Password1");
    await user.click(screen.getByRole("button", { name: "Créer mon compte" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(getAccessToken()).not.toBeNull();
    expect(screen.getByRole("button", { name: "Déconnexion" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Compte" })).not.toBeInTheDocument();
    const registration = fetchMock.mock.calls.find(([input]) => requestPath(input).endsWith("/auth/register"));
    const body = registration?.[1]?.body;
    if (typeof body !== "string") throw new Error("Registration JSON missing");
    expect(JSON.parse(body)).toEqual({ email: "jane@example.com", firstName: "Jane", lastName: "Doe", password: "Password1" });
  });

  it("validates password strength before submitting registration", async () => {
    const user = userEvent.setup(); mount();
    await user.click(screen.getByRole("button", { name: "Compte" }));
    await user.click(screen.getByRole("button", { name: "Créer un compte" }));
    await user.type(screen.getByLabelText(/^Mot de passe/), "weak");
    await user.click(screen.getByRole("button", { name: "Créer mon compte" }));
    expect(await screen.findByText("Le mot de passe doit contenir au moins 8 caractères")).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([input]) => requestPath(input).endsWith("/auth/register"))).toBe(false);
  });

  it("displays the requested generic failure and keeps the form usable", async () => {
    const user = userEvent.setup(); authStatus = 401; mount();
    await user.click(screen.getByRole("button", { name: "Compte" })); await fillLogin();
    await user.click(screen.getByRole("button", { name: "Se connecter" }));
    expect(await screen.findByText("Couple mot de passe/Email inexistant")).toBeInTheDocument();
    expect(screen.getByLabelText("Email", { exact: false })).toHaveValue("jane@example.com");
    expect(getAccessToken()).toBeNull();
  });

  it("does not establish a session from a late response after the modal closes", async () => {
    const user = userEvent.setup(); let resolve!: (value: Response) => void;
    const response = new Promise<Response>((done) => { resolve = done; });
    mount(); await user.click(screen.getByRole("button", { name: "Compte" })); await fillLogin();
    fetchMock.mockImplementationOnce(() => response);
    await user.click(screen.getByRole("button", { name: "Se connecter" }));
    await user.keyboard("{Escape}");
    await act(async () => { resolve(json({ accessToken: token() })); await response; });
    expect(getAccessToken()).toBeNull(); expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("cancels an in-flight login when switching to registration", async () => {
    const user = userEvent.setup(); let resolve!: (value: Response) => void;
    const response = new Promise<Response>((done) => { resolve = done; });
    mount(); await user.click(screen.getByRole("button", { name: "Compte" })); await fillLogin();
    fetchMock.mockImplementationOnce(() => response);
    await user.click(screen.getByRole("button", { name: "Se connecter" }));
    await user.click(screen.getByRole("button", { name: "Créer un compte" }));
    await act(async () => { resolve(json({ accessToken: token() })); await response; });
    expect(getAccessToken()).toBeNull();
    expect(screen.getByRole("dialog", { name: "Créer un compte" })).toBeInTheDocument();
  });

  it("logs out locally and purges private cached data", async () => {
    const user = userEvent.setup(); setAccessToken(token());
    mount();
    await screen.findByRole("button", { name: "Déconnexion" });
    sharedQueryClient.setQueryData(["private-data"], { account: "USER" });
    await user.click(screen.getByRole("button", { name: "Déconnexion" }));
    expect(getAccessToken()).toBeNull(); expect(screen.getByRole("button", { name: "Compte" })).toBeEnabled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(sharedQueryClient.getQueryData(["private-data"])).toBeUndefined();
  });

  it("returns explicitly to the public home when logging out from the dashboard", async () => {
    function Logout() { const { logout } = useAuth(); return <button onClick={logout}>Logout</button>; }
    const client = new QueryClient(); setAccessToken(token("ADMIN"));
    const router = createMemoryRouter([{ path: "/dashboard", element: <AuthProvider><Logout /></AuthProvider> }, { path: "/", element: <p>Home</p> }], { initialEntries: ["/dashboard"] });
    render(<QueryClientProvider client={client}><RouterProvider router={router} /></QueryClientProvider>);
    dispose = () => { cleanup(); router.dispose(); client.clear(); };
    await userEvent.click(screen.getByRole("button", { name: "Logout" }));
    expect(router.state.location.pathname).toBe("/"); expect(getAccessToken()).toBeNull();
  });

  it("closes the mobile menu before authentication and restores its visible trigger", async () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    const user = userEvent.setup(); mount();
    await user.click(screen.getByRole("button", { name: "Ouvrir le menu" }));
    const trigger = screen.getByRole("button", { name: "Compte" });
    await user.click(trigger);
    expect(screen.getByRole("button", { name: "Ouvrir le menu", hidden: true })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("dialog", { name: "Connexion" })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(trigger).toHaveFocus();
  });

  it.each(["USER", "ADMIN"])("shows %s actions inside the mobile menu and closes it on logout", async (currentRole) => {
    vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    const user = userEvent.setup(); role = currentRole; setAccessToken(token(currentRole)); mount();
    const menu = screen.getByRole("button", { name: "Ouvrir le menu" });
    expect(screen.queryByRole("button", { name: "Compte" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Déconnexion" })).not.toBeInTheDocument();
    await user.click(menu);
    const panel = document.getElementById(menu.getAttribute("aria-controls")!);
    const logout = await screen.findByRole("button", { name: "Déconnexion" });
    expect(panel).toContainElement(logout);
    if (currentRole === "ADMIN") {
      const dashboard = await screen.findByRole("link", { name: "Dashboard" });
      expect(panel).toContainElement(dashboard);
      expect(dashboard.compareDocumentPosition(logout) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    } else expect(screen.queryByRole("link", { name: "Dashboard" })).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.click(logout);
    expect(menu).toHaveAttribute("aria-expanded", "false");
    expect(menu).toHaveFocus();
    expect(screen.getByRole("button", { name: "Compte" })).toBeInTheDocument();
    expect(getAccessToken()).toBeNull();
  });

  it("enters Dashboard from the mobile menu without opening an account dialog", async () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    const user = userEvent.setup(); role = "ADMIN";
    const accessToken = token("ADMIN"); setAccessToken(accessToken);
    const { router } = mount();
    await user.click(screen.getByRole("button", { name: "Ouvrir le menu" }));
    await user.click(await screen.findByRole("link", { name: "Dashboard" }));
    expect(router.state.location.pathname).toBe("/dashboard");
    expect(getAccessToken()).toBe(accessToken);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Navigation publique" })).not.toBeInTheDocument();
  });

  it("expires the session without needing an API request", async () => {
    vi.useFakeTimers();
    setAccessToken(token("USER", Math.floor(Date.now() / 1000) + 1));
    mount();
    await act(async () => { await vi.advanceTimersByTimeAsync(1100); });
    expect(getAccessToken()).toBeNull();
    expect(screen.getByRole("dialog", { name: "Connexion" })).toBeInTheDocument();
    expect(screen.getByText("Votre session a expiré. Reconnectez-vous pour continuer.")).toBeInTheDocument();
  });

  it("restores the anonymous mobile account trigger after expiration", async () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    vi.useFakeTimers(); setAccessToken(token("USER", Math.floor(Date.now() / 1000) + 1)); mount();
    expect(screen.queryByRole("button", { name: "Compte" })).not.toBeInTheDocument();
    await act(async () => { await vi.advanceTimersByTimeAsync(1100); });
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(screen.getByRole("dialog", { name: "Connexion" })).toBeInTheDocument();
    expect(getAccessToken()).toBeNull();
    act(() => screen.getByRole("button", { name: "Fermer le formulaire" }).click());
    expect(screen.getByRole("button", { name: "Compte" })).toHaveFocus();
  });
});
