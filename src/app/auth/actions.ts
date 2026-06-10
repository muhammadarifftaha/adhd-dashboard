"use server";
import { auth } from "@lib/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { logger } from "@/lib/logger";
import { toClientErrorMessage, isEmailNotVerified } from "@/lib/safe-error";
import { generateInitials } from "@/lib/initials";
import {
  SignInFormData,
  SignUpFormData,
  signInSchema,
  signUpSchema,
} from "@/lib/schema/auth";

// Actions return { error } on failure (surfaced via RHF in the form) and
// redirect() on success. Errors are never put in the URL.
export async function signIn(
  formData: SignInFormData,
): Promise<{ error: string } | undefined> {
  const log = logger.child({ function: "signIn", module: "auth" });

  // A Server Action is a public POST endpoint: re-validate here so the
  // client-side zodResolver cannot be bypassed.
  const parsed = signInSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: "Invalid input." };
  }
  const { username, password, rememberMe } = parsed.data;

  let result;
  try {
    result = await auth.api.signInUsername({
      body: { username, password, rememberMe },
      headers: await headers(),
    });
  } catch (error) {
    // Unverified accounts can't sign in — Better Auth has already re-sent a
    // verification link, so route to the "check your email" page rather than
    // showing a raw error.
    if (isEmailNotVerified(error)) {
      redirect("/auth/verify-email");
    }
    const message = toClientErrorMessage(
      error,
      "An unknown error occurred during sign-in.",
    );
    log.error({ error, username }, "Sign-in failed");
    return { error: message };
  }

  // With 2FA enabled, sign-in does NOT establish a full session — it returns a
  // twoFactorRedirect and sets a short-lived cookie (forwarded by nextCookies).
  // Send the user to the second-factor page to finish authenticating.
  if ((result as { twoFactorRedirect?: boolean } | null)?.twoFactorRedirect) {
    redirect("/auth/2fa");
  }

  // Success — redirect() navigates the client; nothing is returned.
  redirect("/");
}

export async function signUp(
  formData: SignUpFormData,
): Promise<{ error: string } | undefined> {
  const log = logger.child({ function: "signUp", module: "auth" });

  const parsed = signUpSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: "Invalid input." };
  }
  const { username, email, displayUsername, name, password } = parsed.data;
  // Derive initials at creation time so the avatar fallback is populated from
  // the first session. `userInitials` is a declared additionalField, so Better
  // Auth persists it from the sign-up body.
  const userInitials = generateInitials(name, username);

  try {
    await auth.api.signUpEmail({
      body: { username, email, displayUsername, name, password, userInitials },
      headers: await headers(),
    });
  } catch (error) {
    const message = toClientErrorMessage(
      error,
      "An unknown error occurred during sign-up.",
    );
    log.error({ error, username, email }, "Sign-up failed");
    return { error: message };
  }

  // With verification required, sign-up doesn't establish a session — a
  // verification link was emailed. Send the user to the "check your email" page.
  redirect("/auth/verify-email");
}
