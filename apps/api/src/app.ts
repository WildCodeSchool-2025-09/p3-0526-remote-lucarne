import cors from "cors";
import express from "express";
import helmet from "helmet";
import path from "node:path";
import { environment } from "./config/environment";
import { errorHandler } from "./middlewares/errorHandler";
import { notFoundHandler } from "./middlewares/notFoundHandler";
import router from "./router";
import { API_V1_PATH } from "@lucarne/shared";


const app = express();

app.use(helmet());

if (environment.clientUrl != null) {
  app.use(cors({ origin: [environment.clientUrl] }));
}

app.use(express.json());
app.use(API_V1_PATH, router, notFoundHandler);

// Keep unknown API routes out of the SPA fallback.
app.use("/api", notFoundHandler);

if (environment.nodeEnv === "production") {
  const webDirectory = path.resolve(__dirname, "../../web/dist");

  app.use(express.static(webDirectory));
  app.get("*", (request, response, next) => {
    if (path.extname(request.path) !== "" || !request.accepts("html")) {
      next();
      return;
    }

    response.sendFile(path.join(webDirectory, "index.html"), (error) => {
      if (error != null) {
        next(error);
      }
    });
  });
}

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
