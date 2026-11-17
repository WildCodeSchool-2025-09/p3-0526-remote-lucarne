import { PHOTO_MAX_BYTES } from "@lucarne/shared";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import type * as ReactRouter from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CreatePlayerPage from "../../../../src/features/player/pages/CreatePlayerPage";

const create = vi.hoisted(() => vi.fn());
const upload = vi.hoisted(() => vi.fn());
const navigate = vi.hoisted(() => vi.fn());
const revokePreview = vi.hoisted(() => vi.fn());
vi.mock("../../../../src/hooks/usePlayer", () => ({ useCreatePlayer: () => ({ mutateAsync: create, isPending: false }) }));
vi.mock("../../../../src/hooks/useTeamList", () => ({ useTeamList: () => ({ data: { data: [{ id: "00000000-0000-4000-8000-000000000101", name: "Paris FC" }], pagination: { totalPages: 1 } }, isPending: false, isError: false }) }));
vi.mock("../../../../src/services/uploadPhoto.service", () => ({ uploadPhoto: upload }));
vi.mock("react-router", async (original) => ({ ...await original<typeof ReactRouter>(), useNavigate: () => navigate }));

function renderPage() {
  render(<MemoryRouter><CreatePlayerPage /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText(/Prénom/), { target: { value: "Alex" } });
  fireEvent.change(screen.getByLabelText(/Nom/), { target: { value: "Martin" } });
}

describe("CreatePlayerPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    create.mockReset().mockResolvedValue({ id: "player-id" });
    upload.mockReset().mockResolvedValue("http://localhost:3310/api/v1/uploads/photos/photo.png");
    vi.stubGlobal("URL", Object.assign(class extends URL {}, { createObjectURL: vi.fn(() => "blob:preview"), revokeObjectURL: revokePreview }));
  });
  afterEach(() => vi.unstubAllGlobals());

  it("separates information from optional assignments and creates without a photo", async () => {
    renderPage();
    expect(within(screen.getByRole("group", { name: "Informations de la joueuse" })).getByLabelText(/Prénom/)).toBeInTheDocument();
    expect(within(screen.getByRole("group", { name: "Affectations" })).getByLabelText("Équipe")).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "Créer la joueuse" }));
    expect(create).toHaveBeenCalledWith({ firstName: "Alex", lastName: "Martin", nationality: null, position: null, birthday: null, pictureUrl: null });
    expect(upload).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith("/dashboard/players/player-id", { state: { successMessage: "La joueuse a été créée avec succès." } });
  });

  it("uploads a selected photo and sends its permanent URL with the assignment", async () => {
    renderPage();
    const user = userEvent.setup();
    const file = new File(["image"], "photo.png", { type: "image/png" });
    await user.upload(screen.getByLabelText("Fichier photo"), file);
    expect(screen.getByRole("img", { name: "Aperçu de la photo sélectionnée" })).toHaveAttribute("src", "blob:preview");
    await user.selectOptions(screen.getByLabelText("Équipe"), "00000000-0000-4000-8000-000000000101");
    fireEvent.change(screen.getByLabelText("Date de début"), { target: { value: "2026-10-06" } });
    await user.click(screen.getByRole("button", { name: "Créer la joueuse" }));
    expect(upload).toHaveBeenCalledWith(file);
    expect(create).toHaveBeenCalledWith({ firstName: "Alex", lastName: "Martin", nationality: null, position: null, birthday: null, pictureUrl: "http://localhost:3310/api/v1/uploads/photos/photo.png", teamId: "00000000-0000-4000-8000-000000000101", joinedAt: "2026-10-06", leftAt: null, shirtNumber: null });
  });

  it("rejects unsupported and oversized files before upload", () => {
    renderPage();
    fireEvent.change(screen.getByLabelText("Fichier photo"), { target: { files: [new File(["svg"], "photo.svg", { type: "image/svg+xml" })] } });
    expect(screen.getByRole("alert")).toHaveTextContent("JPEG, PNG ou WebP");
    fireEvent.change(screen.getByLabelText("Fichier photo"), { target: { files: [new File([new Uint8Array(PHOTO_MAX_BYTES + 1)], "large.png", { type: "image/png" })] } });
    expect(screen.getByRole("alert")).toHaveTextContent("5 Mo");
    expect(upload).not.toHaveBeenCalled();
  });

  it("can remove a selected file and create without a photo", async () => {
    renderPage();
    const user = userEvent.setup();
    await user.upload(screen.getByLabelText("Fichier photo"), new File(["image"], "photo.png", { type: "image/png" }));
    await user.click(screen.getByRole("button", { name: "Retirer la photo" }));
    expect(screen.queryByRole("img", { name: "Aperçu de la photo sélectionnée" })).not.toBeInTheDocument();
    expect(revokePreview).toHaveBeenCalledWith("blob:preview");
    await user.click(screen.getByRole("button", { name: "Créer la joueuse" }));
    expect(upload).not.toHaveBeenCalled();
    expect(create).toHaveBeenCalledWith({ firstName: "Alex", lastName: "Martin", nationality: null, position: null, birthday: null, pictureUrl: null });
  });

  it("retains the input after an upload failure and can retry", async () => {
    renderPage();
    const user = userEvent.setup();
    upload.mockRejectedValueOnce(new Error("Network failure"));
    await user.upload(screen.getByLabelText("Fichier photo"), new File(["image"], "photo.png", { type: "image/png" }));
    await user.click(screen.getByRole("button", { name: "Créer la joueuse" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("vos informations et votre photo sont conservées");
    expect(screen.getByLabelText(/Prénom/)).toHaveValue("Alex");
    expect(create).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Créer la joueuse" }));
    expect(create).toHaveBeenCalledOnce();
  });

  it("reuses the uploaded photo if creating the player fails", async () => {
    renderPage();
    const user = userEvent.setup();
    create.mockRejectedValueOnce(new Error("Network failure"));
    await user.upload(screen.getByLabelText("Fichier photo"), new File(["image"], "photo.png", { type: "image/png" }));
    await user.click(screen.getByRole("button", { name: "Créer la joueuse" }));
    await screen.findByRole("alert");
    await user.click(screen.getByRole("button", { name: "Créer la joueuse" }));
    expect(upload).toHaveBeenCalledOnce();
    expect(create).toHaveBeenCalledTimes(2);
  });
});
