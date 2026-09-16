import { z } from "zod";

const participationStatusSchema = z.enum(["REGISTERED", "WITHDRAWN"]);

const createParticipationInputSchema = z.object({
  teamId: z.string().uuid({ error: "L’identifiant de l’équipe doit être un UUID valide" }),
}).strict();

const seasonParticipationParamsSchema = z.object({
  seasonId: z.string().uuid({ error: "L’identifiant de la saison doit être un UUID valide" }),
  teamId: z.string().uuid({ error: "L’identifiant de l’équipe doit être un UUID valide" }),
}).strict();

export {
  createParticipationInputSchema,
  participationStatusSchema,
  seasonParticipationParamsSchema,
};
