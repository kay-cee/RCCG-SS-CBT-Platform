import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

/**
 * Security integration test config.
 * These tests make real HTTP requests and require a running server.
 *
 * Run with:
 *   BASE_URL=https://rccgsundayschoolquiz.online npm run test:security
 *   # or against local dev:
 *   BASE_URL=http://localhost:3000 npm run test:security
 */
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    globals: true,
    include: ["tests/security/**/*.test.ts"],
    testTimeout: 15_000,
  },
});
