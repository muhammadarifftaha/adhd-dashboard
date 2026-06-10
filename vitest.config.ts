import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

import { testDatabaseUrl } from "./tests/setup/test-database-url";

export default defineConfig({
  // Resolve the project's @/ @lib @components … path aliases from tsconfig.
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    globals: true,
    include: ["tests/integration/**/*.test.ts"],
    globalSetup: ["./tests/setup/global.ts"],
    setupFiles: ["./tests/setup/vitest.setup.ts"],
    // The suite shares one Postgres test database, so run files serially rather
    // than racing parallel writers on the same tables.
    fileParallelism: false,
    hookTimeout: 60_000,
    testTimeout: 20_000,
    // auth.ts / email.tsx fail fast on unset secrets; provide test values (real
    // ones from .env win when present). DATABASE_URL points at the test DB.
    env: {
      DATABASE_URL: testDatabaseUrl(),
      BETTER_AUTH_SECRET:
        process.env.BETTER_AUTH_SECRET ?? "test-better-auth-secret-min-32-characters",
      BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
      RESEND_API_KEY: process.env.RESEND_API_KEY ?? "re_test_dummy_key",
      EMAIL_FROM: process.env.EMAIL_FROM ?? "test@example.com",
    },
  },
});
