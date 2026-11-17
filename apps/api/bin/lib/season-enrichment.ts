import { z } from "zod";

export const enrichmentSchema = z.object({
  collectedOn: z.iso.date(),
  season: z.literal("2026 - 2027"),
  teams: z.array(z.object({ name: z.string().min(1), division: z.enum(["d1", "d2"]), source: z.url(), logoUrl: z.url().nullable() })),
  players: z.array(z.object({ sourceId: z.string(), displayName: z.string().optional(), firstName: z.string().min(1), lastName: z.string().min(1),
    birthday: z.iso.date().nullable(), nationality: z.string().nullable(), position: z.string(), team: z.string(), source: z.url(), joinedAt: z.iso.date().nullable() })),
  staff: z.array(z.object({ firstName: z.string().min(1), lastName: z.string().min(1), nationality: z.string().min(1), team: z.string(), jobTitle: z.string(), source: z.url(), nationalitySource: z.url() })).optional(),
  matches: z.array(z.object({ division: z.enum(["d1", "d2"]), day: z.number().int().min(1).max(22), home: z.string(), away: z.string(),
    date: z.iso.date().nullable(), time: z.string().regex(/^\d{2}:\d{2}$/).nullable(), provisionalDate: z.iso.date().nullable(),
    stadium: z.string().nullable(), homeScore: z.number().int().min(0).nullable(), awayScore: z.number().int().min(0).nullable(),
    status: z.enum(["SCHEDULED", "COMPLETED"]), source: z.url(), detailSource: z.url(), sourceMatchId: z.string() })),
  goals: z.array(z.object({ division: z.enum(["d1", "d2"]), sourceMatchId: z.string(), playerSourceId: z.string(), minute: z.number().int().min(0), source: z.url() })),
});
export type Enrichment = z.infer<typeof enrichmentSchema>;
export const normalizeIdentity = (value: string) => value.normalize("NFC").trim().replace(/\s+/g, " ").toLocaleLowerCase("fr");

type Identity = { firstName: string; lastName: string; birthday: string | null };
export function sameIdentity(a: Identity, b: Identity) {
  return normalizeIdentity(a.firstName) === normalizeIdentity(b.firstName)
    && normalizeIdentity(a.lastName) === normalizeIdentity(b.lastName)
    && a.birthday === b.birthday;
}

// Validate the complete round-robin before any mutation, including return legs and byes.
export function validateCalendar(data: Enrichment) {
  for (const division of ["d1", "d2"] as const) {
    const teams = data.teams.filter((team) => team.division === division);
    const expectedTeams = division === "d1" ? 12 : 11;
    if (teams.length !== expectedTeams || new Set(teams.map((team) => normalizeIdentity(team.name))).size !== expectedTeams)
      throw new Error(`Invalid ${division} team list`);
    const teamNames = new Set(teams.map((team) => team.name));
    const matches = data.matches.filter((match) => match.division === division);
    const pairs = new Set<string>();
    for (let day = 1; day <= 22; day++) {
      const rows = matches.filter((match) => match.day === day);
      if (rows.length !== Math.floor(expectedTeams / 2)) throw new Error(`Invalid ${division} matchday ${day}`);
      const used = new Set<string>();
      for (const row of rows) {
        for (const name of [row.home, row.away]) {
          if (!teamNames.has(name) || used.has(name)) throw new Error(`Invalid/repeated team in ${division} matchday ${day}`);
          used.add(name);
        }
        const pair = JSON.stringify([row.home, row.away]);
        if (pairs.has(pair)) throw new Error(`Repeated match in ${division}`);
        pairs.add(pair);
        if (row.status === "COMPLETED" && (!row.date || !row.time || row.homeScore === null || row.awayScore === null || row.date > data.collectedOn))
          throw new Error("Unconfirmed or future result");
        if (row.status === "SCHEDULED" && (row.homeScore !== null || row.awayScore !== null)) throw new Error("Scheduled match with scores");
        if ((row.date === null) !== (row.time === null)) throw new Error("Incomplete confirmed programming");
      }
    }
    for (const match of matches) if (!pairs.has(JSON.stringify([match.away, match.home]))) throw new Error(`Missing return leg in ${division}`);
  }
  const identities = new Map<string, Identity>();
  for (const player of data.players) {
    const previous = identities.get(player.sourceId);
    if (previous && !sameIdentity(previous, player)) throw new Error(`Conflicting identity for source ${player.sourceId}`);
    identities.set(player.sourceId, player);
  }
}
