import { test, expect, type Page } from "@playwright/test";
import path from "node:path";
import { API_URL } from "../../playwright.config";
import {
  ADMINISTRATOR,
  FIRST_LOGIN,
  INACTIVE_REQUESTER,
  IT_STAFF,
  REQUESTER,
  settle,
  withFirstLoginAccount,
  type Account,
} from "../support/auth";

// Lab 3 authentication and role navigation in the browser - tests.md section
// 2.12 E2E-01..E2E-06 and section 2.11 RESP-07 and RESP-08 (Issues #39 and
// #40), with the ui-spec.md section 23 captures for LS 14 Part 5, at all three
// C-90 viewport projects. Every test here starts signed out: it signs in
// through the Login screen itself.
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

    // The gate clears and the role's landing screen renders: a Requester's is
    // My Tickets (FR-18, AC-28, ui-spec 9.1).
    await expect(heading).toHaveCount(0, { timeout: 5_000 });
    await expect(page.getByRole("heading", { level: 1, name: "My Tickets" })).toBeVisible();
    await expect(page).toHaveURL(/\/tickets$/);
  });
});

test("E2E-04 the shell shows who is signed in; after Log Out a bookmarked URL, Back and the old cookie are all refused (AC-17, FR-07)", async ({ page, request }) => {
  await page.goto("/tickets");
  await fillLogin(page, REQUESTER.email, REQUESTER.password);
  await signInButton(page).click();

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

// ---------------------------------------------------------------------------
// #40: landing, navigation and identity per role
// ---------------------------------------------------------------------------

const ROLES: Array<{ account: Account; role: string; name: string; badge: string; landing: RegExp; heading: string; nav: string[]; shot: string }> = [
  { account: REQUESTER, role: "Requester", name: "Anucha Prasert", badge: "Requester", landing: /\/tickets$/, heading: "My Tickets", nav: ["My Tickets", "Create Ticket"], shot: "requester" },
  { account: IT_STAFF, role: "IT Staff", name: "Araya Methee", badge: "IT Staff", landing: /\/queue$/, heading: "Ticket Queue", nav: ["Ticket Queue"], shot: "it-staff" },
  { account: ADMINISTRATOR, role: "Administrator", name: "Panida Srisawat", badge: "Administrator", landing: /\/queue$/, heading: "Ticket Queue", nav: ["Ticket Queue", "User Management"], shot: "administrator" },
];

async function signInThroughLogin(page: Page, account: Account, at = "/") {
  await page.goto(at);
  await fillLogin(page, account.email, account.password);
  await signInButton(page).click();
}

async function navLabels(page: Page): Promise<string[]> {
  return page
    .getByRole("navigation", { name: "Main navigation" })
    .locator(".tk-nav-link")
    .allTextContents()
    .then((labels) => labels.map((l) => l.trim()));
}

test("E2E-01 a Requester signs in at the root, lands on My Tickets, and the shell shows their name and Role badge (AC-01)", async ({ page }) => {
  await signInThroughLogin(page, REQUESTER);
  await expect(page.getByRole("heading", { level: 1, name: "My Tickets" })).toBeVisible();
  await expect(page).toHaveURL(/\/tickets$/);
  const header = page.getByRole("banner");
  await expect(header.locator(".tk-identity-name")).toHaveText("Anucha Prasert");
  await expect(header.locator(".tk-badge-role")).toHaveText("Requester");
});

test("E2E-05 each role signs in and sees exactly its own destinations, landing on its own screen (AC-31..AC-33)", async ({ browser }) => {
  for (const r of ROLES) {
    const context = await browser.newContext({ ...test.info().project.use, storageState: { cookies: [], origins: [] } });
    const page = await context.newPage();
    await signInThroughLogin(page, r.account);
    await expect(page.getByRole("heading", { level: 1, name: r.heading }), r.role).toBeVisible();
    await expect(page).toHaveURL(r.landing);
    expect(await navLabels(page), r.role).toEqual(r.nav);
    await expect(page.getByRole("banner").locator(".tk-identity-name")).toHaveText(r.name);
    await expect(page.getByRole("banner").locator(".tk-badge-role")).toHaveText(r.badge);
    // Part 5's shell evidence for every role (P5-07, P5-08).
    await expect(page.locator("[aria-busy='true']")).toHaveCount(0);
    await openNav(page);
    await capture(page, `shell-<vp>-${r.shot}`);
    await context.close();
  }
});

test("E2E-06 after signing in, localStorage and sessionStorage hold no identity in the real browser (AC-34, FR-11)", async ({ page }) => {
  await signInThroughLogin(page, REQUESTER);
  await expect(page.getByRole("heading", { level: 1, name: "My Tickets" })).toBeVisible();
  const storage = await page.evaluate(() => ({
    local: Object.entries(window.localStorage),
    session: Object.entries(window.sessionStorage),
    cookies: document.cookie,
  }));
  expect(storage.local).toEqual([]);
  expect(storage.session).toEqual([]);
  // The session cookie is HttpOnly: script cannot see it at all.
  expect(storage.cookies).not.toContain("tt_session");
});

test("a role reaching another role's address sees the Forbidden state inside the shell (FR-24, ui-spec 20.1)", async ({ page }) => {
  await signInThroughLogin(page, REQUESTER, "/queue");
  await expect(page.getByRole("heading", { name: "You do not have access to that page." })).toBeVisible();
  await expect(page.getByRole("banner")).toBeVisible();
  await expect(page.getByRole("link", { name: "Go to My Tickets" })).toBeVisible();
  await capture(page, "forbidden-<vp>-requester-at-queue");
});

test("RESP-07 at 390 px the toggler opens a panel with exactly the role's destinations, the name, the Role badge and Log Out (ui-spec 9.1)", async ({ browser }) => {
  for (const r of ROLES) {
    const context = await browser.newContext({ ...test.info().project.use, storageState: { cookies: [], origins: [] } });
    const page = await context.newPage();
    await signInThroughLogin(page, r.account);
    await expect(page.getByRole("heading", { level: 1, name: r.heading })).toBeVisible();
    const toggler = page.getByRole("button", { name: "Toggle navigation" });
    const banner = page.getByRole("banner");
    if (test.info().project.name !== "mobile") {
      await expect(toggler).toBeHidden();
      for (const label of r.nav) await expect(banner.getByRole("link", { name: label })).toBeVisible();
    } else {
      await expect(toggler).toBeVisible();
      await toggler.click();
      await expect(toggler).toHaveAttribute("aria-expanded", "true");
      expect(await navLabels(page), r.role).toEqual(r.nav);
      for (const target of [...r.nav.map((l) => banner.getByRole("link", { name: l })), banner.getByRole("button", { name: "Log Out" })]) {
        await expect(target).toBeVisible();
        expect((await target.boundingBox())!.height, r.role).toBeGreaterThanOrEqual(44);
      }
      await expect(banner.locator(".tk-identity-name")).toHaveText(r.name);
      await expect(banner.locator(".tk-badge-role")).toBeVisible();
    }
    await context.close();
  }
});

test("RESP-08 tabbing Login, the shell and the Forbidden state reaches every control, each named with a visible focus ring (AC-106)", async ({ page }) => {
  async function traverse(label: string, expectAtLeast: number) {
    const seen: string[] = [];
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press("Tab");
      // Let Bootstrap's 150 ms focus transition settle before reading the ring.
      await settle(page);
      const info = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return null;
        const cs = getComputedStyle(el);
        const name = el.getAttribute("aria-label") || (el.id && document.querySelector(`label[for="${el.id}"]`)?.textContent) || el.textContent || "";
        const ring = cs.boxShadow !== "none" || (cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0);
        return { tag: el.tagName, name: name.trim(), ring, key: `${el.tagName}#${el.id}.${el.className}:${name.trim()}` };
      });
      if (!info || seen.includes(info.key)) break;
      seen.push(info.key);
      expect(info.name, `${label}: ${info.tag} has no accessible name`).not.toBe("");
      expect(info.ring, `${label}: ${info.tag} "${info.name}" shows no focus ring`).toBe(true);
    }
    expect(seen.length, `${label}: controls reached`).toBeGreaterThanOrEqual(expectAtLeast);
  }

  await page.goto("/");
  await expect(signInButton(page)).toBeEnabled();
  await traverse("Login", 3);

  await fillLogin(page, REQUESTER.email, REQUESTER.password);
  await signInButton(page).click();
  await expect(page.getByRole("heading", { level: 1, name: "My Tickets" })).toBeVisible();
  await page.goto("/queue");
  await expect(page.getByRole("heading", { name: "You do not have access to that page." })).toBeVisible();
  await page.locator("body").click({ position: { x: 1, y: 1 } });
  await traverse("Shell and Forbidden", 3);
});
