import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";

const schema = path.resolve(__dirname, "../database/schema.sql");
const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;

const migrate = async () => {
  try {
    const sql = fs.readFileSync(schema, "utf8");
    const database = await mysql.createConnection({
      host: DB_HOST,
      port: Number.parseInt(DB_PORT ?? "3306", 10),
      user: DB_USER,
      password: DB_PASSWORD,
      multipleStatements: true,
    });

    await database.query(`drop database if exists ${DB_NAME}`);
    await database.query(`create database ${DB_NAME}`);
    await database.query(`use ${DB_NAME}`);

    if (sql.trim().length > 0) {
      await database.query(sql);
    }

    await database.end();
    console.info(`${DB_NAME} updated from '${path.normalize(schema)}'`);
  } catch (err) {
    const { message, stack } = err as Error;
    console.error("Error updating the database:", message, stack);
  }
};

void migrate();
