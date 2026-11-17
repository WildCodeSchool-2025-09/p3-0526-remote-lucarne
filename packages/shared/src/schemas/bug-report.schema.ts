import { z } from "zod";

const bugReportTitleSchema = z.string({ error: "Titre requis" })
  .trim()
  .min(1, { error: "Titre requis" })
  .max(200, { error: "Le titre ne peut pas dépasser 200 caractères" });

const bugReportDescriptionSchema = z.string({ error: "Description requise" })
  .trim()
  .min(1, { error: "Description requise" })
  .max(5_000, { error: "La description ne peut pas dépasser 5000 caractères" });

const bugReportPagePathSchema = z.string({ error: "Page requise" })
  .trim()
  .min(1, { error: "Page requise" })
  .max(2_048, { error: "Le chemin de page ne peut pas dépasser 2048 caractères" });

const bugReportIdParamsSchema = z.object({
  bugReportId: z.uuid({ error: "Identifiant de bug report invalide" }),
}).strict();

const createBugReportInputSchema = z.object({
  pagePath: bugReportPagePathSchema,
  title: bugReportTitleSchema,
  description: bugReportDescriptionSchema,
}).strict();

export {
  bugReportDescriptionSchema,
  bugReportIdParamsSchema,
  bugReportPagePathSchema,
  bugReportTitleSchema,
  createBugReportInputSchema,
};
