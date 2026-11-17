// Run from the repository root. Only creates/removes an isolated test database.
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
assert.equal(url.hostname, "localhost");
assert.equal(url.port, "5436");
assert.match(url.pathname, /^\/lucarne_test(?:_|$)/);
const administrator = new Client({ connectionString: url.href, connectionTimeoutMillis: 5000 });
const name = `lucarne_test_match_${randomUUID().replaceAll("-", "")}`;
assert.match(name, /^lucarne_test_match_[a-f0-9]{32}$/);
const directory = resolve("apps/api/prisma/migrations");
const migrationName = "20261005180000_match_preparation_publication";
const migration = readFileSync(resolve(directory, migrationName, "migration.sql"), "utf8");
let created = false;

try {
  await administrator.connect();
  await administrator.query(`CREATE DATABASE "${name}"`);
  created = true;
  url.pathname = `/${name}`;
  const database = new Client({ connectionString: url.href, connectionTimeoutMillis: 5000 });
  try {
    await database.connect();
    for (const entry of readdirSync(directory, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name < migrationName)
      .sort((a, b) => a.name.localeCompare(b.name))) {
      await database.query(readFileSync(resolve(directory, entry.name, "migration.sql"), "utf8"));
    }
    const league = randomUUID(); const season = randomUUID(); const edition = randomUUID();
    const home = randomUUID(); const away = randomUUID(); const unregistered = randomUUID();
    const day = randomUUID(); const nextDay = randomUUID(); const legacy = randomUUID();
    await database.query("INSERT INTO league(id,name,country) VALUES ($1,'Match league','France')", [league]);
    await database.query("INSERT INTO season(id,name,start_date,end_date) VALUES ($1,'2026-2027','2026-08-01','2027-06-30')", [season]);
    await database.query("INSERT INTO league_season(id,league_id,season_id) VALUES ($1,$2,$3)", [edition, league, season]);
    await database.query("INSERT INTO team(id,name) VALUES ($1,'Home'),($2,'Away'),($3,'Unregistered')", [home, away, unregistered]);
    await database.query("INSERT INTO participation(team_id,league_season_id) VALUES ($1,$3),($2,$3)", [home, away, edition]);
    await database.query("INSERT INTO matchday(id,league_season_id,number) VALUES ($1,$3,1),($2,$3,2)", [day, nextDay, edition]);
    await database.query(`INSERT INTO game_match(id,matchday_id,home_team_id,away_team_id,match_date,start_time,status,home_score,away_score)
      VALUES ($1,$2,$3,$4,'2026-10-05','18:30','COMPLETED',0,0)`, [legacy, day, home, away]);

    const legacySnapshot = async () => (await database.query("SELECT to_jsonb(m) AS row FROM game_match m ORDER BY id")).rows;
    const assertOldSchema = async () => {
      assert.equal((await database.query(`SELECT count(*)::int AS count FROM information_schema.columns
        WHERE table_schema='public' AND table_name='game_match' AND column_name IN ('match_public_id','version','is_published')`)).rows[0].count, 0);
    };
    const refusesMigration = async (pattern) => {
      const before = await legacySnapshot();
      await assert.rejects(database.query(migration), pattern);
      await database.query("ROLLBACK");
      await assertOldSchema();
      assert.deepEqual(await legacySnapshot(), before);
    };

    await database.query("UPDATE game_match SET status='POSTPONED' WHERE id=$1", [legacy]);
    await refusesMigration(/POSTPONED matches require/);
    await database.query("UPDATE game_match SET status='COMPLETED' WHERE id=$1", [legacy]);

    // Cross-side duplicate, not just home/home, and exclude inactive history.
    const duplicate = randomUUID();
    await database.query(`INSERT INTO game_match(id,matchday_id,home_team_id,away_team_id,match_date,start_time)
      VALUES ($1,$2,$3,$4,'2026-10-06','20:00')`, [duplicate, day, away, home]);
    await refusesMigration(/appears more than once/);
    await database.query("UPDATE game_match SET is_active=false WHERE id=$1", [duplicate]);

    for (const time of ["18:30:01", "18:30:00.5", "24:00:00"]) {
      await database.query("UPDATE game_match SET start_time=$1 WHERE id=$2", [time, legacy]);
      await refusesMigration(/resolved to HH:mm/);
    }
    await database.query("UPDATE game_match SET start_time='18:30' WHERE id=$1", [legacy]);

    // A failure after ALTER/UPDATE also rolls back columns, data and CHECKs.
    await database.query("CREATE FUNCTION preserve_match_public_id() RETURNS trigger AS $$ BEGIN RETURN NEW; END $$ LANGUAGE plpgsql");
    await refusesMigration(/already exists/);
    await database.query("DROP FUNCTION preserve_match_public_id()");

    await database.query("UPDATE participation SET status='WITHDRAWN' WHERE team_id=$1 AND league_season_id=$2", [away, edition]);
    const before = await legacySnapshot();
    const participationBefore = (await database.query("SELECT to_jsonb(p) AS row FROM participation p ORDER BY team_id")).rows;
    const daysBefore = (await database.query("SELECT to_jsonb(d) AS row FROM matchday d ORDER BY id")).rows;
    await database.query(migration);
    const after = await legacySnapshot();
    assert.equal(after.length, before.length);
    const publicIds = new Set();
    for (let index = 0; index < before.length; index++) {
      const { match_public_id: publicId, is_published: published, version, ...preserved } = after[index].row;
      assert.deepEqual(preserved, before[index].row);
      assert.equal(published, true); assert.equal(version, 0);
      assert.match(publicId, /^[a-f0-9-]{36}$/); assert.notEqual(publicId, preserved.id);
      publicIds.add(publicId);
    }
    assert.equal(publicIds.size, before.length);
    assert.deepEqual((await database.query("SELECT to_jsonb(p) AS row FROM participation p ORDER BY team_id")).rows, participationBefore);
    assert.deepEqual((await database.query("SELECT to_jsonb(d) AS row FROM matchday d ORDER BY id")).rows, daysBefore);

    const slot = (await database.query("INSERT INTO game_match(matchday_id) VALUES ($1) RETURNING *", [nextDay])).rows[0];
    assert.equal(slot.is_published, false); assert.equal(slot.status, "SCHEDULED");
    assert.equal(slot.home_team_id, null); assert.equal(slot.away_team_id, null);
    assert.equal(slot.match_date, null); assert.equal(slot.start_time, null);
    assert.equal(slot.home_score, null); assert.equal(slot.away_score, null); assert.equal(slot.version, 0);
    const rejectsConstraint = async (sql, values, constraint) => {
      await assert.rejects(database.query(sql, values), (error) => error.code === "23514" && error.constraint === constraint);
    };
    await rejectsConstraint("UPDATE game_match SET is_published=true WHERE id=$1", [slot.id], "chk_match_publication_complete");
    await rejectsConstraint("UPDATE game_match SET status='IN_PROGRESS' WHERE id=$1", [slot.id], "chk_match_draft_state");
    await rejectsConstraint("UPDATE game_match SET home_score=0 WHERE id=$1", [slot.id], "chk_match_draft_state");
    await rejectsConstraint("UPDATE game_match SET version=-1 WHERE id=$1", [slot.id], "chk_match_version");
    await rejectsConstraint("UPDATE game_match SET start_time='24:00' WHERE id=$1", [slot.id], "chk_match_start_time_minutes");
    await assert.rejects(database.query("UPDATE game_match SET match_public_id=$1 WHERE id=$2", [randomUUID(), slot.id]), /identifier is immutable/);
    await database.query("UPDATE game_match SET match_public_id=match_public_id WHERE id=$1", [slot.id]);
    await assert.rejects(database.query("INSERT INTO game_match(matchday_id,match_public_id) VALUES ($1,$2)", [nextDay, slot.match_public_id]),
      (error) => error.code === "23505" && error.constraint === "uq_match_public_id");

    await assert.rejects(database.query("UPDATE game_match SET home_team_id=$1 WHERE id=$2", [unregistered, slot.id]), /home team is not registered/);
    await assert.rejects(database.query("UPDATE game_match SET away_team_id=$1 WHERE id=$2", [away, slot.id]), /away team is not registered/);
    await database.query("UPDATE game_match SET home_team_id=$1 WHERE id=$2", [home, slot.id]);
    await rejectsConstraint("UPDATE game_match SET away_team_id=$1 WHERE id=$2", [home, slot.id], "chk_different_teams");
    await database.query("UPDATE participation SET status='REGISTERED' WHERE team_id=$1 AND league_season_id=$2", [away, edition]);
    await database.query("UPDATE game_match SET away_team_id=$1,match_date='2026-10-06',start_time='20:00',is_published=true WHERE id=$2", [away, slot.id]);
    await rejectsConstraint("UPDATE game_match SET match_date=null WHERE id=$1", [slot.id], "chk_match_publication_complete");
    await rejectsConstraint("UPDATE game_match SET status='COMPLETED' WHERE id=$1", [slot.id], "chk_completed_match_score");
    await rejectsConstraint("UPDATE game_match SET status='POSTPONED' WHERE id=$1", [slot.id], "chk_match_status");
    await database.query("UPDATE game_match SET status='IN_PROGRESS',version=1 WHERE id=$1", [slot.id]);
    await database.query("UPDATE game_match SET status='COMPLETED',home_score=0,away_score=0,version=2 WHERE id=$1", [slot.id]);
    await database.query("UPDATE game_match SET home_score=2,version=3 WHERE id=$1", [slot.id]);
    assert.deepEqual((await database.query("SELECT status,home_score,away_score,version FROM game_match WHERE id=$1", [slot.id])).rows[0],
      { status: "COMPLETED", home_score: 2, away_score: 0, version: 3 });
    console.log("MATCH migration passed: atomic refusals, history preservation, empty slots, publication, statuses, scores, civil times, registration, immutable unique public IDs.");
  } finally {
    await database.end();
  }
} finally {
  if (created) {
    await administrator.query(`DROP DATABASE "${name}"`);
    console.log("Temporary MATCH database removed; existing databases untouched.");
  }
  await administrator.end();
}
