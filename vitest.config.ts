import path from "node:path";
import { defineConfig } from "vitest/config";

// Pure-logic unit tests only. Every money-touching module factors its decisions
// into dependency-free functions so the suite needs no DOM or IndexedDB.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/__tests__/**/*.test.ts"],
  },
});
