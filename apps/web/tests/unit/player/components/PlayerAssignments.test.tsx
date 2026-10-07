import type { PlayerAssignment } from "@lucarne/shared";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PlayerAssignments } from "../../../../src/features/player/components/PlayerAssignments";

vi.mock("../../../../src/hooks/usePlayer", () => ({ useUpdatePlayerAssignment: () => ({ isPending: false, mutateAsync: vi.fn() }) }));

const assignment: PlayerAssignment = {
  id: "assignment-id",
  team: { id: "team-id", name: "Paris FC", logoUrl: "/club-logo.png" },
  joinedAt: "2026-01-01",
  leftAt: "2026-06-30",
  shirtNumber: null,
  state: "HISTORICAL",
};

describe("PlayerAssignments", () => {
  it("shows the club logo and dates in separate columns", () => {
    render(<PlayerAssignments assignments={[assignment]} />);

    const row = screen.getByRole("row", { name: /Paris FC/ });
    const cells = within(row).getAllByRole("cell");
    expect(within(cells[0]).getByRole("img", { name: "Logo de Paris FC" })).toHaveAttribute("src", "/club-logo.png");
    expect(cells[2]).toHaveTextContent("01/01/2026");
    expect(cells[3]).toHaveTextContent("30/06/2026");
    expect(screen.queryByRole("button", { name: /Modifier les dates/ })).not.toBeInTheDocument();
  });

  it.each(["CURRENT", "PLANNED"] as const)("labels an open %s period without implying it is current", (state) => {
    render(<PlayerAssignments assignments={[{ ...assignment, leftAt: null, state }]} />);

    expect(screen.getByText("Sans date de fin")).toBeInTheDocument();
    expect(screen.getByText(state === "CURRENT" ? "Courante" : "Planifiée")).toBeInTheDocument();
  });

  it("uses the club initial when the logo is absent or fails to load", () => {
    const view = render(<PlayerAssignments assignments={[{ ...assignment, team: { ...assignment.team, logoUrl: null } }]} />);
    expect(screen.getByLabelText("Initiale de Paris FC")).toHaveTextContent("P");

    view.rerender(<PlayerAssignments assignments={[assignment]} />);
    fireEvent.error(screen.getByRole("img", { name: "Logo de Paris FC" }));
    expect(screen.getByLabelText("Initiale de Paris FC")).toHaveTextContent("P");
    expect(screen.queryByRole("img", { name: "Logo de Paris FC" })).not.toBeInTheDocument();
  });

  it("keeps date editing and cancellation available", async () => {
    const user = userEvent.setup();
    render(<PlayerAssignments assignments={[assignment]} playerId="player-id" canEdit />);

    await user.click(screen.getByRole("button", { name: /Modifier les dates/ }));
    expect(screen.getByLabelText(/Date de début/)).toHaveValue("2026-01-01");
    expect(screen.getByLabelText("Date de fin (incluse)")).toHaveValue("2026-06-30");
    await user.click(screen.getByRole("button", { name: "Annuler" }));
    expect(screen.queryByLabelText(/Date de début/)).not.toBeInTheDocument();
  });

  it("shows the empty state", () => {
    render(<PlayerAssignments assignments={[]} />);
    expect(screen.getByText("Aucune affectation.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});
