import { test, expect } from "@playwright/test";

test.describe("Role-based access", () => {
  test("staff cannot access admin dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/scan/);
  });

  test("staff can access members list", async ({ page }) => {
    await page.goto("/members");
    await expect(page).toHaveURL(/\/members/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Membres");
  });

  test("staff cannot access new member page", async ({ page }) => {
    await page.goto("/members/new");
    await expect(page).toHaveURL(/\/scan/);
  });

  test("staff can access today page", async ({ page }) => {
    await page.goto("/today");
    await expect(page).toHaveURL(/\/today/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Aujourd'hui");
  });

  test("staff can access account page", async ({ page }) => {
    await page.goto("/account");
    await expect(page).toHaveURL(/\/account/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Mon compte");
  });

  test("staff cannot access staff management", async ({ page }) => {
    await page.goto("/staff");
    await expect(page).toHaveURL(/\/scan/);
  });

  test("staff cannot access settings", async ({ page }) => {
    await page.goto("/settings");
    await expect(page).toHaveURL(/\/scan/);
  });

  test("staff can access manual check-in", async ({ page }) => {
    await page.goto("/manual");
    await expect(page).toHaveURL(/\/manual/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Check-in manuel");
  });

  test("staff can access scan page", async ({ page }) => {
    await page.goto("/scan");
    await expect(page).toHaveURL(/\/scan/);
  });
});
