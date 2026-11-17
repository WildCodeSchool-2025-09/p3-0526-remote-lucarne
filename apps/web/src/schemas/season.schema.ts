import { assignLeagueSeasonInputSchema, createSeasonInputSchema, updateSeasonInputSchema } from "@lucarne/shared";
import type { CreateSeasonInput, UpdateSeasonInput } from "@lucarne/shared";
import { z } from "zod";

const createSeasonFormSchema = createSeasonInputSchema;

const assignLeagueSeasonFormSchema = assignLeagueSeasonInputSchema
  .pick({ matchdayCount: true, matchesPerMatchday: true })
  .extend({ leagueId: z.string().min(1, { error: "Choisissez une ligue" }) });

type AssignLeagueSeasonFormData = z.infer<typeof assignLeagueSeasonFormSchema>;

const updateSeasonFormSchema = z.object({
  name: z.string({ error: "Nom requis" }).trim().min(1, { error: "Nom requis" }).max(100, { error: "Le nom ne peut pas dépasser 100 caractères" }),
  startDate: z.string({ error: "Date de début requise" }).regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Date invalide" }),
  endDate: z.string({ error: "Date de fin requise" }).regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Date invalide" }),
  version: z.number().int().min(0),
}).strict().refine(({ startDate, endDate }) => endDate >= startDate, {
  message: "La date de fin doit être postérieure ou égale à la date de début",
  path: ["endDate"],
});

type CreateSeasonFormValues = z.input<typeof createSeasonFormSchema>;
type CreateSeasonFormData = z.infer<typeof createSeasonFormSchema>;
type UpdateSeasonFormValues = z.input<typeof updateSeasonFormSchema>;
type UpdateSeasonFormData = z.infer<typeof updateSeasonFormSchema>;

const createSeasonDefaultValues = {
  name: "",
  startDate: "",
  endDate: "",
} satisfies CreateSeasonFormValues;

function toCreateSeasonInput(values: CreateSeasonFormData): CreateSeasonInput {
  return createSeasonFormSchema.parse(values);
}

function toUpdateSeasonInput(
  values: UpdateSeasonFormData,
  dirtyFields: Partial<Record<keyof UpdateSeasonFormData, boolean>>,
): UpdateSeasonInput {
  const changes: Partial<CreateSeasonInput> = {};

  if (dirtyFields.name) changes.name = values.name;
  if (dirtyFields.startDate) changes.startDate = values.startDate;
  if (dirtyFields.endDate) changes.endDate = values.endDate;

  return updateSeasonInputSchema.parse({ ...changes, version: values.version });
}

export {
  assignLeagueSeasonFormSchema,
  createSeasonDefaultValues,
  createSeasonFormSchema,
  toCreateSeasonInput,
  toUpdateSeasonInput,
  updateSeasonFormSchema,
};
export type { AssignLeagueSeasonFormData, CreateSeasonFormData, CreateSeasonFormValues, UpdateSeasonFormData, UpdateSeasonFormValues };
