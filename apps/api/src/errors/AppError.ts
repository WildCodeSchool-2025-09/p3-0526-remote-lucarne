import type { ApiErrorDetail } from "@lucarne/shared";

class AppError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
    readonly details?: ApiErrorDetail[],
  ) {
    super(message);
    this.name = "AppError";
  }
}

export { AppError };
