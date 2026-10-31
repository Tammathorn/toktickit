import { test, expect } from "../support/console";
import { STATE } from "../support/auth";

// The console-error fixture's own tests (C-149, C-182, C-185; tests.md E2E-28 to
// E2E-32). Each "must trip" case is wrapped in test.fail(): the test passes only
// when the fixture fails it, so a fixture that stopped watching would turn these
// red. The allowlist half (E2E-31) must pass. Issue #70 adds the Labs 2-3
// regression captures (E2E-35) to this file.
//
// Requires the manual start sequence in docs/lab-04/tests.md: both dev servers up.

test.use({ storageState: STATE.requester });

test.describe("Console-error fixture (C-149)", () => {
  test("E2E-28 a page that calls console.error fails the test", async ({ page }) => {
    test.fail(true, "the fixture must fail a test on console.error");
    await page.goto("/dashboard");
    await page.evaluate(() => console.error("E2E-28: deliberate console.error"));
  });

  test("E2E-29 an uncaught page exception fails the test", async ({ page }) => {
    test.fail(true, "the fixture must fail a test on a pageerror");
    await page.goto("/dashboard");
    await page.evaluate(() => {
      setTimeout(() => {
        throw new Error("E2E-29: deliberate uncaught exception");
      }, 0);
    });
    await page.waitForTimeout(200);
  });

  test("E2E-30 a same-origin 500 fails the test", async ({ page }) => {
    test.fail(true, "the fixture must fail a test on a same-origin 5xx");
    await page.goto("/dashboard");
    await page.route("**/api/health", (route) => route.fulfill({ status: 500, contentType: "application/json", body: "{}" }));
    const status = await page.evaluate(async () => (await fetch("/api/health")).status);
    expect(status).toBe(500); // the response arrived; the fixture, not this line, fails the test
  });

  test("E2E-31 a declared expected 404 passes: the Failed to load resource line is allowlisted", async ({ page, consoleGuard }) => {
    consoleGuard.expectStatus(404, "/api/tickets/999999");
    await page.goto("/tickets/999999");
    await expect(page.getByRole("heading", { name: "That item does not exist." })).toBeVisible();
  });

  test("E2E-32 the same 404 undeclared fails the test", async ({ page }) => {
    test.fail(true, "an undeclared 404 must still fail the test (C-149)");
    await page.goto("/tickets/999999");
    await expect(page.getByRole("heading", { name: "That item does not exist." })).toBeVisible();
  });

  // C-182: a failure the test causes on purpose is allowed only for the URL it
  // declares. Extra rows beyond E2E-28..32, filed under E2E-30's fixture half.
  test("E2E-30b a declared mocked 500 passes (C-182)", async ({ page, consoleGuard }) => {
    consoleGuard.declareFailure({ url: "/api/health", status: 500 });
    await page.goto("/dashboard");
    await page.route("**/api/health", (route) => route.fulfill({ status: 500, contentType: "application/json", body: "{}" }));
    const status = await page.evaluate(async () => (await fetch("/api/health")).status);
    expect(status).toBe(500);
  });

  test("E2E-30c a 500 declared for one URL does not excuse another (C-182)", async ({ page, consoleGuard }) => {
    test.fail(true, "the declaration is scoped to its URL");
    consoleGuard.declareFailure({ url: "/api/categories", status: 500 });
    await page.goto("/dashboard");
    await page.route("**/api/health", (route) => route.fulfill({ status: 500, contentType: "application/json", body: "{}" }));
    await page.evaluate(async () => (await fetch("/api/health")).status);
  });
});
