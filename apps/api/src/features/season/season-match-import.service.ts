import { MATCH_IMPORT_MAX_BYTES, type MatchImportApply, type MatchImportDocument } from "@lucarne/shared";
import { Prisma } from "../../generated/prisma/client";
import { AppError } from "../../errors/AppError";
import { getPostgresSqlState } from "../../errors/mapErrorToAppError";
import { applySeasonMatchImport, previewSeasonMatchImport } from "./season-match-import.repository";

async function withImportError<T>(operation: () => Promise<T>): Promise<T> {
  try { return await operation(); } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      const state = getPostgresSqlState(error);
      const adapter = error.meta?.driverAdapterError;
      const cause = adapter !== null && typeof adapter === "object" && "cause" in adapter ? adapter.cause : undefined;
      const writeConflict = cause !== null && typeof cause === "object" && "kind" in cause && cause.kind === "TransactionWriteConflict";
      if (error.code === "P2034" || state === "40001" || state === "40P01" || writeConflict) throw new AppError(409, "RESOURCE_VERSION_CONFLICT", "Le calendrier a changé pendant l’import. Analysez à nouveau le fichier.");
      if (error.code === "P2028" || state === "57014") throw new AppError(503, "MATCH_IMPORT_TIMEOUT", "L’import a dépassé le délai autorisé et a été annulé. Aucun match n’a été modifié.");
    }
    throw error;
  }
}
const assertImportSize = (input: unknown) => {
  if (Buffer.byteLength(JSON.stringify(input), "utf8") > MATCH_IMPORT_MAX_BYTES) throw new AppError(413, "PAYLOAD_TOO_LARGE", "Le contenu JSON ne doit pas dépasser 90 Ko.");
};
const previewSeasonMatchImportService = (leagueId: string, seasonId: string, document: MatchImportDocument) => {
  assertImportSize({ document, snapshot: "0".repeat(64) });
  return withImportError(() => previewSeasonMatchImport(leagueId, seasonId, document));
};
const applySeasonMatchImportService = (leagueId: string, seasonId: string, input: MatchImportApply) => {
  assertImportSize(input);
  return withImportError(() => applySeasonMatchImport(leagueId, seasonId, input));
};
export { applySeasonMatchImportService, previewSeasonMatchImportService };
