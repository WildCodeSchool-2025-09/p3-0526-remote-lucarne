import { MemoryRouter } from "react-router";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CreateLeaguePage from "../../../../src/features/league/pages/CreateLeaguePage";

vi.mock("../../../../src/features/league/components/CreateLeagueForm", () => ({
  CreateLeagueForm: ({ onSuccess }: { onSuccess?: (league: unknown) => void }) => (
    <button
      type="button"
      onClick={() => onSuccess?.({ id: "league-id" })}
    >
      Mock form
    </button>
  ),
}));

describe("CreateLeaguePage", () => {
  it("renders the page and displays its success feedback", async () => {
    const user = (await import("@testing-library/user-event")).default.setup();

    render(
      <MemoryRouter initialEntries={["/dashboard/leagues/new"]}>
        <CreateLeaguePage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Créer une ligue" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mock form" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Mock form" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "La ligue a été créée avec succès.",
    );
  });
});
