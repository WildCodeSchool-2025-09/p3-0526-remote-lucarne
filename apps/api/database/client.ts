import { Pool } from "pg";
import type { QueryResult, QueryResultRow } from "pg";
import { environment } from "../src/config/environment";

const client = new Pool({
  connectionString: environment.database.connectionString,
});

type DatabaseClient = Pool;
type Result<Row extends QueryResultRow = QueryResultRow> = QueryResult<Row>;
type Rows<Row extends QueryResultRow = QueryResultRow> = Row[];

export default client;

export type { DatabaseClient, Result, Rows };
