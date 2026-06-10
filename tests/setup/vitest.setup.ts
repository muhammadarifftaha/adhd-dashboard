import { beforeEach, vi } from "vitest";

// ── Mock next/headers ───────────────────────────────────────────────────────
// Better Auth's nextCookies() plugin and the server actions call cookies()/
// headers(); outside a real request these throw. Back them with an in-memory
// store so a sign-in's session cookie is visible to later headers() reads.
vi.mock("next/headers", async () => {
  const { cookieStore, cookieHeader } = await import(
    "../helpers/next-mock-store"
  );
  type CookieInit = { name: string; value: string };
  return {
    cookies: async () => ({
      get: (name: string) =>
        cookieStore.has(name)
          ? { name, value: cookieStore.get(name)! }
          : undefined,
      getAll: () =>
        [...cookieStore.entries()].map(([name, value]) => ({ name, value })),
      set: (a: string | CookieInit, b?: string) => {
        if (a && typeof a === "object") cookieStore.set(a.name, a.value ?? "");
        else cookieStore.set(a, b ?? "");
      },
      delete: (n: string | { name: string }) =>
        cookieStore.delete(typeof n === "object" ? n.name : n),
      has: (name: string) => cookieStore.has(name),
      toString: () => cookieHeader(),
    }),
    headers: async () =>
      new Headers(cookieHeader() ? { cookie: cookieHeader() } : {}),
  };
});

// ── Mock next/navigation ────────────────────────────────────────────────────
// redirect()/notFound() throw a sentinel we can assert on (mirrors Next's own
// NEXT_REDIRECT digest so any digest-based handling still recognizes it).
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    const error = new Error("NEXT_REDIRECT") as Error & {
      digest: string;
      redirectTo: string;
    };
    error.digest = `NEXT_REDIRECT;replace;${url};307;`;
    error.redirectTo = url;
    throw error;
  },
  notFound: () => {
    const error = new Error("NEXT_NOT_FOUND") as Error & { digest: string };
    error.digest = "NEXT_HTTP_ERROR_FALLBACK;404";
    throw error;
  },
}));

// ── Mock @/lib/email ────────────────────────────────────────────────────────
// Capture links instead of sending via Resend.
vi.mock("@/lib/email", async () => {
  const { recordEmail } = await import("../helpers/sent-emails");
  return {
    sendVerificationEmail: async (to: string, url: string, name?: string) =>
      recordEmail({ kind: "verification", to, url, name }),
    sendPasswordResetEmail: async (to: string, url: string, name?: string) =>
      recordEmail({ kind: "reset", to, url, name }),
    sendEmailChangeConfirmation: async (
      to: string,
      newEmail: string,
      url: string,
      name?: string,
    ) => recordEmail({ kind: "change-email", to, newEmail, url, name }),
    sendUsernameChangedEmail: async (
      to: string,
      username: string,
      name?: string,
    ) => recordEmail({ kind: "username-changed", to, username, name }),
  };
});

// Fresh database, inbox, and cookie jar before every test.
beforeEach(async () => {
  const { resetDb } = await import("../helpers/db");
  const { clearSentEmails } = await import("../helpers/sent-emails");
  const { resetCookieStore } = await import("../helpers/next-mock-store");
  await resetDb();
  clearSentEmails();
  resetCookieStore();
});
