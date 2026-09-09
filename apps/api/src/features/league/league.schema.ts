import { z } from "zod";

const createLeagueBodySchema = z.object({
  name: z.string().trim().min(1).max(150),
  country: z.string().trim().min(1).max(100),
  logoUrl: z.string().trim().pipe(z.url()).optional(),
  isActive: z.boolean().optional(),
}).strict();

type CreateLeagueInput = z.infer<typeof createLeagueBodySchema>;

export { createLeagueBodySchema };
export type { CreateLeagueInput };
