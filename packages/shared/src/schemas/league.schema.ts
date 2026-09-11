import { z } from "zod";

const createLeagueInputSchema = z.object({
  name: z.string({ error: "Nom requis" })
    .trim()
    .min(1, { error: "Nom requis" })
    .max(150, { error: "Le nom ne peut pas dépasser 150 caractères" }),
  country: z.string({ error: "Pays requis" })
    .trim()
    .min(1, { error: "Pays requis" })
    .max(100, { error: "Le pays ne peut pas dépasser 100 caractères" }),
  logoUrl: z.string().trim().pipe(z.url()).optional(),
  isActive: z.boolean().optional(),
}).strict();

export { createLeagueInputSchema };
