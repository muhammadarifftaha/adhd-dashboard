import { expect, test } from "@playwright/test";

import { VALID_PASSWORD } from "./helpers";

// Runs first (filename order) against the empty DB from global-setup, so the
// first-run gate is active and no admin exists yet.
test.describe("first-run admin setup", () => {
  test("gates a fresh install to /setup and creates the first admin", async ({
    page,
  }) => {
    // Any route on a virgin install is redirected to setup.
    await page.goto("/");
    await page.waitForURL(/\/setup$/, { timeout: 30_000 });
    await expect(page.locator("#email")).toBeVisible();

    await page.fill("#email", "owner@example.com");
    await page.fill("#name", "Owner");
    await page.fill("#username", "owner");
    await page.fill("#password", VALID_PASSWORD);
    await page.fill("#matchPassword", VALID_PASSWORD);
    await page.getByRole("button", { name: /create account/i }).click();

    // The bootstrap admin is auto-verified and signed in, landing on /admin.
    await page.waitForURL(/\/admin/, { timeout: 30_000 });
    await expect(page).toHaveURL(/\/admin/);
  });
});
