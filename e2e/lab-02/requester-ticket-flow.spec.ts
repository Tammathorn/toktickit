import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { E2E_REQUESTER, REQUESTER_A, REQUESTER_B, REQUESTER_C, STATE, apiAs, signIn } from "../support/auth";

// The end-to-end Requester flow (E2E-01..E2E-06) and the responsive rows
// (RESP-01..RESP-06) from docs/lab-02/tests.md, run at the three C-10 viewport
// projects. The filename is the one LS 12 fixes.
//
// Data discipline: the flow creates its Ticket as the dedicated E2E Requester,
// which the demo seed never touches, so Part 7's counts for Requesters A, B
// and C stay 14 / 3 / 0. The empty and no-results steps read A and C without
// changing them.
//
// Lab 3 (#40), docs/lab-03/tests.md section 4.2: the stored selection becomes
// a signed-in session - the E2E Requester's storageState by default, a
// sign-in where a test needs another persona. E2E-01's Selection step is now
// Login, E2E-02's switch is a sign-out and a sign-in as B, and E2E-05's
// direct refusals are 404, not 403 (C-65). RESP-02's desktop table gains the
// IT Priority column (C-71), RESP-04 checks Log Out where Change Requester was,
// and RESP-06 traverses Login where it traversed the Selection screen. Direct
// API calls are made as a signed-in user; none carries ?requesterId=.
//
// The E2E-01 -> E2E-05 steps share one Ticket and run in order (serial);
// the rest are independent. Requires the manual start sequence in tests.md.

test.use({ storageState: STATE.requester });

const ARTIFACTS = path.resolve(__dirname, "../../artifacts/lab-02/screenshots");
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

async function openNav(page: Page) {
  if (test.info().project.name === "mobile") await page.getByRole("button", { name: "Toggle navigation" }).click();
}

async function expectNoHorizontalScroll(page: Page) {
  const [scrollWidth, innerWidth] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  expect(scrollWidth, `scrollWidth ${scrollWidth} > innerWidth ${innerWidth} on ${page.url()}`).toBeLessThanOrEqual(innerWidth);
}

async function ticketsOf(account: typeof REQUESTER_A) {
  const api = await apiAs(account);
  const body = await (await api.get("/api/tickets?pageSize=50")).json();
  await api.dispose();
  return body;
}

// ---------------------------------------------------------------------------
// E2E-01, E2E-03, E2E-04, E2E-05: one Ticket carried through the flow.
// ---------------------------------------------------------------------------
test.describe("The Requester flow", () => {
  test.describe.configure({ mode: "serial" });

  let ticketNumber: string;
  let ticketId: number;

  test("E2E-01 signs in, creates a Ticket with an attachment, finds it in My Tickets and opens its detail (AC-01, AC-08, AC-09)", async ({ browser }) => {
    // A fresh context with no session: the Login screen stands where the
    // Lab 2 Selection screen stood (AC-08's "this is a real sign-in now").
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await context.newPage();
    await page.goto("/");
    await page.getByLabel(/Email Address/).fill(E2E_REQUESTER.email);
    await page.getByLabel(/^Password/).fill(E2E_REQUESTER.password);
    await page.getByRole("button", { name: "Sign In" }).click();
    const name = page.getByRole("banner").locator(".tk-identity-name");
    await expect(name).toHaveText("Siriporn Chaiyo");

    // Reload keeps the session (AC-09)
    await page.reload();
    await expect(page.getByRole("banner").locator(".tk-identity-name")).toHaveText("Siriporn Chaiyo");

    // Create Ticket with one attachment
    await openNav(page);
    await page.getByRole("banner").getByRole("link", { name: "Create Ticket" }).click();
    await expect(page.getByLabel("Category", { exact: false })).toBeEnabled();
    await page.getByLabel("Category", { exact: false }).selectOption({ index: 1 });
    await page.getByLabel("Related System", { exact: false }).selectOption({ index: 1 });
    await page.getByLabel("Ticket Summary", { exact: false }).fill("E2E flow: projector remote missing");
    await page.getByLabel("Description", { exact: false }).fill("The remote for the lecture hall projector is missing since Monday morning.");
    await page.getByLabel("Attachments").setInputFiles({ name: "remote.png", mimeType: "image/png", buffer: PNG });
    await page.getByRole("button", { name: "Submit Ticket" }).click();

    const panel = page.getByRole("status", { name: "Ticket created" });
    await expect(panel).toBeVisible();
    ticketNumber = (await panel.locator(".tk-ticket-number").textContent())!.trim();
    expect(ticketNumber).toMatch(/^TKT-\d{4}-\d{6}$/);
    await expect(panel.getByText("remote.png")).toBeVisible();
    await expect(panel.getByText("Uploaded")).toBeVisible();
    const viewHref = await panel.getByRole("link", { name: "View Ticket" }).getAttribute("href");
    ticketId = Number(viewHref!.split("/").pop());

    // Find it in My Tickets by its number
    await openNav(page);
    await page.getByRole("banner").getByRole("link", { name: "My Tickets" }).click();
    await page.getByLabel("Search", { exact: true }).fill(ticketNumber);
    await expect(page).toHaveURL(/search=TKT/);
    const row = page.getByRole("link", { name: `Open ${ticketNumber}` });
    await expect(row).toHaveCount(1);

    // Open the detail
    await row.click();
    await expect(page).toHaveURL(new RegExp(`/tickets/${ticketId}$`));
    await expect(page.getByRole("heading", { level: 1, name: ticketNumber })).toBeVisible();
    await expect(page.getByText("1 of 5 active")).toBeVisible();
    await context.close();
  });

  test("E2E-03 adds, downloads and soft-removes an attachment; metadata and reason remain (AC-32, AC-30, AC-34)", async ({ page }) => {
    await page.goto(`/tickets/${ticketId}`);
    await expect(page.getByText("1 of 5 active")).toBeVisible();

    await page.getByLabel("Add attachment").setInputFiles({ name: "receipt.png", mimeType: "image/png", buffer: PNG });
    const active = page.getByRole("list", { name: "Active attachments" });
    await expect(active.getByText("receipt.png")).toBeVisible();
    await expect(page.getByText("2 of 5 active")).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download receipt.png" }).click();
    expect((await downloadPromise).suggestedFilename()).toBe("receipt.png");
    await expect(page.getByText("Downloaded receipt.png")).toBeVisible();

    await page.getByRole("button", { name: "Remove receipt.png" }).click();
    const dialog = page.getByRole("dialog", { name: "Remove attachment" });
    await expect(dialog.getByRole("button", { name: "Remove" })).toBeDisabled();
    await dialog.getByLabel("Removal reason", { exact: false }).fill("Wrong receipt attached.");
    await dialog.getByRole("button", { name: "Remove" }).click();
    await expect(dialog).toBeHidden();

    const removed = page.getByRole("list", { name: "Removed attachments" }).getByRole("listitem");
    await expect(removed).toHaveCount(1);
    await expect(removed).toContainText("receipt.png");
    await expect(removed).toContainText("Reason: Wrong receipt attached.");
    await expect(page.getByText("1 of 5 active")).toBeVisible();
  });

  test("E2E-04 the removed attachment offers no download, and a direct request returns 410 (AC-36)", async ({ page }) => {
    await page.goto(`/tickets/${ticketId}`);
    const removedRow = page.getByRole("list", { name: "Removed attachments" }).getByRole("listitem");
    await expect(removedRow).toContainText("receipt.png");
    await expect(removedRow.getByRole("button", { name: /Download/ })).toHaveCount(0);
    await expect(removedRow.getByRole("button", { name: /Preview/ })).toHaveCount(0);

    const owner = await apiAs(E2E_REQUESTER);
    const list = await (await owner.get(`/api/tickets/${ticketId}/attachments`)).json();
    const removed = list.find((a: { originalFilename: string }) => a.originalFilename === "receipt.png");
    expect(removed.isRemoved).toBe(true);
    for (const disposition of ["attachment", "inline"]) {
      const res = await owner.get(`/api/attachments/${removed.id}/download?disposition=${disposition}`);
      expect(res.status(), disposition).toBe(410);
      expect((await res.json()).error.code).toBe("ATTACHMENT_REMOVED");
    }
    await owner.dispose();
  });

  test("E2E-05 another Requester is refused: direct navigation to the Ticket and a direct attachment request both give 404 (AC-38, AC-39, C-65)", async ({ page }) => {
    const owner = await apiAs(E2E_REQUESTER);
    const list = await (await owner.get(`/api/tickets/${ticketId}/attachments`)).json();
    await owner.dispose();
    const activeFile = list.find((a: { isRemoved: boolean }) => !a.isRemoved);
    const removedFile = list.find((a: { isRemoved: boolean }) => a.isRemoved);

    const other = await apiAs(REQUESTER_B);
    const ticket = await other.get(`/api/tickets/${ticketId}`);
    expect(ticket.status()).toBe(404);
    expect((await ticket.json()).error.code).toBe("TICKET_NOT_FOUND");
    for (const file of [activeFile, removedFile]) {
      const res = await other.get(`/api/attachments/${file.id}/download`);
      expect(res.status(), file.originalFilename).toBe(404); // never 410 to a non-owner (C-65)
      expect((await res.json()).error.code).toBe("ATTACHMENT_NOT_FOUND");
    }
    await other.dispose();

    await signIn(page, REQUESTER_B);
    await page.goto(`/tickets/${ticketId}`);
    await expect(page.getByRole("alert")).toContainText("That item does not exist.");
    await expect(page.getByText(ticketNumber)).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------
// E2E-02 and E2E-06 against the demo seed, read-only.
// ---------------------------------------------------------------------------
test("E2E-02 A signing out and B signing in makes A's Tickets disappear and lists B's (AC-11, AC-03)", async ({ page }) => {
  const aList = await ticketsOf(REQUESTER_A);
  const bList = await ticketsOf(REQUESTER_B);
  expect(aList.meta.total).toBeGreaterThan(0);

  await signIn(page, REQUESTER_A);
  await page.goto("/tickets");
  await expect(page.getByText(aList.data[0].ticketNumber)).toBeVisible();

  await openNav(page);
  await page.getByRole("banner").getByRole("button", { name: "Log Out" }).click();
  await page.getByLabel(/Email Address/).fill(REQUESTER_B.email);
  await page.getByLabel(/^Password/).fill(REQUESTER_B.password);
  await page.getByRole("button", { name: "Sign In" }).click();

  await expect(page.getByRole("banner").locator(".tk-identity-name")).toHaveText("Kanya Somsri");
  await expect(page.getByRole("link", { name: /^Open TKT-/ })).toHaveCount(Math.min(bList.data.length, 10));
  for (const row of aList.data) await expect(page.getByText(row.ticketNumber)).toHaveCount(0);
});

test("E2E-06 a Requester with no Tickets sees `No tickets yet`; a filter that excludes everything shows `No matches` (AC-49, AC-50)", async ({ page }) => {
  await signIn(page, REQUESTER_C);
  await page.goto("/tickets");
  await expect(page.getByRole("heading", { name: "No tickets yet" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Ticket list" }).getByRole("link", { name: "Create Ticket" })).toBeVisible();

  await signIn(page, REQUESTER_A);
  await page.goto("/tickets?search=zzzz-no-such-ticket");
  await expect(page.getByRole("heading", { name: "No matches" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Ticket list" }).getByRole("button", { name: "Clear filters" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "No tickets yet" })).toHaveCount(0);
});

// ---------------------------------------------------------------------------
// RESP-01..RESP-06 - responsive behaviour and the built theme.
// ---------------------------------------------------------------------------
test.describe("Responsive", () => {
  test("RESP-01 no horizontal page scroll on any of the four screens (AC-55)", async ({ browser, page }) => {
    const signedOut = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const login = await signedOut.newPage();
    await login.goto("/");
    await expect(login.getByRole("button", { name: "Sign In" })).toBeVisible();
    await expectNoHorizontalScroll(login);
    await signedOut.close();

    await signIn(page, REQUESTER_A);
    const list = await ticketsOf(REQUESTER_A);
    await page.goto("/tickets");
    await expect(page.getByRole("link", { name: /^Open TKT-/ }).first()).toBeVisible();
    await expectNoHorizontalScroll(page);

    await page.goto("/tickets/new");
    await expect(page.getByLabel("Category", { exact: false })).toBeEnabled();
    await expectNoHorizontalScroll(page);

    await page.goto(`/tickets/${list.data[0].id}`);
    await expect(page.getByRole("heading", { level: 1, name: /^TKT-/ })).toBeVisible();
    await expectNoHorizontalScroll(page);
  });

  test("RESP-02 / RESP-03 My Tickets is cards at 390 px and a seven-column table at 1280 px", async ({ page }) => {
    await signIn(page, REQUESTER_A);
    await page.goto("/tickets");
    await expect(page.getByRole("link", { name: /^Open TKT-/ }).first()).toBeVisible();

    const vp = test.info().project.name;
    if (vp === "mobile") {
      await expect(page.locator("table")).toHaveCount(0);
      await expect(page.locator(".tk-ticket-card").first()).toBeVisible();
    } else {
      await expect(page.locator(".tk-ticket-card")).toHaveCount(0);
      const headers = page.locator("table thead th");
      const visible = await headers.evaluateAll((ths) => ths.filter((th) => (th as HTMLElement).offsetParent !== null).map((th) => th.textContent!.trim()));
      if (vp === "desktop") {
        // C-71, ui-spec 12 change 3: IT Priority is its own column beside Requested Priority at lg.
        expect(visible).toEqual(["Ticket Number", "Ticket Summary", "Category", "Requested Priority", "IT Priority", "Current Status", "Last Updated"]);
      } else {
        expect(visible).toEqual(["Ticket Number", "Ticket Summary", "Current Status", "Last Updated"]); // ui-spec 12.3 at md
      }
    }
  });

  test("RESP-04 at 390 px the toggler opens a panel with both nav items and Log Out (ui-spec 9)", async ({ page }) => {
    await page.goto("/tickets");
    const toggler = page.getByRole("button", { name: "Toggle navigation" });
    const banner = page.getByRole("banner");
    if (test.info().project.name !== "mobile") {
      // md and above: one header bar, no toggler, everything inline (ui-spec 9)
      await expect(toggler).toBeHidden();
      await expect(banner.getByRole("link", { name: "My Tickets" })).toBeVisible();
      await expect(banner.getByRole("link", { name: "Create Ticket" })).toBeVisible();
      await expect(banner.getByRole("button", { name: "Log Out" })).toBeVisible();
      return;
    }
    await expect(toggler).toBeVisible();
    await expect(toggler).toHaveAttribute("aria-expanded", "false");
    await toggler.click();
    await expect(toggler).toHaveAttribute("aria-expanded", "true");
    await expect(banner.getByRole("link", { name: "My Tickets" })).toBeVisible();
    await expect(banner.getByRole("link", { name: "Create Ticket" })).toBeVisible();
    await expect(banner.getByRole("button", { name: "Log Out" })).toBeVisible();
    for (const target of [banner.getByRole("link", { name: "My Tickets" }), banner.getByRole("button", { name: "Log Out" })]) {
      const box = await target.boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44); // touch target
    }
  });

  test("RESP-05 every screenshot ui-spec.md 15 names exists at this viewport (AC-54)", async () => {
    const vp = test.info().project.name;
    const expected = [
      ...["loading", "populated", "empty", "failure"].map((s) => `create-ticket/selection-${vp}-${s}.png`),
      ...["initial", "validation", "submitting", "success", "api-failure", "invalid-attachment"].map((s) => `create-ticket/create-${vp}-${s}.png`),
      ...["populated", "loading", "empty", "no-results", "failure"].map((s) => `my-tickets/list-${vp}-${s}.png`),
      ...["active", "removed", "removal-dialog", "unauthorized"].map((s) => `ticket-detail/detail-${vp}-${s}.png`),
    ];
    const missing = expected.filter((rel) => !fs.existsSync(path.join(ARTIFACTS, rel)) || fs.statSync(path.join(ARTIFACTS, rel)).size === 0);
    expect(missing, "the Lab 2 evidence set, kept in artifacts/lab-02/").toEqual([]);
  });

  test("RESP-06 tabbing each screen reaches every control, each named and with a visible focus ring (AC-56)", async ({ browser, page }) => {
    const vp = test.info().project.name;

    async function traverse(on: Page, label: string, expectAtLeast: number) {
      const seen: string[] = [];
      for (let i = 0; i < 80; i++) {
        await on.keyboard.press("Tab");
        const info = await on.evaluate(() => {
          const el = document.activeElement as HTMLElement | null;
          if (!el || el === document.body) return null;
          const cs = getComputedStyle(el);
          const name =
            el.getAttribute("aria-label") ||
            (el.id && document.querySelector(`label[for="${el.id}"]`)?.textContent) ||
            el.textContent ||
            "";
          const ring = cs.boxShadow !== "none" || (cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0);
          return { tag: el.tagName, name: name.trim(), ring, key: `${el.tagName}#${el.id}.${el.className}:${name.trim()}` };
        });
        if (!info) break;
        if (seen.includes(info.key)) break; // wrapped around
        seen.push(info.key);
        expect(info.name, `${label}: ${info.tag} has no accessible name`).not.toBe("");
        expect(info.ring, `${label}: ${info.tag} "${info.name}" shows no focus ring`).toBe(true);
      }
      expect(seen.length, `${label}: controls reached`).toBeGreaterThanOrEqual(expectAtLeast);
    }

    // Login stands where the Lab 2 Selection screen stood.
    const signedOut = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const login = await signedOut.newPage();
    await login.goto("/");
    await expect(login.getByRole("button", { name: "Sign In" })).toBeEnabled();
    await traverse(login, "Login", 3);
    await signedOut.close();

    await signIn(page, REQUESTER_A);
    const list = await ticketsOf(REQUESTER_A);
    await page.goto("/tickets");
    await expect(page.getByRole("link", { name: /^Open TKT-/ }).first()).toBeVisible();
    await traverse(page, "My Tickets", 8);

    await page.goto("/tickets/new");
    await expect(page.getByLabel("Category", { exact: false })).toBeEnabled();
    // land on the Ticket Summary field and capture the ring as the focus evidence
    const summary = page.getByLabel("Ticket Summary", { exact: false });
    await summary.focus();
    // let Bootstrap's 150 ms transitions settle so the ring and the primary fill are painted
    await expect(summary).toHaveCSS("border-color", "rgb(11, 122, 70)");
    await expect(summary).toHaveCSS("box-shadow", /rgba\(11, 122, 70, 0\.35\) 0px 0px 0px 3px/);
    await expect(page.getByRole("button", { name: "Submit Ticket" })).toHaveCSS("background-color", "rgb(0, 107, 60)");
    await page.screenshot({ path: path.join(ARTIFACTS, `create-ticket/create-${vp}-focus.png`), fullPage: false });
    // then traverse the whole screen from the top
    await page.reload();
    await expect(page.getByLabel("Category", { exact: false })).toBeEnabled();
    await traverse(page, "Create Ticket", 8);

    await page.goto(`/tickets/${list.data[0].id}`);
    await expect(page.getByRole("heading", { level: 1, name: /^TKT-/ })).toBeVisible();
    await traverse(page, "Ticket Detail", 4);
  });

  test("the Zen Green tokens are what the built CSS paints (ui-spec 2, VIS-01 rows 1-6)", async ({ page }) => {
    await page.goto("/tickets/new");
    await expect(page.getByLabel("Category", { exact: false })).toBeEnabled();

    // toHaveCSS polls, which also lets Bootstrap's 150 ms button transition settle
    const css = (el: string, prop: string, value: string) => expect(page.locator(el).first()).toHaveCSS(prop, value);
    await css("header.tk-header", "background-color", "rgb(0, 107, 60)"); // #006B3C
    await css("button.btn-primary", "background-color", "rgb(0, 107, 60)");
    await css("button.btn-primary", "color", "rgb(255, 255, 255)");
    await css("body", "background-color", "rgb(245, 247, 246)"); // #F5F7F6
    await css(".tk-card", "background-color", "rgb(255, 255, 255)");
    await css("body", "color", "rgb(31, 42, 36)"); // #1F2A24
    await css("input.tk-readonly", "background-color", "rgb(237, 241, 238)"); // #EDF1EE read-only
    await css("input#summary", "background-color", "rgb(255, 255, 255)"); // editable
    await css(".tk-required", "color", "rgb(164, 38, 44)"); // #A4262C
    await css(".tk-nav-link-active", "border-bottom-color", "rgb(234, 246, 239)"); // #EAF6EF
    // the button hierarchy: one primary, Cancel secondary
    await expect(page.locator("button.btn-primary, a.btn-primary")).toHaveCount(1);
    await expect(page.getByRole("link", { name: "Cancel" })).toHaveClass(/btn-secondary/);
  });
});
