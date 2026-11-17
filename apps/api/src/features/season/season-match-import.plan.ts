import { createHash } from "node:crypto";
import type { MatchImportDocument, MatchImportPreview } from "@lucarne/shared";
import type { Prisma } from "../../generated/prisma/client";
import { AppError } from "../../errors/AppError";
import type { MatchImportContext } from "./season-match-import.repository";

const normalizeName = (name: string) => name.normalize("NFC").trim().replace(/\s+/g, " ").toLocaleLowerCase("fr");
const dateOnly = (date: Date | null) => date?.toISOString().slice(0, 10) ?? null;
const timeOnly = (date: Date | null) => date?.toISOString().slice(11, 16) ?? null;
type ImportMatch = MatchImportContext["matchdays"][number]["gameMatches"][number];
const isEmptySlot = (match: ImportMatch) => !match.isPublished && match.status === "SCHEDULED"
  && match.homeTeamId === null && match.awayTeamId === null && match.matchDate === null
  && match.startTime === null && match.stadium === null && match.homeScore === null
  && match.awayScore === null && match._count.matchEvents === 0;

function buildMatchImportPlan(context: MatchImportContext, document: MatchImportDocument) {
  const errors: { field: string; message: string }[] = [];
  const invalid = (field: string, message: string) => { if (errors.length < 100) errors.push({ field, message }); };
  const changes: { id: string; version: number; data: Prisma.GameMatchUncheckedUpdateManyInput }[] = [];
  const summary: MatchImportPreview["summary"] = { total: document.matchs.length, toImport: 0, preserved: 0, toPublish: 0, completed: 0, scheduled: 0, drafts: 0, provisionalDates: 0 };
  const warnings = [...(document.avertissements ?? [])];
  const matches: MatchImportPreview["matches"] = [];
  if (normalizeName(document.ligue) !== normalizeName(context.league.name)) invalid("ligue", "La ligue du fichier ne correspond pas à la ligue sélectionnée.");
  if (normalizeName(document.saison) !== normalizeName(context.season.name)) invalid("saison", "La saison du fichier ne correspond pas à la saison sélectionnée.");
  const days = context.matchdays.filter((day) => day.isActive);
  if (context.matchdayCount !== null && days.length !== context.matchdayCount) invalid("matchs", "Le nombre de journées actives ne correspond pas à la configuration de la saison.");
  const participants = new Map<string, MatchImportContext["participations"]>();
  for (const participant of context.participations) {
    const name = normalizeName(participant.team.name);
    participants.set(name, [...(participants.get(name) ?? []), participant]);
  }
  const usedMatches = new Set<string>();
  const usedTeams = new Set<string>();
  const counts = new Map<number, number>();
  for (const [index, row] of document.matchs.entries()) {
    const field = `matchs.${index}`;
    counts.set(row.journee, (counts.get(row.journee) ?? 0) + 1);
    const day = days.find((candidate) => candidate.number === row.journee);
    if (!day) { invalid(`${field}.journee`, `La journée ${row.journee} n’existe pas ou est inactive.`); continue; }
    const homeCandidates = participants.get(normalizeName(row.domicile)) ?? [];
    const awayCandidates = participants.get(normalizeName(row.exterieur)) ?? [];
    if (homeCandidates.length !== 1) invalid(`${field}.domicile`, `Équipe non inscrite ou nom ambigu : ${row.domicile}.`);
    if (awayCandidates.length !== 1) invalid(`${field}.exterieur`, `Équipe non inscrite ou nom ambigu : ${row.exterieur}.`);
    if (homeCandidates.length !== 1 || awayCandidates.length !== 1) continue;
    const home = homeCandidates[0]; const away = awayCandidates[0];
    if (home.team.id === away.team.id) invalid(field, "Les deux équipes doivent être distinctes.");
    for (const participant of [home, away]) {
      const key = `${day.id}:${participant.team.id}`;
      if (usedTeams.has(key)) invalid(field, `${participant.team.name} apparaît plusieurs fois dans la journée ${day.number}.`);
      usedTeams.add(key);
    }
    const activeMatches = day.gameMatches.filter((match) => match.isActive);
    const existing = activeMatches.find((match) => match.homeTeamId === home.team.id && match.awayTeamId === away.team.id);
    if (existing) {
      usedMatches.add(existing.id);
      summary.preserved += 1;
      const differs = dateOnly(existing.matchDate) !== row.date || timeOnly(existing.startTime) !== row.heureParis
        || existing.stadium !== row.stade || existing.homeScore !== row.scoreDomicile || existing.awayScore !== row.scoreExterieur || existing.status !== row.etat;
      if (differs) warnings.push(`J${row.journee} · ${row.domicile} – ${row.exterieur} : les données existantes diffèrent et seront conservées.`);
      matches.push({ journee: row.journee, domicile: row.domicile, exterieur: row.exterieur, action: "PRESERVE", published: existing.isPublished, datePrevisionnelle: row.datePrevisionnelle ?? null,
        date: dateOnly(existing.matchDate), heureParis: timeOnly(existing.startTime), stade: existing.stadium, etat: existing.status as typeof row.etat, scoreDomicile: existing.homeScore, scoreExterieur: existing.awayScore });
      continue;
    }
    if (row.conserverMatchExistant) invalid(field, "Le match à conserver est introuvable. Aucun emplacement ne sera rempli pour le remplacer.");
    for (const participant of [home, away]) {
      if (!participant.team.isActive || participant.status !== "REGISTERED") invalid(field, `${participant.team.name} doit être active et inscrite pour remplir un nouveau match.`);
    }
    const slot = activeMatches.find((match) => !usedMatches.has(match.id) && isEmptySlot(match));
    if (!slot) { invalid(field, `Aucun emplacement vide disponible pour la journée ${day.number}. Les matchs renseignés sont protégés.`); continue; }
    usedMatches.add(slot.id);
    if (row.date && (row.date < dateOnly(context.season.startDate)! || row.date > dateOnly(context.season.endDate)!)) invalid(`${field}.date`, "La date du match doit être comprise dans la période de la saison.");
    const published = Boolean(row.publicationDemandee && row.pretPourPublication && row.dateConfirmee && row.date && row.heureParis);
    summary.toImport += 1;
    summary.toPublish += Number(published);
    summary.completed += Number(row.etat === "COMPLETED");
    summary.scheduled += Number(row.etat === "SCHEDULED");
    summary.drafts += Number(!published);
    summary.provisionalDates += Number(!row.dateConfirmee && Boolean(row.datePrevisionnelle));
    changes.push({ id: slot.id, version: slot.version, data: {
      homeTeamId: home.team.id, awayTeamId: away.team.id,
      matchDate: row.date ? new Date(`${row.date}T00:00:00.000Z`) : null,
      startTime: row.heureParis ? new Date(`1970-01-01T${row.heureParis}:00.000Z`) : null,
      stadium: row.stade, homeScore: row.scoreDomicile, awayScore: row.scoreExterieur,
      status: row.etat, isPublished: published,
    } });
    matches.push({ journee: row.journee, domicile: row.domicile, exterieur: row.exterieur, action: "IMPORT", published, datePrevisionnelle: row.datePrevisionnelle ?? null,
      date: row.date, heureParis: row.heureParis, stade: row.stade, etat: row.etat, scoreDomicile: row.scoreDomicile, scoreExterieur: row.scoreExterieur });
  }
  for (const day of days) {
    const slots = day.gameMatches.filter((match) => match.isActive);
    if (counts.get(day.number) !== slots.length || (context.matchesPerMatchday !== null && slots.length !== context.matchesPerMatchday)) invalid("matchs", `La journée ${day.number} doit couvrir exactement ses ${slots.length} emplacements actifs.`);
    if (slots.some((match) => !usedMatches.has(match.id))) invalid("matchs", `La journée ${day.number} contient un match non couvert ou un emplacement partiellement renseigné. Corrigez le fichier ou le calendrier avant l’import.`);
  }
  if (errors.length) throw new AppError(409, "MATCH_IMPORT_INVALID", "Le fichier ne peut pas être importé. Aucun match n’a été modifié.", errors);
  if (summary.provisionalDates) warnings.push("Les dates prévisionnelles ne sont pas enregistrées comme dates de match. Ces rencontres restent en brouillon jusqu’à confirmation de leur programmation.");
  const snapshot = createHash("sha256").update(JSON.stringify({ context, document })).digest("hex");
  const preview: MatchImportPreview = { snapshot, summary, warnings, matches };
  return { preview, changes };
}

export { buildMatchImportPlan };
