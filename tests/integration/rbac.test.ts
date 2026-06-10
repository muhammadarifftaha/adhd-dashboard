import { describe, expect, it } from "vitest";

import { auth } from "@/lib/auth";

import { prisma } from "../helpers/db";
import { promoteToAdmin, signedInUser, VALID_PASSWORD } from "../helpers/factories";
import { call, createJar, signInUsername } from "../helpers/session";

/** Sign in a freshly-promoted admin and return its jar. */
async function signedInAdmin(email: string, username: string) {
  await signedInUser({ email, username });
  await promoteToAdmin(email);
  const jar = createJar();
  await signInUsername(jar, { username, password: VALID_PASSWORD });
  return jar;
}

describe("admin RBAC (admin plugin)", () => {
  it("forbids a normal user from listing users but allows an admin", async () => {
    const normal = await signedInUser({
      email: "harry@example.com",
      username: "harry",
    });
    const denied = await call(normal, auth.api.listUsers, { query: {} });
    expect(denied.ok).toBe(false);
    expect(denied.status).toBe(403);

    const admin = await signedInAdmin("boss@example.com", "boss");
    const allowed = await call<{ users: unknown[] }>(admin, auth.api.listUsers, {
      query: {},
    });
    expect(allowed.ok).toBe(true);
    expect(Array.isArray(allowed.data.users)).toBe(true);
  });

  it("lets an admin change another user's role", async () => {
    await signedInUser({ email: "minion@example.com", username: "minion" });
    const target = await prisma.user.findUnique({
      where: { email: "minion@example.com" },
    });
    expect(target?.role).toBe("user");

    const admin = await signedInAdmin("chief@example.com", "chief");
    const res = await call(admin, auth.api.setRole, {
      body: { userId: target!.id, role: "admin" },
    });
    expect(res.ok).toBe(true);

    const updated = await prisma.user.findUnique({
      where: { email: "minion@example.com" },
    });
    expect(updated?.role).toBe("admin");
  });

  it("forbids a normal user from changing roles", async () => {
    const target = await signedInUser({
      email: "pawn@example.com",
      username: "pawn",
    });
    void target;
    const targetRow = await prisma.user.findUnique({
      where: { email: "pawn@example.com" },
    });

    const normal = await signedInUser({
      email: "nobody@example.com",
      username: "nobody",
    });
    const res = await call(normal, auth.api.setRole, {
      body: { userId: targetRow!.id, role: "admin" },
    });
    expect(res.ok).toBe(false);

    const unchanged = await prisma.user.findUnique({
      where: { email: "pawn@example.com" },
    });
    expect(unchanged?.role).toBe("user");
  });
});
