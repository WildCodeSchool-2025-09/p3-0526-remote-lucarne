import { MemoryRouter } from "react-router";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { clearAccessToken, setAccessToken } from "../lib/authToken";
import { APP_ROLES, CREATE_LEAGUE_ROLES } from "./authRole";
import { RequireRole } from "./RequireRole";

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

function renderProtectedRoute() {
  return render(
    <MemoryRouter>
      <RequireRole allowedRoles={CREATE_LEAGUE_ROLES}>
        <div data-testid="protected-content">CreateLeagueForm</div>
      </RequireRole>
    </MemoryRouter>,
  );
}

describe("RequireRole", () => {
  beforeEach(() => {
    clearAccessToken();
  });

  it("does not render the protected content anonymously", () => {
    renderProtectedRoute();

    expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Authentification requise" })).toBeInTheDocument();
  });

  it("does not render the protected content for USER", () => {
    setAccessToken(createToken(APP_ROLES.USER));

    renderProtectedRoute();

    expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Accès refusé" })).toBeInTheDocument();
  });

  it("renders the protected content for ADMIN", () => {
    setAccessToken(createToken(APP_ROLES.ADMIN));

    renderProtectedRoute();

    expect(screen.getByTestId("protected-content")).toBeInTheDocument();
  });

  it("denies malformed and unknown-role tokens without throwing", () => {
    setAccessToken("not-a-jwt");

    const { rerender } = renderProtectedRoute();
    expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();

    setAccessToken(createToken("SUPERADMIN"));
    rerender(
      <MemoryRouter>
        <RequireRole allowedRoles={CREATE_LEAGUE_ROLES}>
          <div data-testid="protected-content">CreateLeagueForm</div>
        </RequireRole>
      </MemoryRouter>,
    );

    expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
  });
});
