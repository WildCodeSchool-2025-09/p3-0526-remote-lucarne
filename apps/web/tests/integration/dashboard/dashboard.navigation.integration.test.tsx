import { RouterProvider, createMemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { APP_ROLES } from "../../../src/auth/authRole";
import { clearAccessToken, getAccessToken, setAccessToken } from "../../../src/lib/authToken";
import appRouter from "../../../src/router";

function createToken(role: string): string {
  const encode = (value: string) => btoa(value)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return `${encode("{}")}.${encode(JSON.stringify({
    exp: Math.floor(Date.now() / 1000) + 60,
    role,
  }))}.signature`;
}

describe("Dashboard root navigation", () => {
  afterEach(() => {
    clearAccessToken();
    vi.unstubAllGlobals();
  });

  it("returns to login when a stored session is rejected after a database reset", async () => {
    setAccessToken(createToken(APP_ROLES.ADMIN));
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      error: { code: "AUTHENTICATION_REQUIRED", message: "Authentication required" },
    }), { status: 401, headers: { "content-type": "application/json" } })));
    const router = createMemoryRouter(appRouter.routes, { initialEntries: ["/dashboard/seasons"] });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(<QueryClientProvider client={queryClient}><RouterProvider router={router} /></QueryClientProvider>);

    await waitFor(() => expect(router.state.location.pathname).toBe("/dev/login"));
    expect(getAccessToken()).toBeNull();
    expect(await screen.findByRole("button", { name: "Se connecter" })).toBeInTheDocument();
    expect(screen.getByText("Votre session a expiré ou n’est plus valide. Reconnectez-vous pour continuer.")).toBeInTheDocument();
    expect(screen.queryByText("Impossible de charger les saisons.")).not.toBeInTheDocument();
  });

  it.each(Object.values(APP_ROLES))("renders the empty dashboard layout for %s", async (role) => {
    setAccessToken(createToken(role));
    const router = createMemoryRouter(appRouter.routes, { initialEntries: ["/dashboard"] });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(<QueryClientProvider client={queryClient}><RouterProvider router={router} /></QueryClientProvider>);

    expect(await screen.findByRole("navigation", { name: "Navigation du dashboard" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/dashboard");
    expect(screen.queryByRole("link", { current: "page" })).not.toBeInTheDocument();
  });
});
