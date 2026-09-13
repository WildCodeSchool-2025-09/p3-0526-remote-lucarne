import { Pool } from "pg";
import { environment } from "../src/config/environment";

const client = new Pool({
  connectionString: environment.database.connectionString,
});

export default client;
