import { z } from "zod";
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE, MAX_SEARCH_LENGTH } from "../constants/pagination";

const leagueStatusSchema = z.enum(["ACTIVE", "INACTIVE"]);
const leagueStatusFilterSchema = z.enum(["ALL", "ACTIVE", "INACTIVE"]);

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
  sortBy: z.literal("name").default("name"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
}).strict();

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

export {
  createLeagueInputSchema,
  countriesQuerySchema,
  leagueListQuerySchema,
  leagueStatusFilterSchema,
  leagueStatusSchema,
};
