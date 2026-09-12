import { z } from "zod";
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE, MAX_SEARCH_LENGTH } from "../constants/pagination";

const emptyToNull = (value: unknown): unknown => {
  if (typeof value === "string" && value.trim() === "") {
    return null;
  }

  return value;
};

const createTeamInputSchema = z.object({
  name: z.string({ error: "Nom requis" })
    .trim()
    .min(1, { error: "Nom requis" })
    .max(150, { error: "Le nom ne peut pas dépasser 150 caractères" }),
  logoUrl: z.preprocess(
    emptyToNull,
    z.string().trim().pipe(z.url()).nullable().optional(),
  ),
  stadium: z.preprocess(
    emptyToNull,
    z.string().trim().max(150, {
      error: "Le stade ne peut pas dépasser 150 caractères",
    }).nullable().optional(),
  ),
}).strict();

const teamListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
  pageSize: z.coerce.number().int().refine((value) => value === DEFAULT_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  search: z.preprocess((value) => typeof value === "string" ? value.trim() || undefined : value, z.string().max(MAX_SEARCH_LENGTH).optional()),
  status: z.enum(["ALL", "ACTIVE", "INACTIVE"]).default("ALL"),
  sortBy: z.enum(["name", "createdAt"]).default("name"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
}).strict();

const updateTeamInputSchema = z.object({
  name: createTeamInputSchema.shape.name.optional(),
  logoUrl: z.union([z.string().trim().pipe(z.url()), z.null()]).optional(),
  stadium: z.union([z.string().trim().max(150), z.null()]).optional(),
  isActive: z.boolean().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, { message: "Au moins un champ doit être modifié" });

const teamIdParamsSchema = z.object({ teamId: z.string().uuid() }).strict();

export { createTeamInputSchema, teamIdParamsSchema, teamListQuerySchema, updateTeamInputSchema };
