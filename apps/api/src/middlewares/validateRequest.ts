import type { RequestHandler } from "express";
import { z } from "zod";

interface RequestSchemas {
  body?: z.ZodType;
  params?: z.ZodType;
  query?: z.ZodType;
}

const validateRequest = (schemas: RequestSchemas): RequestHandler => {
  const requestSchema = z.object({
    body: schemas.body ?? z.unknown(),
    params: schemas.params ?? z.unknown(),
    query: schemas.query ?? z.unknown(),
  });

  return (request, _response, next) => {
    const result = requestSchema.safeParse({
      body: request.body as unknown,
      params: request.params,
      query: request.query,
    });

    if (!result.success) {
      next(result.error);
      return;
    }

    if (schemas.body != null) {
      request.body = result.data.body;
    }

    if (schemas.params != null) {
      request.params = result.data.params as typeof request.params;
    }

    if (schemas.query != null) {
      request.query = result.data.query as typeof request.query;
    }

    next();
  };
};

export { validateRequest };
export type { RequestSchemas };
