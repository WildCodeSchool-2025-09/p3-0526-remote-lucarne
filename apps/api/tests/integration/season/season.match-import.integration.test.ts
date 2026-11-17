import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { matchImportDocumentSchema, matchImportPreviewSchema, type ApiErrorResponse } from "@lucarne/shared";
import prisma from "../../../database/prisma";
import { Prisma } from "../../../src/generated/prisma/client";
import app from "../../../src/app";
import { createAdmin, createAuthenticatedUser } from "../../helpers/auth";

const documentFixture = () => matchImportDocumentSchema.parse(JSON.parse(readFileSync(new URL("../../../../../packages/shared/tests/fixtures/season-match-import.json", import.meta.url), "utf8")));
async function fixture() {
  const document = documentFixture();
  const admin = await createAdmin();
  const league = await prisma.league.create({ data: { name: document.ligue, country: "France", isActive: true } });
  const season = await prisma.season.create({ data: { name: document.saison, startDate: new Date("2026-07-29"), endDate: new Date("2027-06-30") } });
  const edition = await prisma.leagueSeason.create({ data: { leagueId: league.id, seasonId: season.id, matchdayCount: 22, matchesPerMatchday: 6 } });
  const teams = await prisma.team.createManyAndReturn({ data: [...new Set(document.matchs.flatMap((match) => [match.domicile, match.exterieur]))].map((name) => ({ name })) });
  await prisma.participation.createMany({ data: teams.map((team) => ({ teamId: team.id, leagueSeasonId: edition.id })) });
  const days = await prisma.matchday.createManyAndReturn({ data: Array.from({ length: 22 }, (_, index) => ({ leagueSeasonId: edition.id, number: index + 1 })) });
  await prisma.gameMatch.createMany({ data: days.flatMap((day) => Array.from({ length: 6 }, () => ({ matchdayId: day.id }))) });
  const first = document.matchs[0];
  const day = days.find((candidate) => candidate.number === first.journee)!;
  const slot = await prisma.gameMatch.findFirstOrThrow({ where: { matchdayId: day.id }, orderBy: { id: "asc" } });
  const preserved = await prisma.gameMatch.update({ where: { id: slot.id }, data: {
    homeTeamId: teams.find((team) => team.name === first.domicile)!.id,
    awayTeamId: teams.find((team) => team.name === first.exterieur)!.id,
    matchDate: new Date(`${first.date}T00:00:00Z`), startTime: new Date(`1970-01-01T${first.heureParis}:00Z`),
    stadium: "Stade existant à préserver", homeScore: first.scoreDomicile, awayScore: first.scoreExterieur,
    status: "COMPLETED", isPublished: true, version: 5,
  } });
  const player = await prisma.player.create({ data: { firstName: "Test", lastName: "Scorer", birthday: new Date("2000-01-01") } });
  const event = await prisma.matchEvent.create({ data: { matchId: preserved.id, playerId: player.id, minute: 5 } });
  const base = `/api/v1/leagues/${league.id}/seasons/${season.id}/matches`;
  const preview = () => request(app).post(`${base}/import-preview`).auth(admin.accessToken, { type: "bearer" }).send(document);
  const apply = (snapshot: string) => request(app).post(`${base}/import`).auth(admin.accessToken, { type: "bearer" }).send({ document, snapshot });
  return { document, admin, league, season, edition, teams, days, preserved, event, base, preview, apply };
}

describe("Admin season JSON import", () => {
  it("previews the exact supplied 132 matches, imports atomically, preserves history and is idempotent", async () => {
    const setup = await fixture();
    const before = await prisma.gameMatch.findMany({ orderBy: { id: "asc" } });
    const response = await setup.preview().expect(200);
    const preview = matchImportPreviewSchema.parse(response.body);
    expect(preview.summary).toEqual({ total: 132, toImport: 131, preserved: 1, toPublish: 41, completed: 23, scheduled: 108, drafts: 90, provisionalDates: 90 });
    expect(preview.warnings.join(" ")).toContain("diffèrent");
    expect(await prisma.gameMatch.findMany({ orderBy: { id: "asc" } })).toEqual(before);
    await setup.apply(preview.snapshot).expect(200);
    const after = await prisma.gameMatch.findMany({ orderBy: { id: "asc" } });
    expect(after.map((match) => [match.id, match.matchPublicId])).toEqual(before.map((match) => [match.id, match.matchPublicId]));
    expect(after.find((match) => match.id === setup.preserved.id)).toEqual(setup.preserved);
    expect(await prisma.matchEvent.findUnique({ where: { id: setup.event.id } })).toEqual(setup.event);
    expect(after.filter((match) => match.isPublished)).toHaveLength(42);
    expect(after.filter((match) => match.status === "COMPLETED")).toHaveLength(24);
    expect(after.filter((match) => !match.isPublished && match.matchDate === null && match.startTime === null)).toHaveLength(90);
    expect(after.filter((match) => match.version === 1)).toHaveLength(131);
    await setup.apply(preview.snapshot).expect(409);
    const next = matchImportPreviewSchema.parse((await setup.preview().expect(200)).body);
    expect(next.summary).toMatchObject({ toImport: 0, preserved: 132 });
    await setup.apply(next.snapshot).expect(200);
    expect(await prisma.gameMatch.findMany({ orderBy: { id: "asc" } })).toEqual(after);
  });

  it("requires an authenticated administrator for preview and application", async () => {
    const base = `/api/v1/leagues/${randomUUID()}/seasons/${randomUUID()}/matches`;
    for (const suffix of ["import-preview", "import"]) await request(app).post(`${base}/${suffix}`).send({}).expect(401);
    for (const role of ["MODERATOR", "EDITOR", "USER"] as const) {
      const user = await createAuthenticatedUser(role);
      for (const suffix of ["import-preview", "import"]) await request(app).post(`${base}/${suffix}`).auth(user.accessToken, { type: "bearer" }).send({}).expect(403);
    }
    expect(await prisma.gameMatch.count()).toBe(0);
  });

  it("enforces the import size limit on the server before writing", async () => {
    const setup = await fixture();
    const enlarged = structuredClone(setup.document);
    const paddingCount = Math.ceil((95 * 1024 - Buffer.byteLength(JSON.stringify(enlarged))) / 2000);
    enlarged.avertissements = Array.from({ length: paddingCount }, () => "x".repeat(2000));
    expect(Buffer.byteLength(JSON.stringify(enlarged))).toBeLessThan(100 * 1024);
    const response = await request(app).post(`${setup.base}/import-preview`).auth(setup.admin.accessToken, { type: "bearer" }).send(enlarged).expect(413);
    expect((response.body as ApiErrorResponse).error.code).toBe("PAYLOAD_TOO_LARGE");
    expect(await prisma.gameMatch.count({ where: { homeTeamId: { not: null } } })).toBe(1);
  });

  it("rejects mismatched identities, unknown teams, duplicate appearances, incomplete days and invalid dates without writes", async () => {
    const setup = await fixture();
    const before = await prisma.gameMatch.findMany({ orderBy: { id: "asc" } });
    const variants = [
      { ...setup.document, ligue: "Autre ligue" }, { ...setup.document, saison: "Autre saison" },
      { ...setup.document, matchs: setup.document.matchs.slice(0, -1) },
      { ...setup.document, matchs: setup.document.matchs.slice(6) },
      { ...setup.document, matchs: setup.document.matchs.map((row, index) => index === 1 ? { ...row, domicile: "Équipe inconnue" } : row) },
      { ...setup.document, matchs: setup.document.matchs.map((row, index) => index === 1 ? { ...row, domicile: setup.document.matchs[0].domicile } : row) },
      { ...setup.document, matchs: setup.document.matchs.map((row, index) => index === 1 ? { ...row, date: "2025-09-01" } : row) },
      { ...setup.document, matchs: setup.document.matchs.map((row, index) => index === 1 ? { ...row, conserverMatchExistant: true } : row) },
    ];
    for (const variant of variants) {
      const response = await request(app).post(`${setup.base}/import-preview`).auth(setup.admin.accessToken, { type: "bearer" }).send(variant).expect(409);
      const error = (response.body as ApiErrorResponse).error;
      expect(error.code).toBe("MATCH_IMPORT_INVALID");
      expect(error.details?.length).toBeGreaterThan(0);
    }
    const invalid = structuredClone(setup.document); invalid.matchs[0].scoreDomicile = null;
    await request(app).post(`${setup.base}/import-preview`).auth(setup.admin.accessToken, { type: "bearer" }).send(invalid).expect(400);
    expect(await prisma.gameMatch.findMany({ orderBy: { id: "asc" } })).toEqual(before);
  });

  it("rejects inactive, withdrawn and ambiguous participants and partially filled slots", async () => {
    const setup = await fixture();
    const team = setup.teams[0];
    await prisma.team.update({ where: { id: team.id }, data: { isActive: false } });
    await setup.preview().expect(409);
    await prisma.team.update({ where: { id: team.id }, data: { isActive: true } });
    await prisma.participation.update({ where: { teamId_leagueSeasonId: { teamId: team.id, leagueSeasonId: setup.edition.id } }, data: { status: "WITHDRAWN" } });
    await setup.preview().expect(409);
    await prisma.participation.update({ where: { teamId_leagueSeasonId: { teamId: team.id, leagueSeasonId: setup.edition.id } }, data: { status: "REGISTERED" } });
    const duplicate = await prisma.team.create({ data: { name: team.name } });
    await prisma.participation.create({ data: { teamId: duplicate.id, leagueSeasonId: setup.edition.id } });
    await setup.preview().expect(409);
    await prisma.participation.delete({ where: { teamId_leagueSeasonId: { teamId: duplicate.id, leagueSeasonId: setup.edition.id } } });
    const empty = await prisma.gameMatch.findFirstOrThrow({ where: { homeTeamId: null } });
    await prisma.gameMatch.update({ where: { id: empty.id }, data: { stadium: "Déjà renseigné" } });
    await setup.preview().expect(409);
    expect(await prisma.gameMatch.count({ where: { version: 1 } })).toBe(0);
  });

  it("rejects obsolete previews after changes to matches, participants, file or season", async () => {
    const setup = await fixture();
    const snapshot = matchImportPreviewSchema.parse((await setup.preview().expect(200)).body).snapshot;
    const empty = await prisma.gameMatch.findFirstOrThrow({ where: { homeTeamId: null } });
    await prisma.gameMatch.update({ where: { id: empty.id }, data: { version: { increment: 1 } } });
    await setup.apply(snapshot).expect(409);
    const next = matchImportPreviewSchema.parse((await setup.preview().expect(200)).body).snapshot;
    setup.document.dateReleve = "2026-10-13";
    await setup.apply(next).expect(409);
    const third = matchImportPreviewSchema.parse((await setup.preview().expect(200)).body).snapshot;
    await prisma.season.update({ where: { id: setup.season.id }, data: { version: { increment: 1 } } });
    await setup.apply(third).expect(409);
    const fourth = matchImportPreviewSchema.parse((await setup.preview().expect(200)).body).snapshot;
    await prisma.team.update({ where: { id: setup.teams[0].id }, data: { name: `${setup.teams[0].name} renommé` } });
    await setup.apply(fourth).expect(409);
    expect(await prisma.gameMatch.count({ where: { homeTeamId: { not: null } } })).toBe(1);
  });

  it("arbitrates simultaneous imports with one successful transaction", async () => {
    const setup = await fixture();
    const snapshot = matchImportPreviewSchema.parse((await setup.preview().expect(200)).body).snapshot;
    const results = await Promise.all([setup.apply(snapshot), setup.apply(snapshot)]);
    expect(results.map((result) => result.status).sort()).toEqual([200, 409]);
    expect(await prisma.gameMatch.count()).toBe(132);
    expect(await prisma.gameMatch.count({ where: { version: 1 } })).toBe(131);
  });

  it("rolls back all previous rows when a database constraint fails late in the import", async () => {
    const setup = await fixture();
    const snapshot = matchImportPreviewSchema.parse((await setup.preview().expect(200)).body).snapshot;
    const before = await prisma.gameMatch.findMany({ orderBy: { id: "asc" } });
    const lastDay = setup.days.find((day) => day.number === 22)!;
    // Temporary test-only constraint forces failure after 21 rounds of writes.
    await prisma.$executeRaw(Prisma.sql`ALTER TABLE game_match ADD CONSTRAINT import_test_failure CHECK (version = 0 OR matchday_id <> ${Prisma.raw(`'${lastDay.id}'::uuid`)}) NOT VALID`);
    try {
      const response = await setup.apply(snapshot);
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(await prisma.gameMatch.findMany({ orderBy: { id: "asc" } })).toEqual(before);
      expect(await prisma.matchTeamReservation.count()).toBe(2);
    } finally { await prisma.$executeRaw`ALTER TABLE game_match DROP CONSTRAINT import_test_failure`; }
  });
});
