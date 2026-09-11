import { z } from "zod";

const emptyToNull = (value: unknown): unknown => {
  if (typeof value === "string" && value.trim() === "") {
    return null;
  }

  return value;
};

const createTeamInputSchema = z.object({
  name: z.string({ error: "Nom requis" })
    .trim()
    .min(1, { error: "Nom requis" })
    .max(150, { error: "Le nom ne peut pas dépasser 150 caractères" }),
  logoUrl: z.preprocess(
    emptyToNull,
    z.string().trim().pipe(z.url()).nullable().optional(),
  ),
  stadium: z.preprocess(
    emptyToNull,
    z.string().trim().max(150, {
      error: "Le stade ne peut pas dépasser 150 caractères",
    }).nullable().optional(),
  ),
}).strict();

export { createTeamInputSchema };
