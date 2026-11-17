import { describe, expect, it } from "vitest";
import { calculateStandings, type RankingMatch } from "../../../src/features/ranking/ranking.calculation";

const teams = ["Alpha", "Beta", "Gamma"].map((name, index) => ({ id: String(index), name, logoUrl: null, stadium: null }));
const match = (homeScore: number, awayScore: number, extra: Partial<RankingMatch> = {}): RankingMatch => ({ matchPublicId: "public-match", homeTeamId: "0", awayTeamId: "1", homeScore, awayScore, matchDate: new Date("2026-10-18"), ...extra });

describe("MVP read-only standings", () => {
  it.each([[2, 1, 3, 0], [0, 0, 1, 1], [0, 1, 0, 3]])("applies %i:%i to both teams with zero scores preserved", (home, away, homePoints, awayPoints) => {
    const rows = calculateStandings(teams, [match(home, away)]);
    expect(rows.find((row) => row.team.id === "0")).toMatchObject({ points: homePoints, played: 1, goalsFor: home, goalsAgainst: away });
    expect(rows.find((row) => row.team.id === "1")).toMatchObject({ points: awayPoints, played: 1, goalsFor: away, goalsAgainst: home });
    expect(rows.find((row) => row.team.id === "2")).toMatchObject({ points: 0, played: 0, form: [] });
  });

  it("rebuilds corrections idempotently and orders equal points by goal difference", () => {
    const input = [match(2, 0), match(0, 1)];
    const before = structuredClone(input);
    const rows = calculateStandings(teams, input);
    expect(rows[0].team.id).toBe("0");
    expect(rows[0].points).toBe(3); expect(rows[1].points).toBe(3);
    expect(calculateStandings(teams, input)).toEqual(rows);
    expect(input).toEqual(before);
    expect(calculateStandings(teams, [match(0, 2), match(0, 1)])[0]).toMatchObject({ team: { id: "1" }, points: 6 });
  });

  it("uses names then UUID for teams without matches and limits form to five newest records", () => {
    const rows = calculateStandings([...teams].reverse(), []);
    expect(rows.map((row) => row.team.name)).toEqual(["Alpha", "Beta", "Gamma"]);
    const duplicateNames = calculateStandings([{ ...teams[0], id: "b" }, { ...teams[0], id: "a" }], []);
    expect(duplicateNames.map((row) => row.team.id)).toEqual(["a", "b"]);
    expect(calculateStandings(teams, Array.from({ length: 8 }, () => match(1, 0)))[0]).toMatchObject({ played: 8, points: 24, form: Array.from({ length: 5 }, () => ({ result: "WIN", date: "2026-10-18", matchPublicId: "public-match" })) });
  });

  it("refuses incomplete results instead of publishing a partial table", () => {
    expect(() => calculateStandings(teams, [match(0, 0, { homeScore: null })])).toThrow("Incomplete ranking match");
    expect(() => calculateStandings(teams, [match(0, 0, { awayTeamId: "missing" })])).toThrow("Missing ranking participant");
  });
});
