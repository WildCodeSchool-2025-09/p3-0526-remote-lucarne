import "dotenv/config";
import "../database/checkConnection";
import app from "./app";
import { environment } from "./config/environment";

const server = app.listen(environment.port, () => {
  console.info(`Server is listening on port ${environment.port}`);
});

server.on("error", (error: Error) => {
  console.error("Unable to start server:", error.message);
});
