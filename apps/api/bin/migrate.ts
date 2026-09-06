import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { Client } from "pg";
import { environment } from "../src/config/environment";

const schemaFile = path.resolve(__dirname, "../database/schema.sql");

const migrate = async () => {
  let database: Client | undefined;

  try {
    const sql = fs.readFileSync(schemaFile, "utf8");

    database = new Client({
      connectionString: environment.database.connectionString,
    });

    await database.connect();

    if (sql.trim().length > 0) {
      await database.query(sql);
    }

    console.info(
      `${environment.database.name} updated from '${path.normalize(schemaFile)}'`,
    );
  } catch (error) {
    const { message, stack } = error as Error;

    console.error("Error updating the database:", message, stack);
    process.exitCode = 1;
  } finally {
    await database?.end();
  }
};

void migrate();
