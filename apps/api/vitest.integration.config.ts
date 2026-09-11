import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["tests/integration/**/*.integration.test.ts"],
    setupFiles: [
      "./vitest.setup.ts",
      "./tests/setup/integration.setup.ts",
    ],
    fileParallelism: false,
    sequence: {
      setupFiles: "list",
    },
  },
});
