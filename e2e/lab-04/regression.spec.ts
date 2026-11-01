import { test, expect } from "../support/console";
import type { Page } from "@playwright/test";
import { E2E_REQUESTER, IT_STAFF, REQUESTER_A, STATE, apiAs, signIn } from "../support/auth";
import { SIGNED_OUT, addAction, capture, expectNoHorizontalScroll, newTicket, openNavIfMobile } from "../support/lab4-shots";

// The console-error fixture's own tests (C-149, C-182, C-185; tests.md E2E-28 to
// E2E-32). Each "must trip" case is wrapped in test.fail(): the test passes only
// when the fixture fails it, so a fixture that stopped watching would turn these
// red. The allowlist half (E2E-31) must pass. Issue #70 adds the Labs 2-3
// regression captures (E2E-35) to this file, below the fixture's own tests.
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

// ---------------------------------------------------------------------------
// E2E-35 - the 14 regression captures (ui-spec 15, Part 8), every one from the
// real app, into artifacts/lab-04/screenshots/regression/. Labs 2-3 screens
// reached through the Lab 4 navigation: the console-error fixture watches each
// (C-149), and the states reached from a card land through the real click.
// ---------------------------------------------------------------------------
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
const heading = (page: Page, name: string) => page.getByRole("heading", { level: 1, name });
const SHOWING = /Showing \d+ to \d+ of \d+ tickets/;

test.describe("Regression captures - signed out", () => {
  test.use({ storageState: SIGNED_OUT });

  test("E2E-35 login-initial and system-check-online: the public screens (FR-29, FR-30; C-87, C-149)", async ({ page, consoleGuard }) => {
    consoleGuard.expectStatus(401, "/api/auth/me");
    await page.goto("/");
    await expect(heading(page, "Sign In")).toBeVisible();
    await capture(page, "regression", "login-<vp>-initial");

    await page.goto("/system-check");
    await page.getByRole("button", { name: "Check System" }).click();
    await expect(page.getByText("System Status: Online")).toBeVisible();
    await capture(page, "regression", "system-check-<vp>-online");
  });
});

test.describe("Regression captures - Requester (seeded Requester A)", () => {
  test.use({ storageState: SIGNED_OUT });

  test("E2E-35 nav-requester, my-tickets-populated, my-tickets-open-group, create-ticket-validation", async ({ page }) => {
    await signIn(page, REQUESTER_A);
    await page.goto("/dashboard");
    await expect(heading(page, "Dashboard")).toBeVisible();
    await expect(page.getByText(/^Updated /)).toBeVisible();
    await openNavIfMobile(page);
    await expect(page.locator(".tk-nav-link[aria-current='page']")).toHaveText("Dashboard");
    await capture(page, "regression", "nav-<vp>-requester");

    await page.goto("/tickets");
    await expect(heading(page, "My Tickets")).toBeVisible();
    await expect(page.getByText(SHOWING).first()).toBeVisible();
    await capture(page, "regression", "my-tickets-<vp>-populated");
    await expectNoHorizontalScroll(page);

    await page.goto("/dashboard");
    await page.getByRole("link", { name: /^Open tickets: \d+\./ }).click();
    await expect(heading(page, "My Tickets")).toBeVisible();
    await expect(page).toHaveURL(/statusGroup=open/);
    await expect(page.getByText(SHOWING).first()).toBeVisible();
    await capture(page, "regression", "my-tickets-<vp>-open-group");

    await page.goto("/tickets/new");
    await expect(heading(page, "Create Ticket")).toBeVisible();
    await page.getByRole("button", { name: "Submit Ticket" }).click();
    await expect(page.locator(".tk-invalid-feedback").first()).toBeVisible();
    await capture(page, "regression", "create-ticket-<vp>-validation");
  });
});

test.describe("Regression captures - Requester (E2E Requester)", () => {
  test.use({ storageState: STATE.requester });

  test("E2E-35 requester-detail-comments-attachments and forbidden-requester", async ({ page, consoleGuard }) => {
    consoleGuard.expectStatus(403);
    const t = await newTicket("E2E-35 requester detail");
    const requester = await apiAs(E2E_REQUESTER);
    const upload = await requester.post(`/api/tickets/${t.id}/attachments`, { multipart: { file: { name: "router-photo.png", mimeType: "image/png", buffer: PNG } } });
    expect(upload.status(), "attachment upload").toBe(201);
    expect((await requester.post(`/api/tickets/${t.id}/public-comments`, { data: { body: "The light on the router is orange, not green." } })).status()).toBe(201);
    await requester.dispose();
    const staff = await apiAs(IT_STAFF);
    expect((await staff.post(`/api/tickets/${t.id}/public-comments`, { data: { body: "Thanks - we will swap the router tomorrow morning." } })).status()).toBe(201);
    await staff.dispose();

    await page.goto(`/tickets/${t.id}`);
    await expect(heading(page, t.ticketNumber)).toBeVisible();
    await expect(page.getByText("router-photo.png").first()).toBeVisible();
    await expect(page.getByText("The light on the router is orange, not green.")).toBeVisible();
    await capture(page, "regression", "requester-detail-<vp>-comments-attachments");

    await page.goto("/queue");
    await expect(heading(page, "You do not have access to that page.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Go to Dashboard" })).toBeVisible();
    await capture(page, "regression", "forbidden-<vp>-requester");
  });
});

test.describe("Regression captures - IT Staff", () => {
  test.use({ storageState: STATE.itStaff });

  test("E2E-35 nav-it-staff, queue-populated, queue-requester-resolved, staff-detail-notes", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(heading(page, "Dashboard")).toBeVisible();
    await expect(page.getByText(/^Updated /)).toBeVisible();
    await openNavIfMobile(page);
    await expect(page.locator(".tk-nav-link[aria-current='page']")).toHaveText("Dashboard");
    await capture(page, "regression", "nav-<vp>-it-staff");

    await page.goto("/queue");
    await expect(heading(page, "Ticket Queue")).toBeVisible();
    await expect(page.getByText(SHOWING).first()).toBeVisible();
    await capture(page, "regression", "queue-<vp>-populated");
    await expectNoHorizontalScroll(page);

    await page.goto("/dashboard");
    await page.getByRole("link", { name: /^Requester says resolved: \d+\./ }).click();
    await expect(heading(page, "Ticket Queue")).toBeVisible();
    await expect(page).toHaveURL(/requesterResolved=true/);
    await expect(page.getByText(SHOWING).first()).toBeVisible();
    await capture(page, "regression", "queue-<vp>-requester-resolved");

    // comments, notes and actions in one frame.
    const t = await newTicket("E2E-35 staff detail");
    const staff = await apiAs(IT_STAFF);
    await addAction(staff, t.id, { description: "Replaced the faulty power adapter", result: "Powers on and charges." });
    expect((await staff.post(`/api/tickets/${t.id}/public-comments`, { data: { body: "We have replaced the adapter - please check it." } })).status()).toBe(201);
    expect((await staff.post(`/api/tickets/${t.id}/internal-notes`, { data: { body: "Spare adapters are in cabinet B, bottom shelf." } })).status()).toBe(201);
    await staff.dispose();
    await page.goto(`/queue/${t.id}`);
    await expect(heading(page, t.ticketNumber)).toBeVisible();
    await expect(page.getByText("Spare adapters are in cabinet B, bottom shelf.")).toBeVisible();
    await expect(page.getByText("We have replaced the adapter - please check it.")).toBeVisible();
    await expect(page.getByText("Replaced the faulty power adapter")).toBeVisible();
    await capture(page, "regression", "staff-detail-<vp>-notes");
  });
});

test.describe("Regression captures - Administrator", () => {
  test.use({ storageState: STATE.administrator });

  test("E2E-35 nav-administrator and users-role-filter", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(heading(page, "Dashboard")).toBeVisible();
    await expect(page.getByText(/^Updated /)).toBeVisible();
    await openNavIfMobile(page);
    await expect(page.locator(".tk-nav-link[aria-current='page']")).toHaveText("Dashboard");
    await capture(page, "regression", "nav-<vp>-administrator");

    await page.goto("/dashboard");
    await page.getByRole("link", { name: /^IT Staff: \d+ accounts/ }).click();
    await expect(heading(page, "User Management")).toBeVisible();
    await expect(page.locator("#users-role")).toHaveValue("IT_STAFF");
    await expect(page.locator("tbody tr.tk-row, li.tk-user-card").first()).toBeVisible();
    await capture(page, "regression", "users-<vp>-role-filter");
  });
});
