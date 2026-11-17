import { RouterProvider, createMemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { APP_ROLES, getCurrentAppRole } from "../../../src/auth/authRole";
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

  it.each(["/dashboard", "/dashboard/leagues", "/dashboard/unknown"])("returns from %s to the public home without changing the ADMIN session", async (path) => {
    const accessToken = createToken(APP_ROLES.ADMIN);
    setAccessToken(accessToken);
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockImplementation((input) => {
      const url = new URL(typeof input === "string" || input instanceof URL ? input : input.url, window.location.origin);
      const data = url.pathname.endsWith("/auth/me")
        ? { id: "admin-id", role: "ADMIN", firstName: "Test", lastName: "Admin", email: "admin@lucarne.test" }
        : { status: "ok" };
      if (url.pathname.endsWith("/auth/me") || url.pathname.endsWith("/health")) {
        return Promise.resolve(new Response(JSON.stringify(data), { headers: { "content-type": "application/json" } }));
      }
      return new Promise<Response>(() => {});
    }));
    const router = createMemoryRouter(appRouter.routes, { initialEntries: ["/matches", path], initialIndex: 1 });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={queryClient}><RouterProvider router={router} /></QueryClientProvider>);
    try {
      const exit = screen.getByRole("link", { name: "Quitter le dashboard" });
      expect(exit).toHaveAttribute("href", "/");
      await userEvent.click(exit);
      await screen.findByRole("navigation", { name: "Navigation publique" });
      expect(router.state.location.pathname).toBe("/");
      expect(getAccessToken()).toBe(accessToken);
      expect(getCurrentAppRole()).toBe(APP_ROLES.ADMIN);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(await screen.findByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/dashboard");
      expect(screen.getByRole("button", { name: "Déconnexion" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Dashboard" }).closest("aside")).not.toBeNull();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    } finally {
      cleanup(); router.dispose(); queryClient.clear();
    }
  });

  it("redirects an anonymous dashboard visit to the public home", async () => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ status: "ok" }), { headers: { "content-type": "application/json" } })));
    const router = createMemoryRouter(appRouter.routes, { initialEntries: ["/dashboard/leagues"] });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={queryClient}><RouterProvider router={router} /></QueryClientProvider>);
    try {
      await screen.findByRole("navigation", { name: "Navigation publique" });
      expect(router.state.location.pathname).toBe("/");
      expect(getAccessToken()).toBeNull();
    } finally {
      cleanup(); router.dispose(); queryClient.clear();
    }
  });

  it("returns to login when a stored session is rejected after a database reset", async () => {
    setAccessToken(createToken(APP_ROLES.ADMIN));
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      error: { code: "AUTHENTICATION_REQUIRED", message: "Authentication required" },
    }), { status: 401, headers: { "content-type": "application/json" } })));
    const router = createMemoryRouter(appRouter.routes, { initialEntries: ["/dashboard/seasons"] });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(<QueryClientProvider client={queryClient}><RouterProvider router={router} /></QueryClientProvider>);

    await waitFor(() => expect(router.state.location.pathname).toBe("/"));
    expect(getAccessToken()).toBeNull();
    expect(await screen.findByRole("button", { name: "Se connecter" })).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Connexion" })).toBeInTheDocument();
    expect(screen.getByText("Votre session a expiré. Reconnectez-vous pour continuer.")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText("Impossible de charger les saisons.")).not.toBeInTheDocument());
  });

  it("renders the empty dashboard layout for ADMIN", async () => {
    const role = APP_ROLES.ADMIN;
    setAccessToken(createToken(role));
    const router = createMemoryRouter(appRouter.routes, { initialEntries: ["/dashboard"] });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(<QueryClientProvider client={queryClient}><RouterProvider router={router} /></QueryClientProvider>);

    expect(await screen.findByRole("navigation", { name: "Navigation du dashboard" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/dashboard");
    expect(screen.queryByRole("link", { current: "page" })).not.toBeInTheDocument();
  });
});
