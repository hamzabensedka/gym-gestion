import { test, expect } from "@playwright/test";
import { generateMemberQrPayload } from "../src/lib/member-qr";
import { getMemberIdByName } from "../tests/helpers/db";

test.describe("QR scan check-in", () => {
  test("simulates camera scan for active member", async ({ page }) => {
    const memberId = await getMemberIdByName("Ahmed Ben Ali");
    expect(memberId).toBeTruthy();

    await page.goto("/scan");
    await page.waitForFunction(() => typeof window.__gymSimulateQrScan === "function");

    const qrPayload = generateMemberQrPayload(memberId!);
    await page.evaluate((payload) => {
      window.__gymSimulateQrScan?.(payload);
    }, qrPayload);

    await expect(page.getByRole("button", { name: "Accès autorisé" })).toBeVisible({
      timeout: 15_000,
    });
  });

  test("simulates camera scan for expired member", async ({ page }) => {
    const memberId = await getMemberIdByName("Sara Trabelsi");
    expect(memberId).toBeTruthy();

    await page.goto("/scan");
    await page.waitForFunction(() => typeof window.__gymSimulateQrScan === "function");

    const qrPayload = generateMemberQrPayload(memberId!);
    await page.evaluate((payload) => {
      window.__gymSimulateQrScan?.(payload);
    }, qrPayload);

    await expect(page.getByRole("button", { name: "Accès refusé" })).toBeVisible({
      timeout: 15_000,
    });
  });
});
