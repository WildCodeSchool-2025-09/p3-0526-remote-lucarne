// Check backfill and immutable slugs without changing existing databases.
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
const name = `lucarne_test_league_slug_${randomUUID().replaceAll("-", "")}`;
assert.match(name, /^lucarne_test_league_slug_[a-f0-9]{32}$/);
const migration = "20261011230000_public_league_navigation";
const directory = resolve("apps/api/prisma/migrations");
let created = false;
try {
  await administrator.connect();
  await administrator.query(`CREATE DATABASE "${name}"`);
  created = true;
  url.pathname = `/${name}`;
  const database = new Client({ connectionString: url.href });
  try {
    await database.connect();
    for (const entry of readdirSync(directory).filter((item) => item < migration && !item.endsWith(".toml")).sort()) {
      await database.query(readFileSync(resolve(directory, entry, "migration.sql"), "utf8"));
    }
    await database.query("INSERT INTO league(name,country,is_active,version,logo_url) VALUES ('Élite Féminine','France',true,4,'/api/v1/uploads/photos/logo.png'),('Élite Féminine','Belgique',false,2,NULL)");
    const before = (await database.query("SELECT * FROM league ORDER BY id")).rows;
    await database.query(readFileSync(resolve(directory, migration, "migration.sql"), "utf8"));
    const after = (await database.query("SELECT * FROM league ORDER BY id")).rows;
    assert.deepEqual(after.map((row) => {
      const originalFields = { ...row };
      delete originalFields.slug;
      return originalFields;
    }), before);
    assert.equal(new Set(after.map((row) => row.slug)).size, 2);
    for (const row of after) assert.match(row.slug, /^elite-feminine-[a-f0-9-]{36}$/);

    const inserted = (await database.query("INSERT INTO league(name,country) VALUES ($1,'France'),($2,'France') RETURNING *", ["東京", "A".repeat(150)])).rows;
    assert.match(inserted[0].slug, /^ligue-[a-f0-9-]{36}$/);
    assert.equal(inserted[1].slug.length, 187);
    assert.equal(inserted[0].is_active, false);
    const original = after[0];
    const renamed = (await database.query("UPDATE league SET name='Renamed',is_active=NOT is_active,version=version+1 WHERE id=$1 RETURNING slug", [original.id])).rows[0];
    assert.equal(renamed.slug, original.slug);
    await assert.rejects(database.query("UPDATE league SET slug='replacement' WHERE id=$1", [original.id]), (error) => error.code === "23514");
    assert.equal((await database.query("SELECT slug FROM league WHERE id=$1", [original.id])).rows[0].slug, original.slug);
    console.log("League slug migration passed: existing data preserved, unique backfill, generated slugs, length bounds and immutability.");
  } finally { await database.end(); }
} finally {
  if (created) await administrator.query(`DROP DATABASE "${name}"`);
  await administrator.end();
  console.log("Temporary database removed; existing databases untouched.");
}
