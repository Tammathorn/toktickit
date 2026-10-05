import { test, expect, type Page } from "@playwright/test";
import path from "node:path";
import { API_URL } from "../../playwright.config";
import { FIRST_LOGIN, INACTIVE_REQUESTER, REQUESTER, settle, withFirstLoginAccount } from "../support/auth";

// Lab 3 authentication in the browser - tests.md section 2.12 E2E-02, E2E-03
// and E2E-04 (Issue #39), with the ui-spec.md section 23 captures for LS 14
// Part 5, at all three C-90 viewport projects.
//
// Deferred, by Issue: E2E-01 and E2E-05 assert the per-role landing screen and
// navigation, E2E-06 asserts browser storage once the selector's own key is
// gone, and RESP-07 and RESP-08 cover role navigation - all #40. E2E-03 here
// stops at "the Change Password screen gives way to the application"; the
// role's own landing screen is #40's.
//
// The busy capture holds the real login request open until the screenshot is
// taken, then lets it through; the failure capture aborts the request in the
// browser, so the screen meets a real network failure (Lab 2 precedent).
// Requires the manual start sequence in tests.md section 6.

const SHOTS = path.resolve(__dirname, "../../artifacts/lab-03/screenshots/authentication");

async function capture(page: Page, name: string) {
  await settle(page);
  await page.screenshot({ path: path.join(SHOTS, `${name.replace("<vp>", test.info().project.name)}.png`), fullPage: true });
}

async function openNav(page: Page) {
  if (test.info().project.name === "mobile") {
    await page.getByRole("button", { name: "Toggle navigation" }).click();
    await expect(page.locator("#tk-nav-panel")).toHaveClass(/show/);
  }
}

async function fillLogin(page: Page, email: string, password: string) {
  await page.getByLabel(/Email Address/).fill(email);
  await page.getByLabel(/^Password/).fill(password);
}

const signInButton = (page: Page) => page.getByRole("button", { name: "Sign In" });

test("E2E-02 Login: validation, a wrong password gets the generic message, an inactive account its own (AC-05, AC-08)", async ({ page }) => {
  await page.goto("/");
  await expect(signInButton(page)).toBeVisible();
  await capture(page, "login-<vp>-initial");

  await signInButton(page).click();
  await expect(page.getByText("Email Address is required.")).toBeVisible();
  await expect(page.getByText("Password is required.")).toBeVisible();
  await capture(page, "login-<vp>-validation");

  await fillLogin(page, REQUESTER.email, "Not#TheRightOne1");
  await signInButton(page).click();
  await expect(page.getByText("That email address and password do not match an account.")).toBeVisible();
  await expect(page.getByLabel(/^Password/)).toHaveValue("");
  await expect(page.getByLabel(/Email Address/)).toHaveValue(REQUESTER.email);
  await capture(page, "login-<vp>-invalid-credentials");

  await fillLogin(page, INACTIVE_REQUESTER.email, INACTIVE_REQUESTER.password);
  await signInButton(page).click();
  await expect(page.getByText("That account is not active. Contact an administrator.")).toBeVisible();
  await expect(page.getByText("That email address and password do not match an account.")).toHaveCount(0);
  await capture(page, "login-<vp>-inactive-account");
});

test("Login busy state: Signing in…, button and fields disabled while the real request is in flight (FR-01)", async ({ page }) => {
  let release!: () => void;
  const held = new Promise<void>((resolve) => (release = resolve));
  await page.route("**/api/auth/login", async (route) => {
    await held;
    await route.continue();
  });
  await page.goto("/");
  await fillLogin(page, REQUESTER.email, REQUESTER.password);
  await signInButton(page).click();
  const busy = page.getByRole("button", { name: /Signing in…/ });
  await expect(busy).toBeDisabled();
  await expect(page.getByLabel(/Email Address/)).toBeDisabled();
  await capture(page, "login-<vp>-submitting");
  release();
  await expect(page.getByLabel(/Email Address/)).toHaveCount(0);
});

test("Login safe failure: a network failure shows the INTERNAL_ERROR banner with Retry, nothing leaked (BR-89)", async ({ page }) => {
  await page.route("**/api/auth/login", (route) => route.abort("connectionrefused"));
  await page.goto("/");
  await fillLogin(page, REQUESTER.email, REQUESTER.password);
  await signInButton(page).click();
  await expect(page.getByText("Something went wrong on our side. Your work has not been lost - please try again.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
  await expect(page.getByLabel(/^Password/)).toHaveValue("");
  await capture(page, "login-<vp>-failure");
});

test("E2E-03 the first-login account meets only Change Password, cannot leave it by URL, changes it, and goes on (AC-02, AC-86)", async ({ page }) => {
  await withFirstLoginAccount(async () => {
    await page.goto("/tickets");
    await fillLogin(page, FIRST_LOGIN.email, FIRST_LOGIN.password);
    await signInButton(page).click();

    const heading = page.getByRole("heading", { level: 1, name: "Change Password" });
    await expect(heading).toBeVisible();
    await expect(page.getByText("Wichai Tanaka")).toBeVisible();
    await expect(page.getByRole("banner")).toHaveCount(0);
    await capture(page, "change-password-<vp>-initial");

    // A bookmarked address does not get past the gate.
    await page.goto("/tickets/new");
    await expect(heading).toBeVisible();
    await expect(page.getByRole("heading", { name: "Create Ticket" })).toHaveCount(0);

    await page.getByLabel(/^New Password/).fill("short");
    await page.getByLabel(/^Confirm New Password/).fill("different");
    await page.getByRole("button", { name: "Change Password" }).click();
    await expect(page.getByText("Current Password is required.")).toBeVisible();
    await expect(page.getByText("The confirmation does not match the new password.")).toBeVisible();
    await capture(page, "change-password-<vp>-validation");

    const next = `Fresh#${test.info().project.name}42`;
    await page.getByLabel(/^Current Password/).fill(FIRST_LOGIN.password);
    await page.getByLabel(/^New Password/).fill(next);
    await page.getByLabel(/^Confirm New Password/).fill(next);
    await page.getByRole("button", { name: "Change Password" }).click();
    await expect(page.getByText("Your password has been changed.")).toBeVisible();
    await capture(page, "change-password-<vp>-success");

    // The gate clears and the application takes over; per-role landing is #40.
    await expect(heading).toHaveCount(0, { timeout: 5_000 });
    await expect(signInButton(page)).toHaveCount(0);
  });
});

test("E2E-04 the shell shows who is signed in; after Log Out a bookmarked URL, Back and the old cookie are all refused (AC-17, FR-07)", async ({ page, request }) => {
  await page.goto("/tickets");
  await fillLogin(page, REQUESTER.email, REQUESTER.password);
  await signInButton(page).click();

  // Until #40 the Lab 2 Development Requester selector still stands between
  // sign-in and My Tickets; it is passed through the screen itself.
  await page.getByRole("combobox", { name: "Development Requester" }).selectOption({ label: "Anucha Prasert" });
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible();
  // The list itself, not its loading skeleton, is what the capture must show.
  await expect(page.locator("[aria-busy='true']")).toHaveCount(0);

  await openNav(page);
  const header = page.getByRole("banner");
  await expect(header.locator(".tk-identity-name")).toHaveText("Anucha Prasert");
  await expect(header.locator(".tk-badge-role")).toHaveText("Requester");
  await expect(header.getByRole("button", { name: "Log Out" })).toBeVisible();
  await capture(page, "shell-<vp>-requester");

  await header.getByRole("link", { name: "Create Ticket" }).click();
  await expect(page).toHaveURL(/\/tickets\/new$/);

  const cookie = (await page.context().cookies()).find((c) => c.name === "tt_session");
  expect(cookie, "the session cookie").toBeDefined();
  expect(cookie!.httpOnly).toBe(true);
  expect(cookie!.sameSite).toBe("Strict");
  const sameCookie = { Cookie: `tt_session=${cookie!.value}` };
  expect((await request.get(`${API_URL}/api/auth/me`, { headers: sameCookie })).status()).toBe(200);

  await openNav(page);
  await page.getByRole("banner").getByRole("button", { name: "Log Out" }).click();
  await expect(signInButton(page)).toBeVisible();
  await expect(page.getByRole("banner")).toHaveCount(0);
  await capture(page, "logout-<vp>-signed-out");

  await page.goBack();
  await expect(signInButton(page)).toBeVisible();
  await expect(page.getByRole("heading", { name: "My Tickets" })).toHaveCount(0);
  await capture(page, "logout-<vp>-back-button");

  await page.goto("/tickets");
  await expect(signInButton(page)).toBeVisible();
  await expect(page.getByRole("heading", { name: "My Tickets" })).toHaveCount(0);
  await capture(page, "logout-<vp>-blocked-after");

  const replay = await request.get(`${API_URL}/api/auth/me`, { headers: sameCookie });
  expect(replay.status()).toBe(401);
  expect((await replay.json()).error.code).toBe("AUTH_REQUIRED");
});
