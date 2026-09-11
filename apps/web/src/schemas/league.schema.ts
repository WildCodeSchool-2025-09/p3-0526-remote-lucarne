import {
  createLeagueInputSchema,
  updateLeagueInputSchema,
} from "@lucarne/shared";
import type { CreateLeagueInput, UpdateLeagueInput } from "@lucarne/shared";
import { z } from "zod";

const createLeagueFormSchema = createLeagueInputSchema.extend({
  logoUrl: z.string({ error: "L'URL du logo doit être une URL valide" })
    .trim()
    .pipe(
      z.union([
        z.literal(""),
        z.url({ error: "L'URL du logo doit être une URL valide" }),
      ]),
    )
    .transform((value) => value === "" ? undefined : value)
    .optional(),
  isActive: z.boolean({ error: "Le statut actif doit être un booléen" }),
}).strict();

type CreateLeagueFormValues = z.input<typeof createLeagueFormSchema>;
type CreateLeagueFormData = z.infer<typeof createLeagueFormSchema>;

const createLeagueDefaultValues = {
  name: "",
  country: "",
  logoUrl: "",
  isActive: false,
} satisfies CreateLeagueFormValues;

const updateLeagueFormSchema = z.object({
  name: z.string({ error: "Nom requis" }).trim().min(1, { error: "Nom requis" }).max(150, { error: "Le nom ne peut pas dépasser 150 caractères" }),
  country: z.string({ error: "Pays requis" }).trim().min(1, { error: "Pays requis" }).max(100, { error: "Le pays ne peut pas dépasser 100 caractères" }),
  logoUrl: z.string({ error: "L'URL du logo doit être une URL valide" })
    .trim()
    .pipe(z.union([z.literal(""), z.url({ error: "L'URL du logo doit être une URL valide" })])),
  isActive: z.boolean({ error: "Le statut actif doit être un booléen" }),
}).strict();

type UpdateLeagueFormValues = z.input<typeof updateLeagueFormSchema>;
type UpdateLeagueFormData = z.infer<typeof updateLeagueFormSchema>;

function toUpdateLeagueInput(
  values: UpdateLeagueFormData,
  dirtyFields: Partial<Record<keyof UpdateLeagueFormData, boolean>>,
  version: number,
  canEditStatus: boolean,
): UpdateLeagueInput {
  const changes: Record<string, unknown> = {};

  if (dirtyFields.name) changes.name = values.name;
  if (dirtyFields.country) changes.country = values.country;
  if (dirtyFields.logoUrl) changes.logoUrl = values.logoUrl === "" ? null : values.logoUrl;
  if (canEditStatus && dirtyFields.isActive) changes.isActive = values.isActive;

  return updateLeagueInputSchema.parse({ ...changes, version });
}

function toCreateLeagueInput(
  values: CreateLeagueFormValues,
): CreateLeagueInput {
  return createLeagueFormSchema.parse(values);
}

export {
  createLeagueDefaultValues,
  createLeagueFormSchema,
  toCreateLeagueInput,
  toUpdateLeagueInput,
  updateLeagueFormSchema,
};
export type { CreateLeagueFormData, CreateLeagueFormValues, UpdateLeagueFormData, UpdateLeagueFormValues };
