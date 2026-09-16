import { z } from "zod";
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE, MAX_SEARCH_LENGTH } from "../constants/pagination";

const seasonNameSchema = z.string({ error: "Nom requis" })
  .trim()
  .min(1, { error: "Nom requis" })
  .max(100, { error: "Le nom ne peut pas dépasser 100 caractères" });

const seasonDateSchema = z.string({ error: "Date requise" })
  .regex(/^\d{4}-\d{2}-\d{2}$/, { error: "La date doit être au format AAAA-MM-JJ" });

const seasonStatusSchema = z.enum(["CURRENT", "INACTIVE"]);
const seasonStatusFilterSchema = z.enum(["ALL", "CURRENT", "INACTIVE"]);

const seasonDatesSchema = z.object({
  startDate: seasonDateSchema,
  endDate: seasonDateSchema,
}).refine(({ startDate, endDate }) => endDate >= startDate, {
  message: "La date de fin doit être postérieure ou égale à la date de début",
  path: ["endDate"],
});

const createSeasonInputSchema = z.object({
  name: seasonNameSchema,
  startDate: seasonDateSchema,
  endDate: seasonDateSchema,
}).strict().superRefine((input, context) => {
  if (input.endDate < input.startDate) {
    context.addIssue({
      code: "custom",
      message: "La date de fin doit être postérieure ou égale à la date de début",
      path: ["endDate"],
    });
  }
});

const updateSeasonInputSchema = z.object({
  name: seasonNameSchema.optional(),
  startDate: seasonDateSchema.optional(),
  endDate: seasonDateSchema.optional(),
  version: z.number({ error: "Version requise" })
    .int({ error: "La version doit être un entier" })
    .min(0, { error: "La version doit être supérieure ou égale à 0" }),
}).strict().refine(
  ({ name, startDate, endDate }) => name !== undefined || startDate !== undefined || endDate !== undefined,
  { message: "Au moins un champ métier doit être modifié", path: ["request"] },
).refine(
  ({ startDate, endDate }) => startDate === undefined || endDate === undefined || endDate >= startDate,
  { message: "La date de fin doit être postérieure ou égale à la date de début", path: ["endDate"] },
);

const seasonListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
  pageSize: z.coerce.number()
    .int()
    .refine((pageSize) => pageSize === DEFAULT_PAGE_SIZE, {
      message: `pageSize must be ${DEFAULT_PAGE_SIZE}`,
    })
    .default(DEFAULT_PAGE_SIZE),
  leagueId: z.string().uuid().optional(),
  search: z.preprocess(
    (value) => typeof value === "string" ? value.trim() || undefined : value,
    z.string().max(MAX_SEARCH_LENGTH).optional(),
  ),
  status: seasonStatusFilterSchema.default("ALL"),
  sortBy: z.enum(["name", "startDate", "endDate", "createdAt"]).default("startDate"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
}).strict();

const seasonIdParamsSchema = z.object({
  seasonId: z.string().uuid(),
}).strict();

const leagueIdParamsSchema = z.object({
  leagueId: z.string().uuid(),
}).strict();

const leagueSeasonParamsSchema = z.object({
  leagueId: z.string().uuid(),
  seasonId: z.string().uuid(),
}).strict();

export {
  createSeasonInputSchema,
  leagueIdParamsSchema,
  leagueSeasonParamsSchema,
  seasonDatesSchema,
  seasonIdParamsSchema,
  seasonListQuerySchema,
  seasonNameSchema,
  seasonStatusFilterSchema,
  seasonStatusSchema,
  updateSeasonInputSchema,
};
