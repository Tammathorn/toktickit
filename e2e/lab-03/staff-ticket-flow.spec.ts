import { test, expect, type Page, type APIRequestContext } from "@playwright/test";
import path from "node:path";
import { getPrisma } from "../../server/src/prisma";
import {
  ADMINISTRATOR,
  E2E_REQUESTER,
  IT_STAFF,
  REQUESTER,
  STATE,
  apiAs,
  settle,
} from "../support/auth";

// IT Staff Ticket Detail - tests.md section 2.12, E2E-07..E2E-18, and the
// RESP-01..06, RESP-09, RESP-10 rows this file owns (Issue #42/#6). Also the
// ui-spec.md section 23 "staff-ticket-detail" captures for LS 14 Part 7
// (P7-01..13, this Issue; P7-11/14/15 already captured elsewhere).
//
// Every Ticket here is created through the API as the dedicated E2E
// Requester (the demo seed never touches it, #40), so Part 7's Requester
// counts never drift. Screenshots are captured at desktop only - the
// three-viewport regeneration for Part 9 is Issue #44's job (CLAUDE.md).
// Requires the manual start sequence in tests.md section 6.

const SHOTS = path.resolve(__dirname, "../../artifacts/lab-03/screenshots/staff-ticket-detail");
const SHOTS_QUEUE = path.resolve(__dirname, "../../artifacts/lab-03/screenshots/staff-queue");

async function capture(page: Page, dir: string, name: string, desktopOnly = true) {
  if (desktopOnly && test.info().project.name !== "desktop") return;
  await settle(page);
  await page.screenshot({ path: path.join(dir, `${name.replace("<vp>", test.info().project.name)}.png`), fullPage: true });
}

async function createTicket(api: APIRequestContext, summary: string, overrides: Record<string, unknown> = {}) {
  const categories = await (await api.get("/api/categories")).json();
  const systems = await (await api.get("/api/related-systems")).json();
  const res = await api.post("/api/tickets", {
    data: {
      categoryId: categories[0].id,
      relatedSystemId: systems[0].id,
      summary,
      description: `Created by staff-ticket-flow.spec.ts (${test.info().project.name}) for Part 7 evidence.`,
      requestedPriority: "MEDIUM",
      ...overrides,
    },
  });
  expect(res.status(), summary).toBe(201);
  return res.json();
}

// The queue shows a <table> at desktop/tablet and cards (no table) at mobile
// (RESP-02/03) - a results check used by captures that must work at all
// three viewports has to branch on that, not assume a table.
async function queueResultsVisible(page: Page) {
  if (test.info().project.name === "mobile") {
    await expect(page.locator("table")).toHaveCount(0);
    await expect(page.getByRole("region", { name: "Ticket queue", exact: true })).toBeVisible();
  } else {
    await expect(page.locator("table")).toBeVisible();
  }
}

async function gotoStaffDetail(page: Page, id: number) {
  await page.goto(`/queue/${id}`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}

test.describe("IT Staff Ticket Detail flow", () => {
  test.use({ storageState: STATE.itStaff });

  test("E2E-09 claim then work: an unassigned Ticket refuses In Progress, is claimed, then accepts it (AC-70, AC-109)", async ({ page, request }) => {
    test.skip(test.info().project.name !== "desktop", "functional flow + desktop evidence only");
    const requester = await apiAs(E2E_REQUESTER);
    const ticket = await createTicket(requester, "E2E: claim then work");
    await requester.dispose();

    await gotoStaffDetail(page, ticket.id);
    await capture(page, SHOTS, "detail-<vp>-unassigned");

    // A move to In Progress while unassigned is refused inline (C-93).
    await page.getByLabel("Current Status", { exact: true }).selectOption("IN_PROGRESS");
    await page.getByRole("group", { name: "Current Status controls" }).getByRole("button", { name: "Save Changes" }).click();
    await expect(page.getByText("This ticket needs a Ticket Owner first. Claim it or assign it, then try again.")).toBeVisible();
    await capture(page, SHOTS, "detail-<vp>-status-refused");

    await page.getByRole("button", { name: "Claim" }).click();
    await expect(page.getByRole("button", { name: "Unassign" })).toBeVisible();
    await expect(page.getByRole("group", { name: "Ticket Owner" }).getByText("Araya Methee").first()).toBeVisible();
    await capture(page, SHOTS, "detail-<vp>-owned");

    await page.getByLabel("Current Status", { exact: true }).selectOption("IN_PROGRESS");
    await page.getByRole("group", { name: "Current Status controls" }).getByRole("button", { name: "Save Changes" }).click();
    await expect(page.getByText("In Progress").first()).toBeVisible();

    const direct = await request.get(`/api/staff/tickets/${ticket.id}`);
    expect((await direct.json()).currentStatus).toBe("IN_PROGRESS");
  });

  // The claim race itself has no dedicated E2E row (it is API-52 at the API
  // level and UI-27 at the component level); it is exercised here only to
  // produce the P7-02 evidence capture before E2E-10's own reassign.
  test("E2E-10 the lost claim race, then Reassign to another eligible user (FR-44, AC-71, AC-72, FR-45)", async ({ page }) => {
    test.skip(test.info().project.name !== "desktop", "functional flow + desktop evidence only");
    const requester = await apiAs(E2E_REQUESTER);
    const ticket = await createTicket(requester, "E2E: claim race and reassign");
    await requester.dispose();

    // The page loads the Ticket while it is still unassigned, so Claim
    // renders (16.2); the Administrator then wins the race underneath it.
    await gotoStaffDetail(page, ticket.id);
    await expect(page.getByRole("button", { name: "Claim" })).toBeVisible();

    const admin = await apiAs(ADMINISTRATOR);
    const claimed = await admin.post(`/api/staff/tickets/${ticket.id}/claim`);
    expect(claimed.status()).toBe(200);

    await page.getByRole("button", { name: "Claim" }).click();
    await expect(page.getByText("Panida Srisawat claimed this ticket first. The ticket has been refreshed.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Claim" })).toHaveCount(0);
    await capture(page, SHOTS, "detail-<vp>-claim-conflict");

    // Reassign to another eligible user - allowed even though the caller
    // never owned it (C-93, BR-96).
    await page.getByLabel("Reassign to…").selectOption({ label: "Araya Methee" });
    await page.getByRole("group", { name: "Ticket Owner" }).getByRole("button", { name: "Save Changes" }).click();
    await expect(page.getByText("Araya Methee").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Unassign" })).toBeVisible();
    await capture(page, SHOTS, "detail-<vp>-reassigned");

    await admin.dispose();
  });

  test("E2E-11 IT Priority and a confirmed status change to Resolved, then Closed (AC-76, AC-77, AC-80)", async ({ page }) => {
    test.skip(test.info().project.name !== "desktop", "functional flow + desktop evidence only");
    const requester = await apiAs(E2E_REQUESTER);
    const ticket = await createTicket(requester, "E2E: priority and status");
    await requester.dispose();

    await gotoStaffDetail(page, ticket.id);
    await page.getByRole("button", { name: "Claim" }).click();
    await expect(page.getByRole("button", { name: "Unassign" })).toBeVisible();

    await page.getByLabel("IT Priority", { exact: true }).selectOption("HIGH");
    await page.getByRole("group", { name: "IT Priority controls" }).getByRole("button", { name: "Save Changes" }).click();
    await expect(page.getByText("IT High").first()).toBeVisible();
    await capture(page, SHOTS, "detail-<vp>-it-priority");

    const statusGroup = page.getByRole("group", { name: "Current Status controls" });
    await capture(page, SHOTS, "detail-<vp>-status-menu");
    // NEW cannot reach RESOLVED directly (specification 5.1) - OPEN first,
    // a plain move needing no confirmation.
    await page.getByLabel("Current Status", { exact: true }).selectOption("OPEN");
    await statusGroup.getByRole("button", { name: "Save Changes" }).click();
    await expect(page.getByText("Open").first()).toBeVisible();

    await page.getByLabel("Current Status", { exact: true }).selectOption("RESOLVED");
    await statusGroup.getByRole("button", { name: "Save Changes" }).click();
    const dialog = page.getByRole("dialog", { name: "Resolve this ticket" });
    await expect(dialog).toBeVisible();
    await capture(page, SHOTS, "detail-<vp>-status-confirm");
    await dialog.getByRole("button", { name: "Resolve" }).click();
    await expect(page.getByText("Resolved").first()).toBeVisible();

    // Resolved -> Closed, then the card goes read-only (BR-58, C-98, C-109).
    await page.getByLabel("Current Status", { exact: true }).selectOption("CLOSED");
    await page.getByRole("group", { name: "Current Status controls" }).getByRole("button", { name: "Save Changes" }).click();
    await page.getByRole("dialog", { name: "Close this ticket" }).getByRole("button", { name: "Close" }).click();
    await expect(page.getByLabel("Current Status", { exact: true })).toHaveCount(0);
    await expect(page.getByText("This ticket is closed - create a new ticket if the problem returns.").first()).toBeVisible();
    await capture(page, SHOTS, "detail-<vp>-terminal");
  });

  test("E2E-12 a refused status change: a Closed Ticket offers no status control, and a direct API attempt returns 409 (AC-81)", async ({ page, request }) => {
    test.skip(test.info().project.name !== "desktop", "desktop evidence only");
    const requester = await apiAs(E2E_REQUESTER);
    const ticket = await createTicket(requester, "E2E: refused on a closed ticket");
    const admin = await apiAs(ADMINISTRATOR);
    await admin.post(`/api/staff/tickets/${ticket.id}/claim`);
    await admin.patch(`/api/staff/tickets/${ticket.id}/status`, { data: { currentStatus: "OPEN" } });
    await admin.patch(`/api/staff/tickets/${ticket.id}/status`, { data: { currentStatus: "RESOLVED" } });
    const closed = await admin.patch(`/api/staff/tickets/${ticket.id}/status`, { data: { currentStatus: "CLOSED" } });
    expect(closed.status()).toBe(200);
    await requester.dispose();

    await gotoStaffDetail(page, ticket.id);
    await expect(page.getByLabel("Current Status", { exact: true })).toHaveCount(0);

    const attempt = await request.patch(`/api/staff/tickets/${ticket.id}/status`, { data: { currentStatus: "REOPENED" } });
    expect(attempt.status()).toBe(409);
    expect((await attempt.json()).error.code).toBe("INVALID_STATUS_TRANSITION");
    await admin.dispose();
  });

  test("E2E-13 a Public Comment and an Internal Note render in one frame, visibly distinct (AC-53, AC-107)", async ({ page }) => {
    test.skip(test.info().project.name !== "desktop", "desktop evidence only");
    const requester = await apiAs(E2E_REQUESTER);
    const ticket = await createTicket(requester, "E2E: comment and note in one frame");
    await requester.dispose();

    await gotoStaffDetail(page, ticket.id);
    await page.getByLabel("Add a comment").fill("A Public Comment from IT Staff, visible to the Requester.");
    await page.getByRole("button", { name: "Post Comment" }).click();
    await expect(page.getByText("A Public Comment from IT Staff, visible to the Requester.")).toBeVisible();

    await page.getByLabel("Add an internal note").fill("An Internal Note - never visible to the Requester.");
    await page.getByRole("button", { name: "Add Note" }).click();
    await expect(page.getByText("An Internal Note - never visible to the Requester.")).toBeVisible();
    await capture(page, SHOTS, "detail-<vp>-comments-and-notes");

    // RESP-10: the greyscale distinction survives - computed from the actual
    // rendered colours and border, not from screenshot pixels (no image
    // library is an approved dependency for this Issue).
    const [commentsLum, notesLum, notesBorder] = await page.evaluate(() => {
      function luminance(hex: string): number {
        const m = getComputedStyle(document.body).getPropertyValue(hex).trim();
        const n = m.startsWith("#") ? m.slice(1) : m;
        const r = parseInt(n.slice(0, 2), 16), g = parseInt(n.slice(2, 4), 16), b = parseInt(n.slice(4, 6), 16);
        return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      }
      return [luminance("--tk-surface"), luminance("--tk-internal-bg"), getComputedStyle(document.body).getPropertyValue("--tk-internal-border").trim()];
    });
    expect(Math.abs(commentsLum - notesLum)).toBeGreaterThan(0.01);
    expect(notesBorder).not.toBe("");
  });

  test("E2E-18 role restriction in the browser: a Requester sees Forbidden at the Queue and User Management URLs, and the direct API refuses 403 (AC-36, AC-97)", async ({ browser }) => {
    // RESP-09: queue-<vp>-forbidden.png needs all three viewports.
    const context = await browser.newContext({ storageState: STATE.requester });
    const page = await context.newPage();
    for (const url of ["/queue", "/users"]) {
      await page.goto(url);
      await expect(page.getByRole("heading", { name: "You do not have access to that page." })).toBeVisible();
      if (url === "/queue") await capture(page, SHOTS_QUEUE, "queue-<vp>-forbidden", false);
    }
    const direct = await page.request.get("/api/staff/tickets");
    expect(direct.status()).toBe(403);
    expect((await direct.json()).error.code).toBe("FORBIDDEN_ROLE");
    await context.close();
  });

  test("the inactive-owner marker, and a safe failure with Retry (AC-75, BR-89)", async ({ page }) => {
    test.skip(test.info().project.name !== "desktop", "desktop evidence only");
    const requester = await apiAs(E2E_REQUESTER);
    const ticket = await createTicket(requester, "E2E: inactive owner marker");
    await requester.dispose();

    // Somkid Rattana is the seed's one inactive IT Staff user (graded-seed.ts).
    // The assign API refuses an inactive assignee (422 ASSIGNEE_NOT_ELIGIBLE),
    // and there is no deactivation screen yet (#43), so the fixture is written
    // directly - the same pattern e2e/support/auth.ts already uses for the
    // first-login account.
    const prisma = getPrisma();
    const somkid = await prisma.user.findUniqueOrThrow({ where: { email: "somkid.r@example.ac.th" } });
    await prisma.ticket.update({ where: { id: ticket.id }, data: { ownerId: somkid.id } });

    await gotoStaffDetail(page, ticket.id);
    await expect(page.getByText("(inactive)")).toBeVisible();
    await capture(page, SHOTS, "detail-<vp>-inactive-owner");

    // Safe failure: the detail request itself fails.
    await page.route(`**/api/staff/tickets/${ticket.id}`, (route) => route.abort("connectionrefused"));
    await page.goto(`/queue/${ticket.id}`);
    await expect(page.getByText("Something went wrong on our side. Your work has not been lost - please try again.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
    await capture(page, SHOTS, "detail-<vp>-failure");
  });

  test("E2E-17 an attachment uploaded by the Requester is still listed and downloadable on the authenticated identity, and staff can download it with no upload or Remove control (FR-25, BR-91, C-103)", async ({ page, browser }) => {
    test.skip(test.info().project.name !== "desktop", "desktop evidence only");
    const requester = await apiAs(E2E_REQUESTER);
    const ticket = await createTicket(requester, "E2E: attachment continuity");
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
    const up = await requester.post(`/api/tickets/${ticket.id}/attachments`, { multipart: { file: { name: "evidence.png", mimeType: "image/png", buffer: png } } });
    expect(up.status()).toBe(201);
    await requester.dispose();

    // Requester side first: the migration from the Lab 2 Requester selector to
    // the authenticated identity (specification.md section 3) must not have
    // broken the Requester's own continuity with an attachment they already
    // uploaded - still listed, still downloadable, on STATE.requester (signed
    // in as this same E2E_REQUESTER, per e2e/auth.setup.ts).
    const reqContext = await browser.newContext({ storageState: STATE.requester });
    const reqPage = await reqContext.newPage();
    await reqPage.goto(`/tickets/${ticket.id}`);
    const reqCard = reqPage.getByRole("region", { name: "Attachments" });
    await expect(reqCard.getByText("1 of 5 active")).toBeVisible();
    const [reqDownload] = await Promise.all([
      reqPage.waitForEvent("download"),
      reqCard.getByRole("button", { name: "Download evidence.png" }).click(),
    ]);
    expect(reqDownload.suggestedFilename()).toBe("evidence.png");
    await reqContext.close();

    await gotoStaffDetail(page, ticket.id);
    const card = page.getByRole("region", { name: "Attachments" });
    await expect(card.getByText("1 of 5 active")).toBeVisible();
    await expect(card.getByLabel("Add attachment")).toHaveCount(0);
    await expect(card.getByRole("button", { name: /remove/i })).toHaveCount(0);
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      card.getByRole("button", { name: "Download evidence.png" }).click(),
    ]);
    expect(download.suggestedFilename()).toBe("evidence.png");
    await capture(page, SHOTS, "detail-<vp>-attachments");
  });

  test("the composer's own validation feedback: the counter turns danger past 2000 and Post Comment stays disabled (FR-53)", async ({ page }) => {
    test.skip(test.info().project.name !== "desktop", "desktop evidence only");
    const requester = await apiAs(E2E_REQUESTER);
    const ticket = await createTicket(requester, "E2E: composer validation feedback");
    await requester.dispose();

    await gotoStaffDetail(page, ticket.id);
    await page.getByLabel("Add a comment").fill("a".repeat(2001));
    await expect(page.getByText("2001 / 2000")).toHaveCSS("color", "rgb(164, 38, 44)"); // --tk-danger
    await expect(page.getByRole("button", { name: "Post Comment" })).toBeDisabled();
    await capture(page, SHOTS, "detail-<vp>-empty-comment");
  });

  test("RESP-01 no horizontal page scroll on IT Staff Ticket Detail (AC-106, FR-68)", async ({ page }) => {
    const requester = await apiAs(E2E_REQUESTER);
    const ticket = await createTicket(requester, "E2E: no horizontal scroll");
    await requester.dispose();
    await gotoStaffDetail(page, ticket.id);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
    expect(overflow, test.info().project.name).toBe(true);
  });

  test("RESP-06 every control on IT Staff Ticket Detail is at least 44 px tall at 390 px (FR-68)", async ({ page }) => {
    test.skip(test.info().project.name !== "mobile", "mobile only");
    const requester = await apiAs(E2E_REQUESTER);
    const ticket = await createTicket(requester, "E2E: touch targets");
    await requester.dispose();
    await gotoStaffDetail(page, ticket.id);
    const controls = page.locator("main button:visible, main select:visible, main a[href]:visible");
    const count = await controls.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const box = await controls.nth(i).boundingBox();
      if (box) expect(box.height, await controls.nth(i).textContent() ?? "").toBeGreaterThanOrEqual(44);
    }
  });

  test("E2E-07 the queue journey: search, each filter, sort, page size, and opening a Ticket (LS 14 Part 6)", async ({ page }) => {
    // RESP-09: staff-queue/ needs all three viewports, so this journey (and
    // its captures) run on every project - not desktop only.
    // A per-run token, not a fixed string: re-running this spec against the
    // same database (as Issue #44's evidence-DB captures do, repeatedly,
    // before the final pass) must not let an earlier run's identically-named
    // fixture push this run's own Ticket off the first results page.
    const token = `e2e07-${test.info().project.name}-${Date.now()}`;
    const requester = await apiAs(E2E_REQUESTER);
    const ticket = await createTicket(requester, `E2E-07 queue journey fixture ${token}`);
    // Eleven more Open tickets so a page 2 exists deterministically - the
    // default view hides Closed/Cancelled, and relying on other specs having
    // already run enough fixtures through would make page-2 order-dependent.
    for (let i = 0; i < 11; i++) {
      await createTicket(requester, `E2E-07 pagination filler ${i} ${token}`);
    }
    await requester.dispose();

    await page.goto("/queue");
    await expect(page.getByRole("heading", { level: 1, name: "Ticket Queue" })).toBeVisible();
    await queueResultsVisible(page);
    await capture(page, SHOTS_QUEUE, "queue-<vp>-populated", false);

    await page.getByLabel("Search", { exact: true }).fill(token);
    await expect(page.getByText(ticket.ticketNumber)).toBeVisible();
    await capture(page, SHOTS_QUEUE, "queue-<vp>-search", false);

    await page.getByLabel("Search", { exact: true }).fill("");
    await page.getByLabel("Current Status", { exact: true }).selectOption("NEW");
    await queueResultsVisible(page);
    await page.getByLabel("IT Priority", { exact: true }).selectOption("MEDIUM");
    await page.getByLabel("Category").selectOption({ index: 1 });
    await capture(page, SHOTS_QUEUE, "queue-<vp>-filters", false);

    await page.getByLabel("Sort").selectOption("createdAt:desc");
    await expect(page).toHaveURL(/sort=createdAt%3Adesc/);
    await capture(page, SHOTS_QUEUE, "queue-<vp>-sorted", false);

    await page.getByLabel("Ticket Owner", { exact: true }).selectOption("unassigned");
    await capture(page, SHOTS_QUEUE, "queue-<vp>-unassigned", false);

    await page.getByRole("button", { name: "Clear filters" }).click();
    await page.getByLabel("Per page").selectOption("10");
    await expect(page.getByText(/Page 1 of/)).toBeVisible();
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByText(/Page 2 of/)).toBeVisible();
    await capture(page, SHOTS_QUEUE, "queue-<vp>-page-2", false);

    await page.getByRole("button", { name: "Previous" }).click();
    await page.getByLabel("Search", { exact: true }).fill(ticket.ticketNumber);
    await page.getByRole("link", { name: `Open ${ticket.ticketNumber}` }).click();
    await expect(page).toHaveURL(new RegExp(`/queue/${ticket.id}$`));
    await expect(page.getByRole("heading", { level: 1, name: ticket.ticketNumber })).toBeVisible();
  });

  test("E2E-08 empty and no-results in the browser (AC-69, FR-41)", async ({ page }) => {
    await page.goto("/queue?search=zzz-no-ticket-matches-this-zzz");
    await expect(page.getByRole("heading", { name: "No matches" })).toBeVisible();
    await expect(page.getByText("No tickets match your search or filters.")).toBeVisible();
    await capture(page, SHOTS_QUEUE, "queue-<vp>-no-results", false);
    // The genuinely-empty queue (no filter, zero rows) is not reproduced here:
    // the shared dev database always carries seed Tickets, and emptying it
    // would corrupt other Issues' fixtures. UI-20 (StaffTicketQueue.test.tsx,
    // #41) already covers that state's component contract directly.
  });

  test("queue-<vp>-loading and queue-<vp>-failure: the busy state and a safe failure on the Queue (FR-68, BR-89)", async ({ page }) => {
    let release!: () => void;
    const held = new Promise<void>((resolve) => (release = resolve));
    await page.route("**/api/staff/tickets*", async (route) => {
      await held;
      await route.continue();
    });
    await page.goto("/queue");
    await expect(page.getByRole("region", { name: "Ticket queue", exact: true })).toHaveAttribute("aria-busy", "true");
    await capture(page, SHOTS_QUEUE, "queue-<vp>-loading", false);
    release();
    await expect(page.getByRole("region", { name: "Ticket queue", exact: true })).not.toHaveAttribute("aria-busy", "true");

    await page.unroute("**/api/staff/tickets*");
    await page.route("**/api/staff/tickets*", (route) => route.abort("connectionrefused"));
    await page.goto("/queue");
    await expect(page.getByText("Something went wrong on our side. Your work has not been lost - please try again.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
    await capture(page, SHOTS_QUEUE, "queue-<vp>-failure", false);
  });
});

test.describe("IT Staff Ticket Queue - responsive (ui-spec 15.2-15.4)", () => {
  test.use({ storageState: STATE.itStaff });

  test("RESP-02/RESP-03 the Queue renders a table with all nine columns at desktop, and cards (no table) on mobile", async ({ page }) => {
    await page.goto("/queue");
    await expect(page.getByRole("heading", { level: 1, name: "Ticket Queue" })).toBeVisible();
    if (test.info().project.name === "mobile") {
      await expect(page.locator("table")).toHaveCount(0);
    } else if (test.info().project.name === "desktop") {
      await expect(page.locator("table")).toBeVisible();
      const headers = await page.locator("table thead th").allTextContents();
      expect(headers).toHaveLength(9);
    }
  });

  test("RESP-04 the Queue's tablet table renders exactly six named columns, the other three absent from the DOM (C-108)", async ({ page }) => {
    test.skip(test.info().project.name !== "tablet", "tablet only");
    await page.goto("/queue");
    await expect(page.getByRole("heading", { level: 1, name: "Ticket Queue" })).toBeVisible();
    await expect(page.locator("table")).toBeVisible();
    const headers = await page.locator("table thead th").allTextContents();
    expect(headers).toEqual(["Ticket Number", "Ticket Summary", "IT Priority", "Current Status", "Ticket Owner", "Last Updated"]);
    for (const absent of ["Created", "Category", "Requested Priority"]) {
      expect(headers).not.toContain(absent);
    }
  });
});

// ---------------------------------------------------------------------------
// What the Requester's own screen must never leak, and the resolution round
// trip - both sides of one conversation, so each uses its own signed-in
// browser context (STATE.requester is the E2E_REQUESTER persona, #40).
// ---------------------------------------------------------------------------
test.describe("Requester visibility, the resolution round trip, and a closed Ticket", () => {
  test("E2E-14/E2E-16 an Internal Note and the owner's email never reach the Requester (AC-54, AC-04, AC-115, BR-100)", async ({ browser }) => {
    const requesterApi = await apiAs(E2E_REQUESTER);
    const created = await createTicket(requesterApi, "E2E-14/16: nothing leaks to the Requester");
    await requesterApi.dispose();

    const admin = await apiAs(ADMINISTRATOR);
    await admin.post(`/api/staff/tickets/${created.id}/claim`);
    const SECRET_NOTE = "SECRET-INTERNAL-ONLY-" + created.id;
    const noteRes = await admin.post(`/api/tickets/${created.id}/internal-notes`, { data: { body: SECRET_NOTE } });
    expect(noteRes.status()).toBe(201);
    await admin.dispose();

    const context = await browser.newContext({ storageState: STATE.requester });
    const page = await context.newPage();
    const bodies: string[] = [];
    page.on("response", async (res) => {
      if (res.url().includes("/api/")) {
        try {
          bodies.push(await res.text());
        } catch {
          // a non-text body (e.g. a download) - irrelevant to this check
        }
      }
    });
    await page.goto(`/tickets/${created.id}`);
    await expect(page.getByRole("heading", { level: 1, name: created.ticketNumber })).toBeVisible();

    await expect(page.locator(`text=${SECRET_NOTE}`)).toHaveCount(0);
    expect(bodies.some((b) => b.includes(SECRET_NOTE)), "no network response carries the note text").toBe(false);
    // the owner's name renders (Panida Srisawat claimed it), the email never does
    await expect(page.getByText("Panida Srisawat")).toBeVisible();
    expect(bodies.some((b) => b.includes("panida.s@example.ac.th"))).toBe(false);
    expect((await page.content())).not.toContain("panida.s@example.ac.th");
    await context.close();
  });

  test("E2E-15 the resolution round trip: Requester reports it, status is unchanged, staff see it and resolve, and it clears (AC-55, AC-59)", async ({ browser }) => {
    const requesterApi = await apiAs(E2E_REQUESTER);
    const ticket = await createTicket(requesterApi, "E2E-15: the resolution round trip");
    await requesterApi.dispose();
    const admin = await apiAs(ADMINISTRATOR);
    await admin.post(`/api/staff/tickets/${ticket.id}/claim`);
    // FR-30: the resolution action only renders in Open, In Progress,
    // Waiting for Requester or Reopened - not New, which createTicket leaves it in.
    await admin.patch(`/api/staff/tickets/${ticket.id}/status`, { data: { currentStatus: "OPEN" } });

    const reqContext = await browser.newContext({ storageState: STATE.requester });
    const reqPage = await reqContext.newPage();
    await reqPage.goto(`/tickets/${ticket.id}`);
    await reqPage.getByRole("button", { name: "Problem Appears Resolved" }).click();
    await reqPage.getByRole("dialog").getByRole("button", { name: "Report it" }).click();
    await expect(reqPage.getByText("Requester says resolved")).toBeVisible();
    await expect(reqPage.getByText("Open")).toBeVisible(); // status is untouched
    await reqContext.close();

    const staffContext = await browser.newContext({ storageState: STATE.itStaff });
    const staffPage = await staffContext.newPage();
    await staffPage.goto(`/queue/${ticket.id}`);
    await expect(staffPage.getByText(/The Requester reported on .* that the problem appears resolved\./)).toBeVisible();
    await capture(staffPage, SHOTS, "detail-<vp>-requester-resolved");

    // The Ticket is already Open (set above) - straight to Resolved.
    await staffPage.getByLabel("Current Status", { exact: true }).selectOption("RESOLVED");
    await staffPage.getByRole("group", { name: "Current Status controls" }).getByRole("button", { name: "Save Changes" }).click();
    await staffPage.getByRole("dialog", { name: "Resolve this ticket" }).getByRole("button", { name: "Resolve" }).click();
    await expect(staffPage.getByText(/The Requester reported on/)).toHaveCount(0);
    await staffContext.close();

    await admin.dispose();
  });

  test("E2E-26 a Closed Ticket in the Requester's browser: read-only, and a direct POST still answers 409 (AC-118, BR-108, C-109)", async ({ browser }) => {
    const requesterApi = await apiAs(E2E_REQUESTER);
    const ticket = await createTicket(requesterApi, "E2E-26: a closed ticket stays readable");
    const comment = await requesterApi.post(`/api/tickets/${ticket.id}/public-comments`, { data: { body: "Still here after closing." } });
    expect(comment.status()).toBe(201);

    const admin = await apiAs(ADMINISTRATOR);
    await admin.post(`/api/staff/tickets/${ticket.id}/claim`);
    await admin.patch(`/api/staff/tickets/${ticket.id}/status`, { data: { currentStatus: "OPEN" } });
    await admin.patch(`/api/staff/tickets/${ticket.id}/status`, { data: { currentStatus: "RESOLVED" } });
    await admin.patch(`/api/staff/tickets/${ticket.id}/status`, { data: { currentStatus: "CLOSED" } });

    const browserContext = await browser.newContext({ storageState: STATE.requester });
    const page = await browserContext.newPage();
    await page.goto(`/tickets/${ticket.id}`);
    await expect(page.getByText("Still here after closing.")).toBeVisible();
    await expect(page.getByLabel("Add a comment")).toHaveCount(0);
    await expect(page.getByLabel("Add attachment")).toHaveCount(0);
    await expect(page.getByText("This ticket is closed - create a new ticket if the problem returns.")).toBeVisible();
    await browserContext.close();

    const direct = await requesterApi.post(`/api/tickets/${ticket.id}/public-comments`, { data: { body: "too late" } });
    expect(direct.status()).toBe(409);
    expect((await direct.json()).error.code).toBe("TICKET_CLOSED");

    await requesterApi.dispose();
    await admin.dispose();
  });
});
