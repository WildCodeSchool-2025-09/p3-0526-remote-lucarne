import type {
  NextFunction,
  Request,
  RequestHandler,
  Response,
} from "express";

type DefaultParams = Request["params"];
type DefaultQuery = Request["query"];

type AsyncRequestHandler<
  Params = DefaultParams,
  ResponseBody = unknown,
  RequestBody = unknown,
  RequestQuery = DefaultQuery,
  Locals extends Record<string, unknown> = Record<string, unknown>,
> = (
  request: Request<Params, ResponseBody, RequestBody, RequestQuery, Locals>,
  response: Response<ResponseBody, Locals>,
  next: NextFunction,
) => Promise<unknown>;

const asyncHandler = <
  Params = DefaultParams,
  ResponseBody = unknown,
  RequestBody = unknown,
  RequestQuery = DefaultQuery,
  Locals extends Record<string, unknown> = Record<string, unknown>,
>(
  handler: AsyncRequestHandler<
    Params,
    ResponseBody,
    RequestBody,
    RequestQuery,
    Locals
  >,
): RequestHandler<Params, ResponseBody, RequestBody, RequestQuery, Locals> =>
  (request, response, next) => {
    void Promise.resolve()
      .then(() => handler(request, response, next))
      .catch(next);
  };

export { asyncHandler };
export type { AsyncRequestHandler };
