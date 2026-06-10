import { prisma } from "@/lib/db";

export { prisma };

// Every @@map'd table; TRUNCATE … CASCADE clears them regardless of FK order.
const TABLES = [
  "event",
  "two_factor",
  "session",
  "account",
  "verification",
  "user_settings",
  "user",
] as const;

/** Wipe all rows between tests so each starts from an empty database. */
export async function resetDb(): Promise<void> {
  const list = TABLES.map((t) => `"${t}"`).join(", ");
  await prisma.$executeRawUnsafe(`TRUNCATE ${list} RESTART IDENTITY CASCADE`);
}
