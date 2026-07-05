import { test, expect } from "@playwright/test";
import { addMonths, format } from "date-fns";
import { getMemberInviteToken } from "../tests/helpers/db";

test.describe("Member invite email flow", () => {
  test("admin invite → set password → member portal", async ({ browser }) => {
    const email = `invite.e2e.${Date.now()}@gym.local`;
    const password = "invite123";
    const endDate = format(addMonths(new Date(), 1), "yyyy-MM-dd");

    const adminContext = await browser.newContext({
      storageState: "e2e/.auth/admin.json",
    });
    const adminPage = await adminContext.newPage();

    await adminPage.goto("/members/new");
    await adminPage.locator('input[name="fullName"]').fill("Invited E2E Member");
    await adminPage.locator('input[name="phone"]').fill(`+21698${Date.now().toString().slice(-7)}`);
    await adminPage.locator('input[name="email"]').fill(email);
    await adminPage.locator('input[name="subscriptionEnd"]').fill(endDate);
    await adminPage.getByRole("button", { name: "Créer le membre" }).click();
    await expect(adminPage).toHaveURL(/\/members\/[a-z0-9]+/);

    const token = await getMemberInviteToken(email);
    expect(token).toBeTruthy();

    await adminContext.close();

    const guestContext = await browser.newContext();
    const guestPage = await guestContext.newPage();

    await guestPage.goto(`/member/invite/${token}`);
    await expect(guestPage.getByRole("heading", { level: 1 })).toContainText(
      "Activez votre carte",
    );
    await guestPage.locator("#password").fill(password);
    await guestPage.locator("#confirmPassword").fill(password);
    await guestPage.getByRole("button", { name: "Activer ma carte" }).click();

    await expect(guestPage).toHaveURL(/\/member/);
    await expect(guestPage.getByText("Invited E2E Member")).toBeVisible();

    await guestContext.close();
  });
});
