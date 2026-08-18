import { test, expect } from "@playwright/test";

test.describe("Member portal", () => {
  test("shows member wallet card", async ({ page }) => {
    await page.goto("/member");
    await expect(page).toHaveURL(/\/member/);
    await expect(page.getByText("Ahmed Ben Ali")).toBeVisible();
    // FitBox theme shows the brand via logo aria-label, not plain gym name text.
    await expect(page.getByLabel("FitBox Mahdia")).toBeVisible();
  });

  test("week grid fills leftover space on a phone viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/member/classes?week=2099-01-04");
    await expect(page).toHaveURL(/\/member\/classes/);

    const grid = page.getByTestId("week-grid");
    await expect(grid).toBeVisible();
    await expect(grid).toHaveAttribute("data-fill", "true");
    await expect(grid.getByText("Aucune séance cette semaine")).toBeVisible();

    const box = await grid.boundingBox();
    expect(box).toBeTruthy();
    const bottomGap = 844 - (box!.y + box!.height);
    expect(box!.height).toBeGreaterThan(350);
    expect(bottomGap).toBeLessThan(160);
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
