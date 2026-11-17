import { z } from "zod";
import {
  DEFAULT_LIMIT,
  DEFAULT_PAGE,
  MAX_LIMIT,
  MAX_SEARCH_LENGTH,
} from "../constants/pagination";

const searchQuerySchema = z.string().trim().min(1).max(MAX_SEARCH_LENGTH);

const sortQuerySchema = z.string().trim().regex(
  /^-?[a-z][A-Za-z0-9]*$/,
  "Sort must be a camelCase field optionally prefixed with '-'",
);

const createSortQuerySchema = <
  const Fields extends readonly [string, ...string[]],
>(allowedFields: Fields) => sortQuerySchema.refine((sort) => {
  const field = sort.startsWith("-") ? sort.slice(1) : sort;

  return allowedFields.some((allowedField) => allowedField === field);
}, "Unsupported sort field");

const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_LIMIT)
    .default(DEFAULT_LIMIT),
  search: searchQuerySchema.optional(),
  sort: sortQuerySchema.optional(),
});

type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export {
  createSortQuerySchema,
  paginationQuerySchema,
  searchQuerySchema,
  sortQuerySchema,
};
export type { PaginationQuery };
