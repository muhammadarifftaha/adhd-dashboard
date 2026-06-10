import { execFileSync } from "node:child_process";

import { Client } from "pg";

import {
  maintenanceDatabaseUrl,
  testDatabaseName,
  testDatabaseUrl,
} from "../setup/test-database-url";

/**
 * Runs once before the E2E run: ensure the test database exists, is migrated,
 * and is empty (no admin) so the first-run setup spec sees a virgin install.
 * Uses raw `pg` + the Prisma CLI only — no app imports, so there are no path
 * alias concerns in the Playwright runtime.
 */
export default async function globalSetup() {
  const dbName = testDatabaseName();

  const admin = new Client({ connectionString: maintenanceDatabaseUrl() });
  await admin.connect();
  try {
    const { rowCount } = await admin.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [dbName],
    );
    if (!rowCount) await admin.query(`CREATE DATABASE "${dbName}"`);
  } finally {
    await admin.end();
  }

  execFileSync("pnpm", ["exec", "prisma", "migrate", "deploy"], {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: testDatabaseUrl() },
  });

  const db = new Client({ connectionString: testDatabaseUrl() });
  await db.connect();
  try {
    await db.query(
      `TRUNCATE "event","two_factor","session","account","verification","user_settings","user" RESTART IDENTITY CASCADE`,
    );
  } finally {
    await db.end();
  }
}
