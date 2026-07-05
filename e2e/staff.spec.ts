import { test, expect } from "@playwright/test";

test.describe("Staff management", () => {
  test("lists existing staff users", async ({ page }) => {
    await page.goto("/staff");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Personnel");
    await expect(page.getByText("admin@gym.local")).toBeVisible();
    await expect(page.getByText("staff@gym.local")).toBeVisible();
  });

  test("creates a new staff member", async ({ page }) => {
    const email = `staff.e2e.${Date.now()}@gym.local`;

    await page.goto("/staff");
    await page.locator('input[name="name"]').fill("E2E Staff");
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill("staff123");
    await page.getByRole("button", { name: "Créer le compte" }).click();

    await expect(page.getByText(email)).toBeVisible({ timeout: 15_000 });
  });
});
