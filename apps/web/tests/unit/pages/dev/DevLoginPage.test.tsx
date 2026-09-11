import { MemoryRouter, useLocation } from "react-router";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { APP_ROLES } from "../../../../src/auth/authRole";
import { clearAccessToken, getAccessToken, setAccessToken } from "../../../../src/lib/authToken";
import { HttpError } from "../../../../src/lib/httpClient";
import DevLoginPage from "../../../../src/pages/dev/DevLoginPage";

const { loginMock } = vi.hoisted(() => ({
  loginMock: vi.fn(),
}));

vi.mock("../../../../src/services/auth.service", () => ({
  login: loginMock,
}));

function createToken(role: string): string {
  const encode = (value: string) => btoa(value)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return `${encode("{}")}.${encode(JSON.stringify({
    exp: Math.floor(Date.now() / 1000) + 60,
    role,
    sub: "test-user",
  }))}.signature`;
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/dev/login"]}>
      <DevLoginPage />
    </MemoryRouter>,
  );
}

function CurrentPath() {
  return <span data-testid="current-path">{useLocation().pathname}</span>;
}

describe("DevLoginPage", () => {
  beforeEach(() => {
    clearAccessToken();
    vi.clearAllMocks();
  });

  it("renders the temporary login form without a token", () => {
    renderPage();

    expect(screen.getByRole("heading", { name: "Connexion de test" })).toBeInTheDocument();
    expect(screen.getByLabelText("Email *")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("Mot de passe *")).toHaveAttribute("type", "password");
    expect(screen.getByRole("link", { name: "Ajouter une équipe" })).toHaveAttribute(
      "href",
      "/dashboard/teams/new",
    );
  });

  it("validates email and password before calling the service", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.clear(screen.getByLabelText("Email *"));
    await user.click(screen.getByRole("button", { name: "Se connecter" }));

    expect(await screen.findByText("Email requis")).toBeInTheDocument();
    expect(screen.getByText("Le mot de passe doit contenir au moins 12 caractères")).toBeInTheDocument();
    expect(loginMock).not.toHaveBeenCalled();
  });

  it.each([APP_ROLES.ADMIN, APP_ROLES.MODERATOR, APP_ROLES.EDITOR, APP_ROLES.USER])(
    "stores and displays the %s role after login",
    async (role) => {
      const user = userEvent.setup();
      const token = createToken(role);
      loginMock.mockImplementation(() => {
        setAccessToken(token);
        return Promise.resolve({ accessToken: token });
      });
      renderPage();

      await user.type(screen.getByLabelText("Mot de passe *"), "Lucarne-Test-2026!");
      await user.click(screen.getByRole("button", { name: "Se connecter" }));

      expect(await screen.findByRole("alert")).toHaveTextContent(`rôle : ${role}`);
      expect(getAccessToken()).toBe(token);
    expect(screen.getByRole("button", { name: "Ligue" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Équipe" })).toBeInTheDocument();
    },
  );

  it("shows the existing session on load", () => {
    setAccessToken(createToken(APP_ROLES.EDITOR));

    renderPage();

    expect(screen.getByRole("alert")).toHaveTextContent("rôle : EDITOR");
    expect(screen.queryByRole("button", { name: "Se connecter" })).not.toBeInTheDocument();
  });

  it("redirects to the league dashboard from the login action", async () => {
    const user = userEvent.setup();
    setAccessToken(createToken(APP_ROLES.ADMIN));

    render(
      <MemoryRouter initialEntries={["/dev/login"]}>
        <DevLoginPage />
        <CurrentPath />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: "Ligue" }));

    expect(screen.getByTestId("current-path")).toHaveTextContent("/dashboard/league");
  });

  it("redirects to the team creation page from the connected action", async () => {
    const user = userEvent.setup();
    setAccessToken(createToken(APP_ROLES.ADMIN));

    render(
      <MemoryRouter initialEntries={["/dev/login"]}>
        <DevLoginPage />
        <CurrentPath />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: "Équipe" }));

    expect(screen.getByTestId("current-path")).toHaveTextContent("/dashboard/teams/new");
  });

  it("shows an invalid session without crashing", () => {
    setAccessToken("not-a-jwt");

    renderPage();

    expect(screen.getByRole("alert")).toHaveTextContent("La session existante est invalide.");
    expect(screen.getByRole("button", { name: "Se connecter" })).toBeInTheDocument();
  });

  it("maps invalid credentials to a safe message", async () => {
    const user = userEvent.setup();
    loginMock.mockRejectedValue(
      new HttpError(new Response(null, { status: 401 }), {
        error: { code: "INVALID_CREDENTIALS", message: "Internal detail" },
      }),
    );
    renderPage();

    await user.type(screen.getByLabelText("Mot de passe *"), "Lucarne-Test-2026!");
    await user.click(screen.getByRole("button", { name: "Se connecter" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Email ou mot de passe incorrect.",
    );
    expect(screen.getByRole("alert")).not.toHaveTextContent("Internal detail");
  });

  it("maps server errors to a generic message", async () => {
    const user = userEvent.setup();
    loginMock.mockRejectedValue(new HttpError(new Response(null, { status: 503 }), {}));
    renderPage();

    await user.type(screen.getByLabelText("Mot de passe *"), "Lucarne-Test-2026!");
    await user.click(screen.getByRole("button", { name: "Se connecter" }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(
      "Une erreur est survenue pendant la connexion.",
    ));
  });

  it("clears the token on logout", async () => {
    const user = userEvent.setup();
    const token = createToken(APP_ROLES.ADMIN);
    setAccessToken(token);
    renderPage();

    await user.click(screen.getByRole("button", { name: "Se déconnecter" }));

    expect(getAccessToken()).toBeNull();
    expect(screen.getByRole("button", { name: "Se connecter" })).toBeInTheDocument();
  });
});
