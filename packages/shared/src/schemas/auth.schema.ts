import { z } from "zod";

export const authenticationErrorMessage = "Couple mot de passe/Email inexistant";

export const loginInputSchema = z.object({
  email: z.email().max(320),
  // Existing accounts remain compatible with the original login policy.
  password: z.string().min(1).max(128),
}).strict();

export const registerInputSchema = loginInputSchema.extend({
  firstName: z.string().trim().min(1, "Prénom requis").max(100),
  lastName: z.string().trim().min(1, "Nom requis").max(100),
  password: z.string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères")
    .max(128, "Le mot de passe doit contenir au plus 128 caractères")
    .regex(/[0-9]/, "Le mot de passe doit contenir un chiffre")
    .regex(/[A-Z]/, "Le mot de passe doit contenir une majuscule"),
}).strict();

export type LoginInput = z.infer<typeof loginInputSchema>;
export type RegisterInput = z.infer<typeof registerInputSchema>;
