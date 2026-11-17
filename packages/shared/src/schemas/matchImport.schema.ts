import { z } from "zod";
import { leagueNameSchema } from "./league.schema";
import { seasonNameSchema } from "./season.schema";
import { createTeamInputSchema } from "./team.schema";
import { MATCH_TIME_ZONE, matchDateSchema, matchStartTimeSchema, matchStatusSchema } from "./match.schema";

const importScoreSchema = z.number().int().min(0).max(2_147_483_647).nullable();
const importSourceSchema = z.url().refine((value) => ["http:", "https:"].includes(new URL(value).protocol), "La source doit être une URL HTTP ou HTTPS");
const matchImportRowSchema = z.object({
  journee: z.number().int().min(1).max(2_147_483_647),
  domicile: createTeamInputSchema.shape.name,
  exterieur: createTeamInputSchema.shape.name,
  date: matchDateSchema.nullable(),
  heureParis: matchStartTimeSchema.nullable(),
  stade: z.string().trim().min(1).max(150).nullable(),
  etat: matchStatusSchema,
  scoreDomicile: importScoreSchema,
  scoreExterieur: importScoreSchema,
  dateConfirmee: z.boolean(),
  datePrevisionnelle: matchDateSchema.nullable().optional(),
  publicationDemandee: z.boolean(),
  pretPourPublication: z.boolean(),
  conserverMatchExistant: z.boolean().optional(),
  sourceCalendrier: importSourceSchema.optional(),
  sourceProgrammation: importSourceSchema.optional(),
  sourceResultat: importSourceSchema.optional(),
  note: z.string().max(2000).optional(),
}).strict().superRefine((row, context) => {
  if (row.domicile === row.exterieur) context.addIssue({ code: "custom", path: ["exterieur"], message: "Les équipes doivent être différentes." });
  if (!row.dateConfirmee && row.date !== null) context.addIssue({ code: "custom", path: ["date"], message: "Une date non confirmée doit être placée dans datePrevisionnelle, pas dans date." });
  if (row.etat === "SCHEDULED" && (row.scoreDomicile !== null || row.scoreExterieur !== null)) {
    context.addIssue({ code: "custom", path: ["scoreDomicile"], message: "Un match à venir doit avoir des scores null." });
  }
  if (row.etat === "COMPLETED" && (row.scoreDomicile === null || row.scoreExterieur === null)) {
    context.addIssue({ code: "custom", path: ["scoreDomicile"], message: "Un match terminé exige deux scores, y compris pour un 0–0." });
  }
  if (row.etat !== "SCHEDULED" && !(row.publicationDemandee && row.pretPourPublication && row.dateConfirmee && row.date && row.heureParis)) {
    context.addIssue({ code: "custom", path: ["etat"], message: "Un résultat ou un match en cours exige une programmation confirmée et une publication demandée." });
  }
});

const matchImportDocumentSchema = z.object({
  ligue: leagueNameSchema,
  saison: seasonNameSchema,
  dateReleve: matchDateSchema,
  timezone: z.literal(MATCH_TIME_ZONE),
  strategie: z.string().max(2000).optional(),
  avertissements: z.array(z.string().max(2000)).optional(),
  matchs: z.array(matchImportRowSchema).min(1, "Le fichier doit contenir des rencontres."),
}).strict();

const matchImportApplySchema = z.object({
  document: matchImportDocumentSchema,
  snapshot: z.string().regex(/^[a-f0-9]{64}$/),
}).strict();
const matchImportSummarySchema = z.object({
  total: z.number().int().min(0),
  toImport: z.number().int().min(0),
  preserved: z.number().int().min(0),
  toPublish: z.number().int().min(0),
  completed: z.number().int().min(0),
  scheduled: z.number().int().min(0),
  drafts: z.number().int().min(0),
  provisionalDates: z.number().int().min(0),
}).strict();
const matchImportPreviewSchema = z.object({
  snapshot: z.string().regex(/^[a-f0-9]{64}$/),
  summary: matchImportSummarySchema,
  warnings: z.array(z.string()),
  matches: z.array(z.object({
    journee: z.number().int(), domicile: z.string(), exterieur: z.string(),
    action: z.enum(["IMPORT", "PRESERVE"]), published: z.boolean(),
    date: matchDateSchema.nullable(), heureParis: matchStartTimeSchema.nullable(),
    stade: z.string().nullable(), etat: matchStatusSchema,
    scoreDomicile: importScoreSchema, scoreExterieur: importScoreSchema,
    datePrevisionnelle: matchDateSchema.nullable(),
  }).strict()),
}).strict();
const matchImportResultSchema = z.object({ summary: matchImportSummarySchema }).strict();

export { matchImportApplySchema, matchImportDocumentSchema, matchImportPreviewSchema, matchImportResultSchema, matchImportRowSchema };
