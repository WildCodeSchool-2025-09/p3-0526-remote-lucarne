// Run API integration tests on a new database, replaying every repository
// migration. Existing development and test databases are never cleaned.
import assert from "node:assert/strict";
import process from "node:process";
import console from "node:console";
import { URL } from "node:url";
import { randomUUID } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { Client } from "pg";
import dotenv from "dotenv";

const local = dotenv.parse(readFileSync("apps/api/.env"));
const url = new URL(process.env.TEST_DATABASE_URL || local.TEST_DATABASE_URL
  || "postgresql://test_user:test_password@localhost:5436/lucarne_test");
assert.equal(url.hostname, "localhost");
assert.equal(url.port, "5436");
assert.match(url.pathname, /^\/lucarne_test(?:_|$)/);
const administrator = new Client({ connectionString: url.href, connectionTimeoutMillis: 5000 });
const name = `lucarne_test_integration_${randomUUID().replaceAll("-", "")}`;
assert.match(name, /^lucarne_test_integration_[a-f0-9]{32}$/);
let created = false;
try {
  await administrator.connect();
  await administrator.query(`CREATE DATABASE "${name}"`);
  created = true;
  url.pathname = `/${name}`;
  const database = new Client({ connectionString: url.href });
  try {
    await database.connect();
    const directory = resolve("apps/api/prisma/migrations");
    for (const entry of readdirSync(directory, { withFileTypes: true }).filter((entry) => entry.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
      await database.query(readFileSync(resolve(directory, entry.name, "migration.sql"), "utf8"));
    }
  } finally {
    await database.end();
  }
  const result = spawnSync(process.execPath, [resolve("node_modules/vitest/vitest.mjs"), "run", "--config", "vitest.integration.config.ts", ...process.argv.slice(2)], {
    cwd: resolve("apps/api"),
    env: { ...process.env, TEST_DATABASE_URL: url.href },
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  if (created) {
    await administrator.query(`DROP DATABASE "${name}"`);
    console.log("Isolated integration database removed; existing databases untouched.");
  }
  await administrator.end();
}
