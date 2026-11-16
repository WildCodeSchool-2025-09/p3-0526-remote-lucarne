export function publicPagination<T>(data: T[], total: number, query: { page: number; limit: number }) {
  return { data, pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } };
}
