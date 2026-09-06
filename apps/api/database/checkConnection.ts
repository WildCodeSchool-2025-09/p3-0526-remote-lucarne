import { environment } from "../src/config/environment";
import client from "./client";

const checkConnection = async () => {
  let connection;

  try {
    connection = await client.connect();
    await connection.query("SELECT 1");

    console.info(`Using database ${environment.database.name}`);
  } catch (error) {
    const { message } = error as Error;

    console.warn(
      "Warning:",
      "Failed to establish a database connection.",
      "Please check your database credentials in the .env file if you need database access.",
    );
    console.warn(message);
  } finally {
    connection?.release();
  }
};

void checkConnection();
