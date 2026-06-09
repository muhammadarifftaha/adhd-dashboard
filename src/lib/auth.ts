import { betterAuth } from "better-auth/minimal";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./db";
import { username, admin } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";

// Fail fast on misconfiguration instead of silently coercing with `!`.
// An unset secret would otherwise degrade session security; an unset URL
// would leave callbacks/redirects relying on request-header inference.
const BETTER_AUTH_SECRET = process.env.BETTER_AUTH_SECRET;
if (!BETTER_AUTH_SECRET) {
  throw new Error("BETTER_AUTH_SECRET is required but was not set.");
}
const BETTER_AUTH_URL = process.env.BETTER_AUTH_URL;
if (!BETTER_AUTH_URL) {
  throw new Error("BETTER_AUTH_URL is required but was not set.");
}

export const auth = betterAuth({
  secret: BETTER_AUTH_SECRET,
  // Better Auth reads `baseURL` (capital URL); a lowercase `baseUrl` key is
  // silently ignored. See better-auth/dist/context/create-context.mjs.
  baseURL: BETTER_AUTH_URL,
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    // TODO(security): email verification is intentionally disabled for the
    // current single-admin internal dashboard. Before any production /
    // multi-user exposure, set this to `true` AND configure
    // `sendVerificationEmail` with a real email transport — otherwise sign-in
    // would break since no verification email can be sent. Without this,
    // accounts can be created/used without proving control of the email.
    requireEmailVerification: false,
  },
  plugins: [username(), admin(), nextCookies()], // nextCookies MUST be last
});
