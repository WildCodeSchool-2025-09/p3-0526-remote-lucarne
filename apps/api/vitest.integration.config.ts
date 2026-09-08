import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.integration.test.ts"],
    setupFiles: [
      "./vitest.setup.ts",
      "./src/test/integration.setup.ts",
    ],
    fileParallelism: false,
    sequence: {
      setupFiles: "list",
    },
  },
});
