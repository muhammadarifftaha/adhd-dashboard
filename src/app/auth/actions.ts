"use server";
import { auth } from "@lib/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { logger } from "@/lib/logger";
import { toClientErrorMessage } from "@/lib/safe-error";
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

  try {
    await auth.api.signInUsername({
      body: { username, password, rememberMe },
      headers: await headers(),
    });
  } catch (error) {
    const message = toClientErrorMessage(
      error,
      "An unknown error occurred during sign-in.",
    );
    log.error({ error, username }, "Sign-in failed");
    return { error: message };
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

  redirect("/");
}
