import fs from "node:fs";
import path from "node:path";
import cors from "cors";
import express from "express";
import type { ErrorRequestHandler } from "express";
import router from "./router";

const app = express();

if (process.env.CLIENT_URL != null) {
  app.use(cors({ origin: [process.env.CLIENT_URL] }));
}

app.use(express.json());
app.use(router);

const apiRootPath = path.resolve(__dirname, "..");
const publicFolderPath = path.join(apiRootPath, "public");

if (fs.existsSync(publicFolderPath)) {
  app.use(express.static(publicFolderPath));
}

const webBuildPath = path.resolve(apiRootPath, "../web/dist");

if (fs.existsSync(webBuildPath)) {
  app.use(express.static(webBuildPath));
  app.get("*", (_, res) => {
    res.sendFile("index.html", { root: webBuildPath });
  });
}

const logErrors: ErrorRequestHandler = (err, req, res, next) => {
  console.error(err);
  console.error("on req:", req.method, req.path);
  next(err);
};

app.use(logErrors);

export default app;
