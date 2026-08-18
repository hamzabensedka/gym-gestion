import { test, expect } from "@playwright/test";

test.describe("Public plans", () => {
  test("public offers page is reachable from login", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: /offres/i }).click();
    await expect(page).toHaveURL(/\/offres/);
    await expect(page.getByText("Growth")).toBeVisible();
  });
});
