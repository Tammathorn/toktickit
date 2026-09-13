import { defineConfig, devices } from "@playwright/test";

// Playwright configuration per decision C-10.
//
// Chromium only, three viewport projects named for the LS 8.7 bands - desktop
// 1280, tablet 834, mobile 390 - one width inside each Bootstrap breakpoint
// band that ui-spec.md section 1 fixes. `webServer` stays disabled: the API
// needs the Docker Postgres container, and an automatic server would fail in a
// way that looks like a test failure. The manual start sequence is in
// docs/lab-02/tests.md section 5.
//
// Screenshots are written explicitly by each spec into
// artifacts/lab-02/screenshots/{create-ticket,my-tickets,ticket-detail}/.
// artifacts/ is tracked; test-results/, playwright-report/ and blob-report/ are
// ignored.

export const CLIENT_URL = process.env.E2E_CLIENT_URL ?? "http://localhost:5173";
export const API_URL = process.env.E2E_API_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: CLIENT_URL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
    {
      name: "tablet",
      use: { ...devices["Desktop Chrome"], viewport: { width: 834, height: 1112 } },
    },
    {
      name: "mobile",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
});
