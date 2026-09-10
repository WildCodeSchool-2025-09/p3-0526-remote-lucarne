import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CreateLeagueForm } from "./CreateLeagueForm";

const { useCreateLeagueMock } = vi.hoisted(() => ({
  useCreateLeagueMock: vi.fn(),
}));

vi.mock("../../../hooks/useCreateLeague", () => ({
  useCreateLeague: useCreateLeagueMock,
}));

describe("CreateLeagueForm", () => {
  const mutate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useCreateLeagueMock.mockReturnValue({
      isError: false,
      isPending: false,
      mutate,
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
      isError: false,
      isPending: true,
      mutate,
    });
    render(<CreateLeagueForm />);

    expect(screen.getByRole("button", { name: "Création..." })).toBeDisabled();
  });

  it("shows a general mutation error without replacing the hook error", () => {
    useCreateLeagueMock.mockReturnValue({
      isError: true,
      isPending: false,
      mutate,
    });
    render(<CreateLeagueForm />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Impossible de créer la ligue pour le moment.",
    );
  });
});
