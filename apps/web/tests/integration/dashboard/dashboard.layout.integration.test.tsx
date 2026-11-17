import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import appRouter from "../../../src/router";
import { clearAccessToken, setAccessToken } from "../../../src/lib/authToken";
import { dashboardResources } from "../../../src/components/dashboard/dashboardResources";

const resources = Object.values(dashboardResources);
const routes = resources.flatMap((resource) => ["", "/new", "/resource-id", "/resource-id/edit"].map((suffix) => ({ ...resource, suffix })));
let dispose: (() => void) | undefined;

function mount(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(appRouter.routes, { initialEntries: [path] });
  render(<QueryClientProvider client={client}><RouterProvider router={router} /></QueryClientProvider>);
  dispose = () => { cleanup(); router.dispose(); client.clear(); };
  return router;
}

describe("Shared dashboard layout", () => {
  beforeEach(() => {
    setAccessToken(`${btoa("{}")}.${btoa(JSON.stringify({ role: "ADMIN", exp: Math.floor(Date.now() / 1000) + 60 }))}.signature`);
    // Keep requests pending to exercise the navigation before names are available.
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(() => {})));
  });

  afterEach(() => {
    dispose?.();
    clearAccessToken();
    vi.unstubAllGlobals();
  });

  it.each(routes)("keeps menu, heading and canonical breadcrumb on $path$suffix", ({ path, label, singular, suffix }) => {
    const router = mount(`${path}${suffix}`);
    const menu = within(screen.getByRole("navigation", { name: "Navigation du dashboard" }));
    expect(menu.getByRole("link", { name: label, current: "page" })).toHaveAttribute("href", path);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    const breadcrumb = within(screen.getByRole("navigation", { name: "Fil d’Ariane" }));
    expect(breadcrumb.getByRole("link", { name: "Administration" })).toHaveAttribute("href", "/dashboard");
    if (suffix) expect(breadcrumb.getByRole("link", { name: label })).toHaveAttribute("href", path);
    else expect(breadcrumb.getByText(label)).toHaveAttribute("aria-current", "page");
    if (suffix.endsWith("/edit")) {
      expect(breadcrumb.getByRole("link", { name: singular })).toHaveAttribute("href", `${path}/resource-id`);
      expect(breadcrumb.getByText("Modifier")).toHaveAttribute("aria-current", "page");
    }
    if (suffix === "/new") expect(breadcrumb.getByText("Créer")).toHaveAttribute("aria-current", "page");
    expect(screen.queryByText("Lucarnes", { selector: "header" })).not.toBeInTheDocument();
    expect(router.state.errors).toBeNull();
  });

  it("gives the root dashboard a heading and breadcrumb", () => {
    mount("/dashboard");
    expect(screen.getByRole("heading", { name: "Administration", level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Fil d’Ariane" })).toHaveTextContent("Administration");
    expect(screen.getByRole("navigation", { name: "Navigation du dashboard" })).toBeInTheDocument();
  });

  it.each(resources)("retains navigation and a list return when $path cannot be loaded", async ({ path, label }) => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ error: { code: "RESOURCE_NOT_FOUND", message: "Ressource introuvable." } }), { status: 404, headers: { "content-type": "application/json" } }))));
    mount(`${path}/resource-id`);
    await waitFor(() => expect(screen.queryByRole("status")).not.toBeInTheDocument());
    expect(within(screen.getByRole("navigation", { name: "Navigation du dashboard" })).getByRole("link", { name: label, current: "page" })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("link", { name: /Retour à la liste/ })).toHaveAttribute("href", path);
  });

  it("keeps the shell on an unknown dashboard route", () => {
    mount("/dashboard/unknown");
    expect(screen.getByRole("heading", { name: "Page introuvable" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Navigation du dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Retour à l’administration" })).toHaveAttribute("href", "/dashboard");
  });

  it("closes an open mobile menu after programmatic navigation", async () => {
    const router = mount("/dashboard");
    await userEvent.click(screen.getByRole("button", { name: "Ouvrir le menu" }));
    expect(screen.getByRole("button", { name: "Fermer le menu" })).toHaveAttribute("aria-expanded", "true");
    await router.navigate("/dashboard/teams/new");
    await waitFor(() => expect(screen.getByRole("button", { name: "Ouvrir le menu" })).toHaveAttribute("aria-expanded", "false"));
  });
});
