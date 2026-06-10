import { APIError } from "better-auth/api";

/**
 * Map a thrown value to a safe, user-facing message.
 *
 * Better Auth `APIError`s carry curated, user-facing messages, so those are
 * safe to surface. Any other thrown value (Prisma errors, unexpected
 * exceptions) may leak internal details (column/constraint names, connection
 * info), so we never forward its raw `.message` — we return a generic fallback
 * instead. The full error should always be logged server-side by the caller.
 */
export function toClientErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof APIError && error.body?.message) {
    return error.body.message;
  }
  return fallback;
}

/**
 * True when the error is Better Auth's "email not verified" sign-in rejection.
 * Lets callers route the user to a "check your email" page (Better Auth has
 * already re-sent a verification link) instead of surfacing a raw error.
 * Checks both the code and the known message for resilience across versions.
 */
export function isEmailNotVerified(error: unknown): boolean {
  if (!(error instanceof APIError)) return false;
  const body = error.body as { code?: string; message?: string } | undefined;
  return body?.code === "EMAIL_NOT_VERIFIED" || body?.message === "Email not verified";
}
