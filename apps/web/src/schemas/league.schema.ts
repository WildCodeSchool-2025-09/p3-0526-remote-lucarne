import type { CreateLeagueInput } from "@lucarne/shared";
import { z } from "zod";

const createLeagueFormSchema = z.object({
  name: z.string({ error: "Nom requis" })
    .trim()
    .min(1, { error: "Nom requis" })
    .max(150, { error: "Le nom ne peut pas dépasser 150 caractères" }),
  country: z.string({ error: "Pays requis" })
    .trim()
    .min(1, { error: "Pays requis" })
    .max(100, { error: "Le pays ne peut pas dépasser 100 caractères" }),
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
  isActive: true,
} satisfies CreateLeagueFormValues;

function toCreateLeagueInput(
  values: CreateLeagueFormValues,
): CreateLeagueInput {
  return createLeagueFormSchema.parse(values);
}

export {
  createLeagueDefaultValues,
  createLeagueFormSchema,
  toCreateLeagueInput,
};
export type { CreateLeagueFormData, CreateLeagueFormValues };
