import { test, expect } from "@playwright/test";

test.describe("Settings", () => {
  test("updates gym name", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Réglages");

    const nameInput = page.locator('input[name="name"]');
    const originalName = await nameInput.inputValue();
    const updatedName = `${originalName} E2E`;

    await nameInput.fill(updatedName);
    await page.getByRole("button", { name: "Enregistrer les informations" }).click();
    await expect(page.getByText("Enregistré")).toBeVisible({ timeout: 10_000 });

    await nameInput.fill(originalName);
    await page.getByRole("button", { name: "Enregistrer les informations" }).click();
  });

  test("settings has no plan select", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Réglages");
    await expect(page.locator('select[name="plan"]')).toHaveCount(0);
  });

  test("plus sheet contains subscription management", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dashboard");
    await page.getByRole("tab", { name: /^plus$/i }).click();
    await expect(page.getByRole("dialog").getByText("Gérer l'abonnement")).toBeVisible();
  });
});

