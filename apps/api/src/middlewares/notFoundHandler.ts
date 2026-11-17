import type { RequestHandler } from "express";
import { AppError } from "../errors/AppError";

const notFoundHandler: RequestHandler = (_request, _response, next) => {
  next(new AppError(404, "RESOURCE_NOT_FOUND", "Resource not found"));
};

export { notFoundHandler };
