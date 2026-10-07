import type { PlayerDetail } from "@lucarne/shared";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EditPlayerPage from "../../../../src/features/player/pages/EditPlayerPage";

const detail = vi.hoisted(() => vi.fn());
const save = vi.hoisted(() => vi.fn());
vi.mock("../../../../src/hooks/usePlayer", () => ({
  usePlayerDetail: detail,
  useUpdatePlayer: () => ({ mutate: save, isPending: false, isError: false, reset: vi.fn() }),
  useCreatePlayerAssignment: () => ({ mutate: vi.fn(), isPending: false, isError: false }),
  useUpdatePlayerAssignment: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock("../../../../src/hooks/useTeamList", () => ({ useTeamList: () => ({ data: { data: [], pagination: { totalPages: 1 } }, isPending: false }) }));
const player: PlayerDetail = {
  id: "player-id", firstName: "Alex", lastName: "Martin", nationality: null, position: null,
  birthday: null, pictureUrl: null, isActive: true, isSelectable: true, activeTeam: { id: "team-id", name: "Paris FC" }, version: 3, createdAt: "2026-10-01T00:00:00Z",
  assignments: [{ id: "assignment-id", team: { id: "team-id", name: "Paris FC", logoUrl: null }, joinedAt: "2026-10-01", leftAt: null, shirtNumber: null, state: "CURRENT" }],
};

function renderPage() {
  return render(<MemoryRouter initialEntries={["/dashboard/players/player-id/edit"]}><Routes>
    <Route path="/dashboard/players/:playerId/edit" element={<EditPlayerPage />} />
    <Route path="/dashboard/players/:playerId" element={<p>Fiche de la joueuse</p>} />
  </Routes></MemoryRouter>);
}

describe("EditPlayerPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    detail.mockReturnValue({ data: player, isPending: false, isError: false, refetch: vi.fn() });
  });

  it("separates information, upload and assignments without nesting forms", async () => {
    const view = renderPage();
    expect(within(screen.getByRole("group", { name: "Informations de la joueuse" })).getByRole("button", { name: "Parcourir…" })).toBeInTheDocument();
    const assignments = screen.getByRole("region", { name: "Affectations" });
    expect(within(assignments).getByText("Paris FC")).toBeInTheDocument();
    await userEvent.setup().click(within(assignments).getByRole("button", { name: "Ajouter une affectation" }));
    expect(within(assignments).getByLabelText("Équipe *")).toBeInTheDocument();
    expect(view.container.querySelector("form form")).toBeNull();
    await userEvent.setup().click(within(assignments).getByRole("button", { name: "Annuler" }));
    expect(within(assignments).getByRole("button", { name: "Ajouter une affectation" })).toBeInTheDocument();
  });

  it("keeps cancellation directed to the canonical player detail", async () => {
    renderPage();
    await userEvent.setup().click(screen.getByRole("button", { name: "Annuler" }));
    expect(screen.getByText("Fiche de la joueuse")).toBeInTheDocument();
  });
});
