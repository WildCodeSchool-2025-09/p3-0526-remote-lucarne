import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { clearAccessToken, setAccessToken } from "../../../src/lib/authToken";
import appRouter from "../../../src/router";

describe("Team navigation through the application routes", () => {
  afterEach(() => {
    cleanup();
    clearAccessToken();
    vi.unstubAllGlobals();
  });

  it.each(["ADMIN", "MODERATOR", "EDITOR"])(
    "lets an already connected %s open the team list and then the creation form",
    async (role) => {
      const payload = btoa(JSON.stringify({ role, exp: Math.floor(Date.now() / 1000) + 60 }));
      setAccessToken(`e30.${payload}.signature`);
      const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
        data: [],
        pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
      }), { status: 200, headers: { "Content-Type": "application/json" } }));
      vi.stubGlobal("fetch", fetchMock);
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      const router = createMemoryRouter(appRouter.routes, { initialEntries: ["/dev/login"] });
      const user = userEvent.setup();

      try {
        render(<QueryClientProvider client={queryClient}><RouterProvider router={router} /></QueryClientProvider>);
        expect(screen.getByRole("heading", { name: "Connexion de test" })).toBeInTheDocument();
        expect(screen.getByRole("alert")).toHaveTextContent(`rôle : ${role}`);
        expect(screen.queryByRole("button", { name: "Se connecter" })).not.toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Équipe" }));

        expect(await screen.findByRole("heading", { name: "Équipes" })).toBeInTheDocument();
        expect(router.state.location.pathname).toBe("/dashboard/teams");
        expect(await screen.findByText("Aucune équipe ne correspond à vos critères.")).toBeInTheDocument();
        const createLink = screen.getByRole("link", { name: "Créer une équipe" });
        expect(createLink).toHaveAttribute("href", "/dashboard/teams/new");

        await user.click(createLink);

        expect(await screen.findByRole("heading", { name: "Créer une équipe" })).toBeInTheDocument();
        expect(router.state.location.pathname).toBe("/dashboard/teams/new");
        expect(screen.getByLabelText("Nom de l’équipe *")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Créer l’équipe" })).toBeEnabled();
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
        expect(router.state.errors).toBeNull();
        expect(fetchMock).toHaveBeenCalledOnce();
      } finally {
        cleanup();
        router.dispose();
        queryClient.clear();
      }
    },
  );
});
