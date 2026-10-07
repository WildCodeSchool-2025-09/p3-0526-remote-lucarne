import { matchDateSchema, matchStartTimeSchema, matchPublicationSchema, publishMatchInputSchema, updateMatchInputSchema, updateMatchResultInputSchema, type UpdateMatchInput } from "@lucarne/shared";
import { z } from "zod";
const optionalTeam = z.union([z.uuid(), z.literal("")]);
const matchProgrammingFormSchema = z.object({
  version: publishMatchInputSchema.shape.version, matchdayId: z.uuid(), homeTeamId: optionalTeam, awayTeamId: optionalTeam,
  matchDate: z.union([matchDateSchema, z.literal("")]), startTime: z.union([matchStartTimeSchema, z.literal("")]),
  stadium: z.union([matchPublicationSchema.shape.stadium.unwrap(), z.literal("")]),
}).refine((value) => !value.homeTeamId || value.homeTeamId !== value.awayTeamId, { message: "Choisissez deux équipes distinctes.", path: ["awayTeamId"] });
type MatchProgrammingValues = z.infer<typeof matchProgrammingFormSchema>;
function toMatchProgrammingInput(values: MatchProgrammingValues, dirty: Partial<Record<keyof MatchProgrammingValues, boolean>>): UpdateMatchInput {
  const changes: Record<string, string | number | null> = { version: values.version };
  for (const field of ["matchdayId", "homeTeamId", "awayTeamId", "matchDate", "startTime", "stadium"] as const) {
    if (dirty[field]) changes[field] = values[field] || null;
  }
  return updateMatchInputSchema.parse(changes);
}
const matchResultFormSchema = z.object({ homeScore: z.string().trim().regex(/^\d+$/, "Renseignez un score entier positif ou nul."), awayScore: z.string().trim().regex(/^\d+$/, "Renseignez un score entier positif ou nul.") })
  .transform((value) => ({ homeScore: Number(value.homeScore), awayScore: Number(value.awayScore), version: 0 }))
  .pipe(updateMatchResultInputSchema);
export { matchProgrammingFormSchema, matchResultFormSchema, toMatchProgrammingInput };
export type { MatchProgrammingValues };
