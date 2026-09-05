import "dotenv/config";
import "../database/checkConnection";
import app from "./app";

const port = Number(process.env.APP_PORT ?? 3310);

app
  .listen(port, () => {
    console.info(`Server is listening on port ${port}`);
  })
  .on("error", (err: Error) => {
    console.error("Error:", err.message);
  });
