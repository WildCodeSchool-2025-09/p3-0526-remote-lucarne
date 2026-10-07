// Verify reservation backfill and rollback using only an isolated test database.
import assert from "node:assert/strict";
import console from "node:console";
import process from "node:process";
import { randomUUID } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { URL } from "node:url";
import { Client } from "pg";
import dotenv from "dotenv";

const environment = dotenv.parse(readFileSync("apps/api/.env"));
const url = new URL(process.env.TEST_DATABASE_URL || environment.TEST_DATABASE_URL
  || "postgresql://test_user:test_password@localhost:5436/lucarne_test");
assert.equal(url.hostname, "localhost"); assert.equal(url.port, "5436");
assert.match(url.pathname, /^\/lucarne_test(?:_|$)/);
const name = `lucarne_test_match_constraints_${randomUUID().replaceAll("-", "")}`;
assert.match(name, /^lucarne_test_match_constraints_[a-f0-9]{32}$/);
const administrator = new Client({ connectionString: url.href, connectionTimeoutMillis: 5000 });
const directory = resolve("apps/api/prisma/migrations");
const migrationName = "20261005190000_match_constraints";
const migration = readFileSync(resolve(directory, migrationName, "migration.sql"), "utf8");
let created = false;
try {
  await administrator.connect(); await administrator.query(`CREATE DATABASE "${name}"`); created = true;
  url.pathname = `/${name}`;
  const database = new Client({ connectionString: url.href, connectionTimeoutMillis: 5000 });
  try {
    await database.connect();
    for (const entry of readdirSync(directory, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name < migrationName)
      .sort((a, b) => a.name.localeCompare(b.name))) {
      await database.query(readFileSync(resolve(directory, entry.name, "migration.sql"), "utf8"));
    }
    const edition = randomUUID(); const league = randomUUID(); const season = randomUUID();
    const day = randomUUID(); const a = randomUUID(); const b = randomUUID();
    await database.query("INSERT INTO league(id,name,country) VALUES ($1,'Reservations','France')", [league]);
    await database.query("INSERT INTO season(id,name,start_date,end_date) VALUES ($1,'2026-2027','2026-08-01','2027-06-30')", [season]);
    await database.query("INSERT INTO league_season(id,league_id,season_id) VALUES ($1,$2,$3)", [edition, league, season]);
    await database.query("INSERT INTO matchday(id,league_season_id,number) VALUES ($1,$2,1)", [day, edition]);
    await database.query("INSERT INTO team(id,name) VALUES ($1,'A'),($2,'B')", [a, b]);
    await database.query("INSERT INTO participation(team_id,league_season_id) VALUES ($1,$3),($2,$3)", [a, b, edition]);
    const match = (await database.query(`INSERT INTO game_match(matchday_id,home_team_id,away_team_id,match_date,start_time,is_published,status,home_score,away_score)
      VALUES ($1,$2,$3,'2026-10-05','18:00',true,'COMPLETED',0,0) RETURNING id`, [day, a, b])).rows[0].id;
    const duplicate = (await database.query("INSERT INTO game_match(matchday_id,away_team_id) VALUES ($1,$2) RETURNING id", [day, a])).rows[0].id;
    const snapshot = async () => (await database.query("SELECT to_jsonb(m) AS row FROM game_match m ORDER BY id")).rows;
    const beforeFailure = await snapshot();
    await assert.rejects(database.query(migration), (error) => error.code === "23505" && error.constraint === "pk_match_team_reservation");
    await database.query("ROLLBACK");
    assert.deepEqual(await snapshot(), beforeFailure);
    assert.equal((await database.query("SELECT to_regclass('public.match_team_reservation') AS name")).rows[0].name, null);
    await database.query("UPDATE game_match SET is_active=false WHERE id=$1", [duplicate]);
    await database.query("INSERT INTO game_match(matchday_id) VALUES ($1)", [day]);
    await database.query("UPDATE participation SET status='WITHDRAWN' WHERE team_id=$1", [b]);
    const beforeSuccess = await snapshot();
    await database.query(migration);
    assert.deepEqual(await snapshot(), beforeSuccess);
    const rows = (await database.query("SELECT * FROM match_team_reservation ORDER BY team_id")).rows;
    assert.deepEqual(rows, [a, b].sort().map((team_id) => ({ matchday_id: day, team_id, match_id: match })));
    await database.query("UPDATE game_match SET home_score=2 WHERE id=$1", [match]);
    await database.query("UPDATE game_match SET is_active=false WHERE id=$1", [match]);
    assert.equal((await database.query("SELECT count(*)::int AS count FROM match_team_reservation")).rows[0].count, 0);
    console.log("MATCH constraints migration passed: atomic conflict refusal, unchanged history, derived backfill, inactive/empty exclusions and reservation release.");
  } finally { await database.end(); }
} finally {
  if (created) { await administrator.query(`DROP DATABASE "${name}"`); console.log("Temporary database removed; existing databases untouched."); }
  await administrator.end();
}
