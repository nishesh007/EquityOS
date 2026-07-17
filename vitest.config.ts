import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  // Next.js keeps tsconfig `jsx: preserve`; transform TSX for tests here.
  oxc: { jsx: { runtime: "automatic" } },
  test: {
    globals: false,
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.spec.ts", "lib/**/*.test.ts", "lib/**/*.spec.ts"],
    coverage: {
      provider: "v8",
      include: ["src/core/dataIntegrity/**/*.ts"],
      exclude: ["src/core/dataIntegrity/**/*.test.ts", "src/core/dataIntegrity/index.ts"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
