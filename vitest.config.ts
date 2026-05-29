import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    globals: true,
    // Unit tests: no server needed
    include: ["src/**/__tests__/**/*.test.ts"],
    // Security integration tests run separately (require a live server)
    exclude: ["tests/security/**", "node_modules/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/lib/**/*.ts"],
      exclude: ["src/lib/db.ts", "src/**/__tests__/**"],
    },
  },
});
