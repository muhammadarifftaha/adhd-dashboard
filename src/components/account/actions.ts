"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { putObject, deleteObject } from "@/lib/storage";
import { ProfileUpdateData, profileUpdateSchema } from "@/lib/schema/profile";
import { toClientErrorMessage } from "@/lib/safe-error";
import { sendUsernameChangedEmail } from "@/lib/email";

// Avatars are small; cap uploads so a bad/oversized file can't exhaust memory.
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const MIME_TO_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

// Served back through the gated route handler at app/api/files/[...key].
const PUBLIC_PREFIX = "/api/files/";

/**
 * Upload a new profile picture for the current user. Returns `{ error }` on
 * failure (surfaced via the form) and `undefined` on success — the client then
 * refetches the session to pick up the new `user.image`.
 */
export async function uploadProfilePicture(
  formData: FormData,
): Promise<{ error: string } | undefined> {
  const log = logger.child({ function: "uploadProfilePicture", module: "account" });

  // A Server Action is a public POST endpoint — authenticate every call.
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { error: "You must be signed in to update your profile picture." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "No image was provided." };
  }
  if (file.size > MAX_BYTES) {
    return { error: "Image must be 5 MB or smaller." };
  }
  const ext = MIME_TO_EXT[file.type];
  if (!ext) {
    return { error: "Unsupported image type. Use PNG, JPEG, WebP, or GIF." };
  }

  const userId = session.user.id;
  const key = `avatars/${userId}/${crypto.randomUUID()}.${ext}`;

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    await putObject(key, bytes, file.type);
  } catch (error) {
    log.error({ error, userId }, "Failed to store profile picture");
    return { error: "Could not upload the image. Please try again." };
  }

  // Capture the previous image so we can clean it up after repointing the user.
  const previousImage = session.user.image;

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { image: `${PUBLIC_PREFIX}${key}` },
    });
  } catch (error) {
    log.error({ error, userId }, "Failed to update user image");
    // Roll back the orphaned upload so we don't leak storage.
    await deleteObject(key).catch(() => {});
    return { error: "Could not save the image. Please try again." };
  }

  // Best-effort cleanup of the old avatar (only ones we own, by key prefix).
  if (previousImage?.startsWith(PUBLIC_PREFIX)) {
    const oldKey = previousImage.slice(PUBLIC_PREFIX.length);
    if (oldKey.startsWith(`avatars/${userId}/`)) {
      await deleteObject(oldKey).catch((error) =>
        log.warn({ error, oldKey }, "Failed to delete previous avatar"),
      );
    }
  }

  return undefined;
}

/**
 * Update the current user's editable profile fields. Returns `{ error }` on
 * failure (surfaced via the form) and `undefined` on success — the client then
 * refetches the session to pick up the changes.
 */
export async function updateProfile(
  input: ProfileUpdateData,
): Promise<{ error: string } | undefined> {
  const log = logger.child({ function: "updateProfile", module: "account" });

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { error: "You must be signed in to update your profile." };
  }

  // Re-validate server-side so the client zodResolver can't be bypassed.
  const parsed = profileUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Invalid input." };
  }
  const { name, displayUsername, userInitials } = parsed.data;

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name,
        // Empty optional fields are cleared to null rather than stored as "".
        displayUsername: displayUsername?.trim() || null,
        userInitials: userInitials?.trim() || null,
      },
    });
  } catch (error) {
    log.error({ error, userId: session.user.id }, "Failed to update profile");
    return { error: "Could not save your profile. Please try again." };
  }

  return undefined;
}

/**
 * Change the current user's username. Routed through a server action (rather
 * than the client `updateUser`) so we can send a security-notification email
 * to the account address afterwards. Uniqueness/normalization is enforced by
 * the username plugin's /update-user hook. Returns `{ error }` on failure.
 */
export async function changeUsername(
  username: string,
): Promise<{ error: string } | undefined> {
  const log = logger.child({ function: "changeUsername", module: "account" });

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { error: "You must be signed in to change your username." };
  }

  try {
    await auth.api.updateUser({ body: { username }, headers: await headers() });
  } catch (error) {
    log.error({ error, userId: session.user.id }, "Username change failed");
    return { error: toClientErrorMessage(error, "Could not update your username.") };
  }

  // Best-effort security alert — never fail the change if the email doesn't send.
  try {
    await sendUsernameChangedEmail(session.user.email, username, session.user.name);
  } catch (error) {
    log.warn({ error, userId: session.user.id }, "Failed to send username-changed email");
  }

  return undefined;
}
