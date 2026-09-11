import type { ErrorRequestHandler } from "express";
import { mapErrorToAppError } from "../errors/mapErrorToAppError";
import type { ApiErrorResponse } from "@lucarne/shared";

const errorHandler: ErrorRequestHandler = (error, request, response, next) => {
  void next;

  console.error(error);
  console.error("on request:", request.method, request.path);

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

  response.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred",
    },
  });
};

export { errorHandler };
