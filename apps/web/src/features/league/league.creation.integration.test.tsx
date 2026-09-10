import type { League } from "@lucarne/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setAccessToken, clearAccessToken } from "../../lib/authToken";
import { APP_ROLES } from "../../auth/authRole";
import { RequireRole } from "../../auth/RequireRole";
import CreateLeaguePage from "./pages/CreateLeaguePage";

const responseLeague: League = {
  id: "league-id",
  name: "Première Ligue",
  country: "France",
  logoUrl: null,
  isActive: true,
  createdAt: "2026-09-10T10:00:00.000Z",
};

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

function renderCreationRoute() {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/dashboard/leagues/new"]}>
        <Routes>
          <Route
            path="/dashboard/leagues/new"
            element={
              <RequireRole allowedRoles={[APP_ROLES.ADMIN]}>
                <CreateLeaguePage />
              </RequireRole>
            }
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("League creation frontend integration", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    clearAccessToken();
    setAccessToken(createToken(APP_ROLES.ADMIN));
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    clearAccessToken();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("creates a league through the real page and displays success", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(responseLeague), {
        headers: { "content-type": "application/json" },
        status: 201,
      }),
    );
    const user = userEvent.setup();
    renderCreationRoute();

    await user.type(screen.getByLabelText("Nom *"), "  Première Ligue  ");
    await user.type(screen.getByLabelText("Pays *"), " France ");
    await user.click(screen.getByRole("button", { name: "Créer la ligue" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "La ligue a été créée avec succès.",
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/v1\/leagues$/),
      expect.objectContaining({ method: "POST" }),
    );

    const [, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(request.headers);
    const requestBody = request.body;

    if (typeof requestBody !== "string") {
      throw new TypeError("The request body must be a JSON string");
    }

    const body = JSON.parse(requestBody) as Record<string, unknown>;

    expect(headers.get("authorization")).toMatch(/^Bearer /);
    expect(body).toEqual({
      country: "France",
      isActive: true,
      name: "Première Ligue",
    });
  });

  it("traverses the real error path for a duplicate league", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({
        error: {
          code: "RESOURCE_ALREADY_EXISTS",
          message: "P2002 Prisma technical detail",
        },
      }), {
        headers: { "content-type": "application/json" },
        status: 409,
      }),
    );
    const user = userEvent.setup();
    renderCreationRoute();

    await user.type(screen.getByLabelText("Nom *"), "Première Ligue");
    await user.type(screen.getByLabelText("Pays *"), "France");
    await user.click(screen.getByRole("button", { name: "Créer la ligue" }));

    const alert = await screen.findByRole("alert");

    expect(alert).toHaveTextContent("Une ligue avec ce nom existe déjà pour ce pays.");
    expect(alert).not.toHaveTextContent("P2002");
    expect(alert).not.toHaveTextContent("Prisma");
  });

  it("does not render the creation form for USER", () => {
    setAccessToken(createToken(APP_ROLES.USER));

    renderCreationRoute();

    expect(screen.queryByLabelText("Nom *")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Accès refusé" })).toBeInTheDocument();
  });

  it("does not issue a second request while the first request is pending", async () => {
    let resolveRequest: (response: Response) => void = () => undefined;
    const pendingResponse = new Promise<Response>((resolve) => {
      resolveRequest = resolve;
    });
    fetchMock.mockReturnValueOnce(pendingResponse);
    const user = userEvent.setup();
    renderCreationRoute();

    await user.type(screen.getByLabelText("Nom *"), "Première Ligue");
    await user.type(screen.getByLabelText("Pays *"), "France");
    await user.click(screen.getByRole("button", { name: "Créer la ligue" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Création..." })).toBeDisabled());
    await user.click(screen.getByRole("button", { name: "Création..." }));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    resolveRequest(new Response(JSON.stringify(responseLeague), {
      headers: { "content-type": "application/json" },
      status: 201,
    }));
  });
});
