import { describe, expect, it } from "vitest";

import { signIn, signUp } from "@/app/auth/actions";
import { changeUsername } from "@/components/account/actions";
import { signUpAdmin } from "@/app/setup/actions";

import { prisma } from "../helpers/db";
import { promoteToAdmin, signedInUser, VALID_PASSWORD } from "../helpers/factories";
import { setCookieHeader } from "../helpers/next-mock-store";
import { lastEmail } from "../helpers/sent-emails";

/** Run an action that redirect()s and return the destination (mocked redirect throws). */
async function redirectTarget(run: () => Promise<unknown>): Promise<string> {
  try {
    await run();
  } catch (error) {
    const target = (error as { redirectTo?: string }).redirectTo;
    if (target) return target;
    throw error;
  }
  throw new Error("Expected a redirect, but none was thrown.");
}

describe("auth server actions", () => {
  describe("signUp", () => {
    it("creates an unverified user and redirects to verify-email", async () => {
      const target = await redirectTarget(() =>
        signUp({
          name: "Ivy",
          email: "ivy@example.com",
          username: "ivy",
          password: VALID_PASSWORD,
          matchPassword: VALID_PASSWORD,
          displayUsername: "Ivy",
        }),
      );
      expect(target).toBe("/auth/verify-email");

      const user = await prisma.user.findUnique({
        where: { email: "ivy@example.com" },
      });
      expect(user?.emailVerified).toBe(false);
      expect(lastEmail("verification")?.to).toBe("ivy@example.com");
    });

    it("returns a validation error for bad input without writing to the DB", async () => {
      const result = await signUp({
        name: "",
        email: "not-an-email",
        username: "x",
        password: "weak",
        matchPassword: "different",
      } as unknown as Parameters<typeof signUp>[0]);
      expect(result).toEqual({ error: "Invalid input." });
      expect(await prisma.user.count()).toBe(0);
    });
  });

  describe("signIn", () => {
    it("routes an unverified user to the verify-email page", async () => {
      await signUp({
        name: "Unverified",
        email: "uv@example.com",
        username: "uvuser",
        password: VALID_PASSWORD,
        matchPassword: VALID_PASSWORD,
      }).catch(() => {}); // swallow its redirect

      const target = await redirectTarget(() =>
        signIn({ username: "uvuser", password: VALID_PASSWORD }),
      );
      expect(target).toBe("/auth/verify-email");
    });

    it("returns an error for invalid credentials", async () => {
      const result = await signIn({ username: "ghost", password: VALID_PASSWORD });
      expect(result).toHaveProperty("error");
    });
  });

  describe("signUpAdmin", () => {
    it("creates and promotes the first admin, then redirects to /admin", async () => {
      const target = await redirectTarget(() =>
        signUpAdmin({
          name: "Root",
          email: "root@example.com",
          username: "root",
          password: VALID_PASSWORD,
          matchPassword: VALID_PASSWORD,
        }),
      );
      expect(target).toBe("/admin");

      const admin = await prisma.user.findUnique({
        where: { email: "root@example.com" },
      });
      expect(admin?.role).toBe("admin");
      expect(admin?.emailVerified).toBe(true);
    });

    it("refuses to create a second admin and redirects home", async () => {
      await signedInUser({ email: "first@example.com", username: "first" });
      await promoteToAdmin("first@example.com");

      const target = await redirectTarget(() =>
        signUpAdmin({
          name: "Second",
          email: "second@example.com",
          username: "second",
          password: VALID_PASSWORD,
          matchPassword: VALID_PASSWORD,
        }),
      );
      expect(target).toBe("/");

      expect(await prisma.user.count({ where: { role: "admin" } })).toBe(1);
      expect(
        await prisma.user.findUnique({ where: { email: "second@example.com" } }),
      ).toBeNull();
    });

    it("rejects invalid input", async () => {
      const result = await signUpAdmin({
        name: "",
        email: "bad",
        username: "x",
        password: "weak",
        matchPassword: "weak",
      } as unknown as Parameters<typeof signUpAdmin>[0]);
      expect(result).toEqual({ error: "Invalid input." });
    });
  });

  describe("changeUsername", () => {
    it("updates the username for the signed-in user and notifies them", async () => {
      const jar = await signedInUser({ email: "jane@example.com", username: "jane" });
      // Bridge the real session cookie into the next/headers mock.
      setCookieHeader(jar.cookie());

      const result = await changeUsername("janedoe");
      expect(result).toBeUndefined();

      const row = await prisma.user.findUnique({
        where: { email: "jane@example.com" },
      });
      expect(row?.username).toBe("janedoe");
      expect(lastEmail("username-changed")?.to).toBe("jane@example.com");
    });

    it("refuses when there is no session", async () => {
      setCookieHeader(""); // clear any session
      const result = await changeUsername("whoever");
      expect(result).toEqual({
        error: "You must be signed in to change your username.",
      });
    });
  });
});
