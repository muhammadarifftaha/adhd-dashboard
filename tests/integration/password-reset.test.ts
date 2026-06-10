import { describe, expect, it } from "vitest";

import { auth } from "@/lib/auth";

import { signedInUser, VALID_PASSWORD } from "../helpers/factories";
import { lastEmail, tokenFromLastEmail } from "../helpers/sent-emails";
import { call, createJar, getSession, signInUsername } from "../helpers/session";

describe("password reset", () => {
  const user = {
    email: "erin@example.com",
    username: "erin",
    password: VALID_PASSWORD,
  };
  const NEW_PASSWORD = "BrandNew9!";

  it("emails a reset link, resets the password, and swaps which password works", async () => {
    await signedInUser(user);

    // Request a reset — sends the link via the captured email hook.
    const request = await call(createJar(), auth.api.requestPasswordReset, {
      body: {
        email: user.email,
        redirectTo: "http://localhost:3000/auth/reset-password",
      },
    });
    expect(request.ok).toBe(true);

    const mail = lastEmail("reset");
    expect(mail?.to).toBe(user.email);
    const token = tokenFromLastEmail("reset");
    expect(token).toBeTruthy();

    // Reset to the new password.
    const reset = await call(createJar(), auth.api.resetPassword, {
      body: { newPassword: NEW_PASSWORD, token },
    });
    expect(reset.ok).toBe(true);

    // New password works…
    const withNew = createJar();
    const ok = await signInUsername(withNew, {
      username: user.username,
      password: NEW_PASSWORD,
    });
    expect(ok.ok).toBe(true);
    expect((await getSession(withNew))?.user?.email).toBe(user.email);

    // …and the old one no longer does.
    const withOld = await signInUsername(createJar(), {
      username: user.username,
      password: VALID_PASSWORD,
    });
    expect(withOld.ok).toBe(false);
  });

  it("does not leak whether an email exists (no error for unknown address)", async () => {
    const res = await call(createJar(), auth.api.requestPasswordReset, {
      body: {
        email: "nobody@example.com",
        redirectTo: "http://localhost:3000/auth/reset-password",
      },
    });
    // Better Auth responds success regardless to avoid account enumeration.
    expect(res.ok).toBe(true);
    expect(lastEmail("reset")).toBeUndefined();
  });
});
