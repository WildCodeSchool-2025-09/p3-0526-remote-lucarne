import type { PlayerDetail } from "@lucarne/shared";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PlayerDetailPage from "../../../../src/features/player/pages/PlayerDetailPage";
import { HttpError } from "../../../../src/lib/httpClient";

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
  PLAYER_WRITE_ROLES: ["ADMIN", "MODERATOR", "EDITOR"],
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

  it("shows the existing player photo", () => {
    usePlayerDetailMock.mockReturnValue({ data: { ...player, pictureUrl: "/player-photo.jpg" }, isError: false, isPending: false });
    renderPage();

    expect(screen.getByRole("img", { name: "Photo de Alex Martin" })).toHaveAttribute("src", "/player-photo.jpg");
  });

  it("explains protected history when deletion is refused", async () => {
    const failure = new HttpError(new Response(null, { status: 409 }), { error: { code: "PROTECTED_DEPENDENCIES", message: "Suppression bloquée" } });
    useDeletePlayerMock.mockReturnValue({ ...mutation(), error: failure, isError: true });
    renderPage();

    await userEvent.setup().click(screen.getByRole("button", { name: "Supprimer" }));

    expect(within(screen.getByRole("dialog")).getByText(/Son historique de matchs doit être conservé. Vous pouvez la désactiver./)).toBeInTheDocument();
  });

  it("shows a business error returned by the status action", async () => {
    const failure = new HttpError(new Response(null, { status: 400 }), { error: { code: "ASSIGNMENT_INVALID_PERIOD", message: "La date de fin doit être postérieure à la date de début." } });
    useDeactivatePlayerMock.mockReturnValue({ ...mutation(), error: failure, isError: true });
    renderPage();

    await userEvent.setup().click(screen.getByRole("button", { name: "Désactiver" }));

    expect(within(screen.getByRole("dialog")).getByText("La date de fin doit être postérieure à la date de début.")).toBeInTheDocument();
  });

  it("shows a placeholder when the photo is absent", () => {
    renderPage();

    expect(screen.getByLabelText("Photo non disponible pour Alex Martin")).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "Photo de Alex Martin" })).not.toBeInTheDocument();
  });

  it("replaces a failed photo and retries when its URL changes", () => {
    usePlayerDetailMock.mockReturnValue({ data: { ...player, pictureUrl: "/failed-photo.jpg" }, isError: false, isPending: false });
    const view = renderPage();

    fireEvent.error(screen.getByRole("img", { name: "Photo de Alex Martin" }));

    expect(screen.getByLabelText("Photo non disponible pour Alex Martin")).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "Photo de Alex Martin" })).not.toBeInTheDocument();

    usePlayerDetailMock.mockReturnValue({ data: { ...player, pictureUrl: "/updated-photo.jpg" }, isError: false, isPending: false });
    view.rerender(<MemoryRouter><PlayerDetailPage /></MemoryRouter>);

    expect(screen.getByRole("img", { name: "Photo de Alex Martin" })).toHaveAttribute("src", "/updated-photo.jpg");
  });

  it("explains that deactivation preserves all assignment dates", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Désactiver" }));

    expect(screen.getByRole("heading", { name: "Désactiver cette joueuse ?" })).toBeInTheDocument();
    expect(screen.getByText("La joueuse deviendra inactive. Toutes ses affectations et leurs dates seront conservées.")).toBeInTheDocument();
    expect(within(screen.getByRole("dialog")).getByRole("button", { name: "Désactiver" })).toBeInTheDocument();
  });

  it("uses explicit activation and deletion confirmations", async () => {
    const user = userEvent.setup();
    usePlayerDetailMock.mockReturnValue({ data: { ...player, isActive: false }, isError: false, isPending: false });
    renderPage();

    await user.click(screen.getByRole("button", { name: "Activer" }));
    expect(screen.getByRole("heading", { name: "Activer cette joueuse ?" })).toBeInTheDocument();
    expect(screen.getByText("La joueuse sera réactivée. Aucune affectation ne sera créée.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Annuler" }));
    await user.click(screen.getByRole("button", { name: "Supprimer" }));

    expect(screen.getByRole("heading", { name: "Supprimer cette joueuse ?" })).toBeInTheDocument();
    expect(screen.getByText("Cette suppression est définitive. Toutes les affectations de la joueuse et leurs dates seront également supprimées.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Supprimer définitivement" })).toBeInTheDocument();
  });
});
