import type { League } from "@lucarne/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CreateLeagueForm } from "../../../src/features/league/components/CreateLeagueForm";
import { UpdateLeagueForm } from "../../../src/features/league/components/UpdateLeagueForm";

const league: League = {
  id: "league-id", name: "Ligue Nationale", country: "France",
  logoUrl: "https://example.com/current.png", isActive: true, version: 3,
  createdAt: "2026-09-11T10:00:00.000Z",
};
const logoPath = "/api/v1/uploads/photos/league-logo.png";
const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "content-type": "application/json" },
});
const newLogo = () => new File(["image"], "logo.png", { type: "image/png" });

function renderCreation() {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } });
  const onSuccess = vi.fn();
  render(<QueryClientProvider client={queryClient}><CreateLeagueForm onSuccess={onSuccess} /></QueryClientProvider>);
  fireEvent.change(screen.getByLabelText("Nom *"), { target: { value: "Ligue Nationale" } });
  fireEvent.change(screen.getByLabelText("Pays *"), { target: { value: "France" } });

  return { onSuccess };
}

function renderUpdate() {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } });
  const props = { league, canEditStatus: false, onCancel: vi.fn(), onReload: vi.fn(), onSuccess: vi.fn() };
  const view = render(<QueryClientProvider client={queryClient}><UpdateLeagueForm {...props} /></QueryClientProvider>);

  return { ...view, queryClient, props };
}

describe("League logo frontend integration", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("URL", Object.assign(class extends URL {}, {
      createObjectURL: vi.fn(() => "blob:logo-preview"), revokeObjectURL: vi.fn(),
    }));
  });
  afterEach(() => vi.unstubAllGlobals());

  it("uploads a logo before creating the league", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ path: logoPath }, 201));
    fetchMock.mockResolvedValueOnce(jsonResponse(league, 201));
    const { onSuccess } = renderCreation();
    const user = userEvent.setup();
    const file = newLogo();
    await user.upload(screen.getByLabelText("Fichier logo"), file);
    expect(screen.getByRole("img", { name: "Aperçu du logo sélectionné" })).toHaveAttribute("src", "blob:logo-preview");
    await user.click(screen.getByRole("button", { name: "Créer la ligue" }));
    await waitFor(() => expect(onSuccess.mock.calls[0]?.[0]).toEqual(league));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [uploadUrl, uploadRequest] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(uploadUrl).toMatch(/\/uploads\/photos$/);
    expect(uploadRequest.body).toBe(file);
    expect(fetchMock.mock.calls[1][0]).toEqual(expect.stringMatching(/\/leagues$/));
    expect(JSON.parse(fetchMock.mock.calls[1][1]?.body as string)).toEqual({
      name: league.name, country: league.country, isActive: false,
      logoUrl: new URL(logoPath, new URL(uploadUrl, window.location.origin).origin).href,
    });
  });

  it("reuses the uploaded logo after creating the league fails", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ path: logoPath }, 201));
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: { code: "RESOURCE_ALREADY_EXISTS", message: "Duplicate" } }, 409));
    fetchMock.mockResolvedValueOnce(jsonResponse(league, 201));
    const { onSuccess } = renderCreation();
    const user = userEvent.setup();
    await user.upload(screen.getByLabelText("Fichier logo"), newLogo());
    await user.click(screen.getByRole("button", { name: "Créer la ligue" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Une ligue avec ce nom existe déjà");
    expect(screen.getByLabelText("Nom *")).toHaveValue(league.name);
    await user.click(screen.getByRole("button", { name: "Créer la ligue" }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls.filter(([url]) => typeof url === "string" && url.endsWith("/uploads/photos"))).toHaveLength(1);
    expect(JSON.parse(fetchMock.mock.calls[2][1]?.body as string)).toEqual(JSON.parse(fetchMock.mock.calls[1][1]?.body as string));
  });

  it("keeps the selected logo after an upload failure during creation", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Network failure"));
    fetchMock.mockResolvedValueOnce(jsonResponse({ path: logoPath }, 201));
    fetchMock.mockResolvedValueOnce(jsonResponse(league, 201));
    const { onSuccess } = renderCreation();
    const user = userEvent.setup();
    await user.upload(screen.getByLabelText("Fichier logo"), newLogo());
    await user.click(screen.getByRole("button", { name: "Créer la ligue" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Impossible d’envoyer le logo");
    expect(screen.getByRole("img", { name: "Aperçu du logo sélectionné" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledOnce();
    await user.click(screen.getByRole("button", { name: "Créer la ligue" }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("blocks editing and duplicate submissions during creation upload", async () => {
    let resolveUpload: (response: Response) => void = () => undefined;
    fetchMock.mockReturnValueOnce(new Promise<Response>((resolve) => { resolveUpload = resolve; }));
    fetchMock.mockResolvedValueOnce(jsonResponse(league, 201));
    const { onSuccess } = renderCreation();
    const user = userEvent.setup();
    await user.upload(screen.getByLabelText("Fichier logo"), newLogo());
    await user.click(screen.getByRole("button", { name: "Créer la ligue" }));
    expect(screen.getByRole("button", { name: "Création..." })).toBeDisabled();
    expect(screen.getByLabelText("Nom *")).toBeDisabled();
    expect(screen.getByLabelText("Pays *")).toBeDisabled();
    expect(screen.getByLabelText("Fichier logo")).toBeDisabled();
    expect(screen.getByLabelText("Ligue active")).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Création..." }));
    expect(fetchMock).toHaveBeenCalledOnce();
    resolveUpload(jsonResponse({ path: logoPath }, 201));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("updates only the logo with the current version and uses the returned version on the next save", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ path: logoPath }, 201));
    const updated = { ...league, logoUrl: "https://example.com/updated.png", version: 4 };
    fetchMock.mockResolvedValueOnce(jsonResponse(updated));
    fetchMock.mockResolvedValueOnce(jsonResponse({ ...updated, name: "Nouvelle ligue", version: 5 }));
    const { props } = renderUpdate();
    const user = userEvent.setup();
    expect(screen.getByRole("img", { name: "Logo de Ligue Nationale" })).toHaveAttribute("src", league.logoUrl);
    await user.upload(screen.getByLabelText("Fichier logo"), newLogo());
    expect(screen.getByRole("button", { name: "Enregistrer" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));
    await waitFor(() => expect(props.onSuccess).toHaveBeenCalledOnce());
    const uploadUrl = fetchMock.mock.calls[0][0] as string;
    expect(JSON.parse(fetchMock.mock.calls[1][1]?.body as string)).toEqual({
      logoUrl: new URL(logoPath, new URL(uploadUrl, window.location.origin).origin).href, version: 3,
    });
    expect(screen.getByRole("img", { name: "Logo de Ligue Nationale" })).toHaveAttribute("src", updated.logoUrl);
    expect(screen.getByRole("button", { name: "Enregistrer" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Nom *"), { target: { value: "Nouvelle ligue" } });
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));
    await waitFor(() => expect(props.onSuccess).toHaveBeenCalledTimes(2));
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(JSON.parse(fetchMock.mock.calls[2][1]?.body as string)).toEqual({ name: "Nouvelle ligue", version: 4 });
  });

  it("restores the existing logo when a replacement is withdrawn", async () => {
    renderUpdate();
    const user = userEvent.setup();
    await user.upload(screen.getByLabelText("Fichier logo"), newLogo());
    await user.click(screen.getByRole("button", { name: "Retirer le logo" }));
    expect(screen.getByRole("img", { name: "Logo de Ligue Nationale" })).toHaveAttribute("src", league.logoUrl);
    expect(screen.getByRole("button", { name: "Enregistrer" })).toBeDisabled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reuses the uploaded logo after updating the league fails", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ path: logoPath }, 201));
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: { code: "INTERNAL_SERVER_ERROR", message: "Failure" } }, 500));
    fetchMock.mockResolvedValueOnce(jsonResponse({ ...league, version: 4 }));
    const { props } = renderUpdate();
    const user = userEvent.setup();
    await user.upload(screen.getByLabelText("Fichier logo"), newLogo());
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));
    await screen.findByRole("alert");
    expect(screen.getByRole("img", { name: "Aperçu du logo sélectionné" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));
    await waitFor(() => expect(props.onSuccess).toHaveBeenCalledOnce());
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls.filter(([url]) => typeof url === "string" && url.endsWith("/uploads/photos"))).toHaveLength(1);
    expect(JSON.parse(fetchMock.mock.calls[2][1]?.body as string)).toEqual(JSON.parse(fetchMock.mock.calls[1][1]?.body as string));
  });

  it("keeps the version conflict reload and clears the replacement on explicit reload", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ path: logoPath }, 201));
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: { code: "RESOURCE_VERSION_CONFLICT", message: "Conflict" } }, 409));
    fetchMock.mockResolvedValueOnce(jsonResponse({ ...league, name: "Nouvelle ligue", version: 5 }));
    const view = renderUpdate();
    const user = userEvent.setup();
    await user.upload(screen.getByLabelText("Fichier logo"), newLogo());
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("modifiée par un autre utilisateur");
    await user.click(screen.getByRole("button", { name: "Recharger les données" }));
    expect(view.props.onReload).toHaveBeenCalledOnce();
    view.rerender(<QueryClientProvider client={view.queryClient}><UpdateLeagueForm {...view.props} league={{ ...league, version: 4 }} /></QueryClientProvider>);
    expect(screen.queryByRole("img", { name: "Aperçu du logo sélectionné" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enregistrer" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Nom *"), { target: { value: "Nouvelle ligue" } });
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));
    await waitFor(() => expect(view.props.onSuccess).toHaveBeenCalledOnce());
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(JSON.parse(fetchMock.mock.calls[2][1]?.body as string)).toEqual({ name: "Nouvelle ligue", version: 4 });
  });

  it("still displays server validation errors for the logo", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: {
      code: "VALIDATION_ERROR", message: "Validation refusée",
      details: [{ field: "logoUrl", message: "Ce logo n’est pas accepté." }],
    } }, 400));
    renderUpdate();
    fireEvent.change(screen.getByLabelText("Nom *"), { target: { value: "Nouvelle ligue" } });
    await userEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(await screen.findByText("Ce logo n’est pas accepté.")).toBeInTheDocument();
  });

  it("discards a replacement when switching leagues", async () => {
    const view = renderUpdate();
    await userEvent.upload(screen.getByLabelText("Fichier logo"), newLogo());
    const anotherLeague = { ...league, id: "another-league-id", name: "Autre ligue", logoUrl: "https://example.com/another.png" };
    view.rerender(<QueryClientProvider client={view.queryClient}><UpdateLeagueForm {...view.props} league={anotherLeague} /></QueryClientProvider>);
    expect(screen.getByRole("img", { name: "Logo de Autre ligue" })).toHaveAttribute("src", anotherLeague.logoUrl);
    expect(screen.queryByRole("img", { name: "Aperçu du logo sélectionné" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enregistrer" })).toBeDisabled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
