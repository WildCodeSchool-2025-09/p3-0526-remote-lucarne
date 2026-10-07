import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { RosterTable } from "../../../../src/features/team/components/TeamRoster";

const members = [
  { id: "a", assignmentId: "1", lastName: "Albert", firstName: "Zoé", position: "Milieu", pictureUrl: "/photos/zoe.jpg", shirtNumber: 8 },
  { id: "b", assignmentId: "2", lastName: "Bernard", firstName: "Anne", position: "Attaquante", pictureUrl: null, shirtNumber: null },
];
describe("team roster", () => {
  it("sorts names and positions in both directions and links to canonical player details", async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><RosterTable title="Effectif" resource="players" members={members} /></MemoryRouter>);
    const names = () => screen.getAllByRole("row").slice(1).map((row) => within(row).getByRole("link").textContent);
    expect(names()).toEqual(["Albert Zoé", "Bernard Anne"]);
    await user.click(screen.getByRole("button", { name: /Nom/ }));
    expect(names()).toEqual(["Bernard Anne", "Albert Zoé"]);
    await user.click(screen.getByRole("button", { name: /Poste/ }));
    expect(names()).toEqual(["Bernard Anne", "Albert Zoé"]);
    await user.click(screen.getByRole("button", { name: /Poste/ }));
    expect(names()).toEqual(["Albert Zoé", "Bernard Anne"]);
    expect(screen.getByRole("link", { name: "Albert Zoé" })).toHaveAttribute("href", "/dashboard/players/a");
  });
  it("shows player photos, positions and assignment shirt numbers with missing-data fallbacks", () => {
    render(<MemoryRouter><RosterTable title="Effectif" resource="players" members={members} /></MemoryRouter>);
    expect(screen.getByRole("columnheader", { name: "Numéro" })).toBeInTheDocument();
    const rows = screen.getAllByRole("row").slice(1);
    expect(within(rows[0]).getByRole("img", { name: "Photo de Albert Zoé" })).toHaveAttribute("src", "/photos/zoe.jpg");
    expect(within(rows[0]).getAllByRole("cell").map((cell) => cell.textContent)).toEqual(["Albert Zoé", "Milieu", "8"]);
    expect(within(rows[1]).getByLabelText("Photo non disponible pour Bernard Anne")).toBeInTheDocument();
    expect(within(rows[1]).getByRole("cell", { name: "Non renseigné" })).toBeInTheDocument();
  });
  it("shows staff photos and positions without a shirt-number column", () => {
    render(<MemoryRouter><RosterTable title="Staff" resource="staff-members" members={[{ id: "staff", assignmentId: "staff-assignment", lastName: "Martin", firstName: "Marie", position: "Coach", pictureUrl: "/photos/coach.jpg" }]} /></MemoryRouter>);
    expect(screen.getByRole("img", { name: "Photo de Martin Marie" })).toHaveAttribute("src", "/photos/coach.jpg");
    expect(screen.getByRole("cell", { name: "Coach" })).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Numéro" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Martin Marie" })).toHaveAttribute("href", "/dashboard/staff-members/staff");
  });
  it("shows an explicit empty state for staff", () => {
    render(<MemoryRouter><RosterTable title="Staff" resource="staff-members" members={[]} /></MemoryRouter>);
    expect(screen.getByText("Aucun membre du staff dans cette équipe à cette date.")).toBeInTheDocument();
  });
});
