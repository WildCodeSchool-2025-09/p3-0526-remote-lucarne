import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";
import { environment } from "../src/config/environment";

const schema = path.resolve(__dirname, "../database/schema.sql");

const migrate = async () => {
  try {
    const sql = fs.readFileSync(schema, "utf8");
    const database = await mysql.createConnection({
      host: environment.database.host,
      port: environment.database.port,
      user: environment.database.user,
      password: environment.database.password,
      multipleStatements: true,
    });

    await database.query(`drop database if exists ${environment.database.name}`);
    await database.query(`create database ${environment.database.name}`);
    await database.query(`use ${environment.database.name}`);

    if (sql.trim().length > 0) {
      await database.query(sql);
    }

    await database.end();
    console.info(`${environment.database.name} updated from '${path.normalize(schema)}'`);
  } catch (err) {
    const { message, stack } = err as Error;
    console.error("Error updating the database:", message, stack);
  }
};

void migrate();
