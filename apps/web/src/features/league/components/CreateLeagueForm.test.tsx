import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HttpError } from "../../../lib/httpClient";
import { CreateLeagueForm } from "./CreateLeagueForm";

const { useCreateLeagueMock } = vi.hoisted(() => ({
  useCreateLeagueMock: vi.fn(),
}));

vi.mock("../../../hooks/useCreateLeague", () => ({
  useCreateLeague: useCreateLeagueMock,
}));

describe("CreateLeagueForm", () => {
  const mutate = vi.fn();
  const reset = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useCreateLeagueMock.mockReturnValue({
      error: null,
      isError: false,
      isPending: false,
      mutate,
      reset,
    });
  });

  it("renders all fields with an active league by default", () => {
    render(<CreateLeagueForm />);

    expect(screen.getByLabelText("Nom *")).toBeInTheDocument();
    expect(screen.getByLabelText("Pays *")).toBeInTheDocument();
    expect(screen.getByLabelText("URL du logo")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Ligue active" })).toBeChecked();
  });

  it("shows inline validation errors for required fields", async () => {
    const user = userEvent.setup();
    render(<CreateLeagueForm />);

    await user.click(screen.getByRole("button", { name: "Créer la ligue" }));

    expect(await screen.findByText("Nom requis")).toBeInTheDocument();
    expect(screen.getByText("Pays requis")).toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
  });

  it("shows an inline error for an invalid logo URL", async () => {
    const user = userEvent.setup();
    render(<CreateLeagueForm />);

    await user.type(screen.getByLabelText("Nom *"), "Première Ligue");
    await user.type(screen.getByLabelText("Pays *"), "France");
    await user.type(screen.getByLabelText("URL du logo"), "not-a-url");
    await user.click(screen.getByRole("button", { name: "Créer la ligue" }));

    expect(await screen.findByText("L'URL du logo doit être une URL valide")).toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
  });

  it("submits the normalized payload", async () => {
    const user = userEvent.setup();
    render(<CreateLeagueForm />);

    await user.type(screen.getByLabelText("Nom *"), "Première Ligue");
    await user.type(screen.getByLabelText("Pays *"), "France");
    await user.click(screen.getByRole("button", { name: "Créer la ligue" }));

    await waitFor(() => expect(mutate).toHaveBeenCalledWith({
      name: "Première Ligue",
      country: "France",
      logoUrl: undefined,
      isActive: true,
    }));
  });

  it("disables the submit button while creating", () => {
    useCreateLeagueMock.mockReturnValue({
      error: null,
      isError: false,
      isPending: true,
      mutate,
      reset,
    });
    render(<CreateLeagueForm />);

    expect(screen.getByRole("button", { name: "Création..." })).toBeDisabled();
  });

  it("shows a general mutation error without replacing the hook error", () => {
    const error = new HttpError(
      new Response(null, { status: 409 }),
      { error: { code: "RESOURCE_ALREADY_EXISTS", message: "P2002 Prisma" } },
    );
    useCreateLeagueMock.mockReturnValue({
      error,
      isError: true,
      isPending: false,
      mutate,
      reset,
    });
    render(<CreateLeagueForm />);

    const alert = screen.getByRole("alert");

    expect(alert).toHaveTextContent("Une ligue avec ce nom existe déjà pour ce pays.");
    expect(alert).not.toHaveTextContent("P2002");
    expect(alert).not.toHaveTextContent("Prisma");
  });

  it("resets a previous API error when a new submission starts", async () => {
    const user = userEvent.setup();
    render(<CreateLeagueForm />);

    await user.click(screen.getByRole("button", { name: "Créer la ligue" }));

    expect(reset).toHaveBeenCalled();
  });
});
