import type { RequestHandler } from "express";
import { publicSearchQuerySchema, publicSearchResponseSchema } from "@lucarne/shared";
import { asyncHandler } from "../../utils/asyncHandler";
import { searchPublicResourcesService } from "./search.service";

export const searchPublicResourcesResponse: RequestHandler = asyncHandler(async (request, response) => {
  response.json(publicSearchResponseSchema.parse(await searchPublicResourcesService(publicSearchQuerySchema.parse(request.query))));
});
