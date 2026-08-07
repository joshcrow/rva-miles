import path from "node:path";
import { defineConfig } from "vitest/config";

// Owned by W-DATA-A. Covers all pure-logic tests under src/lib/__tests__
// (dates, periods, rates, db-merge, plus geo/geocode/routesLogic owned by
// other workstreams) — node environment, no DOM/IndexedDB required since
// db.ts's merge logic is factored into a pure, dependency-free function.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/lib/__tests__/**/*.test.ts"],
  },
});
