import { PHOTO_MAX_BYTES } from "@lucarne/shared";
import type { Team } from "@lucarne/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("URL", Object.assign(class extends URL {}, {
      createObjectURL: vi.fn(() => "blob:logo-preview"),
      revokeObjectURL: vi.fn(),
    }));
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
    expect(screen.getByLabelText("Fichier logo")).toBeInTheDocument();
    expect(screen.queryByLabelText("URL du logo")).not.toBeInTheDocument();
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

  it("creates without a logo using null", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(responseTeam), { status: 201, headers: { "content-type": "application/json" } }),
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

  it("rejects an oversized stadium", async () => {
    const user = userEvent.setup();
    renderCreationRoute();

    await user.type(screen.getByLabelText("Nom de l’équipe *"), "Paris FC");
    await user.type(screen.getByLabelText("Stade"), "a".repeat(151));
    await user.click(screen.getByRole("button", { name: "Créer l’équipe" }));

    expect(await screen.findByText("Le stade ne peut pas dépasser 150 caractères")).toBeInTheDocument();
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
    resolveRequest(new Response(JSON.stringify(responseTeam), { status: 201, headers: { "content-type": "application/json" } }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("créée avec succès"));
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


  it("uploads the logo before creating the team with its permanent URL", async () => {
    const logoPath = "/api/v1/uploads/photos/team-logo.png";
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ path: logoPath }), { status: 201, headers: { "content-type": "application/json" } }));
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(responseTeam), { status: 201, headers: { "content-type": "application/json" } }));
    const user = userEvent.setup();
    renderCreationRoute();
    const logo = new File(["image"], "logo.png", { type: "image/png" });

    await user.type(screen.getByLabelText("Nom de l’équipe *"), "Paris FC");
    await user.upload(screen.getByLabelText("Fichier logo"), logo);
    expect(screen.getByRole("img", { name: "Aperçu du logo sélectionné" })).toHaveAttribute("src", "blob:logo-preview");
    await user.click(screen.getByRole("button", { name: "Créer l’équipe" }));
    await screen.findByRole("alert");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [uploadUrl, uploadRequest] = fetchMock.mock.calls[0] as [string, RequestInit];
    const [teamUrl, teamRequest] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(uploadUrl).toMatch(/\/api\/v1\/uploads\/photos$/);
    expect(uploadRequest.method).toBe("POST");
    expect(uploadRequest.body).toBe(logo);
    expect(new Headers(uploadRequest.headers).get("content-type")).toBe("image/png");
    expect(teamUrl).toMatch(/\/api\/v1\/teams$/);
    expect(JSON.parse(teamRequest.body as string)).toEqual({
      name: "Paris FC",
      stadium: null,
      logoUrl: new URL(logoPath, new URL(uploadUrl, window.location.origin).origin).href,
    });
  });

  it("rejects unsupported and oversized logos without sending them", () => {
    renderCreationRoute();
    fireEvent.change(screen.getByLabelText("Fichier logo"), {
      target: { files: [new File(["svg"], "logo.svg", { type: "image/svg+xml" })] },
    });
    expect(screen.getByRole("alert")).toHaveTextContent("JPEG, PNG ou WebP");
    fireEvent.change(screen.getByLabelText("Fichier logo"), {
      target: { files: [new File([new Uint8Array(PHOTO_MAX_BYTES + 1)], "large.png", { type: "image/png" })] },
    });
    expect(screen.getByRole("alert")).toHaveTextContent("5 Mo");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("can remove a selected logo and create without uploading it", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(responseTeam), { status: 201, headers: { "content-type": "application/json" } }));
    const user = userEvent.setup();
    renderCreationRoute();
    await user.type(screen.getByLabelText("Nom de l’équipe *"), "Paris FC");
    await user.upload(screen.getByLabelText("Fichier logo"), new File(["image"], "logo.png", { type: "image/png" }));
    await user.click(screen.getByRole("button", { name: "Retirer le logo" }));
    expect(screen.queryByRole("img", { name: "Aperçu du logo sélectionné" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Créer l’équipe" }));
    await screen.findByRole("alert");
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0]).toEqual(expect.stringMatching(/\/teams$/));
    expect(JSON.parse(fetchMock.mock.calls[0][1]?.body as string)).toMatchObject({ logoUrl: null });
  });

  it("retains the logo after an upload failure and allows retry", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Network failure"));
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ path: "/api/v1/uploads/photos/logo.png" }), { status: 201, headers: { "content-type": "application/json" } }));
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(responseTeam), { status: 201, headers: { "content-type": "application/json" } }));
    const user = userEvent.setup();
    renderCreationRoute();
    await user.type(screen.getByLabelText("Nom de l’équipe *"), "Paris FC");
    await user.upload(screen.getByLabelText("Fichier logo"), new File(["image"], "logo.png", { type: "image/png" }));
    await user.click(screen.getByRole("button", { name: "Créer l’équipe" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Impossible d’envoyer le logo");
    expect(screen.getByLabelText("Nom de l’équipe *")).toHaveValue("Paris FC");
    expect(screen.getByRole("img", { name: "Aperçu du logo sélectionné" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledOnce();
    await user.click(screen.getByRole("button", { name: "Créer l’équipe" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("créée avec succès"));
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("reuses the uploaded logo after team creation fails", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ path: "/api/v1/uploads/photos/logo.png" }), { status: 201, headers: { "content-type": "application/json" } }));
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ error: { code: "INTERNAL_SERVER_ERROR", message: "Failure" } }), { status: 500, headers: { "content-type": "application/json" } }));
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(responseTeam), { status: 201, headers: { "content-type": "application/json" } }));
    const user = userEvent.setup();
    renderCreationRoute();
    await user.type(screen.getByLabelText("Nom de l’équipe *"), "Paris FC");
    await user.upload(screen.getByLabelText("Fichier logo"), new File(["image"], "logo.png", { type: "image/png" }));
    await user.click(screen.getByRole("button", { name: "Créer l’équipe" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Une erreur est survenue");
    await user.click(screen.getByRole("button", { name: "Créer l’équipe" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("créée avec succès"));
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls.filter(([url]) => typeof url === "string" && url.endsWith("/uploads/photos"))).toHaveLength(1);
    const firstInput = JSON.parse(fetchMock.mock.calls[1][1]?.body as string) as Record<string, unknown>;
    const retryInput = JSON.parse(fetchMock.mock.calls[2][1]?.body as string) as Record<string, unknown>;
    expect(retryInput.logoUrl).toBe(firstInput.logoUrl);
  });

  it("blocks edits and duplicate submissions while the logo is uploading", async () => {
    let resolveUpload: (response: Response) => void = () => undefined;
    fetchMock.mockReturnValueOnce(new Promise<Response>((resolve) => { resolveUpload = resolve; }));
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(responseTeam), { status: 201, headers: { "content-type": "application/json" } }));
    const user = userEvent.setup();
    renderCreationRoute();
    await user.type(screen.getByLabelText("Nom de l’équipe *"), "Paris FC");
    await user.upload(screen.getByLabelText("Fichier logo"), new File(["image"], "logo.png", { type: "image/png" }));
    await user.click(screen.getByRole("button", { name: "Créer l’équipe" }));
    expect(screen.getByRole("button", { name: "Création..." })).toBeDisabled();
    expect(screen.getByLabelText("Nom de l’équipe *")).toBeDisabled();
    expect(screen.getByLabelText("Stade")).toBeDisabled();
    expect(screen.getByLabelText("Fichier logo")).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Création..." }));
    expect(fetchMock).toHaveBeenCalledOnce();
    resolveUpload(new Response(JSON.stringify({ path: "/api/v1/uploads/photos/logo.png" }), { status: 201, headers: { "content-type": "application/json" } }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("créée avec succès"));
    expect(fetchMock).toHaveBeenCalledTimes(2);
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
