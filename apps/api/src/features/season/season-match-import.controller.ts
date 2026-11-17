import type { RequestHandler } from "express";
import type { MatchImportApply, MatchImportDocument, MatchImportPreview, MatchImportResult } from "@lucarne/shared";
import { asyncHandler } from "../../utils/asyncHandler";
import { applySeasonMatchImportService, previewSeasonMatchImportService } from "./season-match-import.service";

const previewSeasonMatchImport: RequestHandler<{ leagueId: string; seasonId: string }, MatchImportPreview, MatchImportDocument> = asyncHandler(async (request, response) => {
  response.json(await previewSeasonMatchImportService(request.params.leagueId, request.params.seasonId, request.body));
});
const applySeasonMatchImport: RequestHandler<{ leagueId: string; seasonId: string }, MatchImportResult, MatchImportApply> = asyncHandler(async (request, response) => {
  response.json(await applySeasonMatchImportService(request.params.leagueId, request.params.seasonId, request.body));
});
export { applySeasonMatchImport, previewSeasonMatchImport };
