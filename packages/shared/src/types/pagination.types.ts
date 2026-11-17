interface PaginationMetadata {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

interface PageSizePaginationParams {
  page?: number;
  pageSize?: 20;
}

type PaginationParams = PageSizePaginationParams;

interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMetadata;
}

export type {
  PageSizePaginationParams,
  PaginatedResponse,
  PaginationMetadata,
  PaginationParams,
};
