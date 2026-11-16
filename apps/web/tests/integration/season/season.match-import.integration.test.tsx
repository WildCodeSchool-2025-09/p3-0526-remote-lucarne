import raw from "../../../../../packages/shared/tests/fixtures/season-match-import.json?raw";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { matchImportDocumentSchema, type MatchImportPreview } from "@lucarne/shared";
import { SeasonMatchImport } from "../../../src/features/season/components/SeasonMatchImport";
import { applySeasonMatchImport, previewSeasonMatchImport } from "../../../src/services/season.service";
import { HttpError } from "../../../src/lib/httpClient";
import { seasonKeys } from "../../../src/features/season/seasonKeys";
import { matchKeys } from "../../../src/features/match/matchKeys";
import { leagueKeys } from "../../../src/features/league/leagueKeys";
import { teamKeys } from "../../../src/features/team/teamKeys";

vi.mock("../../../src/services/season.service", () => ({ applySeasonMatchImport: vi.fn(), previewSeasonMatchImport: vi.fn() }));
const document = matchImportDocumentSchema.parse(JSON.parse(raw));
const summary = { total: 132, toImport: 131, preserved: 1, toPublish: 41, completed: 23, scheduled: 108, drafts: 90, provisionalDates: 90 };
const preview: MatchImportPreview = {
  snapshot: "a".repeat(64), summary,
  warnings: ["Les dates prévisionnelles ne sont pas enregistrées comme dates de match."],
  matches: document.matchs.map((match, index) => ({
    ...match, action: index === 0 ? "PRESERVE" : "IMPORT", published: match.pretPourPublication,
    datePrevisionnelle: match.datePrevisionnelle ?? null,
  })),
};
const responseError = (status: number, code: string, message: string) => new HttpError(new Response(null, { status }), { error: { code, message, details: [{ field: "matchs.1.domicile", message: "Équipe à vérifier." }] } });

function setup(leagueId = "league-one") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const keys = [seasonKeys.detail("season-one"), matchKeys.publicList({ page: 1, pageSize: 20, sortBy: "matchDate", sortOrder: "asc" }), leagueKeys.all, teamKeys.all];
  for (const key of keys) queryClient.setQueryData(key, {});
  render(<QueryClientProvider client={queryClient}><SeasonMatchImport leagueId={leagueId} seasonId="season-one" leagueName="Arkema Première Ligue" /></QueryClientProvider>);
  return { queryClient, keys, user: userEvent.setup() };
}
async function selectFile(user: ReturnType<typeof userEvent.setup>, contents = raw) {
  await user.click(screen.getByRole("button", { name: "Importer les matchs (JSON)" }));
  await user.upload(screen.getByLabelText(/Fichier JSON/), new File([contents], "saison.json", { type: "application/json" }));
  await waitFor(() => expect(screen.queryByText("Lecture du fichier…")).not.toBeInTheDocument());
}
async function analyze(user: ReturnType<typeof userEvent.setup>) {
  await selectFile(user);
  await waitFor(() => expect(screen.getByRole("button", { name: "Analyser le fichier" })).toBeEnabled());
  await user.click(screen.getByRole("button", { name: "Analyser le fichier" }));
  await screen.findByRole("button", { name: "Importer 131 matchs" });
}

describe("Season JSON upload workflow", () => {
  beforeEach(() => {
    vi.mocked(previewSeasonMatchImport).mockResolvedValue(preview);
    vi.mocked(applySeasonMatchImport).mockResolvedValue({ summary });
  });
  afterEach(() => vi.resetAllMocks());

  it("previews the selected edition without writes, supports cancellation, then imports and refreshes public and admin caches", async () => {
    const { user, queryClient, keys } = setup("selected-league");
    await analyze(user);
    expect(previewSeasonMatchImport).toHaveBeenCalledWith("selected-league", "season-one", document);
    expect(applySeasonMatchImport).not.toHaveBeenCalled();
    expect(screen.getByText(/132 matchs : 131 à importer, 1 à conserver/)).toBeInTheDocument();
    expect(screen.getByText("Terminé : 1 – 7")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Importer 131 matchs" }));
    let dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("button", { name: "Confirmer l’import" })).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(applySeasonMatchImport).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Importer 131 matchs" }));
    dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Confirmer l’import" }));
    expect(await screen.findByRole("status")).toHaveTextContent("131 matchs importés, 1 conservés, 41 publiés et 90 en brouillon");
    expect(applySeasonMatchImport).toHaveBeenCalledWith("selected-league", "season-one", { document, snapshot: preview.snapshot });
    for (const key of keys) expect(queryClient.getQueryState(key)?.isInvalidated).toBe(true);
    expect(screen.queryByRole("button", { name: "Importer 131 matchs" })).not.toBeInTheDocument();
  });

  it.each(["{broken", JSON.stringify({ ...document, timezone: "UTC" })])("rejects invalid JSON before sending it", async (contents) => {
    const { user } = setup();
    await selectFile(user, contents);
    expect(await screen.findByRole("alert")).toHaveTextContent(/JSON valide|format du fichier est incorrect/);
    expect(screen.getByRole("button", { name: "Analyser le fichier" })).toBeDisabled();
    expect(previewSeasonMatchImport).not.toHaveBeenCalled();
    expect(applySeasonMatchImport).not.toHaveBeenCalled();
  });

  it("rejects oversized files without reads or HTTP requests", async () => {
    const { user } = setup();
    await selectFile(user, " ".repeat(100_000));
    expect(await screen.findByRole("alert")).toHaveTextContent("90 Ko");
    expect(previewSeasonMatchImport).not.toHaveBeenCalled();
  });

  it("shows server validation details and retains the file for another analysis", async () => {
    vi.mocked(previewSeasonMatchImport).mockRejectedValueOnce(responseError(409, "MATCH_IMPORT_INVALID", "Le fichier ne peut pas être importé."));
    const { user } = setup();
    await selectFile(user);
    await waitFor(() => expect(screen.getByRole("button", { name: "Analyser le fichier" })).toBeEnabled());
    await user.click(screen.getByRole("button", { name: "Analyser le fichier" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Le fichier ne peut pas être importé.");
    expect(screen.getByText(/matchs.1.domicile : Équipe à vérifier/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Analyser le fichier" })).toBeEnabled();
    expect(applySeasonMatchImport).not.toHaveBeenCalled();
  });

  it.each([responseError(409, "RESOURCE_VERSION_CONFLICT", "Le calendrier a changé."), new Error("Erreur réseau")])("requires a fresh preview after a failed import: %s", async (failure) => {
    vi.mocked(applySeasonMatchImport).mockRejectedValueOnce(failure);
    const { user } = setup();
    await analyze(user);
    await user.click(screen.getByRole("button", { name: "Importer 131 matchs" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Confirmer l’import" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(failure.message);
    expect(screen.queryByRole("button", { name: "Importer 131 matchs" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Analyser le fichier" }));
    expect(await screen.findByRole("button", { name: "Importer 131 matchs" })).toBeEnabled();
    expect(previewSeasonMatchImport).toHaveBeenCalledTimes(2);
    expect(applySeasonMatchImport).toHaveBeenCalledTimes(1);
  });

  it("clears an old preview when another file is selected", async () => {
    const { user } = setup();
    await analyze(user);
    fireEvent.change(screen.getByLabelText(/Fichier JSON/), { target: { files: [new File(["invalid"], "autre.json", { type: "application/json" })] } });
    expect(await screen.findByRole("alert")).toHaveTextContent("JSON valide");
    expect(screen.queryByRole("button", { name: "Importer 131 matchs" })).not.toBeInTheDocument();
    expect(applySeasonMatchImport).not.toHaveBeenCalled();
  });

  it("closes the panel and returns focus to its trigger", async () => {
    const { user } = setup();
    await selectFile(user);
    await user.click(screen.getByRole("button", { name: "Fermer l’import" }));
    expect(screen.queryByLabelText(/Fichier JSON/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Importer les matchs (JSON)" })).toHaveFocus();
    expect(previewSeasonMatchImport).not.toHaveBeenCalled();
  });

  it("explains an idempotent reimport without offering a write", async () => {
    vi.mocked(previewSeasonMatchImport).mockResolvedValueOnce({ ...preview, summary: { ...summary, toImport: 0, preserved: 132 } });
    const { user } = setup();
    await selectFile(user);
    await waitFor(() => expect(screen.getByRole("button", { name: "Analyser le fichier" })).toBeEnabled());
    await user.click(screen.getByRole("button", { name: "Analyser le fichier" }));
    expect(await screen.findByText(/Tous les matchs sont déjà renseignés/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Importer 131 matchs" })).not.toBeInTheDocument();
  });
});
