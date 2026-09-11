import { createLeagueInputSchema } from "@lucarne/shared";
import type { CreateLeagueInput } from "@lucarne/shared";
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
