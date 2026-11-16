import type { z } from "zod";
import type { matchImportApplySchema, matchImportDocumentSchema, matchImportPreviewSchema, matchImportResultSchema, matchImportRowSchema } from "../schemas/matchImport.schema";

type MatchImportDocument = z.infer<typeof matchImportDocumentSchema>;
type MatchImportRow = z.infer<typeof matchImportRowSchema>;
type MatchImportApply = z.infer<typeof matchImportApplySchema>;
type MatchImportPreview = z.infer<typeof matchImportPreviewSchema>;
type MatchImportResult = z.infer<typeof matchImportResultSchema>;

export type { MatchImportApply, MatchImportDocument, MatchImportPreview, MatchImportResult, MatchImportRow };
