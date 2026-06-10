import {
  usernameClient,
  adminClient,
  inferAdditionalFields,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
// `import type` is erased at compile time, so referencing the server `auth`
// instance for type inference does NOT pull server-only code into the browser
// bundle. This keeps `userInitials` (and any future additionalFields) typed on
// `useSession().data.user` without duplicating the field schema here.
import type { auth } from "./auth";
export const authClient = createAuthClient({
  // No `baseURL` is set: this client runs in the browser, where non-NEXT_PUBLIC_
  // env vars (like BETTER_AUTH_URL) are not inlined and resolve to `undefined`.
  // Since the app and the auth API are served from the same origin, Better Auth
  // falls back to `window.location.origin`. If the auth API is ever served from
  // a different origin, expose `NEXT_PUBLIC_BETTER_AUTH_URL` and set
  // `baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL` here.
  plugins: [
    usernameClient(),
    adminClient(),
    inferAdditionalFields<typeof auth>(),
  ],
});
