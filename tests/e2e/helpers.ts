import { Client } from "pg";

import { testDatabaseUrl } from "../setup/test-database-url";

export const VALID_PASSWORD = "Password1!";

/** Run a query against the test database with a short-lived connection. */
async function withDb<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  const client = new Client({ connectionString: testDatabaseUrl() });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

export async function countAdmins(): Promise<number> {
  return withDb(async (db) => {
    const { rows } = await db.query<{ count: string }>(
      `SELECT COUNT(*)::int AS count FROM "user" WHERE role = 'admin'`,
    );
    return Number(rows[0]?.count ?? 0);
  });
}

/**
 * Register a user through the running server's public sign-up endpoint (so the
 * password is hashed by Better Auth), then flip them to verified directly in
 * the DB. Promotes to admin when requested. Returns the credentials.
 */
export async function seedUser(
  baseURL: string,
  opts: {
    email: string;
    username: string;
    name?: string;
    password?: string;
    admin?: boolean;
  },
): Promise<{ username: string; email: string; password: string }> {
  const password = opts.password ?? VALID_PASSWORD;

  const res = await fetch(`${baseURL}/api/auth/sign-up/email`, {
    method: "POST",
    // Better Auth's CSRF check requires a trusted Origin; a bare fetch has none.
    headers: { "content-type": "application/json", origin: baseURL },
    body: JSON.stringify({
      name: opts.name ?? "Seed User",
      email: opts.email,
      username: opts.username,
      password,
      userInitials: "SU",
    }),
  });
  if (!res.ok && res.status !== 422) {
    // 422 can occur if the user already exists from a previous spec; tolerate it.
    const text = await res.text();
    throw new Error(`seedUser sign-up failed (${res.status}): ${text}`);
  }

  await withDb((db) =>
    db.query(
      `UPDATE "user" SET "emailVerified" = true${
        opts.admin ? `, role = 'admin'` : ""
      } WHERE email = $1`,
      [opts.email],
    ),
  );

  return { username: opts.username, email: opts.email, password };
}

/** Ensure at least one admin exists so the first-run gate lets normal routes load. */
export async function ensureAdmin(baseURL: string): Promise<void> {
  if ((await countAdmins()) > 0) return;
  await seedUser(baseURL, {
    email: "e2e.admin@example.com",
    username: "e2eadmin",
    name: "E2E Admin",
    admin: true,
  });
}
