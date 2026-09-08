interface PaginationMetadata {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMetadata;
}

export type { PaginatedResponse, PaginationMetadata };
