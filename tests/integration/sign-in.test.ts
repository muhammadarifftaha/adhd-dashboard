import { describe, expect, it } from "vitest";

import { auth } from "@/lib/auth";

import { registerUser, signedInUser, VALID_PASSWORD } from "../helpers/factories";
import {
  call,
  createJar,
  getSession,
  signInEmail,
  signInUsername,
  verifyEmailFromInbox,
} from "../helpers/session";

describe("sign-in", () => {
  const user = {
    email: "dana@example.com",
    username: "dana",
    password: VALID_PASSWORD,
  };

  it("signs in a verified user by username and establishes a session", async () => {
    await signedInUser(user);
    const jar = createJar();
    const res = await signInUsername(jar, {
      username: user.username,
      password: user.password,
    });
    expect(res.ok).toBe(true);

    const session = await getSession(jar);
    expect(session?.user?.email).toBe(user.email);
  });

  it("signs in by email as well as username", async () => {
    await signedInUser(user);
    const jar = createJar();
    const res = await signInEmail(jar, {
      email: user.email,
      password: user.password,
    });
    expect(res.ok).toBe(true);
    expect((await getSession(jar))?.user?.username).toBe(user.username);
  });

  it("rejects an unknown username", async () => {
    const jar = createJar();
    const res = await signInUsername(jar, {
      username: "ghost",
      password: VALID_PASSWORD,
    });
    expect(res.ok).toBe(false);
    expect(await getSession(jar)).toBeNull();
  });

  it("honours rememberMe without erroring", async () => {
    await signedInUser(user);
    const jar = createJar();
    const res = await signInUsername(jar, {
      username: user.username,
      password: user.password,
      rememberMe: false,
    });
    expect(res.ok).toBe(true);
  });

  it("signs out, invalidating the session", async () => {
    const jar = await signedInUser(user);
    expect((await getSession(jar))?.user?.email).toBe(user.email);

    const out = await call(jar, auth.api.signOut, {});
    expect(out.ok).toBe(true);
    expect(await getSession(jar)).toBeNull();
  });

  it("does not sign in an unverified account", async () => {
    const { jar } = await registerUser({
      email: "unverified@example.com",
      username: "unverified",
    });
    const res = await signInUsername(jar, {
      username: "unverified",
      password: VALID_PASSWORD,
    });
    expect(res.ok).toBe(false);

    // After verifying, the same credentials work.
    await verifyEmailFromInbox(jar);
    const after = await signInUsername(jar, {
      username: "unverified",
      password: VALID_PASSWORD,
    });
    expect(after.ok).toBe(true);
  });
});
