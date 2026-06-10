import "dotenv/config";

/**
 * The dev `DATABASE_URL` with its database name swapped to a dedicated test
 * database (`<name>_test`), so the suite never touches development data. Falls
 * back to the docker-compose defaults if the env isn't loaded.
 */
export function testDatabaseUrl(): string {
  const base =
    process.env.DATABASE_URL ??
    "postgresql://postgres:postgres@localhost:5432/adhd_dashboard";
  const url = new URL(base);
  const name = decodeURIComponent(url.pathname.replace(/^\//, "")) || "adhd_dashboard";
  url.pathname = `/${name}_test`;
  return url.toString();
}

/** Same connection, pointed at the `postgres` maintenance DB (for CREATE DATABASE). */
export function maintenanceDatabaseUrl(): string {
  const url = new URL(testDatabaseUrl());
  url.pathname = "/postgres";
  return url.toString();
}

/** The bare name of the test database. */
export function testDatabaseName(): string {
  return decodeURIComponent(new URL(testDatabaseUrl()).pathname.replace(/^\//, ""));
}
