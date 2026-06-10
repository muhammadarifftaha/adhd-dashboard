import { describe, expect, it } from "vitest";

import { prisma } from "../helpers/db";
import { registerUser, VALID_PASSWORD } from "../helpers/factories";
import { lastEmail } from "../helpers/sent-emails";
import { getSession, signInUsername, verifyEmailFromInbox } from "../helpers/session";

describe("sign-up + email verification", () => {
  it("creates an unverified user and emails a verification link", async () => {
    const { res } = await registerUser({
      email: "alice@example.com",
      username: "alice",
      name: "Alice",
    });
    expect(res.ok).toBe(true);

    const user = await prisma.user.findUnique({
      where: { email: "alice@example.com" },
    });
    expect(user).not.toBeNull();
    expect(user?.emailVerified).toBe(false);
    expect(user?.username).toBe("alice");

    const mail = lastEmail("verification");
    expect(mail?.to).toBe("alice@example.com");
    expect(mail?.url).toContain("token=");
  });

  it("blocks sign-in until the email is verified, then allows it", async () => {
    const { jar } = await registerUser({
      email: "bob@example.com",
      username: "bob",
    });

    const before = await signInUsername(jar, {
      username: "bob",
      password: VALID_PASSWORD,
    });
    expect(before.ok).toBe(false);

    const verify = await verifyEmailFromInbox(jar);
    expect(verify.ok).toBe(true);

    const user = await prisma.user.findUnique({
      where: { email: "bob@example.com" },
    });
    expect(user?.emailVerified).toBe(true);

    const after = await signInUsername(jar, {
      username: "bob",
      password: VALID_PASSWORD,
    });
    expect(after.ok).toBe(true);

    const session = await getSession(jar);
    expect(session?.user?.email).toBe("bob@example.com");
  });

  it("rejects a wrong password even after verification", async () => {
    const { jar } = await registerUser({
      email: "carol@example.com",
      username: "carol",
    });
    await verifyEmailFromInbox(jar);

    const result = await signInUsername(jar, {
      username: "carol",
      password: "WrongPassword9!",
    });
    expect(result.ok).toBe(false);
  });

  it("never creates a duplicate account and keeps usernames unique", async () => {
    const { jar } = await registerUser({
      email: "dup@example.com",
      username: "dupuser",
    });
    await verifyEmailFromInbox(jar);

    // Better Auth's email sign-up is non-enumerating: a repeat of an existing
    // email returns ok rather than leaking that it exists — but it must NOT
    // create a second row or overwrite the original account. (A duplicate
    // username, by contrast, throws — so tolerate either outcome and assert the
    // underlying invariant.)
    await registerUser({ email: "dup@example.com", username: "otheruser" }).catch(
      () => {},
    );
    expect(await prisma.user.count({ where: { email: "dup@example.com" } })).toBe(
      1,
    );
    const original = await prisma.user.findUnique({
      where: { email: "dup@example.com" },
    });
    expect(original?.username).toBe("dupuser");

    // A different email reusing the taken username must not break uniqueness.
    await registerUser({ email: "other@example.com", username: "dupuser" }).catch(
      () => {},
    );
    expect(await prisma.user.count({ where: { username: "dupuser" } })).toBe(1);
  });
});
