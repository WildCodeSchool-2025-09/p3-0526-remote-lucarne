import type { HealthResponse } from "@lucarne/shared";
import type { RequestHandler } from "express";

const getHealth: RequestHandler<
  Record<string, never>,
  HealthResponse
> = (_request, response) => {
  response.status(200).json({ status: "ok" });
};

export { getHealth };
