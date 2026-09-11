import { z } from "zod";
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE, MAX_SEARCH_LENGTH } from "../constants/pagination";

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
  countriesQuerySchema,
  leagueListQuerySchema,
  leagueStatusFilterSchema,
  leagueStatusSchema,
  leagueCountrySchema,
  leagueLogoUrlSchema,
  leagueNameSchema,
  updateLeagueInputSchema,
};
