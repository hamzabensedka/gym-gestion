import { test, expect } from "@playwright/test";

test.describe("Staff login", () => {
  test("admin login redirects to dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#email").fill("admin@gym.local");
    await page.locator("#password").fill("admin123");
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("staff login redirects to scan", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#email").fill("staff@gym.local");
    await page.locator("#password").fill("staff123");
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page).toHaveURL(/\/scan/);
  });

  test("wrong password shows error", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#email").fill("admin@gym.local");
    await page.locator("#password").fill("wrong-password");
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page.getByText("Identifiants incorrects")).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("unauthenticated user is redirected to login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });
});
