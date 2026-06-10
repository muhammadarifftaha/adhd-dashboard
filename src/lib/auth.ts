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
    // TODO(security): email verification is intentionally disabled for the
    // current single-admin internal dashboard. The Resend transport is now
    // wired (see `emailVerification.sendVerificationEmail` below), so flipping
    // this to `true` later is safe — but only AFTER existing users are
    // verified, otherwise the current unverified admin would be locked out of
    // sign-in. Without this, accounts can be created/used without proving
    // control of the email.
    requireEmailVerification: false,
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail(user.email, url, user.name);
    },
  },
  emailVerification: {
    // `sendOnSignUp` is intentionally left off so the current sign-up flow is
    // unchanged (no verification email is forced at registration). Verification
    // can still be requested manually via sendVerificationEmail / the API.
    sendVerificationEmail: async ({ user, url }) => {
      await sendVerificationEmail(user.email, url, user.name);
    },
  },
  user: {
    changeEmail: {
      enabled: true,
      // No email transport is wired yet and accounts are unverified, so allow a
      // direct change without a confirmation email. This only takes effect while
      // `emailVerified` is false. Revisit alongside the email-verification TODO
      // above before any multi-user / production exposure.
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
