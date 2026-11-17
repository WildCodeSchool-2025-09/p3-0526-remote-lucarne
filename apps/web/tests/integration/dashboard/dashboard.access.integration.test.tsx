import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import appRouter from "../../../src/router";
import { APP_ROLES, getCurrentAppRole } from "../../../src/auth/authRole";
import { clearAccessToken, getAccessToken, setAccessToken } from "../../../src/lib/authToken";
import { dashboardResources } from "../../../src/components/dashboard/dashboardResources";

const paths = ["/dashboard", "/dashboard/unknown", ...Object.values(dashboardResources).flatMap(({ path }) => [path, `${path}/new`, `${path}/resource-id`, `${path}/resource-id/edit`])];
const blockedRoles = [null, APP_ROLES.USER, APP_ROLES.EDITOR, APP_ROLES.MODERATOR];
const cases = blockedRoles.flatMap((role) => paths.map((path) => ({ role, label: role ?? "anonymous", path })));
const token = (role: string, expires = Math.floor(Date.now() / 1000) + 60) => `${btoa("{}")}.${btoa(JSON.stringify({ role, exp: expires }))}.signature`;
const requestPath = (input: RequestInfo | URL) => new URL(typeof input === "string" || input instanceof URL ? input : input.url, window.location.origin).pathname;
const fetchMock = vi.fn<typeof fetch>();
let dispose: (() => void) | undefined;

function mount(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(appRouter.routes, { initialEntries: ["/matches", path], initialIndex: 1 });
  render(<QueryClientProvider client={client}><RouterProvider router={router} /></QueryClientProvider>);
  dispose = () => { cleanup(); router.dispose(); client.clear(); };
  return router;
}

describe("ADMIN-only dashboard access", () => {
  beforeEach(() => {
    clearAccessToken(); fetchMock.mockReset(); vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockImplementation((input) => {
      const path = requestPath(input);
      if (path === "/api/v1/leagues/navigation") return Promise.resolve(new Response("[]", { headers: { "content-type": "application/json" } }));
      if (path === "/api/v1/matches") return Promise.resolve(new Response(JSON.stringify({ data: [], pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 } }), { headers: { "content-type": "application/json" } }));
      if (path !== "/api/v1/health" && path !== "/api/v1/auth/me") throw new Error(`Unexpected protected request: ${path}`);
      return Promise.resolve(new Response(JSON.stringify(path.endsWith("/health") ? { status: "ok" } : { id: "user-id", role: getCurrentAppRole(), firstName: "Test", lastName: "User", email: "user@lucarne.test" }), { headers: { "content-type": "application/json" } }));
    });
  });
  afterEach(() => { dispose?.(); clearAccessToken(); vi.unstubAllGlobals(); });

  it.each(cases)("redirects $label from $path without mounting protected pages", async ({ role, path }) => {
    const accessToken = role ? token(role) : null;
    if (accessToken) setAccessToken(accessToken);
    const router = mount(path);
    await screen.findByRole("navigation", { name: "Navigation publique" });
    expect(router.state.location.pathname).toBe("/");
    expect(getAccessToken()).toBe(accessToken);
    expect(getCurrentAppRole()).toBe(role);
    expect(screen.queryByRole("navigation", { name: "Navigation du dashboard" })).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.every(([input]) => ["/api/v1/health", "/api/v1/auth/me", "/api/v1/matches", "/api/v1/leagues/navigation"].includes(requestPath(input)))).toBe(true);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    // replace removes the rejected entry; Back reaches the earlier public page.
    await act(() => router.navigate(-1));
    await waitFor(() => expect(router.state.location.pathname).toBe("/matches"));
  });

  it("keeps ADMIN on the dashboard", () => {
    setAccessToken(token(APP_ROLES.ADMIN));
    const router = mount("/dashboard");
    expect(router.state.location.pathname).toBe("/dashboard");
    expect(screen.getByRole("navigation", { name: "Navigation du dashboard" })).toBeInTheDocument();
  });

  it("redirects when a current ADMIN session is replaced by a USER session", async () => {
    setAccessToken(token(APP_ROLES.ADMIN)); const router = mount("/dashboard");
    const userToken = token(APP_ROLES.USER);
    act(() => setAccessToken(userToken));
    await screen.findByRole("navigation", { name: "Navigation publique" });
    expect(router.state.location.pathname).toBe("/"); expect(getAccessToken()).toBe(userToken);
  });

  it.each(["invalid-token", token(APP_ROLES.ADMIN, Math.floor(Date.now() / 1000) - 1)])("redirects an invalid or expired token", async (accessToken) => {
    setAccessToken(accessToken); const router = mount("/dashboard/matches");
    await waitFor(() => expect(router.state.location.pathname).toBe("/"));
    expect(screen.queryByRole("navigation", { name: "Navigation du dashboard" })).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.every(([input]) => ["/api/v1/health", "/api/v1/auth/me", "/api/v1/matches", "/api/v1/leagues/navigation"].includes(requestPath(input)))).toBe(true);
  });
});
