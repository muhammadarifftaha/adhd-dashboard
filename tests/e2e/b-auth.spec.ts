import { expect, test } from "@playwright/test";

import { ensureAdmin, seedUser, VALID_PASSWORD } from "./helpers";

let member: { username: string; email: string; password: string };

test.describe("sign-in and the auth gate", () => {
  test.beforeAll(async ({ baseURL }) => {
    // An admin must exist so normal routes aren't swallowed by the setup gate,
    // plus a verified non-admin to sign in as.
    await ensureAdmin(baseURL!);
    member = await seedUser(baseURL!, {
      email: "member@example.com",
      username: "member",
      name: "Member",
    });
  });

  test("redirects a logged-out visitor to sign-in", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/auth\/sign-in/);
  });

  test("signs in a verified user and reaches the dashboard", async ({ page }) => {
    await page.goto("/auth/sign-in");
    await page.fill("#username", member.username);
    await page.fill("#password", member.password);
    await page.getByRole("button", { name: /^sign in$/i }).click();

    await page.waitForURL((url) => !url.pathname.startsWith("/auth"), {
      timeout: 30_000,
    });
    await expect(page).not.toHaveURL(/\/auth\//);
    // No sign-in form once authenticated.
    await expect(page.locator("#password")).toHaveCount(0);
  });

  test("shows an error for the wrong password", async ({ page }) => {
    await page.goto("/auth/sign-in");
    await page.fill("#username", member.username);
    await page.fill("#password", "WrongPassword9!");
    await page.getByRole("button", { name: /^sign in$/i }).click();

    await expect(page.getByText(/invalid username or password/i)).toBeVisible();
    await expect(page).toHaveURL(/\/auth\/sign-in/);
  });

  test("redirects /setup away once an admin exists", async ({ page }) => {
    await page.goto("/setup");
    await expect(page).not.toHaveURL(/\/setup/);
  });

  test("validates the sign-up form client-side", async ({ page }) => {
    await page.goto("/auth/sign-up");
    await page.fill("#name", "Mismatch");
    await page.fill("#email", "mismatch@example.com");
    await page.fill("#username", "mismatchuser");
    await page.fill("#password", VALID_PASSWORD);
    await page.fill("#matchPassword", "Different1!");
    await page.getByRole("button", { name: /^sign up$/i }).click();

    await expect(page.getByText(/passwords do not match/i)).toBeVisible();
    await expect(page).toHaveURL(/\/auth\/sign-up/);
  });
});
