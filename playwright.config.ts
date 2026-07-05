import path from "node:path";
import { config as loadEnv } from "dotenv";
import { defineConfig, devices } from "@playwright/test";

loadEnv({ path: path.resolve(__dirname, ".env.test"), override: true });
loadEnv({ path: path.resolve(__dirname, ".env") });

const port = Number(process.env.PLAYWRIGHT_PORT ?? 3001);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${port}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    locale: "fr-FR",
  },
  globalSetup: path.resolve(__dirname, "e2e/global-setup.ts"),
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "admin",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/admin.json",
      },
      dependencies: ["setup"],
      testMatch: [/members\.spec/, /staff\.spec/, /settings\.spec/, /manual-checkin\.spec/, /member-invite\.spec/],
    },
    {
      name: "staff",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/staff.json",
      },
      dependencies: ["setup"],
      testMatch: [/rbac\.spec/, /scan\.spec/],
    },
    {
      name: "member",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/member.json",
      },
      dependencies: ["setup"],
      testMatch: [/member-portal\.spec/],
    },
    {
      name: "guest",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
      testMatch: [/auth\.spec/],
    },
  ],
  webServer: {
    command: `npx next start -p ${port}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...process.env,
      PORT: String(port),
      APP_URL: baseURL,
      NEXT_PUBLIC_E2E_TEST: "true",
    },
  },
});
