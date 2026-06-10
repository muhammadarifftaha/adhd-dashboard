import { betterAuth } from "better-auth/minimal";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./db";
import { username, admin, twoFactor } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendEmailChangeConfirmation,
} from "./email";

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
    // Verification required: unverified accounts cannot sign in. Sign-up and
    // unverified sign-in both send a verification link via the hooks below.
    // The first-run setup flow auto-verifies the bootstrap admin (see
    // setup/actions.ts) so the server owner isn't blocked on email.
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail(user.email, url, user.name);
    },
  },
  emailVerification: {
    // `sendOnSignUp` is left unset: Better Auth falls back to
    // requireEmailVerification (now true), so sign-up still triggers a
    // verification email — and the banner / API can request one on demand.
    sendVerificationEmail: async ({ user, url }) => {
      await sendVerificationEmail(user.email, url, user.name);
    },
  },
  user: {
    changeEmail: {
      enabled: true,
      // Only applies while `emailVerified` is false. Now that verification is
      // required, signed-in users are always verified, so email changes go
      // through the confirmation flow (sendChangeEmailConfirmation) below —
      // this flag is effectively dormant, kept only for the unverified edge.
      updateEmailWithoutVerification: true,
      // NOTE: this version of Better Auth names the hook
      // `sendChangeEmailConfirmation` (not `sendChangeEmailVerification`); the
      // older name is silently ignored. It fires for the verified-email change
      // flow, sending a confirmation to the user's CURRENT address.
      sendChangeEmailConfirmation: async ({ user, newEmail, url }) => {
        await sendEmailChangeConfirmation(user.email, newEmail, url, user.name);
      },
    },
    // Better Auth only returns core + plugin fields in the session; any extra
    // Prisma column must be declared here or it is silently stripped from the
    // `/get-session` payload (the DB column alone is not enough).
    additionalFields: {
      userInitials: {
        type: "string",
        required: false, // nullable column; existing rows start as null
      },
    },
  },
  plugins: [
    username(),
    admin(),
    // `issuer` is the label shown in authenticator apps. Default flow:
    // enable() generates the secret but does NOT turn 2FA on until the user
    // verifies a TOTP code (verifyTotp) — so a half-finished setup can't lock
    // anyone out.
    twoFactor({ issuer: "ADHD Dashboard" }),
    nextCookies(), // nextCookies MUST be last
  ],
});
