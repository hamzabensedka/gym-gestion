import { test, expect } from "@playwright/test";

test.describe("Manual check-in", () => {
  test("checks in an active member", async ({ page }) => {
    await page.goto("/manual");
    await page.getByPlaceholder("Nom ou téléphone…").fill("Ahmed");
    await expect(page.getByText("Ahmed Ben Ali")).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: "Check-in" }).first().click();
    await expect(page.getByRole("button", { name: "Accès autorisé" })).toBeVisible();
  });

  test("expired member has no check-in button", async ({ page }) => {
    await page.goto("/manual");
    await page.getByPlaceholder("Nom ou téléphone…").fill("Sara");
    await expect(page.getByText("Sara Trabelsi")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("button", { name: "Check-in" })).toHaveCount(0);
    await expect(page.getByText("Expiré").first()).toBeVisible();
  });
});

test.describe("Dashboard & attendance", () => {
  test("dashboard loads with stats", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Tableau de bord");
    await expect(page.getByRole("complementary").getByText("FitClub Tunis")).toBeVisible();
  });

  test("attendance page loads", async ({ page }) => {
    await page.goto("/attendance");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});
