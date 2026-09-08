interface ApiError {
  code: string;
  message: string;
}

interface ApiErrorResponse {
  error: ApiError;
}

export type { ApiError, ApiErrorResponse };
