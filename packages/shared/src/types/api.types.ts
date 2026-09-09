interface ApiErrorDetail {
  field: string;
  message: string;
}

interface ApiError {
  code: string;
  message: string;
  details?: ApiErrorDetail[];
}

interface ApiErrorResponse {
  error: ApiError;
}

export type { ApiError, ApiErrorDetail, ApiErrorResponse };
