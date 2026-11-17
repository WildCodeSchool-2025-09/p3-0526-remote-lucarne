import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { matchImportDocumentSchema } from "../../../src/schemas/matchImport.schema";

const fixture = () => matchImportDocumentSchema.parse(JSON.parse(readFileSync(new URL("../../fixtures/season-match-import.json", import.meta.url), "utf8")));
describe("Season match import document", () => {
  it("accepts the supplied complete season with confirmed results and provisional rounds", () => {
    const document = matchImportDocumentSchema.parse(fixture());
    expect(document.matchs).toHaveLength(132);
    expect(document.matchs.filter((match) => match.etat === "COMPLETED")).toHaveLength(24);
    expect(document.matchs.filter((match) => !match.dateConfirmee)).toHaveLength(90);
    expect(new Set(document.matchs.map((match) => match.journee)).size).toBe(22);
  });
  it("accepts zero scores as results", () => {
    const document = fixture();
    document.matchs[0].scoreDomicile = 0; document.matchs[0].scoreExterieur = 0;
    expect(matchImportDocumentSchema.safeParse(document).success).toBe(true);
  });
  it.each([
    { timezone: "UTC" }, { matchs: [] }, { unknown: true },
  ])("rejects invalid document fields %j", (changes) => {
    expect(matchImportDocumentSchema.safeParse({ ...fixture(), ...changes }).success).toBe(false);
  });
  it.each([
    { date: "2026-02-30" }, { heureParis: "24:00" }, { scoreDomicile: null },
    { scoreDomicile: -1 }, { scoreExterieur: 1.5 }, { dateConfirmee: false },
    { pretPourPublication: false }, { publicationDemandee: false },
    { etat: "SCHEDULED" }, { sourceCalendrier: "javascript:alert(1)" },
  ])("rejects invalid or unpublishable result %j", (changes) => {
    const document = fixture(); Object.assign(document.matchs[0], changes);
    expect(matchImportDocumentSchema.safeParse(document).success).toBe(false);
  });
});
