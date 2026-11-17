import type { Team } from "@lucarne/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UpdateTeamForm } from "../../../src/features/team/components/UpdateTeamForm";

const team: Team = {
  id: "team-id",
  name: "Paris FC",
  logoUrl: "https://example.com/current.png",
  stadium: "Stade municipal",
  isActive: true,
  createdAt: "2026-09-11T10:00:00.000Z",
};
const logoPath = "/api/v1/uploads/photos/replacement.png";
const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json" },
});

function renderForm(overrides: Partial<Parameters<typeof UpdateTeamForm>[0]> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } });
  const props = { team, canEditStatus: false, onCancel: vi.fn(), onSuccess: vi.fn(), ...overrides };
  const view = render(<QueryClientProvider client={queryClient}><UpdateTeamForm {...props} /></QueryClientProvider>);

  return { ...view, queryClient, props };
}

describe("Team update logo integration", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("URL", Object.assign(class extends URL {}, {
      createObjectURL: vi.fn(() => "blob:logo-preview"),
      revokeObjectURL: vi.fn(),
    }));
  });
  afterEach(() => vi.unstubAllGlobals());

  it("preserves the existing logo when editing another field", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ...team, name: "Paris FC Féminines" }));
    const { props } = renderForm();
    expect(screen.getByRole("img", { name: "Logo de Paris FC" })).toHaveAttribute("src", team.logoUrl);
    expect(screen.queryByLabelText("URL du logo")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Nom/), { target: { value: "Paris FC Féminines" } });
    await userEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    await waitFor(() => expect(props.onSuccess).toHaveBeenCalledOnce());
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0]).toEqual(expect.stringMatching(/\/teams\/team-id$/));
    expect(fetchMock.mock.calls[0][1]?.method).toBe("PATCH");
    expect(JSON.parse(fetchMock.mock.calls[0][1]?.body as string)).toEqual({
      name: "Paris FC Féminines", logoUrl: team.logoUrl, stadium: team.stadium,
    });
  });

  it("uploads a replacement logo without requiring another field change", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ path: logoPath }, 201));
    const updated = { ...team, logoUrl: "https://example.com/replacement.png" };
    fetchMock.mockResolvedValueOnce(jsonResponse(updated));
    const { props } = renderForm();
    const user = userEvent.setup();
    const logo = new File(["image"], "replacement.png", { type: "image/png" });
    expect(screen.getByRole("button", { name: "Enregistrer" })).toBeDisabled();
    await user.upload(screen.getByLabelText("Fichier logo"), logo);
    expect(screen.getByRole("button", { name: "Enregistrer" })).toBeEnabled();
    expect(screen.getByRole("img", { name: "Aperçu du logo sélectionné" })).toHaveAttribute("src", "blob:logo-preview");
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));
    await waitFor(() => expect(props.onSuccess).toHaveBeenCalledWith(updated));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [uploadUrl, uploadRequest] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(uploadUrl).toMatch(/\/uploads\/photos$/);
    expect(uploadRequest.body).toBe(logo);
    const input = JSON.parse(fetchMock.mock.calls[1][1]?.body as string) as Record<string, unknown>;
    expect(input.logoUrl).toBe(new URL(logoPath, new URL(uploadUrl, window.location.origin).origin).href);
    expect(screen.getByRole("img", { name: "Logo de Paris FC" })).toHaveAttribute("src", updated.logoUrl);
    expect(screen.queryByRole("img", { name: "Aperçu du logo sélectionné" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enregistrer" })).toBeDisabled();
  });

  it("removes the existing logo only when saving", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ...team, logoUrl: null }));
    const { props } = renderForm();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Supprimer le logo actuel" }));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.queryByRole("img", { name: "Logo de Paris FC" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));
    await waitFor(() => expect(props.onSuccess).toHaveBeenCalledOnce());
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(JSON.parse(fetchMock.mock.calls[0][1]?.body as string)).toMatchObject({ logoUrl: null });
  });

  it("restores the current logo when a replacement is withdrawn", async () => {
    renderForm();
    const user = userEvent.setup();
    await user.upload(screen.getByLabelText("Fichier logo"), new File(["image"], "replacement.png", { type: "image/png" }));
    await user.click(screen.getByRole("button", { name: "Retirer le logo" }));
    expect(screen.getByRole("img", { name: "Logo de Paris FC" })).toHaveAttribute("src", team.logoUrl);
    expect(screen.getByRole("button", { name: "Enregistrer" })).toBeDisabled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("retains input and the selected logo after upload fails and allows retry", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Network failure"));
    fetchMock.mockResolvedValueOnce(jsonResponse({ path: logoPath }, 201));
    fetchMock.mockResolvedValueOnce(jsonResponse(team));
    const { props } = renderForm();
    const user = userEvent.setup();
    fireEvent.change(screen.getByLabelText(/Nom/), { target: { value: "Paris FC Féminines" } });
    await user.upload(screen.getByLabelText("Fichier logo"), new File(["image"], "replacement.png", { type: "image/png" }));
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Impossible d’envoyer le logo");
    expect(screen.getByLabelText(/Nom/)).toHaveValue("Paris FC Féminines");
    expect(screen.getByRole("img", { name: "Aperçu du logo sélectionné" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledOnce();
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));
    await waitFor(() => expect(props.onSuccess).toHaveBeenCalledOnce());
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("reuses the uploaded logo after saving fails", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ path: logoPath }, 201));
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: { code: "INTERNAL_SERVER_ERROR", message: "Failure" } }, 500));
    fetchMock.mockResolvedValueOnce(jsonResponse(team));
    const { props } = renderForm();
    const user = userEvent.setup();
    await user.upload(screen.getByLabelText("Fichier logo"), new File(["image"], "replacement.png", { type: "image/png" }));
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Impossible de modifier l’équipe");
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));
    await waitFor(() => expect(props.onSuccess).toHaveBeenCalledOnce());
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls.filter(([url]) => typeof url === "string" && url.endsWith("/uploads/photos"))).toHaveLength(1);
    expect(JSON.parse(fetchMock.mock.calls[2][1]?.body as string)).toEqual(JSON.parse(fetchMock.mock.calls[1][1]?.body as string));
  });

  it("blocks edits, cancellation and duplicate submissions during upload", async () => {
    let resolveUpload: (response: Response) => void = () => undefined;
    fetchMock.mockReturnValueOnce(new Promise<Response>((resolve) => { resolveUpload = resolve; }));
    fetchMock.mockResolvedValueOnce(jsonResponse(team));
    const { props } = renderForm({ canEditStatus: true });
    const user = userEvent.setup();
    await user.upload(screen.getByLabelText("Fichier logo"), new File(["image"], "replacement.png", { type: "image/png" }));
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(screen.getByRole("button", { name: "Enregistrement…" })).toBeDisabled();
    expect(screen.getByLabelText(/Nom/)).toBeDisabled();
    expect(screen.getByLabelText("Stade")).toBeDisabled();
    expect(screen.getByLabelText("Fichier logo")).toBeDisabled();
    expect(screen.getByLabelText("Équipe active")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Annuler" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Enregistrement…" }));
    expect(fetchMock).toHaveBeenCalledOnce();
    resolveUpload(jsonResponse({ path: logoPath }, 201));
    await waitFor(() => expect(props.onSuccess).toHaveBeenCalledOnce());
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("keeps status editing restricted by canEditStatus", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ...team, isActive: false }));
    const { props } = renderForm({ canEditStatus: true });
    const user = userEvent.setup();
    await user.click(screen.getByLabelText("Équipe active"));
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));
    await waitFor(() => expect(props.onSuccess).toHaveBeenCalledOnce());
    expect(JSON.parse(fetchMock.mock.calls[0][1]?.body as string)).toMatchObject({ isActive: false, logoUrl: team.logoUrl });
  });

  it("discards a selected replacement when switching teams", async () => {
    const view = renderForm();
    await userEvent.upload(screen.getByLabelText("Fichier logo"), new File(["image"], "replacement.png", { type: "image/png" }));
    const anotherTeam = { ...team, id: "another-team-id", name: "Lyon", logoUrl: "https://example.com/lyon.png" };
    view.rerender(<QueryClientProvider client={view.queryClient}><UpdateTeamForm {...view.props} team={anotherTeam} /></QueryClientProvider>);
    expect(screen.getByRole("img", { name: "Logo de Lyon" })).toHaveAttribute("src", anotherTeam.logoUrl);
    expect(screen.queryByRole("img", { name: "Aperçu du logo sélectionné" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enregistrer" })).toBeDisabled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
