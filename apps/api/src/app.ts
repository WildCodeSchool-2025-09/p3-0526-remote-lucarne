import cors from "cors";
import express from "express";
import helmet from "helmet";
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

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
