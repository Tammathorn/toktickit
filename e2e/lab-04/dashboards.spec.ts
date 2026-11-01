import fs from "node:fs";
import path from "node:path";
import { test, expect } from "../support/console";
import { ADMINISTRATOR, E2E_REQUESTER, IT_STAFF, REQUESTER_A, REQUESTER_C, STATE, apiAs, signIn, type Account } from "../support/auth";
import {
  SIGNED_OUT,
  addAction,
  capture,
  expectNoHorizontalScroll,
  freshAdministrator,
  hold,
  newTicket,
  vp,
} from "../support/lab4-shots";
import type { Page } from "@playwright/test";

// The dashboards end to end - tests.md E2E-19 to E2E-27, plus the captures
// E2E-33 (staff-dashboard/, 8 states) and E2E-34 (requester-dashboard/, 5
// states) of ui-spec 15. Issue #70. Every walk runs under the console-error
// fixture (C-149): a console error, an uncaught exception or a same-origin 5xx
// anywhere on the walk fails the test.
// Requires the manual start sequence in docs/lab-04/tests.md section 5.

const heading = (page: Page, name: string) => page.getByRole("heading", { level: 1, name });
const cards = (page: Page) => page.locator("a.tk-metric-card");

async function openNav(page: Page) {
  if (vp() !== "mobile") return;
  const panel = page.locator("#tk-nav-panel");
  if (!(await panel.evaluate((el) => el.classList.contains("show")))) {
    await page.getByRole("button", { name: "Toggle navigation" }).click();
    await expect(panel).toHaveClass(/show/);
  }
}

async function gotoDashboard(page: Page) {
  await page.goto("/dashboard");
  await expect(heading(page, "Dashboard")).toBeVisible();
  await expect(page.getByText(/^Updated \d{2} \w{3} \d{4} \d{2}:\d{2} \(Asia\/Bangkok\)$/)).toBeVisible();
}

async function signInAs(page: Page, account: Account) {
  await page.context().clearCookies();
  await signIn(page, account);
}

// The total a drill-down landed on: the "Showing x to y of N tickets" line, or
// 0 for either empty state.
async function landedTickets(page: Page): Promise<number> {
  const showing = page.getByText(/Showing \d+ to \d+ of \d+ tickets/).first();
  const none = page.getByRole("heading", { name: /^No (matches|tickets)/ });
  await expect(showing.or(none).first()).toBeVisible();
  if (await showing.isVisible()) return Number(/of (\d+) tickets/.exec((await showing.textContent())!)![1]);
  return 0;
}

async function landedUsers(page: Page): Promise<number> {
  const rows = page.locator("tbody tr.tk-row, li.tk-user-card");
  const none = page.getByRole("heading", { name: /^No (matches|users)/ });
  await expect(rows.first().or(none).first()).toBeVisible();
  return rows.count();
}

// E2E-23 and E2E-24: every card, clicked in the browser, lands on a list whose
// total equals the card's count. Another test creating a Ticket between the
// two reads would move both numbers apart for an instant, so a mismatch is
// re-read up to twice before it counts; a card that never agrees fails.
async function everyCardMatchesItsList(page: Page, tag: string) {
  const record: Array<{ card: string; href: string; cardCount: number; listTotal: number; reads: number }> = [];
  await gotoDashboard(page);
  const total = await cards(page).count();
  expect(total).toBeGreaterThan(0);
  for (let i = 0; i < total; i++) {
    let last = "";
    for (let attempt = 0; attempt < 3; attempt++) {
      await gotoDashboard(page);
      const card = cards(page).nth(i);
      const href = (await card.getAttribute("href"))!;
      if (href.startsWith("/dashboard#")) break; // the My planned actions card stays on the page (E2E-26)
      const label = ((await card.locator(".tk-metric-label").textContent()) ?? "").trim();
      const count = Number((await card.locator(".tk-metric-count").textContent())!.trim());
      await card.click();
      const landed = href.startsWith("/users") ? await landedUsers(page) : await landedTickets(page);
      last = `${label}: card ${count}, list ${landed} (${href})`;
      if (landed === count || attempt === 2) record.push({ card: label, href, cardCount: count, listTotal: landed, reads: attempt + 1 });
      if (landed === count) {
        last = "";
        break;
      }
    }
    expect(last, "the card's count equals the landed list's total").toBe("");
  }
  // Measured values for VIS-09 (visual-checklist.md).
  const out = path.resolve(__dirname, "../../artifacts/lab-04/evidence/issue-70");
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, `card-vs-list-${tag}-${vp()}.json`), JSON.stringify({ viewport: vp(), pairs: record }, null, 2) + "\n");
}

test.describe("Dashboards - sign-in landing", () => {
  test.use({ storageState: SIGNED_OUT });

  for (const [role, account] of [
    ["Requester", E2E_REQUESTER],
    ["IT Staff", IT_STAFF],
    ["Administrator", ADMINISTRATOR],
  ] as const) {
    test(`E2E-19 ${role} signs in and lands on /dashboard with Dashboard first and aria-current (AC-88; FR-23)`, async ({ page, consoleGuard }) => {
      consoleGuard.expectStatus(401, "/api/auth/me"); // the signed-out probe the Login screen makes
      await page.goto("/");
      await page.getByLabel(/Email Address/).fill(account.email);
      await page.getByLabel(/^Password/).fill(account.password);
      await page.getByRole("button", { name: "Sign In" }).click();
      await expect(page).toHaveURL(/\/dashboard$/);
      await expect(heading(page, "Dashboard")).toBeVisible();
      await openNav(page);
      const links = page.locator(".tk-nav-link");
      await expect(links.first()).toHaveText("Dashboard");
      await expect(links.first()).toHaveAttribute("aria-current", "page");
      await expect(page.locator(".tk-nav-link[aria-current='page']")).toHaveCount(1);
    });
  }
});

test.describe("Dashboards - the three walks", () => {
  test.use({ storageState: SIGNED_OUT });

  test("E2E-20 Requester walk: every nav item, Quick Action, card and list link loads with no console error (AC-89; FR-28, FR-30, C-149)", async ({ page }) => {
    test.slow();
    await signIn(page, REQUESTER_A);
    await gotoDashboard(page);
    expect(await cards(page).count(), "the four Requester cards").toBe(4);

    for (const [label, title] of [["My Tickets", "My Tickets"], ["Create Ticket", "Create Ticket"], ["Dashboard", "Dashboard"]] as const) {
      await openNav(page);
      await page.getByRole("banner").getByRole("link", { name: label, exact: true }).click();
      await expect(heading(page, title)).toBeVisible();
      await page.waitForLoadState("networkidle");
    }
    for (let i = 0; i < 4; i++) {
      await gotoDashboard(page);
      await cards(page).nth(i).click();
      await expect(heading(page, "My Tickets")).toBeVisible();
      await landedTickets(page);
    }
    await gotoDashboard(page);
    await page.getByRole("link", { name: "Create Ticket" }).last().click();
    await expect(heading(page, "Create Ticket")).toBeVisible();

    await gotoDashboard(page);
    const viewAll = page.getByRole("link", { name: "View all" }).first();
    await viewAll.click();
    await expect(heading(page, "My Tickets")).toBeVisible();
    await landedTickets(page);

    await gotoDashboard(page);
    const first = page.getByRole("region", { name: "Recently updated" }).or(page.locator("section[aria-labelledby='list-recently-updated']")).locator("ol a").first();
    const ticketNumber = ((await first.textContent()) ?? "").trim();
    await first.click();
    await expect(heading(page, ticketNumber)).toBeVisible();
    await page.waitForLoadState("networkidle");
  });

  test("E2E-21 IT Staff walk: every nav item, Quick Action, card and list link loads, and every Lab 3 staff screen is reachable (AC-89; FR-28, FR-30)", async ({ page }) => {
    test.slow();
    await signIn(page, IT_STAFF);
    await gotoDashboard(page);
    expect(await cards(page).count(), "the eleven staff cards").toBe(11);

    for (const [label, title] of [["Ticket Queue", "Ticket Queue"], ["Dashboard", "Dashboard"]] as const) {
      await openNav(page);
      await page.getByRole("banner").getByRole("link", { name: label, exact: true }).click();
      await expect(heading(page, title)).toBeVisible();
      await page.waitForLoadState("networkidle");
    }
    const n = await cards(page).count();
    for (let i = 0; i < n; i++) {
      await gotoDashboard(page);
      const href = (await cards(page).nth(i).getAttribute("href"))!;
      await cards(page).nth(i).click();
      if (href.startsWith("/dashboard#")) {
        await expect(page.locator("#my-actions-title")).toBeFocused();
      } else {
        await expect(heading(page, "Ticket Queue")).toBeVisible();
        await landedTickets(page);
      }
    }
    for (const quick of ["Search Tickets", "My Queue"]) {
      await gotoDashboard(page);
      await page.getByRole("link", { name: quick }).click();
      await expect(heading(page, "Ticket Queue")).toBeVisible();
      await landedTickets(page);
    }
    for (const title of ["Recently updated", "Urgent"]) {
      await gotoDashboard(page);
      const section = page.locator(`section[aria-labelledby='list-${title.toLowerCase().replace(/\s+/g, "-")}']`);
      await section.getByRole("link", { name: "View all" }).click();
      await expect(heading(page, "Ticket Queue")).toBeVisible();
      await landedTickets(page);
      await gotoDashboard(page);
      const link = page.locator(`section[aria-labelledby='list-${title.toLowerCase().replace(/\s+/g, "-")}']`).locator("ol a").first();
      const number = ((await link.textContent()) ?? "").trim();
      await link.click();
      await expect(heading(page, number)).toBeVisible();
      await page.waitForLoadState("networkidle");
    }
  });

  test("E2E-22 Administrator walk, including the user cards: User Management is reachable filtered (AC-89; FR-28, FR-30)", async ({ page }) => {
    test.slow();
    await signIn(page, ADMINISTRATOR);
    await gotoDashboard(page);
    expect(await cards(page).count(), "eleven ticket cards and three user cards").toBe(14);
    for (const [label, title] of [["Ticket Queue", "Ticket Queue"], ["User Management", "User Management"], ["Dashboard", "Dashboard"]] as const) {
      await openNav(page);
      await page.getByRole("banner").getByRole("link", { name: label, exact: true }).click();
      await expect(heading(page, title)).toBeVisible();
      await page.waitForLoadState("networkidle");
    }
    for (const [label, role] of [["Requesters", "REQUESTER"], ["IT Staff", "IT_STAFF"], ["Administrators", "ADMINISTRATOR"]] as const) {
      await gotoDashboard(page);
      await page.getByRole("link", { name: new RegExp(`^${label}: \\d+ accounts`) }).click();
      await expect(heading(page, "User Management")).toBeVisible();
      await expect(page).toHaveURL(new RegExp(`/users\\?role=${role}$`));
      await expect(page.locator("#users-role")).toHaveValue(role);
      await landedUsers(page);
    }
    for (let i = 0; i < 11; i++) {
      await gotoDashboard(page);
      const href = (await cards(page).nth(i).getAttribute("href"))!;
      if (href.startsWith("/dashboard#")) continue;
      await cards(page).nth(i).click();
      await expect(heading(page, "Ticket Queue")).toBeVisible();
      await landedTickets(page);
    }
  });
});

test.describe("Dashboards - count equals list (VIS-09)", () => {
  test.use({ storageState: SIGNED_OUT });

  test("E2E-23 IT Staff: every staff card clicked in the browser lands on a list whose total equals the count (AC-81; VIS-09)", async ({ page }) => {
    test.slow();
    await signIn(page, IT_STAFF);
    await everyCardMatchesItsList(page, "it-staff");
  });

  test("E2E-23 Administrator: every staff and user card clicked lands on a list whose total equals the count (AC-81; VIS-09)", async ({ page }) => {
    test.slow();
    await signIn(page, ADMINISTRATOR);
    await everyCardMatchesItsList(page, "administrator");
  });

  test("E2E-24 Requester: every Requester card clicked lands on My Tickets with the same total, for a Requester with Tickets and one with none (AC-81; VIS-09)", async ({ page }) => {
    test.slow();
    await signIn(page, REQUESTER_A);
    await everyCardMatchesItsList(page, "requester-a");
    await signInAs(page, REQUESTER_C);
    await everyCardMatchesItsList(page, "requester-c");
  });
});

test.describe("Dashboards - refresh, focus and access", () => {
  test.describe("IT Staff", () => {
    test.use({ storageState: STATE.itStaff });

    test("E2E-25 no polling: with the clock advanced 15 minutes no dashboard request is sent while idle; Refresh sends one and the Updated line changes (AC-84; C-128)", async ({ page }) => {
      let dashboardRequests = 0;
      page.on("request", (r) => {
        if (r.url().includes("/api/dashboard/")) dashboardRequests++;
      });
      await page.clock.install();
      await gotoDashboard(page);
      const updated = page.getByText(/^Updated /);
      const before = (await updated.textContent())!;
      const base = dashboardRequests;
      expect(base).toBeGreaterThan(0);

      await page.clock.fastForward(15 * 60 * 1000);
      await page.waitForTimeout(1000);
      expect(dashboardRequests, "no request while idle, 15 minutes later").toBe(base);

      // The server's generatedAt is real time and the line shows minutes, so the
      // refresh response is shifted by the same 15 minutes the clock was
      // advanced; the request itself is the real one.
      await page.route("**/api/dashboard/staff", async (route) => {
        const response = await route.fetch();
        const body = (await response.json()) as { generatedAt: string };
        body.generatedAt = new Date(Date.parse(body.generatedAt) + 15 * 60 * 1000).toISOString();
        await route.fulfill({ response, json: body });
      });
      await page.getByRole("button", { name: "Refresh" }).click();
      await expect(updated).not.toHaveText(before);
      expect(dashboardRequests, "Refresh sent exactly one request").toBe(base + 1);
    });

    test("E2E-26 following My planned actions moves #my-actions into view and focus to its heading (AC-133; VIS-26)", async ({ page }) => {
      const t = await newTicket("E2E-26 planned for me");
      const staff = await apiAs(IT_STAFF);
      await addAction(staff, t.id, { status: "PLANNED", description: "Check the dashboard focus target" });
      await staff.dispose();
      await gotoDashboard(page);
      await page.getByRole("link", { name: /^My planned actions: \d+\./ }).click();
      await expect(page.locator("#my-actions")).toBeInViewport();
      await expect(page.locator("#my-actions-title")).toBeFocused();
      expect(new URL(page.url()).hash).toBe("#my-actions");
    });
  });

  test.describe("Requester", () => {
    test.use({ storageState: STATE.requester });

    test("E2E-27 a Requester at /queue sees Forbidden with Go to Dashboard (C-144)", async ({ page, consoleGuard }) => {
      consoleGuard.expectStatus(403);
      await page.goto("/queue");
      await expect(heading(page, "You do not have access to that page.")).toBeVisible();
      await page.getByRole("link", { name: "Go to Dashboard" }).click();
      await expect(page).toHaveURL(/\/dashboard$/);
      await expect(heading(page, "Dashboard")).toBeVisible();
    });
  });
});

// ---------------------------------------------------------------------------
// E2E-33 - staff-dashboard/ (8 states). Seeded data, real responses; the one
// mocked capture is named -mocked and the -failure capture is a declared
// mocked 500 (C-180, C-182).
// ---------------------------------------------------------------------------
test.describe("Dashboards - staff captures", () => {
  test.use({ storageState: SIGNED_OUT });

  test("E2E-33 captures the eight staff-dashboard states into artifacts/lab-04/screenshots/staff-dashboard/", async ({ page, consoleGuard }) => {
    test.slow();
    consoleGuard.declareFailure({ url: "/api/dashboard/staff", status: 500 });

    // IT Staff with a planned action of their own, so my-actions shows a real row.
    const t = await newTicket("E2E-33 planned for staff capture");
    const staff = await apiAs(IT_STAFF);
    await addAction(staff, t.id, { status: "PLANNED", description: "Replace the lab projector bulb" });
    await staff.dispose();

    await signIn(page, IT_STAFF);
    await gotoDashboard(page);
    await expect(cards(page)).toHaveCount(11);
    await capture(page, "staff-dashboard", "staff-dashboard-<vp>-populated");
    await expectNoHorizontalScroll(page);

    // loading - the real request held until the capture.
    const release = await hold(page, "**/api/dashboard/staff");
    await page.goto("/dashboard");
    await expect(page.getByRole("region", { name: "Dashboard loading" })).toBeVisible();
    await capture(page, "staff-dashboard", "staff-dashboard-<vp>-loading");
    await release();
    await expect(cards(page).first()).toBeVisible();

    // my-actions - after following the card.
    await page.getByRole("link", { name: /^My planned actions: [1-9]\d*\./ }).click();
    await expect(page.locator("#my-actions-title")).toBeFocused();
    await capture(page, "staff-dashboard", "staff-dashboard-<vp>-my-actions");

    // focus - keyboard focus on a card.
    await gotoDashboard(page);
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press("Tab");
      if (await page.evaluate(() => document.activeElement?.classList.contains("tk-metric-card"))) break;
    }
    await expect(page.locator("a.tk-metric-card:focus")).toHaveCount(1);
    await capture(page, "staff-dashboard", "staff-dashboard-<vp>-focus");

    // lists-empty-mocked - the seed always holds recent and High Tickets, so the
    // two lists are emptied in the real response; named mocked (C-180).
    await page.route("**/api/dashboard/staff", async (route) => {
      const response = await route.fetch();
      const body = (await response.json()) as { lists: { recentlyUpdated: { items: unknown[] }; urgent: { items: unknown[] } } };
      body.lists.recentlyUpdated.items = [];
      body.lists.urgent.items = [];
      await route.fulfill({ response, json: body });
    });
    await gotoDashboard(page);
    await expect(page.getByText("No tickets were updated in the last 7 days.")).toBeVisible();
    await expect(page.getByText("No High IT Priority tickets are open.")).toBeVisible();
    await capture(page, "staff-dashboard", "staff-dashboard-<vp>-lists-empty-mocked");
    await page.unroute("**/api/dashboard/staff");

    // failure - a declared mocked 500.
    await page.route("**/api/dashboard/staff", (route) =>
      route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: { code: "INTERNAL_ERROR", message: "Something went wrong on our side." } }) }),
    );
    await page.goto("/dashboard");
    await expect(page.getByRole("alert")).toContainText("Something went wrong on our side.");
    await capture(page, "staff-dashboard", "staff-dashboard-<vp>-failure");
    await page.unroute("**/api/dashboard/staff");

    // administrator - the seeded Administrator, with the three user cards.
    await signInAs(page, ADMINISTRATOR);
    await gotoDashboard(page);
    await expect(page.getByRole("heading", { name: "User accounts" })).toBeVisible();
    await expect(page.getByText(/\d+ active/).first()).toBeVisible();
    await capture(page, "staff-dashboard", "staff-dashboard-<vp>-administrator");

    // zero - an Administrator who owns nothing: Mine 0, My planned actions 0 and
    // its panel's real Empty state. The account is created for this test so the
    // state is true on any database.
    const zero = await freshAdministrator(vp());
    try {
      await signInAs(page, zero);
      await gotoDashboard(page);
      await expect(page.getByRole("link", { name: /^Mine: 0\./ })).toBeVisible();
      await expect(page.getByRole("link", { name: /^My planned actions: 0\./ })).toBeVisible();
      await expect(page.getByText("No planned actions are assigned to you.")).toBeVisible();
      await capture(page, "staff-dashboard", "staff-dashboard-<vp>-zero");
    } finally {
      await zero.retire();
    }
  });
});

test.describe("Dashboards - Requester captures", () => {
  test.use({ storageState: SIGNED_OUT });

  test("E2E-34 captures the five requester-dashboard states into artifacts/lab-04/screenshots/requester-dashboard/", async ({ page, consoleGuard }) => {
    test.slow();
    consoleGuard.declareFailure({ url: "/api/dashboard/requester", status: 500 });

    await signIn(page, REQUESTER_A);
    await gotoDashboard(page);
    await expect(cards(page)).toHaveCount(4);
    await expect(page.getByRole("link", { name: /^Open tickets: \d+\./ })).toBeVisible();
    await capture(page, "requester-dashboard", "requester-dashboard-<vp>-populated");
    await expectNoHorizontalScroll(page);

    const release = await hold(page, "**/api/dashboard/requester");
    await page.goto("/dashboard");
    await expect(page.getByRole("region", { name: "Dashboard loading" })).toBeVisible();
    await capture(page, "requester-dashboard", "requester-dashboard-<vp>-loading");
    await release();
    await expect(cards(page).first()).toBeVisible();

    await gotoDashboard(page);
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press("Tab");
      if (await page.evaluate(() => document.activeElement?.classList.contains("tk-metric-card"))) break;
    }
    await expect(page.locator("a.tk-metric-card:focus")).toHaveCount(1);
    await capture(page, "requester-dashboard", "requester-dashboard-<vp>-focus");

    await page.route("**/api/dashboard/requester", (route) =>
      route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: { code: "INTERNAL_ERROR", message: "Something went wrong on our side." } }) }),
    );
    await page.goto("/dashboard");
    await expect(page.getByRole("alert")).toContainText("Something went wrong on our side.");
    await capture(page, "requester-dashboard", "requester-dashboard-<vp>-failure");
    await page.unroute("**/api/dashboard/requester");

    await signInAs(page, REQUESTER_C);
    await gotoDashboard(page);
    for (const label of ["Open tickets", "Waiting for you", "Resolved - awaiting closure", "Closed"]) {
      await expect(page.getByRole("link", { name: new RegExp(`^${label}: 0\\.`) })).toBeVisible();
    }
    await expect(page.getByText("None of your tickets changed in the last 7 days.")).toBeVisible();
    await expect(page.getByText("None of your tickets were resolved in the last 7 days.")).toBeVisible();
    await capture(page, "requester-dashboard", "requester-dashboard-<vp>-zero");
  });
});
