import { test as setup, expect } from "@playwright/test";

const adminFile = "e2e/.auth/admin.json";
const staffFile = "e2e/.auth/staff.json";
const memberFile = "e2e/.auth/member.json";

setup("authenticate as admin", async ({ page }) => {
  await page.goto("/login");
  await page.locator("#email").fill("admin@gym.local");
  await page.locator("#password").fill("admin123");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await page.context().storageState({ path: adminFile });
});

setup("authenticate as staff", async ({ page }) => {
  await page.goto("/login");
  await page.locator("#email").fill("staff@gym.local");
  await page.locator("#password").fill("staff123");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/\/scan/);
  await page.context().storageState({ path: staffFile });
});

setup("authenticate as member", async ({ page }) => {
  await page.goto("/login");
  await page.locator("#email").fill("ahmed.ben.ali.1@member.gym.local");
  await page.locator("#password").fill("member123");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/\/member/);
  await page.context().storageState({ path: memberFile });
});
