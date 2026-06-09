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
