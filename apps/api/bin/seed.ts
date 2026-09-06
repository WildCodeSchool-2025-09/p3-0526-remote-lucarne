import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";
import { environment } from "../src/config/environment";

const seedFile = path.resolve(__dirname, "../database/seed.sql");

const seed = async () => {
  let database: Awaited<ReturnType<typeof mysql.createConnection>> | undefined;

  try {
    const sql = fs.readFileSync(seedFile, "utf8");

    database = await mysql.createConnection({
      host: environment.database.host,
      port: environment.database.port,
      user: environment.database.user,
      password: environment.database.password,
      database: environment.database.name,
      multipleStatements: true,
    });

    if (sql.trim().length > 0) {
      await database.query(sql);
    }

    console.info(`${environment.database.name} filled from '${path.normalize(seedFile)}'`);
  } catch (error) {
    const { message, stack } = error as Error;
    console.error("Error filling the database:", message, stack);
    process.exitCode = 1;
  } finally {
    await database?.end();
  }
};

void seed();
