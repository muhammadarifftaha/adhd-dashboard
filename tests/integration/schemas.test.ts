import { describe, expect, it } from "vitest";

import { signUpAdminSchema } from "@/lib/schema/admin";
import { signInSchema, signUpSchema } from "@/lib/schema/auth";

// Pure validation — these guard the server actions' re-validation of untrusted
// input (a Server Action is a public POST endpoint), so a bypassed client form
// can't smuggle a weak password or malformed username through.

describe("signInSchema", () => {
  it("accepts a valid credential pair", () => {
    expect(
      signInSchema.safeParse({ username: "alice", password: "Password1!" })
        .success,
    ).toBe(true);
  });

  it("rejects a too-short username", () => {
    expect(
      signInSchema.safeParse({ username: "al", password: "Password1!" }).success,
    ).toBe(false);
  });

  it("rejects illegal username characters", () => {
    expect(
      signInSchema.safeParse({ username: "ali ce!", password: "Password1!" })
        .success,
    ).toBe(false);
  });

  it("rejects a password under 8 characters", () => {
    expect(
      signInSchema.safeParse({ username: "alice", password: "Pw1!" }).success,
    ).toBe(false);
  });
});

describe("signUpSchema", () => {
  const valid = {
    username: "alice",
    password: "Password1!",
    matchPassword: "Password1!",
    email: "alice@example.com",
    name: "Alice",
    displayUsername: "Alice",
  };

  it("accepts a complete valid payload", () => {
    expect(signUpSchema.safeParse(valid).success).toBe(true);
  });

  it("requires a letter, a number, and a special character in the password", () => {
    expect(
      signUpSchema.safeParse({
        ...valid,
        password: "password",
        matchPassword: "password",
      }).success,
    ).toBe(false);
    expect(
      signUpSchema.safeParse({
        ...valid,
        password: "Password1",
        matchPassword: "Password1",
      }).success,
    ).toBe(false);
  });

  it("rejects mismatched passwords with an error on matchPassword", () => {
    const result = signUpSchema.safeParse({
      ...valid,
      matchPassword: "Different1!",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === "matchPassword")).toBe(
        true,
      );
    }
  });

  it("rejects an invalid email and an empty name", () => {
    expect(signUpSchema.safeParse({ ...valid, email: "nope" }).success).toBe(
      false,
    );
    expect(signUpSchema.safeParse({ ...valid, name: "" }).success).toBe(false);
  });

  it("allows displayUsername to be omitted", () => {
    expect(
      signUpSchema.safeParse({ ...valid, displayUsername: undefined }).success,
    ).toBe(true);
  });
});

describe("signUpAdminSchema", () => {
  it("enforces the same rules as the public sign-up schema", () => {
    expect(
      signUpAdminSchema.safeParse({
        username: "root",
        password: "Password1!",
        matchPassword: "Password1!",
        email: "admin@example.com",
        name: "Administrator",
      }).success,
    ).toBe(true);

    expect(
      signUpAdminSchema.safeParse({
        username: "root",
        password: "weak",
        matchPassword: "weak",
        email: "admin@example.com",
        name: "Administrator",
      }).success,
    ).toBe(false);
  });
});
