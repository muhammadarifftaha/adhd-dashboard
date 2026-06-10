import { prisma } from "./db";
import {
  createJar,
  signInUsername,
  signUp,
  verifyEmailFromInbox,
  type Jar,
} from "./session";

// Meets the sign-up schema: ≥8 chars, letter + digit + special char.
export const VALID_PASSWORD = "Password1!";

export type NewUser = {
  name?: string;
  email: string;
  username: string;
  password?: string;
  displayUsername?: string;
};

/** Register a user via Better Auth (created unverified). Returns the jar + result. */
export async function registerUser(u: NewUser) {
  const jar = createJar();
  const res = await signUp(jar, {
    name: u.name ?? "Test User",
    email: u.email,
    username: u.username,
    password: u.password ?? VALID_PASSWORD,
    displayUsername: u.displayUsername,
    userInitials: "TU",
  });
  return { jar, res };
}

/** Register → verify → sign in. Returns an authenticated jar. */
export async function signedInUser(u: NewUser): Promise<Jar> {
  const { jar } = await registerUser(u);
  await verifyEmailFromInbox(jar);
  await signInUsername(jar, {
    username: u.username,
    password: u.password ?? VALID_PASSWORD,
  });
  return jar;
}

/** Promote an existing user to admin (and mark verified), like the bootstrap. */
export async function promoteToAdmin(email: string): Promise<void> {
  await prisma.user.update({
    where: { email },
    data: { role: "admin", emailVerified: true },
  });
}
