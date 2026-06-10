"use server";

import { auth } from "@lib/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/db";
import { toClientErrorMessage } from "@/lib/safe-error";
import { generateInitials } from "@/lib/initials";
import { SignUpAdminFormData, signUpAdminSchema } from "@/lib/schema/admin";

// First-run bootstrap: creates the first admin. Returns { error } on failure
// (surfaced via RHF), redirects on success. Errors are never put in the URL.
export async function signUpAdmin(
  formData: SignUpAdminFormData,
): Promise<{ error: string } | undefined> {
  const log = logger.child({ function: "signUpAdmin", module: "setup" });

  // Public Server Action: re-validate so the client zodResolver can't be bypassed.
  const parsed = signUpAdminSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: "Invalid input." };
  }
  const { username, email, displayUsername, name, password } = parsed.data;
  const userInitials = generateInitials(name, username);

  // SECURITY: this endpoint may only ever create the *first* admin. The proxy
  // redirect is not a boundary (server actions can bypass it), so the guard
  // must live here too.
  if ((await prisma.user.count({ where: { role: "admin" } })) > 0) {
    log.warn({ username }, "Admin setup attempted after an admin already exists");
    redirect("/");
  }

  let userId: string;
  try {
    const data = await auth.api.signUpEmail({
      body: { username, email, displayUsername, name, password, userInitials },
      headers: await headers(),
    });
    userId = data.user.id;
  } catch (error) {
    const message = toClientErrorMessage(
      error,
      "An unknown error occurred during sign-up.",
    );
    log.error({ error, username }, "Admin sign-up failed");
    return { error: message };
  }

  // `role` is input:false on the admin plugin, so it can't be set via sign-up.
  // Promote the freshly-created user directly (server-side bootstrap only).
  // Wrapped so a failed promotion doesn't crash and lock setup out (the user
  // record already exists, so the count guard would block a retry).
  try {
    await prisma.user.update({ where: { id: userId }, data: { role: "admin" } });
  } catch (error) {
    log.error(
      { error, userId, username },
      "Failed to promote bootstrap user to admin",
    );
    return { error: "Could not complete admin setup. Please try again." };
  }

  redirect("/admin");
}
