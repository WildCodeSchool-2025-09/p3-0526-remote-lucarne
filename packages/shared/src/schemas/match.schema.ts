import { z } from "zod";
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from "../constants/pagination";

// Civil date/time in Paris, never an ISO instant or a fixed UTC offset.
const MATCH_TIME_ZONE = "Europe/Paris" as const;

const matchStatusSchema = z.enum(["SCHEDULED", "IN_PROGRESS", "COMPLETED"]);

const matchDateSchema = z.iso.date();

const matchStartTimeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "L'heure doit être au format HH:mm");

const matchStadiumSchema = z.string().trim().min(1).max(150);

const matchVersionSchema = z.number().int().min(0).max(2_147_483_647);

const matchScoreSchema = z.number().int().min(0).max(2_147_483_647);

// Manual slot creation; automatic generation reuses the existing association input.
const createMatchInputSchema = z.object({ matchdayId: z.string().uuid() }).strict();

const updateMatchInputSchema = z.object({
  version: matchVersionSchema,
  matchdayId: z.string().uuid().optional(),
  homeTeamId: z.string().uuid().nullable().optional(),
  awayTeamId: z.string().uuid().nullable().optional(),
  matchDate: matchDateSchema.nullable().optional(),
  startTime: matchStartTimeSchema.nullable().optional(),
  stadium: matchStadiumSchema.nullable().optional(),
}).strict().superRefine((input, context) => {
  if (!Object.entries(input).some(([key, value]) => key !== "version" && value !== undefined)) {
    context.addIssue({
      code: "custom",
      message: "Au moins un champ métier doit être modifié",
      path: ["request"],
    });
  }
  if (input.homeTeamId != null && input.homeTeamId === input.awayTeamId) {
    context.addIssue({
      code: "custom",
      message: "Les équipes doivent être différentes",
      path: ["awayTeamId"],
    });
  }
});

// Validate the persisted, merged state before publication and every published update.
// Registration, current status permissions and conflicts require server-side checks.
const matchPublicationSchema = z.object({
  matchdayId: z.string().uuid(),
  homeTeamId: z.string().uuid(),
  awayTeamId: z.string().uuid(),
  matchDate: matchDateSchema,
  startTime: matchStartTimeSchema,
  stadium: matchStadiumSchema.nullable(),
}).strict().refine(
  ({ homeTeamId, awayTeamId }) => homeTeamId !== awayTeamId,
  {
    message: "Les équipes doivent être différentes",
    path: ["awayTeamId"],
  },
);

const publishMatchInputSchema = z.object({ version: matchVersionSchema }).strict();
// Structural contract only: this schema does not authorize a status transition.
const updateMatchStatusInputSchema = z.object({
  version: matchVersionSchema,
  status: matchStatusSchema,
}).strict();

const updateMatchResultInputSchema = z.object({
  version: matchVersionSchema,
  homeScore: matchScoreSchema,
  awayScore: matchScoreSchema,
}).strict();

const deleteMatchInputSchema = z.object({ version: matchVersionSchema }).strict();

const matchListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
  pageSize: z.coerce.number().int().refine(
    (value) => value === DEFAULT_PAGE_SIZE,
    {
      message: `pageSize must be ${DEFAULT_PAGE_SIZE}`,
    },
  ).default(DEFAULT_PAGE_SIZE),
  leagueId: z.string().uuid().optional(),
  seasonId: z.string().uuid().optional(),
  matchdayId: z.string().uuid().optional(),
  teamId: z.string().uuid().optional(),
  status: matchStatusSchema.optional(),
  dateFrom: matchDateSchema.optional(),
  dateTo: matchDateSchema.optional(),
  sortBy: z.enum(["matchDate"]).default("matchDate"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
}).strict().refine(
  ({ dateFrom, dateTo }) => dateFrom === undefined || dateTo === undefined || dateTo >= dateFrom,
  {
    message: "La fin de période doit être postérieure ou égale au début",
    path: ["dateTo"],
  },
);

export {
  MATCH_TIME_ZONE,
  createMatchInputSchema,
  deleteMatchInputSchema,
  matchDateSchema,
  matchListQuerySchema,
  matchPublicationSchema,
  matchStartTimeSchema,
  matchStatusSchema,
  publishMatchInputSchema,
  updateMatchInputSchema,
  updateMatchResultInputSchema,
  updateMatchStatusInputSchema,
};
