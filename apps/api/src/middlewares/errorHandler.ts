import type { ErrorRequestHandler } from "express";
import { mapErrorToAppError } from "../errors/mapErrorToAppError";
import type { ApiErrorResponse } from "@lucarne/shared";

const errorHandler: ErrorRequestHandler = (error, request, response, next) => {
  void next;

  const status = typeof error === "object" && error != null && "status" in error
    ? (error as { status?: unknown }).status
    : undefined;
  const safeStatus = typeof status === "number" ? status : undefined;
  console.error(JSON.stringify({
    event: "request_error",
    method: request.method,
    path: request.path,
    status: safeStatus,
    code: error instanceof Error ? error.name : "UNKNOWN_ERROR",
  }));

  const appError = mapErrorToAppError(error);

  if (appError != null) {
    const payload: ApiErrorResponse = {
      error: {
        code: appError.code,
        message: appError.message,
        ...(appError.details == null
          ? {}
          : { details: appError.details }),
      },
    };

    response.status(appError.statusCode).json(payload);
    return;
  }

  if (error instanceof SyntaxError && safeStatus === 400) {
    response.status(400).json({ error: { code: "INVALID_JSON", message: "Request body contains invalid JSON" } });
    return;
  }

  if (error instanceof Error && error.name === "PayloadTooLargeError") {
    response.status(413).json({ error: { code: "PAYLOAD_TOO_LARGE", message: "Request body is too large" } });
    return;
  }

  response.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred",
    },
  });
};

export { errorHandler };
