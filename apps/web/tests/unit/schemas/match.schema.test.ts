import { describe, expect, it } from "vitest";
import { matchProgrammingFormSchema, matchResultFormSchema, toMatchProgrammingInput } from "../../../src/schemas/match.schema";
const values = { version: 4, matchdayId: "00000000-0000-4000-8000-000000000001", homeTeamId: "", awayTeamId: "", matchDate: "", startTime: "", stadium: "" };
describe("MATCH form adapters", () => {
  it("omits untouched fields and clears only an explicitly emptied field", () => {
    expect(toMatchProgrammingInput(values, { stadium: true })).toEqual({ version: 4, stadium: null });
    expect(toMatchProgrammingInput({ ...values, startTime: "02:30" }, { startTime: true })).toEqual({ version: 4, startTime: "02:30" });
  });
  it("keeps the Paris civil date and time and trims the optional venue", () => {
    const parsed = matchProgrammingFormSchema.parse({ ...values, matchDate: "2026-10-25", startTime: "02:30", stadium: " Terrain " });
    expect(toMatchProgrammingInput(parsed, { matchDate: true, startTime: true, stadium: true })).toEqual({ version: 4, matchDate: "2026-10-25", startTime: "02:30", stadium: "Terrain" });
  });
  it("does not convert missing scores to zero", () => {
    expect(matchResultFormSchema.safeParse({ homeScore: "", awayScore: "0" }).success).toBe(false);
    expect(matchResultFormSchema.safeParse({ homeScore: " ", awayScore: "0" }).success).toBe(false);
    expect(matchResultFormSchema.parse({ homeScore: "0", awayScore: "0" })).toEqual({ version: 0, homeScore: 0, awayScore: 0 });
  });
  it.each(["-1", "1.5", "2147483648", "abc"])("rejects invalid score %s", (score) => {
    expect(matchResultFormSchema.safeParse({ homeScore: score, awayScore: "0" }).success).toBe(false);
  });
});
