// This file is `.tsx` (not `.ts`) so the React Email templates can be built as
// JSX elements here and handed to Resend via its `react` option, which renders
// them to HTML/text at send time. Server-only: it reads secret env vars and
// must never be imported into client components.
import { Resend } from "resend";

import ChangeEmailVerification from "@/emails/change-email-verification";
import ResetPasswordEmail from "@/emails/reset-password-email";
import UsernameChangedEmail from "@/emails/username-changed";
import VerificationEmail from "@/emails/verification-email";

// Fail fast on misconfiguration instead of silently coercing with `!`.
// Without a real API key, every send would reject at runtime; without a
// verified `from` address, Resend rejects the request outright.
if (!process.env.RESEND_API_KEY) {
  throw new Error("RESEND_API_KEY is required but was not set.");
}
if (!process.env.EMAIL_FROM) {
  throw new Error("EMAIL_FROM is required but was not set.");
}
// Capture as `string` after the guards above. Reading `process.env.*` directly
// inside the `send` closure would re-widen to `string | undefined`, since TS
// does not carry module-level narrowing into nested functions.
const RESEND_API_KEY: string = process.env.RESEND_API_KEY;
const EMAIL_FROM: string = process.env.EMAIL_FROM;

const resend = new Resend(RESEND_API_KEY);

// Resend resolves the promise with `{ error }` set on failure rather than
// throwing, so surface it as a thrown Error to keep callers (Better Auth
// hooks) on a single failure path.
async function send(to: string, subject: string, react: React.ReactElement) {
  const { error } = await resend.emails.send({
    from: EMAIL_FROM,
    to,
    subject,
    react,
  });

  if (error) {
    throw new Error(`Failed to send email "${subject}" to ${to}: ${error.message}`);
  }
}

export async function sendVerificationEmail(to: string, url: string, name?: string) {
  await send(to, "Verify your email", <VerificationEmail url={url} name={name} />);
}

export async function sendPasswordResetEmail(to: string, url: string, name?: string) {
  await send(to, "Reset your password", <ResetPasswordEmail url={url} name={name} />);
}

export async function sendEmailChangeConfirmation(
  to: string,
  newEmail: string,
  url: string,
  name?: string,
) {
  await send(
    to,
    "Confirm your new email address",
    <ChangeEmailVerification url={url} newEmail={newEmail} name={name} />,
  );
}

export async function sendUsernameChangedEmail(
  to: string,
  username: string,
  name?: string,
) {
  await send(
    to,
    "Your username was changed",
    <UsernameChangedEmail username={username} name={name} />,
  );
}
