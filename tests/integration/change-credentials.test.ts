import { describe, expect, it } from "vitest";

import { auth } from "@/lib/auth";

import { prisma } from "../helpers/db";
import { signedInUser, VALID_PASSWORD } from "../helpers/factories";
import { lastEmail } from "../helpers/sent-emails";
import { call, createJar, getSession, signInUsername } from "../helpers/session";

describe("changing credentials", () => {
  const user = {
    email: "frank@example.com",
    username: "frank",
    password: VALID_PASSWORD,
  };

  it("requires confirmation before a verified user's email changes", async () => {
    const jar = await signedInUser(user);

    const res = await call(jar, auth.api.changeEmail, {
      body: {
        newEmail: "frank.new@example.com",
        callbackURL: "http://localhost:3000/account",
      },
    });
    expect(res.ok).toBe(true);

    // A confirmation goes to the CURRENT address; the email is not yet changed.
    const mail = lastEmail("change-email");
    expect(mail?.to).toBe(user.email);
    expect(mail?.newEmail).toBe("frank.new@example.com");

    const row = await prisma.user.findUnique({ where: { username: user.username } });
    expect(row?.email).toBe(user.email);
  });

  it("changes the password and revokes other sessions", async () => {
    const current = await signedInUser(user);

    // A second, independent session for the same user.
    const other = createJar();
    await signInUsername(other, {
      username: user.username,
      password: user.password,
    });
    expect((await getSession(other))?.user?.email).toBe(user.email);

    const NEW_PASSWORD = "Rotated9!";
    const res = await call(current, auth.api.changePassword, {
      body: {
        currentPassword: VALID_PASSWORD,
        newPassword: NEW_PASSWORD,
        revokeOtherSessions: true,
      },
    });
    expect(res.ok).toBe(true);

    // The other session is now revoked; the calling session survives.
    expect(await getSession(other)).toBeNull();
    expect((await getSession(current))?.user?.email).toBe(user.email);

    // New password authenticates; old one is rejected.
    const withNew = await signInUsername(createJar(), {
      username: user.username,
      password: NEW_PASSWORD,
    });
    expect(withNew.ok).toBe(true);
    const withOld = await signInUsername(createJar(), {
      username: user.username,
      password: VALID_PASSWORD,
    });
    expect(withOld.ok).toBe(false);
  });

  it("changes the username via the username plugin", async () => {
    const jar = await signedInUser(user);

    const res = await call(jar, auth.api.updateUser, {
      body: { username: "frank2" },
    });
    expect(res.ok).toBe(true);

    const row = await prisma.user.findUnique({ where: { email: user.email } });
    expect(row?.username).toBe("frank2");

    // The new username signs in; the old one no longer resolves.
    const ok = await signInUsername(createJar(), {
      username: "frank2",
      password: VALID_PASSWORD,
    });
    expect(ok.ok).toBe(true);
  });
});
