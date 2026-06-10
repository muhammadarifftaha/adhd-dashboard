import { execFileSync } from "node:child_process";

import { Client } from "pg";

import {
  maintenanceDatabaseUrl,
  testDatabaseName,
  testDatabaseUrl,
} from "./test-database-url";

/**
 * Runs once before the whole suite: ensures a dedicated test database exists on
 * the dev Postgres instance and applies all migrations to it. The dev DB and
 * its data are never touched.
 */
export default async function setup() {
  const dbName = testDatabaseName();

  // CREATE DATABASE can't run inside the target DB, so connect to `postgres`.
  const admin = new Client({ connectionString: maintenanceDatabaseUrl() });
  await admin.connect();
  try {
    const { rowCount } = await admin.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [dbName],
    );
    if (!rowCount) {
      // Identifier can't be parameterized; dbName is derived from our own env.
      await admin.query(`CREATE DATABASE "${dbName}"`);
    }
  } finally {
    await admin.end();
  }

  // Apply migrations to the test DB. prisma.config.ts reads DATABASE_URL, and
  // dotenv won't override an already-set var, so this targets the test DB.
  // execFileSync (argv array, no shell) over execSync — nothing to inject here.
  execFileSync("pnpm", ["exec", "prisma", "migrate", "deploy"], {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: testDatabaseUrl() },
  });
}
