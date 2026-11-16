import { z } from "zod";
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE, MAX_SEARCH_LENGTH } from "../constants/pagination";
import { createTeamInputSchema, teamListQuerySchema } from "./team.schema";

const leagueStatusSchema = z.enum(["ACTIVE", "INACTIVE"]);
const leagueStatusFilterSchema = z.enum(["ALL", "ACTIVE", "INACTIVE"]);
const leagueNameSchema = z.string({ error: "Nom requis" })
  .trim()
  .min(1, { error: "Nom requis" })
  .max(150, { error: "Le nom ne peut pas dépasser 150 caractères" });
const leagueCountrySchema = z.string({ error: "Pays requis" })
  .trim()
  .min(1, { error: "Pays requis" })
  .max(100, { error: "Le pays ne peut pas dépasser 100 caractères" });
const leagueLogoUrlSchema = z.string().trim().pipe(z.url());

const leagueSlugSchema = z.string().min(1).max(190).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const publicLeagueNavigationItemSchema = z.object({
  id: z.uuid(),
  slug: leagueSlugSchema,
  name: leagueNameSchema,
  country: leagueCountrySchema,
  logoUrl: z.string().nullable(),
}).strict();
const publicLeagueNavigationResponseSchema = z.array(publicLeagueNavigationItemSchema);
const publicLeagueSeasonSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1).max(100),
  isCurrent: z.boolean(),
}).strict();
const publicLeagueDetailSchema = publicLeagueNavigationItemSchema.omit({ country: true }).extend({
  country: leagueCountrySchema.optional(),
  seasons: z.array(publicLeagueSeasonSchema),
}).strict();
const publicLeagueTeamsQuerySchema = teamListQuerySchema.pick({ page: true, pageSize: true }).extend({
  pageSize: teamListQuerySchema.shape.pageSize.pipe(z.literal(DEFAULT_PAGE_SIZE)),
}).strict();
const publicLeagueTeamSchema = z.object({
  id: z.uuid(), name: createTeamInputSchema.shape.name, logoUrl: z.string().nullable(),
}).strict();
const publicLeagueTeamsResponseSchema = z.object({
  data: z.array(publicLeagueTeamSchema),
  pagination: z.object({
    page: z.number().int().min(1), pageSize: z.literal(DEFAULT_PAGE_SIZE),
    totalItems: z.number().int().min(0), totalPages: z.number().int().min(0),
  }).strict(),
}).strict();

const countriesQuerySchema = z.preprocess((value) => {
  if (typeof value === "string") {
    return value.split(",").map((country) => country.trim()).filter(Boolean);
  }

  if (Array.isArray(value)) {
    const values: unknown[] = value;

    return values.flatMap((country: unknown): unknown[] => typeof country === "string"
      ? country.split(",").map((item) => item.trim()).filter(Boolean)
      : [country]);
  }

  return value;
}, z.array(z.string().min(1)).optional());

const leagueListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
  pageSize: z.coerce.number()
    .int()
    .refine((pageSize) => pageSize === DEFAULT_PAGE_SIZE, {
      message: `pageSize must be ${DEFAULT_PAGE_SIZE}`,
    })
    .default(DEFAULT_PAGE_SIZE),
  search: z.preprocess(
    (value) => typeof value === "string" ? value.trim() || undefined : value,
    z.string().max(MAX_SEARCH_LENGTH).optional(),
  ),
  countries: countriesQuerySchema,
  status: leagueStatusFilterSchema.default("ALL"),
  sortBy: z.enum(["name", "createdAt"]).default("name"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
}).strict();

const createLeagueInputSchema = z.object({
  name: leagueNameSchema,
  country: leagueCountrySchema,
  logoUrl: leagueLogoUrlSchema.optional(),
  isActive: z.boolean().optional(),
}).strict();

const deleteLeagueInputSchema = z.object({
  confirm: z.literal(true, { error: "La confirmation de suppression est requise" }),
}).strict();

const updateLeagueInputSchema = z.object({
  name: leagueNameSchema.optional(),
  country: leagueCountrySchema.optional(),
  logoUrl: z.union([leagueLogoUrlSchema, z.null()]).optional(),
  isActive: z.boolean().optional(),
  version: z.number({ error: "Version requise" })
    .int({ error: "La version doit être un entier" })
    .min(0, { error: "La version doit être supérieure ou égale à 0" }),
}).strict().refine(
  ({ name, country, logoUrl, isActive }) =>
    name !== undefined
    || country !== undefined
    || logoUrl !== undefined
    || isActive !== undefined,
  { message: "Au moins un champ métier doit être modifié", path: ["request"] },
);

export {
  createLeagueInputSchema,
  deleteLeagueInputSchema,
  countriesQuerySchema,
  leagueListQuerySchema,
  leagueStatusFilterSchema,
  leagueStatusSchema,
  leagueCountrySchema,
  leagueLogoUrlSchema,
  leagueSlugSchema,
  publicLeagueNavigationItemSchema,
  publicLeagueNavigationResponseSchema,
  publicLeagueSeasonSchema,
  publicLeagueDetailSchema,
  publicLeagueTeamsQuerySchema,
  publicLeagueTeamSchema,
  publicLeagueTeamsResponseSchema,
  leagueNameSchema,
  updateLeagueInputSchema,
};
