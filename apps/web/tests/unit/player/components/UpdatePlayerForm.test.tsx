import type { Player } from "@lucarne/shared";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UpdatePlayerForm } from "../../../../src/features/player/components/UpdatePlayerForm";

const mutate = vi.fn();
const resetMutation = vi.fn();
const useUpdatePlayerMock = vi.hoisted(() => vi.fn());
const upload = vi.hoisted(() => vi.fn());

vi.mock("../../../../src/hooks/usePlayer", () => ({ useUpdatePlayer: useUpdatePlayerMock }));
vi.mock("../../../../src/services/uploadPhoto.service", () => ({ uploadPhoto: upload }));

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
  beforeEach(() => {
    vi.clearAllMocks();
    upload.mockReset().mockResolvedValue("https://example.com/uploaded.png");
    vi.stubGlobal("URL", Object.assign(class extends URL {}, { createObjectURL: vi.fn(() => "blob:preview"), revokeObjectURL: vi.fn() }));
  });
  afterEach(() => vi.unstubAllGlobals());
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

  it("keeps unsaved information when an assignment changes the player version", async () => {
    const view = renderForm();
    fireEvent.change(screen.getByLabelText(/Pr.nom/), { target: { value: "Alexandre" } });
    view.rerender(<UpdatePlayerForm player={{ ...player, version: 4 }} onCancel={vi.fn()} onReload={vi.fn()} onSuccess={vi.fn()} />);
    expect(screen.getByLabelText(/Pr.nom/)).toHaveValue("Alexandre");
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    await waitFor(() => expect(mutate).toHaveBeenCalled());
    expect(mutate.mock.calls[0][0]).toEqual({ id: player.id, input: { firstName: "Alexandre", lastName: "Martin", nationality: null, position: "Forward", birthday: null, pictureUrl: null, version: 4 } });
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

  it("uploads a replacement photo without requiring another field change", async () => {
    const onSuccess = vi.fn();
    renderForm({ player: { ...player, pictureUrl: "https://example.com/current.jpg" }, onSuccess });
    expect(screen.getByRole("img", { name: "Photo de Alex Martin" })).toHaveAttribute("src", "https://example.com/current.jpg");
    const file = new File(["photo"], "replacement.png", { type: "image/png" });
    const user = userEvent.setup();
    await user.upload(screen.getByLabelText("Fichier photo"), file);
    expect(screen.getByRole("button", { name: "Enregistrer" })).toBeEnabled();
    expect(screen.getByRole("img", { name: "Aperçu de la photo sélectionnée" })).toHaveAttribute("src", "blob:preview");
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(upload).toHaveBeenCalledWith(file);
    await waitFor(() => expect(mutate).toHaveBeenCalled());
    expect(mutate.mock.calls[0][0]).toEqual({ id: player.id, input: { firstName: "Alex", lastName: "Martin", nationality: null, position: "Forward", birthday: null, pictureUrl: "https://example.com/uploaded.png", version: 3 } });
    const options = mutate.mock.calls[0][1] as { onSuccess: (value: Player) => void };
    act(() => options.onSuccess({ ...player, pictureUrl: "https://example.com/uploaded.png", version: 4 }));
    expect(screen.getByRole("img", { name: "Photo de Alex Martin" })).toHaveAttribute("src", "https://example.com/uploaded.png");
    expect(screen.getByRole("button", { name: "Enregistrer" })).toBeDisabled();
    expect(onSuccess).toHaveBeenCalledOnce();
  });

  it("retains a failed upload and allows retry", async () => {
    renderForm();
    upload.mockRejectedValueOnce(new Error("Upload failure"));
    const user = userEvent.setup();
    await user.upload(screen.getByLabelText("Fichier photo"), new File(["photo"], "photo.png", { type: "image/png" }));
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Impossible d’envoyer la photo");
    expect(screen.getByRole("img", { name: "Aperçu de la photo sélectionnée" })).toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));
    await waitFor(() => expect(mutate).toHaveBeenCalledOnce());
  });

  it("reuses the uploaded photo after a failed save", async () => {
    renderForm();
    const user = userEvent.setup();
    await user.upload(screen.getByLabelText("Fichier photo"), new File(["photo"], "photo.png", { type: "image/png" }));
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));
    await waitFor(() => expect(mutate).toHaveBeenCalledOnce());
    const options = mutate.mock.calls[0][1] as { onError: () => void };
    act(() => options.onError());
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));
    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(2));
    expect(upload).toHaveBeenCalledOnce();
  });

  it("clears the existing photo only when saving", async () => {
    renderForm({ player: { ...player, pictureUrl: "https://example.com/current.jpg" } });
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Supprimer la photo actuelle" }));
    expect(mutate).not.toHaveBeenCalled();
    expect(screen.queryByRole("img", { name: "Photo de Alex Martin" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));
    await waitFor(() => expect(mutate).toHaveBeenCalledOnce());
    expect(mutate.mock.calls[0][0]).toEqual({ id: player.id, input: { firstName: "Alex", lastName: "Martin", nationality: null, position: "Forward", birthday: null, pictureUrl: null, version: 3 } });
  });

  it("cancels a replacement photo without uploading", async () => {
    const onCancel = vi.fn();
    renderForm({ onCancel });
    const user = userEvent.setup();
    await user.upload(screen.getByLabelText("Fichier photo"), new File(["photo"], "photo.png", { type: "image/png" }));
    await user.click(screen.getByRole("button", { name: "Annuler" }));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(upload).not.toHaveBeenCalled();
    expect(mutate).not.toHaveBeenCalled();
  });
});
