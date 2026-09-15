import { test, expect, type Page, type APIRequestContext } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { API_URL } from "../../playwright.config";

// The end-to-end Requester flow (E2E-01..E2E-06) and the responsive rows
// (RESP-01..RESP-06) from docs/lab-02/tests.md, run at the three C-10 viewport
// projects. The filename is the one LS 12 fixes.
//
// Data discipline: the flow creates its Ticket as the LAST active Development
// Requester, which the demo seed never touches, so Part 7's counts for
// Requesters A, B and C stay 14 / 3 / 0. The switch, empty and no-results
// steps read A, B and C without changing them.
//
// The E2E-01 -> E2E-04 steps share one Ticket and run in order (serial);
// the rest are independent. Requires the manual start sequence in tests.md
// section 5.

const STORAGE_KEY = "toktickit.requesterId";
const ARTIFACTS = path.resolve(__dirname, "../../artifacts/lab-02/screenshots");
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

type Requester = { id: number; name: string };

async function activeRequesters(request: APIRequestContext): Promise<Requester[]> {
  const res = await request.get(`${API_URL}/api/requesters`);
  expect(res.ok()).toBeTruthy();
  const all: Requester[] = await res.json();
  expect(all.length, "graded seed: at least four active Requesters").toBeGreaterThanOrEqual(4);
  return all;
}

async function preselect(page: Page, id: number) {
  await page.addInitScript(([key, value]) => window.localStorage.setItem(key, String(value)), [STORAGE_KEY, id] as const);
}

async function openNav(page: Page) {
  if (test.info().project.name === "mobile") await page.getByRole("button", { name: "Toggle navigation" }).click();
}

async function expectNoHorizontalScroll(page: Page) {
  const [scrollWidth, innerWidth] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  expect(scrollWidth, `scrollWidth ${scrollWidth} > innerWidth ${innerWidth} on ${page.url()}`).toBeLessThanOrEqual(innerWidth);
}

// ---------------------------------------------------------------------------
// E2E-01, E2E-03, E2E-04, E2E-05: one Ticket carried through the flow.
// ---------------------------------------------------------------------------
test.describe("The Requester flow", () => {
  test.describe.configure({ mode: "serial" });

  let owner: Requester;
  let other: Requester;
  let ticketNumber: string;
  let ticketId: number;

  test.beforeAll(async ({ request }) => {
    const all = await activeRequesters(request);
    owner = all[all.length - 1];
    other = all[1];
  });

  test("E2E-01 selects a Requester, creates a Ticket with an attachment, finds it in My Tickets and opens its detail (AC-01, AC-08, AC-09)", async ({ page }) => {
    await page.goto("/");

    // Selection: not a login screen (AC-08)
    await expect(page.getByText("This is not a login screen")).toBeVisible();
    await page.getByLabel("Development Requester").selectOption(String(owner.id));
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("banner")).toContainText(owner.name);

    // Reload keeps the selection (AC-09)
    await page.reload();
    await expect(page.getByRole("banner")).toContainText(owner.name);

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
  });

  test("E2E-03 adds, downloads and soft-removes an attachment; metadata and reason remain (AC-32, AC-30, AC-34)", async ({ page }) => {
    await preselect(page, owner.id);
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

  test("E2E-04 the removed attachment offers no download, and a direct request returns 410 (AC-36)", async ({ page, request }) => {
    await preselect(page, owner.id);
    await page.goto(`/tickets/${ticketId}`);
    const removedRow = page.getByRole("list", { name: "Removed attachments" }).getByRole("listitem");
    await expect(removedRow).toContainText("receipt.png");
    await expect(removedRow.getByRole("button", { name: /Download/ })).toHaveCount(0);
    await expect(removedRow.getByRole("button", { name: /Preview/ })).toHaveCount(0);

    const list = await (await request.get(`${API_URL}/api/tickets/${ticketId}/attachments?requesterId=${owner.id}`)).json();
    const removed = list.find((a: { originalFilename: string }) => a.originalFilename === "receipt.png");
    expect(removed.isRemoved).toBe(true);
    for (const disposition of ["attachment", "inline"]) {
      const res = await request.get(`${API_URL}/api/attachments/${removed.id}/download?requesterId=${owner.id}&disposition=${disposition}`);
      expect(res.status(), disposition).toBe(410);
      expect((await res.json()).error.code).toBe("ATTACHMENT_REMOVED");
    }
  });

  test("E2E-05 another Requester is refused: direct navigation to the Ticket and a direct attachment request both give 403 (AC-03, AC-39)", async ({ page, request }) => {
    const list = await (await request.get(`${API_URL}/api/tickets/${ticketId}/attachments?requesterId=${owner.id}`)).json();
    const activeFile = list.find((a: { isRemoved: boolean }) => !a.isRemoved);
    const removedFile = list.find((a: { isRemoved: boolean }) => a.isRemoved);

    const ticket = await request.get(`${API_URL}/api/tickets/${ticketId}?requesterId=${other.id}`);
    expect(ticket.status()).toBe(403);
    expect((await ticket.json()).error.code).toBe("TICKET_FORBIDDEN");
    for (const file of [activeFile, removedFile]) {
      const res = await request.get(`${API_URL}/api/attachments/${file.id}/download?requesterId=${other.id}`);
      expect(res.status(), file.originalFilename).toBe(403); // never 410 to a non-owner (C-20)
      expect((await res.json()).error.code).toBe("ATTACHMENT_FORBIDDEN");
    }

    await preselect(page, other.id);
    await page.goto(`/tickets/${ticketId}`);
    await expect(page.getByRole("alert")).toContainText("You do not have access to that item.");
    await expect(page.getByText(ticketNumber)).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------
// E2E-02 and E2E-06 against the demo seed, read-only.
// ---------------------------------------------------------------------------
test("E2E-02 switching from Requester A to B makes A's Tickets disappear and lists B's (AC-11, AC-03)", async ({ page, request }) => {
  const [a, b] = await activeRequesters(request);
  const aList = await (await request.get(`${API_URL}/api/tickets?requesterId=${a.id}`)).json();
  const bList = await (await request.get(`${API_URL}/api/tickets?requesterId=${b.id}`)).json();
  expect(aList.meta.total).toBeGreaterThan(0);

  await preselect(page, a.id);
  await page.goto("/tickets");
  await expect(page.getByText(aList.data[0].ticketNumber)).toBeVisible();

  await openNav(page);
  await page.getByRole("button", { name: "Change Requester" }).click();
  await page.getByLabel("Development Requester").selectOption(String(b.id));
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("banner")).toContainText(b.name);
  await expect(page.getByRole("link", { name: /^Open TKT-/ })).toHaveCount(bList.data.length);
  for (const row of aList.data) await expect(page.getByText(row.ticketNumber)).toHaveCount(0);
});

test("E2E-06 a Requester with no Tickets sees `No tickets yet`; a filter that excludes everything shows `No matches` (AC-49, AC-50)", async ({ page, request }) => {
  const [a, , c] = await activeRequesters(request);
  await preselect(page, c.id);
  await page.goto("/tickets");
  await expect(page.getByRole("heading", { name: "No tickets yet" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Ticket list" }).getByRole("link", { name: "Create Ticket" })).toBeVisible();

  await page.evaluate(([key, value]) => window.localStorage.setItem(key, String(value)), [STORAGE_KEY, a.id] as const);
  await page.goto("/tickets?search=zzzz-no-such-ticket");
  await expect(page.getByRole("heading", { name: "No matches" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Ticket list" }).getByRole("button", { name: "Clear filters" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "No tickets yet" })).toHaveCount(0);
});

// ---------------------------------------------------------------------------
// RESP-01..RESP-06 - responsive behaviour and the built theme.
// ---------------------------------------------------------------------------
test.describe("Responsive", () => {
  test("RESP-01 no horizontal page scroll on any of the four screens (AC-55)", async ({ page, request }) => {
    const all = await activeRequesters(request);
    const owner = all[all.length - 1];
    const list = await (await request.get(`${API_URL}/api/tickets?requesterId=${all[0].id}`)).json();

    await page.goto("/");
    await expect(page.getByLabel("Development Requester")).toBeVisible();
    await expectNoHorizontalScroll(page);

    await preselect(page, all[0].id);
    await page.goto("/tickets");
    await expect(page.getByRole("link", { name: /^Open TKT-/ }).first()).toBeVisible();
    await expectNoHorizontalScroll(page);

    await page.goto("/tickets/new");
    await expect(page.getByLabel("Category", { exact: false })).toBeEnabled();
    await expectNoHorizontalScroll(page);

    await page.goto(`/tickets/${list.data[0].id}`);
    await expect(page.getByRole("heading", { level: 1, name: /^TKT-/ })).toBeVisible();
    await expectNoHorizontalScroll(page);
    void owner;
  });

  test("RESP-02 / RESP-03 My Tickets is cards at 390 px and a six-column table at 1280 px", async ({ page, request }) => {
    const [a] = await activeRequesters(request);
    await preselect(page, a.id);
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
        expect(visible).toEqual(["Ticket Number", "Ticket Summary", "Category", "Requested Priority", "Current Status", "Last Updated"]);
      } else {
        expect(visible).toEqual(["Ticket Number", "Ticket Summary", "Current Status", "Last Updated"]); // ui-spec 12.3 at md
      }
    }
  });

  test("RESP-04 at 390 px the toggler opens a panel with both nav items and Change Requester (ui-spec 9)", async ({ page, request }) => {
    const [a] = await activeRequesters(request);
    await preselect(page, a.id);
    await page.goto("/tickets");
    const toggler = page.getByRole("button", { name: "Toggle navigation" });
    const banner = page.getByRole("banner");
    if (test.info().project.name !== "mobile") {
      // md and above: one header bar, no toggler, everything inline (ui-spec 9)
      await expect(toggler).toBeHidden();
      await expect(banner.getByRole("link", { name: "My Tickets" })).toBeVisible();
      await expect(banner.getByRole("link", { name: "Create Ticket" })).toBeVisible();
      await expect(banner.getByRole("button", { name: "Change Requester" })).toBeVisible();
      return;
    }
    await expect(toggler).toBeVisible();
    await expect(toggler).toHaveAttribute("aria-expanded", "false");
    await toggler.click();
    await expect(toggler).toHaveAttribute("aria-expanded", "true");
    await expect(banner.getByRole("link", { name: "My Tickets" })).toBeVisible();
    await expect(banner.getByRole("link", { name: "Create Ticket" })).toBeVisible();
    await expect(banner.getByRole("button", { name: "Change Requester" })).toBeVisible();
    for (const target of [banner.getByRole("link", { name: "My Tickets" }), banner.getByRole("button", { name: "Change Requester" })]) {
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
    expect(missing, "written by the three *-screenshots.spec.ts files in this directory").toEqual([]);
  });

  test("RESP-06 tabbing each screen reaches every control, each named and with a visible focus ring (AC-56)", async ({ page, request }) => {
    const all = await activeRequesters(request);
    const list = await (await request.get(`${API_URL}/api/tickets?requesterId=${all[0].id}`)).json();
    const vp = test.info().project.name;

    async function traverse(label: string, expectAtLeast: number) {
      const seen: string[] = [];
      for (let i = 0; i < 80; i++) {
        await page.keyboard.press("Tab");
        const info = await page.evaluate(() => {
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

    await page.goto("/");
    await expect(page.getByLabel("Development Requester")).toBeEnabled();
    // Continue is disabled until a value is chosen (BR-16), so choose one first
    await page.getByLabel("Development Requester").selectOption(String(all[0].id));
    await page.locator("body").click({ position: { x: 1, y: 1 } });
    await traverse("Selection", 2);

    await preselect(page, all[0].id);
    await page.goto("/tickets");
    await expect(page.getByRole("link", { name: /^Open TKT-/ }).first()).toBeVisible();
    await traverse("My Tickets", 8);

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
    await traverse("Create Ticket", 8);

    await page.goto(`/tickets/${list.data[0].id}`);
    await expect(page.getByRole("heading", { level: 1, name: /^TKT-/ })).toBeVisible();
    await traverse("Ticket Detail", 4);
  });

  test("the Zen Green tokens are what the built CSS paints (ui-spec 2, VIS-01 rows 1-6)", async ({ page, request }) => {
    const [a] = await activeRequesters(request);
    await preselect(page, a.id);
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
