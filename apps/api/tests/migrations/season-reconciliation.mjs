// Standalone PostgreSQL migration tests. No Prisma generation or application
// cleanup hooks: only newly created databases on the dedicated test server.
// Run from repository root: node apps/api/tests/migrations/season-reconciliation.mjs
import process from "node:process";
import console from "node:console";
import { URL } from "node:url";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { Client } from "pg";
import dotenv from "dotenv";

const environment = dotenv.parse(readFileSync("apps/api/.env"));
const testUrl = new URL(process.env.TEST_DATABASE_URL || environment.TEST_DATABASE_URL
  || "postgresql://test_user:test_password@localhost:5436/lucarne_test");
assert.equal(testUrl.hostname, "localhost");
assert.equal(testUrl.port, "5436");
assert.match(testUrl.pathname, /^\/lucarne_test(?:_|$)/);
const sourceUrl = new URL(process.env.DATABASE_URL || environment.DATABASE_URL);
assert.equal(sourceUrl.hostname, "localhost");
assert.equal(sourceUrl.port, "5435");
assert.equal(sourceUrl.pathname, "/lucarne");
const directory = resolve("apps/api/prisma/migrations");
const migrationName = "20261004190000_reconcile_league_seasons";
const migration = readFileSync(resolve(directory, migrationName, "migration.sql"), "utf8");
const oldMigrations = readdirSync(directory, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name < migrationName)
  .map((entry) => entry.name).sort();
const administrator = new Client({ connectionString: testUrl.href, connectionTimeoutMillis: 5000 });
const createdDatabases = [];

async function createDatabase() {
  const name = `lucarne_test_season_${randomUUID().replaceAll("-", "")}`;
  assert.match(name, /^lucarne_test_season_[a-f0-9]{32}$/);
  await administrator.query(`CREATE DATABASE "${name}"`);
  createdDatabases.push(name);
  const url = new URL(testUrl);
  url.pathname = `/${name}`;
  const client = new Client({ connectionString: url.href, connectionTimeoutMillis: 5000 });
  await client.connect();
  return client;
}

async function initializeLegacy(client) {
  for (const name of oldMigrations) {
    await client.query(readFileSync(resolve(directory, name, "migration.sql"), "utf8"));
  }
}

async function snapshot(client) {
  const result = {};
  for (const table of ["season", "league_season", "matchday", "participation", "game_match"]) {
    result[table] = (await client.query(`SELECT to_jsonb(t) AS row FROM ${table} t ORDER BY to_jsonb(t)::text`)).rows;
  }
  return result;
}

async function rejectsSql(client, sql, pattern) {
  await assert.rejects(client.query(sql), pattern);
  await client.query("ROLLBACK");
}

let success = false;
try {
  await administrator.connect();
  const legacy = await createDatabase();
  try {
    await initializeLegacy(legacy);
    const leagueA = randomUUID(); const leagueB = randomUUID();
    const seasonA = randomUUID(); const seasonB = randomUUID();
    const teamA = randomUUID(); const teamB = randomUUID();
    const dayA = randomUUID(); const dayB = randomUUID(); const match = randomUUID();
    await legacy.query("INSERT INTO league(id,name,country) VALUES ($1,'League A','France'),($2,'League B','France')", [leagueA, leagueB]);
    await legacy.query(`INSERT INTO season(id,league_id,name,start_date,end_date,is_active,created_at,version)
      VALUES ($1,$2,'2026-2027','2026-08-01','2027-06-30',true,'2026-01-01',2),
             ($3,$4,'2026-2027','2026-08-01','2027-06-30',true,'2026-02-01',4)`, [seasonA, leagueA, seasonB, leagueB]);
    await legacy.query("INSERT INTO team(id,name) VALUES ($1,'Team A'),($2,'Team B')", [teamA, teamB]);
    await legacy.query("INSERT INTO participation(team_id,season_id,points,rank) VALUES ($1,$3,12,1),($2,$3,7,2),($1,$4,3,1)", [teamA, teamB, seasonA, seasonB]);
    await legacy.query("INSERT INTO matchday(id,season_id,number,start_date,end_date) VALUES ($1,$2,1,'2026-09-01','2026-09-01'),($3,$4,1,'2026-09-01','2026-09-01')", [dayA, seasonA, dayB, seasonB]);
    await legacy.query(`INSERT INTO game_match(id,matchday_id,home_team_id,away_team_id,match_date,start_time,status,home_score,away_score)
      VALUES ($1,$2,$3,$4,'2026-09-01','14:00','COMPLETED',2,1)`, [match, dayA, teamA, teamB]);
    await legacy.query("UPDATE participation SET status='WITHDRAWN' WHERE team_id=$1 AND season_id=$2", [teamB, seasonA]);
    const beforeParticipants = (await legacy.query("SELECT * FROM participation ORDER BY team_id,season_id")).rows;
    const beforeMatch = (await legacy.query("SELECT * FROM game_match")).rows;
    await legacy.query(migration);
    const seasons = (await legacy.query("SELECT id,name,version FROM season")).rows;
    assert.deepEqual(seasons, [{ id: seasonA, name: "2026-2027", version: 5 }]);
    const editions = (await legacy.query("SELECT * FROM league_season ORDER BY league_id")).rows;
    assert.equal(editions.length, 2);
    assert.ok(editions.every((edition) => edition.season_id === seasonA && edition.is_current));
    const afterParticipants = (await legacy.query("SELECT * FROM participation ORDER BY team_id,league_season_id")).rows;
    assert.deepEqual(afterParticipants, beforeParticipants.map(({ season_id, ...rest }) => ({ ...rest, league_season_id: season_id })));
    assert.deepEqual((await legacy.query("SELECT * FROM game_match")).rows, beforeMatch);
    assert.deepEqual((await legacy.query("SELECT id,league_season_id FROM matchday ORDER BY id")).rows,
      [{ id: dayA, league_season_id: seasonA }, { id: dayB, league_season_id: seasonB }].sort((a, b) => a.id.localeCompare(b.id)));
    console.log("PASS legacy migration: merges identical seasons and preserves editions, withdrawn participation, scores and matches");

    const beforeRerun = await snapshot(legacy);
    await legacy.query(migration);
    assert.deepEqual(await snapshot(legacy), beforeRerun);
    console.log("PASS already transformed model: repeated reconciliation preserves all rows");

    await assert.rejects(legacy.query("DELETE FROM season WHERE id=$1", [seasonA]), /foreign key/);
    await assert.rejects(legacy.query("DELETE FROM league_season WHERE id=$1", [seasonA]), /foreign key/);
    await assert.rejects(legacy.query("INSERT INTO league_season(league_id,season_id) VALUES ($1,$2)", [leagueA, seasonA]), /unique/);
    await assert.rejects(legacy.query("INSERT INTO season(name,start_date,end_date) VALUES ('2026-2027','2026-08-01','2027-06-30')"), /unique/);
    const extra = (await legacy.query("INSERT INTO season(name,start_date,end_date) VALUES ('2027-2028','2027-08-01','2028-06-30') RETURNING id")).rows[0].id;
    await assert.rejects(legacy.query("INSERT INTO league_season(league_id,season_id,is_current) VALUES ($1,$2,true)", [leagueA, extra]), /unique/);
    await assert.rejects(legacy.query(`INSERT INTO game_match(matchday_id,home_team_id,away_team_id,match_date,start_time)
      VALUES ($1,$2,$3,'2026-09-01','14:00')`, [dayB, teamA, teamB]), /away team is not registered/);
    await legacy.query("UPDATE team SET is_active=false WHERE id=$1", [teamB]);
    await assert.rejects(legacy.query("INSERT INTO participation(team_id,league_season_id) VALUES ($1,$2)", [teamB, seasonB]), /team must exist and be active/);
    console.log("PASS restrictions: global uniqueness, unique editions, one current season, protected history and league-specific match registrations");

    await legacy.query("DROP INDEX uq_season_name");
    await rejectsSql(legacy, migration, /Missing season-name/);
    console.log("PASS incomplete transformed structure rejected");
  } finally { await legacy.end(); }

  const conflict = await createDatabase();
  try {
    await initializeLegacy(conflict);
    await conflict.query("INSERT INTO league(name,country) VALUES ('A','France'),('B','France')");
    await conflict.query(`INSERT INTO season(league_id,name,start_date,end_date)
      SELECT id,'Conflict','2026-08-01',CASE WHEN name='A' THEN DATE '2027-06-30' ELSE DATE '2027-07-31' END FROM league`);
    const before = (await conflict.query("SELECT * FROM season ORDER BY id")).rows;
    await rejectsSql(conflict, migration, /conflicting dates/);
    assert.deepEqual((await conflict.query("SELECT * FROM season ORDER BY id")).rows, before);
    assert.equal((await conflict.query("SELECT to_regclass('league_season') AS edition")).rows[0].edition, null);
    console.log("PASS conflicting dates rejected with no partial migration");
    await conflict.query("CREATE TABLE league_season(id UUID)");
    await rejectsSql(conflict, migration, /Unsupported intermediate/);
    console.log("PASS intermediate structure rejected");
  } finally { await conflict.end(); }

  // Copy schema only from the observed deployed database. No local data is
  // modified or dumped, and the dump stays in memory.
  const schema = execFileSync("docker", ["compose", "exec", "-T", "db", "pg_dump",
    "-U", decodeURIComponent(sourceUrl.username), "-d", "lucarne", "--schema-only", "--no-owner", "--no-privileges"],
  { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 });
  // pg_dump's psql-only restriction markers are not SQL statements.
  const sqlSchema = schema.split("\n").filter((line) => !line.startsWith("\\")).join("\n");
  const deployed = await createDatabase();
  try {
    await deployed.query(sqlSchema);
    // pg_dump clears search_path for restoration. Restore the application
    // schema before running unqualified fixture and migration queries.
    await deployed.query("SET search_path TO public");
    assert.equal((await deployed.query("SELECT current_schema() AS schema")).rows[0].schema, "public");
    assert.equal((await deployed.query("SELECT to_regclass('league')::text AS table_name")).rows[0].table_name, "league");
    const league = (await deployed.query("INSERT INTO league(name,country) VALUES ('Deployed','France') RETURNING id")).rows[0].id;
    const season = (await deployed.query("INSERT INTO season(name,start_date,end_date) VALUES ('2026-2027','2026-08-01','2027-06-30') RETURNING id")).rows[0].id;
    await deployed.query("INSERT INTO league_season(league_id,season_id,is_current) VALUES ($1,$2,true)", [league, season]);
    const before = await snapshot(deployed);
    await deployed.query(migration);
    assert.deepEqual(await snapshot(deployed), before);
    console.log("PASS actual deployed schema clone: existing season and edition identifiers unchanged");
  } finally { await deployed.end(); }
  success = true;
} finally {
  if (success) {
    for (const name of createdDatabases) {
      assert.match(name, /^lucarne_test_season_[a-f0-9]{32}$/);
      await administrator.query(`DROP DATABASE "${name}"`);
    }
    console.log("Temporary test databases removed; development database untouched.");
  } else {
    console.error("STOP: test failed. Test databases retained for diagnosis:", createdDatabases.join(", "));
  }
  await administrator.end();
}
