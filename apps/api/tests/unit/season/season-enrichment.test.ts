import { describe, expect, it } from "vitest";
import { sameIdentity, validateCalendar, type Enrichment } from "../../../bin/lib/season-enrichment";

function calendar(): Enrichment {
  const data: Enrichment = { collectedOn: "2026-11-16", season: "2026 - 2027", teams: [], players: [], matches: [], goals: [] };
  for (const division of ["d1", "d2"] as const) {
    const names = Array.from({ length: division === "d1" ? 12 : 11 }, (_, i) => `${division}-${i}`);
    data.teams.push(...names.map((name) => ({ name, division, source: "https://example.org/teams", logoUrl: null })));
    const rotation: (string | null)[] = [...names];
    if (rotation.length % 2) rotation.push(null);
    for (let day = 1; day <= 11; day++) {
      for (let i = 0; i < rotation.length / 2; i++) {
        const home = rotation[i]; const away = rotation[rotation.length - i - 1];
        if (!home || !away) continue;
        for (const reverse of [false, true]) data.matches.push({ division, day: day + (reverse ? 11 : 0),
          home: reverse ? away : home, away: reverse ? home : away, date: null, time: null, provisionalDate: null,
          stadium: null, homeScore: null, awayScore: null, status: "SCHEDULED", source: "https://example.org/match",
          detailSource: "https://example.org/match", sourceMatchId: `${division}-${day}-${i}-${reverse}` });
      }
      rotation.splice(1, 0, rotation.pop()!);
    }
  }
  return data;
}

describe("season data enrichment preflight", () => {
  it("accepts 132 D1 and 110 D2 matches with a genuine D2 bye rather than a fake team", () => {
    const data = calendar();
    expect(data.matches).toHaveLength(242);
    expect(() => validateCalendar(data)).not.toThrow();
  });
  it("rejects a repeated participant before any mutation", () => {
    const data = calendar(); data.matches[1].home = data.matches[0].home;
    expect(() => validateCalendar(data)).toThrow(/repeated team/);
  });
  it("rejects a future final result even when scores and programming are complete", () => {
    const data = calendar(); Object.assign(data.matches[0], { date: "2027-01-01", time: "15:00", status: "COMPLETED", homeScore: 0, awayScore: 0 });
    expect(() => validateCalendar(data)).toThrow(/future result/);
  });
  it("rejects scores on an unpublished draft", () => {
    const data = calendar(); data.matches[0].homeScore = 0;
    expect(() => validateCalendar(data)).toThrow(/Scheduled match with scores/);
  });
  it("rejects contradictory identities sharing a source id", () => {
    const data = calendar();
    const player = { sourceId: "1", firstName: "Emma", lastName: "Martin", birthday: "2000-01-01", nationality: null, position: "Milieu", team: "d1-0", source: "https://example.org/player", joinedAt: null };
    data.players = [player, { ...player, birthday: "2001-01-01" }];
    expect(() => validateCalendar(data)).toThrow(/Conflicting identity/);
  });
  it("normalizes names without merging homonyms with different birthdays", () => {
    const player = { firstName: " Emma ", lastName: "MARTIN", birthday: "2000-01-01" };
    expect(sameIdentity(player, { firstName: "emma", lastName: "Martin", birthday: "2000-01-01" })).toBe(true);
    expect(sameIdentity(player, { firstName: "emma", lastName: "Martin", birthday: "2001-01-01" })).toBe(false);
  });
});
