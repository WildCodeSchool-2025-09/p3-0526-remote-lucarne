import type { RequestHandler } from "express";
import { getHealthStatus } from "./health.service";
import type { HealthResponse } from "@lucarne/shared";

const getHealth: RequestHandler<
  Record<string, never>,
  HealthResponse
> = (_request, response) => {
  response.status(200).json(getHealthStatus());
};

export { getHealth };
