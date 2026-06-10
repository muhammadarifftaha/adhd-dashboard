"use server";

import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { Prisma } from "@/generated/prisma/client";
import { parseDashboardLayouts } from "@/lib/schema/dashboard";

/**
 * Persist the current user's dashboard widget arrangement. Called (debounced)
 * from the client whenever a card is moved or resized. Returns `{ error }` on
 * failure; the grid keeps the in-memory layout regardless, so a failed save is
 * non-fatal — it just won't survive a reload.
 */
export async function saveDashboardLayout(
  input: unknown,
): Promise<{ error: string } | undefined> {
  const log = logger.child({ function: "saveDashboardLayout", module: "dashboard" });

  // A Server Action is a public POST endpoint — authenticate every call.
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { error: "You must be signed in to save your dashboard." };
  }

  // Re-validate and strip unknown widgets server-side; never trust the payload.
  const layouts = parseDashboardLayouts(input);
  if (!layouts) {
    return { error: "Invalid layout." };
  }

  const userId = session.user.id;
  try {
    // UserSettings is keyed on the user id (1:1), so upsert covers the
    // first-save case where no settings row exists yet.
    await prisma.userSettings.upsert({
      where: { id: userId },
      update: { dashboardLayout: layouts as Prisma.InputJsonValue },
      create: { id: userId, dashboardLayout: layouts as Prisma.InputJsonValue },
    });
  } catch (error) {
    log.error({ error, userId }, "Failed to save dashboard layout");
    return { error: "Could not save your dashboard layout." };
  }

  return undefined;
}
