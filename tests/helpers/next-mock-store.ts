/**
 * Backing store for the mocked `next/headers` (see tests/setup/vitest.setup.ts).
 * Better Auth's `nextCookies()` plugin and the server actions call `cookies()`
 * and `headers()`, which throw outside a real request — the mock reads/writes
 * this map so those calls behave like a single in-memory browser session.
 */
export const cookieStore = new Map<string, string>();

export function resetCookieStore(): void {
  cookieStore.clear();
}

export function cookieHeader(): string {
  return [...cookieStore.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

/**
 * Load a `k=v; k2=v2` cookie header (e.g. a real session from the jar) into the
 * mocked store, so a server action's `headers()`/`cookies()` sees that session.
 * Bridges the asResponse jar world to the next/headers-mock world.
 */
export function setCookieHeader(header: string): void {
  resetCookieStore();
  for (const part of header.split(";")) {
    const segment = part.trim();
    const eq = segment.indexOf("=");
    if (eq < 0) continue;
    cookieStore.set(segment.slice(0, eq).trim(), segment.slice(eq + 1).trim());
  }
}
