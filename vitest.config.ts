import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "tests/integration/**/*.test.ts"],
    // Les tests d'intégration partagent une base : on les sérialise.
    fileParallelism: false,
    testTimeout: 30000,
    
  },
});
