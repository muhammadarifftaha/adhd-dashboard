import { defineConfig, devices } from "@playwright/test";

import { testDatabaseUrl } from "./tests/setup/test-database-url";

// A dedicated port so the E2E server never reuses (and never writes to) a dev
// server that might be pointed at the real database.
const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;

// Env for the Next server under test: the test DB, test auth secrets, and the
// email no-op seam so sign-up flows don't try to reach Resend.
const serverEnv: Record<string, string> = {
  ...process.env,
  DATABASE_URL: testDatabaseUrl(),
  BETTER_AUTH_SECRET:
    process.env.BETTER_AUTH_SECRET ?? "test-better-auth-secret-min-32-characters",
  BETTER_AUTH_URL: BASE_URL,
  AUTH_EMAIL_TRANSPORT: "noop",
  RESEND_API_KEY: process.env.RESEND_API_KEY ?? "re_test_dummy_key",
  EMAIL_FROM: process.env.EMAIL_FROM ?? "test@example.com",
  // Object storage isn't exercised by the auth flows; dummy values keep any
  // import-time guards happy.
  S3_ENDPOINT: process.env.S3_ENDPOINT ?? "http://localhost:9000",
  S3_REGION: process.env.S3_REGION ?? "us-east-1",
  S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID ?? "test",
  S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY ?? "testsecret",
  S3_BUCKET: process.env.S3_BUCKET ?? "test",
};

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  // Auth flows mutate shared global state (the single admin, sessions), so run
  // everything serially in one worker, in filename order.
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: BASE_URL,
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: "retain-on-failure",
  },
  webServer: {
    command: `pnpm exec next dev --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 120_000,
    env: serverEnv,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});
