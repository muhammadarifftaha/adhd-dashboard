/**
 * In-memory capture of the emails the app would send. The `@/lib/email` module
 * is mocked (see tests/setup/vitest.setup.ts) to record into this store instead
 * of hitting Resend, so tests can read verification/reset tokens straight from
 * the link the user would have clicked — no network, fully deterministic.
 */
export type SentEmailKind =
  | "verification"
  | "reset"
  | "change-email"
  | "username-changed";

export type SentEmail = {
  kind: SentEmailKind;
  to: string;
  url?: string;
  newEmail?: string;
  username?: string;
  name?: string;
};

const emails: SentEmail[] = [];

export function recordEmail(email: SentEmail): void {
  emails.push(email);
}

export function sentEmails(): readonly SentEmail[] {
  return emails.slice();
}

export function clearSentEmails(): void {
  emails.length = 0;
}

/** Most recent captured email, optionally filtered by kind. */
export function lastEmail(kind?: SentEmailKind): SentEmail | undefined {
  for (let i = emails.length - 1; i >= 0; i--) {
    if (!kind || emails[i].kind === kind) return emails[i];
  }
  return undefined;
}

/**
 * Pull the token out of the most recent link of a given kind. Verification uses
 * a `?token=` query param; password-reset uses a `/reset-password/:token` path
 * segment — handle both.
 */
export function tokenFromLastEmail(kind?: SentEmailKind): string | undefined {
  const url = lastEmail(kind)?.url;
  if (!url) return undefined;
  const parsed = new URL(url);
  const query = parsed.searchParams.get("token");
  if (query) return query;
  const lastSegment = parsed.pathname.split("/").filter(Boolean).pop();
  return lastSegment || undefined;
}
