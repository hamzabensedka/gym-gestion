import { test, expect } from "@playwright/test";
import { addMonths, format } from "date-fns";
import { fillNamed } from "./helpers/form";

test.describe("Members management", () => {
  test("lists seeded members", async ({ page }) => {
    await page.goto("/members");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Membres");
    await expect(page.getByText("Ahmed Ben Ali")).toBeVisible();
    await expect(page.getByText("Sara Trabelsi")).toBeVisible();
  });

  test("search filters members by name", async ({ page }) => {
    await page.goto("/members");
    await page.getByPlaceholder("Rechercher par nom ou téléphone…").fill("Ahmed");
    await page.getByPlaceholder("Rechercher par nom ou téléphone…").press("Enter");
    await expect(page).toHaveURL(/q=Ahmed/);
    await expect(page.getByText("Ahmed Ben Ali")).toBeVisible();
    await expect(page.getByText("Sara Trabelsi")).toHaveCount(0);
  });

  test("filter active members hides expired", async ({ page }) => {
    await page.goto("/members?f=active");
    await expect(page.getByText("Ahmed Ben Ali")).toBeVisible();
    await expect(page.getByText("Sara Trabelsi")).not.toBeVisible();
  });

  test("filter expired members shows only expired", async ({ page }) => {
    await page.goto("/members?f=expired");
    await expect(page.getByText("Sara Trabelsi")).toBeVisible();
    await expect(page.getByText("Ahmed Ben Ali")).not.toBeVisible();
  });

  test("creates a new member", async ({ page }) => {
    const uniquePhone = `+21699${Date.now().toString().slice(-7)}`;
    const endDate = format(addMonths(new Date(), 1), "yyyy-MM-dd");

    await page.goto("/members/new");
    await page.locator('input[name="fullName"]').fill("Test E2E Member");
    await page.locator('input[name="phone"]').fill(uniquePhone);
    await fillNamed(page, "gender", "MALE");
    await fillNamed(page, "subscriptionEnd", endDate);
    await page.locator('input[name="monthlyFee"]').fill("99");
    await page.getByRole("button", { name: "Créer le membre" }).click();

    await expect(page).toHaveURL(/\/members\/[a-z0-9]+/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "Test E2E Member" })).toBeVisible({
      timeout: 15_000,
    });
  });

  test("shows validation error for duplicate phone", async ({ page }) => {
    await page.goto("/members/new");
    await page.locator('input[name="fullName"]').fill("Duplicate Phone");
    await page.locator('input[name="phone"]').fill("+21620123456");
    await fillNamed(page, "gender", "MALE");
    await fillNamed(page, "subscriptionEnd", format(addMonths(new Date(), 1), "yyyy-MM-dd"));
    await page.getByRole("button", { name: "Créer le membre" }).click();
    await expect(page.getByText("Ce numéro de téléphone est déjà utilisé")).toBeVisible();
  });

  test("exports members CSV", async ({ page }) => {
    await page.goto("/members");
    const downloadPromise = page.waitForEvent("download");
    // Pro also shows "Exporter pour logiciel d'accès" — target members CSV only.
    await page.locator('a[href^="/api/members/export"]').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/membres-.*\.csv/i);
  });

  test("opens member detail page", async ({ page }) => {
    await page.goto("/members");
    await page.getByText("Ahmed Ben Ali").click();
    await expect(page).toHaveURL(/\/members\/[a-z0-9]+/);
    await expect(page.getByText("+21620123456")).toBeVisible();
  });
});
