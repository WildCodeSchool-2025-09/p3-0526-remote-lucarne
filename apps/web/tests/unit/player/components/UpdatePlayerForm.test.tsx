import type { Player } from "@lucarne/shared";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { UpdatePlayerForm } from "../../../../src/features/player/components/UpdatePlayerForm";

const mutate = vi.fn();
const resetMutation = vi.fn();
const useUpdatePlayerMock = vi.hoisted(() => vi.fn());

vi.mock("../../../../src/hooks/usePlayer", () => ({ useUpdatePlayer: useUpdatePlayerMock }));

const player: Player = {
  id: "player-id", firstName: "Alex", lastName: "Martin", nationality: null,
  position: "Forward", birthday: null, pictureUrl: null, isActive: true,
  version: 3, createdAt: "2026-09-11T10:00:00.000Z", activeTeam: null, isSelectable: false,
};

const updated: Player = { ...player, firstName: "Alexandre", version: 4 };

function renderForm(overrides: Partial<Parameters<typeof UpdatePlayerForm>[0]> = {}) {
  useUpdatePlayerMock.mockReturnValue({ error: null, isError: false, isPending: false, mutate, reset: resetMutation });
  return render(<UpdatePlayerForm player={player} onCancel={vi.fn()} onReload={vi.fn()} onSuccess={vi.fn()} {...overrides} />);
}

describe("UpdatePlayerForm", () => {
  it("uses the returned version for a second save and resets dirty state", async () => {
    renderForm();
    fireEvent.change(screen.getByLabelText(/Pr.nom/), { target: { value: "Alexandre" } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    await waitFor(() => expect(mutate).toHaveBeenCalledWith(
      { id: player.id, input: { firstName: "Alexandre", lastName: "Martin", nationality: null, position: "Forward", birthday: null, pictureUrl: null, version: 3 } },
      expect.any(Object),
    ));
    const firstOptions = (mutate.mock.calls[0] as unknown as [unknown, { onSuccess: (value: Player) => void }])[1];
    act(() => firstOptions.onSuccess(updated));

    expect(screen.getByDisplayValue("Alexandre")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enregistrer" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Nom/), { target: { value: "Durand" } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    await waitFor(() => expect(mutate).toHaveBeenLastCalledWith(
      { id: player.id, input: { firstName: "Alexandre", lastName: "Durand", nationality: null, position: "Forward", birthday: null, pictureUrl: null, version: 4 } },
      expect.any(Object),
    ));
  });

  it("replaces values when the player changes", () => {
    const { rerender } = renderForm();
    const anotherPlayer = { ...player, id: "another-player-id", firstName: "Sam", version: 8 };

    rerender(<UpdatePlayerForm player={anotherPlayer} onCancel={vi.fn()} onReload={vi.fn()} onSuccess={vi.fn()} />);

    expect(screen.getByDisplayValue("Sam")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enregistrer" })).toBeDisabled();
  });

  it("offers a reload after a version conflict", () => {
    const onReload = vi.fn();
    useUpdatePlayerMock.mockReturnValue({ error: Object.assign(new Error("Conflict"), { code: "RESOURCE_VERSION_CONFLICT" }), isError: true, isPending: false, mutate, reset: resetMutation });
    render(<UpdatePlayerForm player={player} onCancel={vi.fn()} onReload={onReload} onSuccess={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/Pr.nom/), { target: { value: "Alexandre" } });
    expect(screen.getByDisplayValue("Alexandre")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Recharger la fiche" }));
    expect(resetMutation).toHaveBeenCalledOnce();
    expect(onReload).toHaveBeenCalledOnce();
  });
});
