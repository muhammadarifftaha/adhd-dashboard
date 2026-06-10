import { authenticator } from "otplib";

/** Generate the current TOTP code for a base32 secret. */
export function totpFromSecret(secret: string): string {
  return authenticator.generate(secret);
}

/** Generate the current TOTP code from an `otpauth://…?secret=…` URI. */
export function totpFromUri(totpURI: string): string {
  const secret = new URL(totpURI).searchParams.get("secret");
  if (!secret) throw new Error("No secret found in the TOTP URI.");
  return totpFromSecret(secret);
}
