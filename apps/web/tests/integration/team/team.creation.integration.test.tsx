import type { Team } from "@lucarne/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { APP_ROLES, TEAM_CREATE_ROLES } from "../../../src/auth/authRole";
import { RequireRole } from "../../../src/auth/RequireRole";
import { clearAccessToken, setAccessToken } from "../../../src/lib/authToken";
import CreateTeamPage from "../../../src/features/team/pages/CreateTeamPage";

const responseTeam: Team = {
  id: "team-id",
  name: "Paris FC",
  logoUrl: null,
  stadium: "Stade municipal",
  isActive: true,
  createdAt: "2026-09-11T10:00:00.000Z",
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
      <MemoryRouter initialEntries={["/dashboard/teams/new"]}>
        <Routes>
          <Route
            path="/dashboard/teams/new"
            element={
              <RequireRole allowedRoles={TEAM_CREATE_ROLES}>
                <CreateTeamPage />
              </RequireRole>
            }
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("Team creation frontend integration", () => {
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

  it("renders only the allowed fields", () => {
    renderCreationRoute();

    expect(screen.getByRole("heading", { name: "Créer une équipe" })).toBeInTheDocument();
    expect(screen.getByLabelText("Nom de l’équipe *")).toBeInTheDocument();
    expect(screen.getByLabelText("URL du logo")).toBeInTheDocument();
    expect(screen.getByLabelText("Stade")).toBeInTheDocument();
    expect(screen.queryByLabelText(/active/i)).not.toBeInTheDocument();
  });

  it("creates a team with a normalized payload", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(responseTeam), {
        headers: { "content-type": "application/json" },
        status: 201,
      }),
    );
    const user = userEvent.setup();
    renderCreationRoute();

    await user.type(screen.getByLabelText("Nom de l’équipe *"), "  Paris FC  ");
    await user.type(screen.getByLabelText("Stade"), "  Stade municipal  ");
    await user.click(screen.getByRole("button", { name: "Créer l’équipe" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Paris FC");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/v1\/teams$/),
      expect.objectContaining({ method: "POST" }),
    );

    const [, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(request.body as string) as Record<string, unknown>;

    expect(body).toEqual({
      logoUrl: null,
      name: "Paris FC",
      stadium: "Stade municipal",
    });
    expect(body).not.toHaveProperty("isActive");
  });

  it("accepts an empty logo URL as null", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(responseTeam), { status: 201 }),
    );
    const user = userEvent.setup();
    renderCreationRoute();

    await user.type(screen.getByLabelText("Nom de l’équipe *"), "Paris FC");
    await user.click(screen.getByRole("button", { name: "Créer l’équipe" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    const [, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(request.body as string)).toMatchObject({ logoUrl: null });
  });

  it.each([
    ["", "Nom requis"],
    ["a".repeat(151), "Le nom ne peut pas dépasser 150 caractères"],
  ])("rejects invalid name: %s", async (name, message) => {
    const user = userEvent.setup();
    renderCreationRoute();

    if (name !== "") {
      await user.type(screen.getByLabelText("Nom de l’équipe *"), name);
    }
    await user.click(screen.getByRole("button", { name: "Créer l’équipe" }));

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid logo URL and an oversized stadium", async () => {
    const user = userEvent.setup();
    renderCreationRoute();

    await user.type(screen.getByLabelText("Nom de l’équipe *"), "Paris FC");
    await user.type(screen.getByLabelText("URL du logo"), "invalid");
    await user.type(screen.getByLabelText("Stade"), "a".repeat(151));
    await user.click(screen.getByRole("button", { name: "Créer l’équipe" }));

    expect(await screen.findByText("Invalid URL")).toBeInTheDocument();
    expect(screen.getByText("Le stade ne peut pas dépasser 150 caractères")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("disables the button and prevents a second request while submitting", async () => {
    let resolveRequest: (response: Response) => void = () => undefined;
    fetchMock.mockReturnValueOnce(new Promise<Response>((resolve) => {
      resolveRequest = resolve;
    }));
    const user = userEvent.setup();
    renderCreationRoute();

    await user.type(screen.getByLabelText("Nom de l’équipe *"), "Paris FC");
    await user.click(screen.getByRole("button", { name: "Créer l’équipe" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Création..." })).toBeDisabled());
    await user.click(screen.getByRole("button", { name: "Création..." }));

    expect(fetchMock).toHaveBeenCalledOnce();
    resolveRequest(new Response(JSON.stringify(responseTeam), { status: 201 }));
  });

  it("shows an API error", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({
        error: { code: "INSUFFICIENT_ROLE", message: "Forbidden" },
      }), {
        headers: { "content-type": "application/json" },
        status: 403,
      }),
    );
    const user = userEvent.setup();
    renderCreationRoute();

    await user.type(screen.getByLabelText("Nom de l’équipe *"), "Paris FC");
    await user.click(screen.getByRole("button", { name: "Créer l’équipe" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Vous n’avez pas les droits nécessaires pour créer une équipe.",
    );
  });

  it.each([APP_ROLES.ADMIN, APP_ROLES.MODERATOR, APP_ROLES.EDITOR])(
    "allows %s to access the creation page",
    (role) => {
      setAccessToken(createToken(role));
      renderCreationRoute();

      expect(screen.getByRole("heading", { name: "Créer une équipe" })).toBeInTheDocument();
    },
  );

  it("denies access to USER", () => {
    setAccessToken(createToken(APP_ROLES.USER));
    renderCreationRoute();

    expect(screen.queryByLabelText("Nom de l’équipe *")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Accès refusé" })).toBeInTheDocument();
  });
});
