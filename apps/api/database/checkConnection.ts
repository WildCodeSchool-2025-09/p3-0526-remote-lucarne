import { environment } from "../src/config/environment";
import client from "./client";

client
  .getConnection()
  .then((connection) => {
    console.info(`Using database ${environment.database.name}`);
    connection.release();
  })
  .catch((error: Error) => {
    console.warn(
      "Warning:",
      "Failed to establish a database connection.",
      "Please check your database credentials in the .env file if you need database access.",
    );
    console.warn(error.message);
  });
