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
});
