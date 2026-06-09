import { usernameClient, adminClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
export const authClient = createAuthClient({
  // No `baseURL` is set: this client runs in the browser, where non-NEXT_PUBLIC_
  // env vars (like BETTER_AUTH_URL) are not inlined and resolve to `undefined`.
  // Since the app and the auth API are served from the same origin, Better Auth
  // falls back to `window.location.origin`. If the auth API is ever served from
  // a different origin, expose `NEXT_PUBLIC_BETTER_AUTH_URL` and set
  // `baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL` here.
  plugins: [usernameClient(), adminClient()],
});
