const fs = require("node:fs/promises");
const path = require("node:path");

for (const nodeModules of [
  path.join(__dirname, "..", "node_modules"),
  path.join(__dirname, "..", "apps", "web", "node_modules"),
  path.join(__dirname, "..", "apps", "api", "node_modules"),
  path.join(__dirname, "..", "packages", "shared", "node_modules"),
  path.join(__dirname, "..", "packages", "typescript-config", "node_modules"),
  path.join(__dirname, "..", "packages", "eslint-config", "node_modules"),
]) {
  fs.rm(nodeModules, { recursive: true, force: true });
}

const packageLock = path.join(__dirname, "..", "package-lock.json");

fs.rm(packageLock, { force: true });
