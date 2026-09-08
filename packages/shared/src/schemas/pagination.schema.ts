import { z } from "zod";
import {
  DEFAULT_LIMIT,
  DEFAULT_PAGE,
  MAX_LIMIT,
} from "../constants/pagination";

const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_LIMIT)
    .default(DEFAULT_LIMIT),
  sort: z.string().trim().min(1).optional(),
});

type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export { paginationQuerySchema };
export type { PaginationQuery };
