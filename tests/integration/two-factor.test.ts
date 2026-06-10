import { describe, expect, it } from "vitest";

import { auth } from "@/lib/auth";

import { prisma } from "../helpers/db";
import { signedInUser, VALID_PASSWORD } from "../helpers/factories";
import { call, createJar, getSession, signInUsername } from "../helpers/session";
import { totpFromUri } from "../helpers/totp";

describe("two-factor authentication", () => {
  const user = {
    email: "grace@example.com",
    username: "grace",
    password: VALID_PASSWORD,
  };

  it("activates only after a TOTP code is verified, then challenges sign-in", async () => {
    const jar = await signedInUser(user);

    const enable = await call<{ totpURI: string; backupCodes: string[] }>(
      jar,
      auth.api.enableTwoFactor,
      { body: { password: VALID_PASSWORD } },
    );
    expect(enable.ok).toBe(true);
    expect(enable.data.totpURI).toContain("otpauth://");
    const backupCodes = enable.data.backupCodes;
    expect(Array.isArray(backupCodes)).toBe(true);
    expect(backupCodes.length).toBeGreaterThan(0);

    // Generating the secret does NOT enable 2FA — a code must be verified first.
    let row = await prisma.user.findUnique({ where: { email: user.email } });
    expect(row?.twoFactorEnabled ?? false).toBe(false);

    const verified = await call(jar, auth.api.verifyTOTP, {
      body: { code: totpFromUri(enable.data.totpURI) },
    });
    expect(verified.ok).toBe(true);

    row = await prisma.user.findUnique({ where: { email: user.email } });
    expect(row?.twoFactorEnabled).toBe(true);

    // A fresh sign-in now returns a 2FA challenge instead of a full session.
    const login = createJar();
    const challenge = await signInUsername(login, {
      username: user.username,
      password: VALID_PASSWORD,
    });
    expect(challenge.ok).toBe(true);
    expect(
      (challenge.data as { twoFactorRedirect?: boolean }).twoFactorRedirect,
    ).toBe(true);
    expect(await getSession(login)).toBeNull();

    // Finish with a single-use backup code (avoids TOTP replay within a window).
    const second = await call(login, auth.api.verifyBackupCode, {
      body: { code: backupCodes[0] },
    });
    expect(second.ok).toBe(true);
    expect((await getSession(login))?.user?.email).toBe(user.email);
  });

  it("can be disabled again with the account password", async () => {
    const jar = await signedInUser(user);
    const enable = await call<{ totpURI: string }>(jar, auth.api.enableTwoFactor, {
      body: { password: VALID_PASSWORD },
    });
    await call(jar, auth.api.verifyTOTP, {
      body: { code: totpFromUri(enable.data.totpURI) },
    });

    const disabled = await call(jar, auth.api.disableTwoFactor, {
      body: { password: VALID_PASSWORD },
    });
    expect(disabled.ok).toBe(true);

    const row = await prisma.user.findUnique({ where: { email: user.email } });
    expect(row?.twoFactorEnabled ?? false).toBe(false);
  });

  it("rejects enabling 2FA with the wrong password", async () => {
    const jar = await signedInUser(user);
    const res = await call(jar, auth.api.enableTwoFactor, {
      body: { password: "WrongPassword9!" },
    });
    expect(res.ok).toBe(false);
  });
});
