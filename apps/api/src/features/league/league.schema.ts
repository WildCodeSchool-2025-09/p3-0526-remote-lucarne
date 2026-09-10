import { z } from "zod";
import type { CreateLeagueInput } from "@lucarne/shared";

const createLeagueBodySchema = z.object({
  name: z.string().trim().min(1).max(150),
  country: z.string().trim().min(1).max(100),
  logoUrl: z.string().trim().pipe(z.url()).optional(),
  isActive: z.boolean().optional(),
}).strict();

export { createLeagueBodySchema };
export type { CreateLeagueInput };
