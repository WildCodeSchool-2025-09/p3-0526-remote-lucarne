import type { PlayerDetail } from "@lucarne/shared";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PlayerDetailPage from "../../../../src/features/player/pages/PlayerDetailPage";

const usePlayerDetailMock = vi.hoisted(() => vi.fn());
const useActivatePlayerMock = vi.hoisted(() => vi.fn());
const useDeactivatePlayerMock = vi.hoisted(() => vi.fn());
const useDeletePlayerMock = vi.hoisted(() => vi.fn());
const getCurrentAppRoleMock = vi.hoisted(() => vi.fn());
const hasRoleMock = vi.hoisted(() => vi.fn());

vi.mock("../../../../src/hooks/usePlayer", () => ({
  useActivatePlayer: useActivatePlayerMock,
  useDeactivatePlayer: useDeactivatePlayerMock,
  useDeletePlayer: useDeletePlayerMock,
  usePlayerDetail: usePlayerDetailMock,
}));
vi.mock("../../../../src/auth/authRole", () => ({
  APP_ROLES: { ADMIN: "ADMIN", EDITOR: "EDITOR", MODERATOR: "MODERATOR" },
  getCurrentAppRole: getCurrentAppRoleMock,
  hasRole: hasRoleMock,
}));

const player: PlayerDetail = {
  activeTeam: null,
  assignments: [],
  birthday: null,
  createdAt: "2026-09-14T10:00:00.000Z",
  firstName: "Alex",
  id: "player-id",
  isActive: true,
  isSelectable: false,
  lastName: "Martin",
  nationality: null,
  pictureUrl: null,
  position: null,
  version: 0,
};

const mutation = () => ({ error: null, isError: false, isPending: false, mutateAsync: vi.fn(), reset: vi.fn() });

function renderPage() {
  return render(<MemoryRouter><PlayerDetailPage /></MemoryRouter>);
}

describe("PlayerDetailPage confirmations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentAppRoleMock.mockReturnValue("ADMIN");
    hasRoleMock.mockReturnValue(true);
    usePlayerDetailMock.mockReturnValue({ data: player, isError: false, isPending: false });
    useActivatePlayerMock.mockReturnValue(mutation());
    useDeactivatePlayerMock.mockReturnValue(mutation());
    useDeletePlayerMock.mockReturnValue(mutation());
  });

  it("explains that deactivation retains planned and historical assignments", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Désactiver" }));

    expect(screen.getByRole("heading", { name: "Désactiver ce joueur ?" })).toBeInTheDocument();
    expect(screen.getByText("L’affectation courante sera clôturée. Les affectations planifiées et l’historique seront conservés.")).toBeInTheDocument();
    expect(within(screen.getByRole("dialog")).getByRole("button", { name: "Désactiver" })).toBeInTheDocument();
  });

  it("uses explicit activation and deletion confirmations", async () => {
    const user = userEvent.setup();
    usePlayerDetailMock.mockReturnValue({ data: { ...player, isActive: false }, isError: false, isPending: false });
    renderPage();

    await user.click(screen.getByRole("button", { name: "Activer" }));
    expect(screen.getByRole("heading", { name: "Activer ce joueur ?" })).toBeInTheDocument();
    expect(screen.getByText("Le joueur sera réactivé. Aucune affectation ne sera créée.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Annuler" }));
    await user.click(screen.getByRole("button", { name: "Supprimer" }));

    expect(screen.getByRole("heading", { name: "Supprimer ce joueur ?" })).toBeInTheDocument();
    expect(screen.getByText("Cette suppression est définitive.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Supprimer définitivement" })).toBeInTheDocument();
  });
});
