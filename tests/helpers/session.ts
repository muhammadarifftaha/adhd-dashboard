import { auth } from "@/lib/auth";

import { tokenFromLastEmail } from "./sent-emails";

/**
 * A tiny cookie jar that threads Better Auth's session across `auth.api.*`
 * calls. We call the api with `asResponse: true`, read `Set-Cookie` from the
 * Response, and replay it on the next request — independent of the nextCookies
 * plugin, so it works the same way a browser would.
 */
export type Jar = {
  cookie(): string;
  ingest(headers: Headers): void;
  headers(extra?: Record<string, string>): Headers;
};

export function createJar(): Jar {
  const store = new Map<string, string>();
  return {
    cookie() {
      return [...store.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
    },
    ingest(headers) {
      const setCookies =
        (headers.getSetCookie?.() as string[] | undefined) ?? [];
      for (const sc of setCookies) {
        const segment = sc.split(";")[0];
        const eq = segment.indexOf("=");
        if (eq < 0) continue;
        const name = segment.slice(0, eq).trim();
        const value = segment.slice(eq + 1).trim();
        const cleared =
          !value ||
          /expires=Thu,\s*01 Jan 1970/i.test(sc) ||
          /max-age=0\b/i.test(sc);
        if (cleared) store.delete(name);
        else store.set(name, value);
      }
    },
    headers(extra) {
      const cookie = this.cookie();
      return new Headers({
        ...(cookie ? { cookie } : {}),
        ...(extra ?? {}),
      });
    },
  };
}

export type ApiResult<T = unknown> = {
  ok: boolean;
  status: number;
  data: T;
};

// Better Auth's endpoints each have a strict, distinct signature; for a generic
// test helper we accept any callable and treat the asResponse result as a
// Response (which is what passing asResponse:true returns at runtime).
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- bridges many endpoint signatures
type ApiFn = (...args: any[]) => unknown;

/**
 * Invoke a Better Auth server endpoint with the jar's cookies, capturing any
 * Set-Cookie back into the jar. Returns the parsed body + status without
 * throwing, so failure cases can be asserted directly.
 */
export async function call<T = unknown>(
  jar: Jar,
  fn: ApiFn,
  opts: Record<string, unknown> = {},
): Promise<ApiResult<T>> {
  const res = (await fn({
    ...opts,
    headers: jar.headers(opts.headers as Record<string, string> | undefined),
    asResponse: true,
  })) as Response;
  jar.ingest(res.headers);
  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  return { ok: res.ok, status: res.status, data: data as T };
}

/* ── high-level flows ─────────────────────────────────────────────────────── */

type SignUpBody = {
  name: string;
  email: string;
  username: string;
  password: string;
  displayUsername?: string;
  userInitials?: string;
};

export const signUp = (jar: Jar, body: SignUpBody) =>
  call(jar, auth.api.signUpEmail, { body });

export const signInUsername = (
  jar: Jar,
  body: { username: string; password: string; rememberMe?: boolean },
) => call(jar, auth.api.signInUsername, { body });

export const signInEmail = (
  jar: Jar,
  body: { email: string; password: string; rememberMe?: boolean },
) => call(jar, auth.api.signInEmail, { body });

export async function getSession(jar: Jar) {
  const { data } = await call<{
    user?: { id: string; email: string; username?: string | null };
  } | null>(jar, auth.api.getSession);
  return data;
}

/** Verify the email using the token from the most recent verification link. */
export async function verifyEmailFromInbox(jar: Jar) {
  const token = tokenFromLastEmail("verification");
  if (!token) throw new Error("No verification email/token was captured.");
  return call(jar, auth.api.verifyEmail, { query: { token } });
}
