import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";

const seedFile = path.resolve(__dirname, "../database/seed.sql");
const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;

const seed = async () => {
  let database: Awaited<ReturnType<typeof mysql.createConnection>> | undefined;

  try {
    const sql = fs.readFileSync(seedFile, "utf8");

    database = await mysql.createConnection({
      host: DB_HOST,
      port: Number.parseInt(DB_PORT ?? "3306", 10),
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      multipleStatements: true,
    });

    if (sql.trim().length > 0) {
      await database.query(sql);
    }

    console.info(`${DB_NAME} filled from '${path.normalize(seedFile)}'`);
  } catch (error) {
    const { message, stack } = error as Error;
    console.error("Error filling the database:", message, stack);
    process.exitCode = 1;
  } finally {
    await database?.end();
  }
};

void seed();
