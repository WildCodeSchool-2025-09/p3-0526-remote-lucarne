import type { ErrorRequestHandler } from "express";
import { AppError } from "../errors/AppError";

const errorHandler: ErrorRequestHandler = (error, request, response, next) => {
  void next;

  console.error(error);
  console.error("on request:", request.method, request.path);

  if (error instanceof AppError) {
    response.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
      },
    });
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
