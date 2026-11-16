import { useId, useRef, useState } from "react";
import { MATCH_IMPORT_MAX_BYTES, matchImportDocumentSchema, type MatchImportDocument, type MatchImportPreview, type MatchImportResult } from "@lucarne/shared";
import { Alert, Button, ConfirmDialog, Input } from "../../../ui";
import { HttpError } from "../../../lib/httpClient";
import { useSeasonMatchImport } from "../hooks/useSeasonMatchImport";
import "./seasonMatchImport.css";

interface SeasonMatchImportProps { leagueId: string; seasonId: string; leagueName: string }
const readFile = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Impossible de lire le fichier comme texte."));
  reader.onerror = () => reject(new Error("Impossible de lire le fichier."));
  reader.readAsText(file, "UTF-8");
});
const errorMessage = (error: unknown) => error instanceof Error ? error.message : "Impossible d’importer les matchs.";

function SeasonMatchImportPanel({ leagueId, seasonId, leagueName, onClose }: SeasonMatchImportProps & { onClose: () => void }) {
  const inputId = useId();
  const revision = useRef(0);
  const { preview: previewMutation, apply: applyMutation } = useSeasonMatchImport(leagueId, seasonId);
  const [document, setDocument] = useState<MatchImportDocument | null>(null);
  const [preview, setPreview] = useState<MatchImportPreview | null>(null);
  const [result, setResult] = useState<MatchImportResult | null>(null);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<{ field: string; message: string }[]>([]);
  const [confirm, setConfirm] = useState(false);
  const pending = reading || previewMutation.isPending || applyMutation.isPending;

  async function selectFile(file?: File) {
    const current = ++revision.current;
    setDocument(null); setPreview(null); setResult(null); setError(null); setDetails([]);
    if (!file) return;
    if (file.size > MATCH_IMPORT_MAX_BYTES) { setError("Le fichier ne doit pas dépasser 90 Ko."); return; }
    setReading(true);
    try {
      const raw = await readFile(file);
      if (current !== revision.current) return;
      let value: unknown;
      try { value = JSON.parse(raw.replace(/^\uFEFF/, "")); } catch { throw new Error("Le fichier ne contient pas un JSON valide."); }
      const parsed = matchImportDocumentSchema.safeParse(value);
      if (!parsed.success) {
        setError("Le format du fichier est incorrect.");
        setDetails(parsed.error.issues.slice(0, 100).map((issue) => ({ field: issue.path.join("."), message: issue.message })));
        return;
      }
      // The actual HTTP envelope must also fit the existing API JSON limit.
      if (new TextEncoder().encode(JSON.stringify({ document: parsed.data, snapshot: "0".repeat(64) })).length > MATCH_IMPORT_MAX_BYTES) throw new Error("Le contenu JSON dépasse la taille autorisée de 90 Ko.");
      setDocument(parsed.data);
    } catch (failure) { if (current === revision.current) setError(errorMessage(failure)); } finally { if (current === revision.current) setReading(false); }
  }

  async function analyze() {
    if (!document || pending) return;
    setError(null); setDetails([]); setPreview(null); setResult(null);
    try { setPreview(await previewMutation.mutateAsync(document)); } catch (failure) { setError(errorMessage(failure)); if (failure instanceof HttpError) setDetails(failure.details ?? []); }
  }

  async function apply() {
    if (!document || !preview || pending) return;
    setError(null); setDetails([]);
    try {
      setResult(await applyMutation.mutateAsync({ document, snapshot: preview.snapshot }));
      setPreview(null); setDocument(null); setConfirm(false);
    } catch (failure) {
      setError(errorMessage(failure));
      if (failure instanceof HttpError) setDetails(failure.details ?? []);
      // A fresh preview is required after every failed write, including ambiguous
      // network failures where the server may already have committed the import.
      setPreview(null); setConfirm(false);
    }
  }

  return (
    <section className="season-match-import" aria-label={`Import des matchs de ${leagueName}`}>
      <h3>Importer les matchs de {leagueName}</h3>
      <p>Le fichier doit couvrir toutes les journées existantes. Seuls les emplacements entièrement vides seront remplis. Les matchs renseignés seront conservés.</p>
      <p>Les rencontres confirmées et prêtes à être publiées seront visibles publiquement après confirmation de l’import. Les dates prévisionnelles restent dans le fichier source, sans devenir des dates de match.</p>
      <label htmlFor={inputId}>Fichier JSON de la saison (90 Ko maximum)</label>
      <Input id={inputId} type="file" accept=".json,application/json" disabled={pending} onChange={(event) => { void selectFile(event.target.files?.[0]); }} />
      <div className="season-match-import__actions">
        <Button variant="outline" disabled={!document || pending} onClick={() => { void analyze(); }}>{previewMutation.isPending ? "Analyse…" : "Analyser le fichier"}</Button>
        <Button variant="ghost" disabled={pending} onClick={onClose}>Fermer l’import</Button>
      </div>
      {reading ? <p role="status">Lecture du fichier…</p> : null}
      {error ? <Alert variant="danger">{error}</Alert> : null}
      {details.length ? <ul>{details.map((detail, index) => <li key={index}>{detail.field} : {detail.message}</li>)}</ul> : null}
      {result ? <p role="status">Import terminé : {result.summary.toImport} matchs importés, {result.summary.preserved} conservés, {result.summary.toPublish} publiés et {result.summary.drafts} en brouillon.</p> : null}
      {preview ? (
        <div aria-live="polite">
          <h4>Aperçu de l’import</h4>
          <p>{preview.summary.total} matchs : {preview.summary.toImport} à importer, {preview.summary.preserved} à conserver.</p>
          <p>Parmi les nouveaux matchs : {preview.summary.completed} terminés, {preview.summary.scheduled} programmés ; {preview.summary.toPublish} seront publiés et {preview.summary.drafts} resteront en brouillon.</p>
          {preview.warnings.length ? <ul>{preview.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul> : null}
          <details>
            <summary>Vérifier les {preview.summary.total} matchs</summary>
            <ol className="season-match-import__matches">
              {preview.matches.map((match, index) => (
                <li key={index}>
                  <strong>J{match.journee} · {match.domicile} – {match.exterieur}</strong>
                  <span>{match.action === "PRESERVE" ? "Conservé" : "À importer"} · {match.published ? "Publié" : "Brouillon"}</span>
                  <span>{match.date ?? "Date à confirmer"} · {match.heureParis ? `${match.heureParis} (Paris)` : "Heure à confirmer"} · {match.stade ?? "Stade non renseigné"}</span>
                  {match.datePrevisionnelle ? <span>Date prévisionnelle du fichier : {match.datePrevisionnelle}</span> : null}
                  <span>{match.etat === "COMPLETED" ? `Terminé : ${match.scoreDomicile} – ${match.scoreExterieur}` : match.etat === "IN_PROGRESS" ? "En cours" : "Programmé"}</span>
                </li>
              ))}
            </ol>
          </details>
          {preview.summary.toImport ? <Button disabled={pending} onClick={() => setConfirm(true)}>Importer {preview.summary.toImport} matchs</Button> : <p>Tous les matchs sont déjà renseignés. Aucune modification à importer.</p>}
        </div>
      ) : null}
      <ConfirmDialog open={confirm} pending={applyMutation.isPending} title="Confirmer l’import des matchs" actionLabel="Confirmer l’import" onCancel={() => setConfirm(false)} onConfirm={() => { void apply(); }}>
        {preview ? `${preview.summary.toImport} matchs seront remplis, dont ${preview.summary.toPublish} publiés. Les ${preview.summary.preserved} matchs existants seront conservés. L’opération est appliquée en une seule transaction.` : ""}
      </ConfirmDialog>
    </section>
  );
}

function SeasonMatchImport(props: SeasonMatchImportProps) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  return <>
    <Button ref={buttonRef} variant="outline" aria-expanded={open} onClick={() => setOpen(true)}>Importer les matchs (JSON)</Button>
    {open ? <SeasonMatchImportPanel {...props} onClose={() => { setOpen(false); buttonRef.current?.focus(); }} /> : null}
  </>;
}
export { SeasonMatchImport };
