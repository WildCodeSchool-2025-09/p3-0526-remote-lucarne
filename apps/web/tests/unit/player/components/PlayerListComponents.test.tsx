import type { Player } from "@lucarne/shared";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import PlayerMobileCard from "../../../../src/features/player/components/PlayerMobileCard";
import PlayerTable from "../../../../src/features/player/components/PlayerTable";

const player: Player = {
  id: "player-1",
  firstName: "Ada",
  lastName: "Lovelace",
  nationality: "France",
  position: "Attaquante",
  birthday: null,
  pictureUrl: null,
  isActive: true,
  version: 1,
  createdAt: "2026-09-11T10:30:00.000Z",
  activeTeam: { id: "team-1", name: "Les Lionnes" },
  isSelectable: true,
};

function renderInRouter(element: React.ReactNode) {
  return render(<MemoryRouter>{element}</MemoryRouter>);
}

describe("Player list components", () => {
  it("renders an accessible mobile card with player details", () => {
    renderInRouter(<div role="list"><PlayerMobileCard canDelete={false} canEdit={false} onAction={() => undefined} player={player} /></div>);

    expect(screen.getByRole("listitem")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ada Lovelace" })).toHaveAttribute("href", "/dashboard/players/player-1");
    expect(screen.getByLabelText("Photo non disponible pour Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("Les Lionnes")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("renders table semantics and shared status markup", () => {
    renderInRouter(<PlayerTable canDelete={false} canEdit={false} onAction={() => undefined} players={[player]} />);

    expect(screen.getByRole("table", { name: "Liste des joueuses" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Joueuse" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ada Lovelace" })).toHaveAttribute("href", "/dashboard/players/player-1");
    expect(screen.getByText("Active")).toHaveClass("lucarne-status-badge--active");
  });
});
