import type { ErrorRequestHandler } from "express";
import { mapErrorToAppError } from "../errors/mapErrorToAppError";
import { AppError } from "../errors/AppError";
import type { ApiErrorResponse } from "@lucarne/shared";

const errorHandler: ErrorRequestHandler = (error, request, response, next) => {
  void next;

  const status = typeof error === "object" && error != null && "status" in error
    ? (error as { status?: unknown }).status
    : undefined;
  const safeStatus = typeof status === "number" ? status : undefined;
  let appError = mapErrorToAppError(error);
  if (appError == null && error instanceof SyntaxError && safeStatus === 400) {
    appError = new AppError(400, "INVALID_JSON", "Request body contains invalid JSON");
  }
  if (appError == null && error instanceof Error && error.name === "PayloadTooLargeError") {
    appError = new AppError(413, "PAYLOAD_TOO_LARGE", "Request body is too large");
  }
  appError ??= new AppError(500, "INTERNAL_SERVER_ERROR", "An unexpected error occurred");

  // Route patterns omit user-controlled URL segments, query strings and bodies.
  const route: unknown = request.route;
  const routePattern = typeof route === "object" && route != null
    && "path" in route && typeof route.path === "string" ? route.path : "unmatched";
  console.error(JSON.stringify({
    event: "request_error",
    method: request.method,
    route: routePattern,
    status: appError.statusCode,
    code: appError.code,
  }));

  const payload: ApiErrorResponse = {
    error: {
      code: appError.code,
      message: appError.message,
      ...(appError.details == null ? {} : { details: appError.details }),
    },
  };
  response.status(appError.statusCode).json(payload);
};

export { errorHandler };
