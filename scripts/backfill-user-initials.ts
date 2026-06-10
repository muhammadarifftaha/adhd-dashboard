/**
 * One-off backfill: populate `User.userInitials` for existing rows created
 * before the column existed (they default to NULL).
 *
 * Idempotent — only touches users whose initials are null/empty, so it is safe
 * to re-run. New sign-ups already set this at creation time, so this is purely
 * for historical rows.
 *
 *   pnpm db:up            # ensure Postgres is running
 *   npx tsx scripts/backfill-user-initials.ts
 *
 * Builds its own Prisma client (rather than importing src/lib/db) so it can run
 * standalone under tsx without the `@/` path alias.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { generateInitials } from "../src/lib/initials";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Configure .env before running.");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  const users = await prisma.user.findMany({
    where: { OR: [{ userInitials: null }, { userInitials: "" }] },
    select: { id: true, name: true, username: true },
  });

  console.log(`Found ${users.length} user(s) needing initials.`);

  let updated = 0;
  let skipped = 0;
  for (const user of users) {
    const initials = generateInitials(user.name, user.username);
    if (!initials) {
      console.warn(`  - ${user.id}: name/username empty, cannot derive — skipped`);
      skipped++;
      continue;
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { userInitials: initials },
    });
    console.log(`  ✓ ${user.id}: "${user.name}" -> ${initials}`);
    updated++;
  }

  console.log(`Done. Updated ${updated}, skipped ${skipped}.`);
}

main()
  .catch((error) => {
    console.error("Backfill failed:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
