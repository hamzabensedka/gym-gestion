import { test, expect } from "@playwright/test";

test.describe("Member portal", () => {
  test("shows member wallet card", async ({ page }) => {
    await page.goto("/member");
    await expect(page).toHaveURL(/\/member/);
    await expect(page.getByText("Ahmed Ben Ali")).toBeVisible();
    await expect(page.getByText("FitBox Mahdia")).toBeVisible();
  });

  test("navigates to QR card page", async ({ page }) => {
    await page.goto("/member/card");
    await expect(page).toHaveURL(/\/member\/card/);
    await expect(page.getByText("Ahmed Ben Ali")).toBeVisible();
  });

  test("member session cannot access staff dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).not.toHaveURL(/\/dashboard/);
  });
});
