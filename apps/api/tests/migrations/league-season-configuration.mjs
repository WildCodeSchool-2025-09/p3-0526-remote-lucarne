// Verify the configuration migration on a fresh database on the test server.
// Run from repository root: node apps/api/tests/migrations/league-season-configuration.mjs
import assert from "node:assert/strict";
import console from "node:console";
import process from "node:process";
import { randomUUID } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { URL } from "node:url";
import { Client } from "pg";
import dotenv from "dotenv";

const local = dotenv.parse(readFileSync("apps/api/.env"));
const url = new URL(process.env.TEST_DATABASE_URL || local.TEST_DATABASE_URL
  || "postgresql://test_user:test_password@localhost:5436/lucarne_test");
assert.equal(url.hostname, "localhost");
assert.equal(url.port, "5436");
assert.match(url.pathname, /^\/lucarne_test(?:_|$)/);
const administrator = new Client({ connectionString: url.href, connectionTimeoutMillis: 5000 });
const name = `lucarne_test_configuration_${randomUUID().replaceAll("-", "")}`;
assert.match(name, /^lucarne_test_configuration_[a-f0-9]{32}$/);
const migrationName = "20261005120000_league_season_configuration";
const directory = resolve("apps/api/prisma/migrations");
let created = false;

try {
  await administrator.connect();
  await administrator.query(`CREATE DATABASE "${name}"`);
  created = true;
  url.pathname = `/${name}`;
  const database = new Client({ connectionString: url.href, connectionTimeoutMillis: 5000 });
  try {
    await database.connect();
    const previous = readdirSync(directory, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name < migrationName)
      .map((entry) => entry.name).sort();
    for (const entry of previous) {
      await database.query(readFileSync(resolve(directory, entry, "migration.sql"), "utf8"));
    }
    const leagueA = randomUUID();
    const leagueB = randomUUID();
    const season = randomUUID();
    const editionA = randomUUID();
    const editionB = randomUUID();
    await database.query("INSERT INTO league(id,name,country) VALUES ($1,'League A','France'),($2,'League B','France')", [leagueA, leagueB]);
    await database.query("INSERT INTO season(id,name,start_date,end_date) VALUES ($1,'2026-2027','2026-08-01','2027-06-30')", [season]);
    await database.query("INSERT INTO league_season(id,league_id,season_id,is_current) VALUES ($1,$2,$3,true)", [editionA, leagueA, season]);
    const home = randomUUID();
    const away = randomUUID();
    const matchday = randomUUID();
    await database.query("INSERT INTO team(id,name) VALUES ($1,'Home'),($2,'Away')", [home, away]);
    await database.query("INSERT INTO participation(team_id,league_season_id,points,rank) VALUES ($1,$3,8,1),($2,$3,3,2)", [home, away, editionA]);
    await database.query("INSERT INTO matchday(id,league_season_id,number) VALUES ($1,$2,1)", [matchday, editionA]);
    await database.query("INSERT INTO game_match(matchday_id,home_team_id,away_team_id,match_date,start_time,status,home_score,away_score) VALUES ($1,$2,$3,'2026-09-01','18:00','COMPLETED',2,1)", [matchday, home, away]);
    const participantsBefore = (await database.query("SELECT * FROM participation ORDER BY team_id")).rows;
    const matchesBefore = (await database.query("SELECT * FROM game_match")).rows;
    const matchdaysBefore = (await database.query("SELECT * FROM matchday")).rows;
    const before = (await database.query("SELECT * FROM league_season WHERE id=$1", [editionA])).rows[0];

    await database.query(readFileSync(resolve(directory, migrationName, "migration.sql"), "utf8"));
    const after = (await database.query("SELECT * FROM league_season WHERE id=$1", [editionA])).rows[0];
    assert.deepEqual(after, { ...before, matchday_count: null, matches_per_matchday: null });
    assert.deepEqual((await database.query("SELECT * FROM participation ORDER BY team_id")).rows, participantsBefore);
    assert.deepEqual((await database.query("SELECT * FROM game_match")).rows, matchesBefore);
    assert.deepEqual((await database.query("SELECT * FROM matchday")).rows, matchdaysBefore);

    await database.query("UPDATE league_season SET matchday_count=22,matches_per_matchday=6 WHERE id=$1", [editionA]);
    await database.query("INSERT INTO league_season(id,league_id,season_id,matchday_count,matches_per_matchday) VALUES ($1,$2,$3,18,5)", [editionB, leagueB, season]);
    assert.deepEqual((await database.query("SELECT matchday_count,matches_per_matchday FROM league_season WHERE season_id=$1 ORDER BY matchday_count", [season])).rows,
      [{ matchday_count: 18, matches_per_matchday: 5 }, { matchday_count: 22, matches_per_matchday: 6 }]);

    for (const column of ["matchday_count", "matches_per_matchday"]) {
      for (const value of [0, -1]) {
        await assert.rejects(database.query(`UPDATE league_season SET ${column}=$1 WHERE id=$2`, [value, editionA]),
          (error) => error.code === "23514" && error.constraint === `ck_league_season_${column}`);
      }
      await database.query(`UPDATE league_season SET ${column}=2147483647 WHERE id=$1`, [editionB]);
      await assert.rejects(database.query(`UPDATE league_season SET ${column}=2147483648 WHERE id=$1`, [editionB]),
        (error) => error.code === "22003");
      await assert.rejects(database.query(`INSERT INTO league_season(league_id,season_id,${column}) VALUES ($1,$2,0)`, [leagueA, season]),
        (error) => error.code === "23514");
    }
    assert.deepEqual((await database.query("SELECT matchday_count,matches_per_matchday FROM league_season WHERE id=$1", [editionA])).rows[0],
      { matchday_count: 22, matches_per_matchday: 6 });
    assert.deepEqual((await database.query("SELECT * FROM matchday")).rows, matchdaysBefore);
    assert.deepEqual((await database.query("SELECT * FROM game_match")).rows, matchesBefore);
    console.log("Configuration migration passed: history preserved, independent values, positive checks, INTEGER bounds, no calendar generation.");
  } finally {
    await database.end();
  }
} finally {
  if (created) {
    await administrator.query(`DROP DATABASE "${name}"`);
    console.log("Temporary database removed; existing databases untouched.");
  }
  await administrator.end();
}
