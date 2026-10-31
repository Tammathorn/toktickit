import { test, expect } from "../support/console";
import { ADMINISTRATOR, E2E_REQUESTER, IT_STAFF, STATE, apiAs, signIn } from "../support/auth";
import { moveStatus } from "../support/lab4";
import {
  actionRow,
  addAction,
  capture,
  claim,
  gotoRequesterDetail,
  gotoStaffDetail,
  newTicket,
  staffTicket,
  vp,
  type TicketRef,
} from "../support/lab4-shots";
import type { Page } from "@playwright/test";

// The final Ticket workflow end to end - tests.md E2E-11 to E2E-18, plus
// E2E-17's captures (ui-spec 15, artifacts/lab-04/screenshots/ticket-workflow/).
// Issue #70. Tickets are created as the dedicated E2E Requester; the console-
// error fixture (C-149) watches every test and each expected 4xx is declared.
// Requires the manual start sequence in docs/lab-04/tests.md section 5.

const statusControls = (page: Page) => page.getByRole("group", { name: "Current Status controls" });
const statusSelect = (page: Page) => page.locator("#status-select");
const headerBadge = (page: Page) => page.getByRole("region", { name: "Ticket information" }).locator(".tk-badge").first();
const resolvedOption = (page: Page) => page.locator("#status-select option[value='RESOLVED']");

async function chooseStatus(page: Page, value: string) {
  await statusSelect(page).selectOption(value);
  await statusControls(page).getByRole("button", { name: "Save Changes" }).click();
}

// A Ticket owned by Araya, Open, ready for actions: claim then OPEN, through the API.
async function openTicket(summary: string): Promise<TicketRef> {
  const t = await newTicket(summary);
  const staff = await apiAs(IT_STAFF);
  await claim(staff, t.id);
  await moveStatus(staff, t.id, "OPEN");
  await staff.dispose();
  return t;
}

test.describe("Ticket workflow - IT Staff", () => {
  test.use({ storageState: STATE.itStaff });

  test("E2E-12 the gate unmet in the UI: Resolved is disabled with its reasons, and enabled once the planned action is completed (AC-136)", async ({ page }) => {
    const t = await openTicket("E2E-12 gate unmet");
    const staff = await apiAs(IT_STAFF);
    await addAction(staff, t.id, { status: "PLANNED", description: "Test the replacement drive" });
    await staff.dispose();

    await gotoStaffDetail(page, t);
    await expect(resolvedOption(page)).toHaveText("Resolved - not available yet");
    expect(await resolvedOption(page).evaluate((o: HTMLOptionElement) => o.disabled)).toBe(true);
    const callout = page.locator("#gate-callout");
    await expect(callout).toContainText("Resolved is not available yet:");
    await expect(callout).toContainText("Record at least one completed action.");
    await expect(callout).toContainText("Complete or cancel every planned action.");

    const row = actionRow(page, "Test the replacement drive");
    await row.getByRole("button", { name: "Complete", exact: true }).click();
    await page.getByRole("group", { name: "Complete action" }).getByLabel("Result").fill("Drive tested, no errors.");
    await page.getByRole("group", { name: "Complete action" }).getByRole("button", { name: "Complete Action" }).click();
    await expect(page.locator(".tk-panel-success")).toContainText("Action completed.");
    await expect(page.locator("#gate-callout")).toHaveCount(0);
    await expect(resolvedOption(page)).toHaveText("Resolved");
    expect(await resolvedOption(page).evaluate((o: HTMLOptionElement) => o.disabled)).toBe(false);
  });

  test("E2E-13 cancelling a Ticket with a planned action is refused (409): the message and Go to Actions Taken, which scrolls to the card (AC-51)", async ({ page, consoleGuard }) => {
    consoleGuard.expectStatus(409, "/status");
    const t = await openTicket("E2E-13 cancel blocked");
    const staff = await apiAs(IT_STAFF);
    await addAction(staff, t.id, { status: "PLANNED", description: "Wait for the supplier" });
    await staff.dispose();

    await gotoStaffDetail(page, t);
    await chooseStatus(page, "CANCELLED");
    await page.getByRole("dialog").getByRole("button", { name: "Cancel Ticket" }).click();
    const panel = statusControls(page).getByRole("alert");
    await expect(panel).toContainText("This ticket still has planned actions. Complete or cancel them before cancelling the ticket.");
    await panel.getByRole("link", { name: "Go to Actions Taken" }).click();
    await expect(page.locator("#actions-taken")).toBeInViewport();
    expect(new URL(page.url()).hash).toBe("#actions-taken");
  });

  test("E2E-14 a stale status change, two contexts (409): the conflict panel sits on the status control and the chosen status is kept (AC-60)", async ({ page, consoleGuard }) => {
    consoleGuard.expectStatus(409, "/status");
    const t = await openTicket("E2E-14 stale status");
    await gotoStaffDetail(page, t);
    await statusSelect(page).selectOption("IN_PROGRESS");

    // B (the Administrator) changes the IT Priority first, which moves the version.
    const b = await apiAs(ADMINISTRATOR);
    const current = await staffTicket(b, t.id);
    const res = await b.patch(`/api/staff/tickets/${t.id}/it-priority`, { data: { itPriority: "HIGH", version: current.version } });
    expect(res.status(), "B's priority change").toBe(200);
    await b.dispose();

    await statusControls(page).getByRole("button", { name: "Save Changes" }).click();
    const conflict = statusControls(page).getByRole("alert");
    await expect(conflict).toContainText("This changed while you were working");
    await expect(statusSelect(page), "the chosen status is kept").toHaveValue("IN_PROGRESS");
    await conflict.getByRole("button", { name: "Apply my changes again" }).click();
    await expect(page.locator(".tk-panel-success")).toContainText("Status changed to In Progress.");
    await expect(headerBadge(page)).toHaveText(/in progress/i);
  });

  test("E2E-15 reopen, then try to resolve: the reason line shows, and after a new completed action Resolved succeeds (AC-48)", async ({ page }) => {
    const t = await openTicket("E2E-15 reopen then resolve");
    const staff = await apiAs(IT_STAFF);
    await addAction(staff, t.id, { description: "First fix" });
    await moveStatus(staff, t.id, "RESOLVED");
    await staff.dispose();

    await gotoStaffDetail(page, t);
    await chooseStatus(page, "REOPENED");
    await expect(page.locator(".tk-panel-success")).toContainText("Status changed to Reopened.");
    await expect(page.locator("#gate-callout")).toContainText("Record an action completed since the ticket was reopened.");
    expect(await resolvedOption(page).evaluate((o: HTMLOptionElement) => o.disabled)).toBe(true);

    await page.locator("#action-description").fill("Second fix after the reopen");
    await page.locator("#action-result").fill("Fixed for good.");
    await page.getByRole("button", { name: "Add Action" }).click();
    await expect(page.locator(".tk-panel-success")).toContainText("Action added.");
    await expect(page.locator("#gate-callout")).toHaveCount(0);

    await chooseStatus(page, "RESOLVED");
    await page.getByRole("dialog").getByRole("button", { name: "Resolve", exact: true }).click();
    await expect(page.locator(".tk-panel-success")).toContainText("Status changed to Resolved.");
    await expect(headerBadge(page)).toHaveText(/resolved/i);
  });

  test("E2E-16 the history reads oldest first with the creation row first, on both screens (AC-36; FR-14)", async ({ page }) => {
    const t = await openTicket("E2E-16 history order");
    const staff = await apiAs(IT_STAFF);
    await addAction(staff, t.id, { description: "Fixed it" });
    await moveStatus(staff, t.id, "RESOLVED");
    await staff.dispose();

    const check = async () => {
      const rows = page.locator(".tk-history-list li");
      await expect(rows).toHaveCount(3);
      await expect(rows.nth(0)).toContainText("Created as");
      await expect(rows.nth(1)).toContainText("Open");
      await expect(rows.nth(2)).toContainText("Resolved");
    };
    await gotoStaffDetail(page, t);
    await check();
    await page.context().clearCookies();
    await signIn(page, E2E_REQUESTER);
    await gotoRequesterDetail(page, t);
    await check();
  });
});

test.describe("Ticket workflow - two roles", () => {
  test.use({ storageState: STATE.requester });

  test("E2E-11 creation to closure: a Requester creates, IT Staff claims, records a completed action, resolves and closes; the Requester sees Closed, the action and the full history (AC-119, AC-49; C-154)", async ({ page }) => {
    test.slow();
    const summary = `E2E-11 two-role flow (${vp()})`;

    // 1. The Requester creates the Ticket in the UI.
    await page.goto("/tickets/new");
    await page.getByLabel("Category", { exact: false }).selectOption({ index: 1 });
    await page.getByLabel("Related System", { exact: false }).selectOption({ index: 1 });
    await page.getByLabel("Ticket Summary", { exact: false }).fill(summary);
    await page.getByLabel("Description", { exact: false }).fill("The classroom projector shows no signal since this morning.");
    await page.getByRole("button", { name: "Submit Ticket" }).click();
    const created = page.getByRole("status", { name: "Ticket created" });
    await expect(created).toBeVisible();
    const ticketNumber = (await created.locator(".tk-ticket-number").textContent())!.trim();
    const id = Number((await created.getByRole("link", { name: "View Ticket" }).getAttribute("href"))!.split("/").pop());
    const t: TicketRef = { id, ticketNumber };

    // 2. IT Staff: claim, Open, record a completed action, see the gate met, resolve.
    await page.context().clearCookies();
    await signIn(page, IT_STAFF);
    await gotoStaffDetail(page, t);
    await page.getByRole("button", { name: "Claim" }).click();
    await expect(page.locator(".tk-panel-success")).toContainText("Ticket claimed.");
    await chooseStatus(page, "OPEN");
    await expect(page.locator(".tk-panel-success")).toContainText("Status changed to Open.");
    expect(await resolvedOption(page).evaluate((o: HTMLOptionElement) => o.disabled), "gate unmet before any action").toBe(true);

    await page.locator("#action-description").fill("Replaced the HDMI cable");
    await page.locator("#action-result").fill("Signal restored.");
    await page.getByRole("button", { name: "Add Action" }).click();
    await expect(page.locator(".tk-panel-success")).toContainText("Action added.");
    expect(await resolvedOption(page).evaluate((o: HTMLOptionElement) => o.disabled), "gate met after a completed action").toBe(false);

    await chooseStatus(page, "RESOLVED");
    await page.getByRole("dialog").getByRole("button", { name: "Resolve", exact: true }).click();
    await expect(page.locator(".tk-panel-success")).toContainText("Status changed to Resolved.");

    // 3. The Requester sees Resolved and the action.
    await page.context().clearCookies();
    await signIn(page, E2E_REQUESTER);
    await gotoRequesterDetail(page, t);
    await expect(headerBadge(page)).toHaveText(/resolved/i);
    await expect(actionRow(page, "Replaced the HDMI cable")).toContainText("Completed by Araya Methee");

    // 4. IT Staff closes it.
    await page.context().clearCookies();
    await signIn(page, IT_STAFF);
    await gotoStaffDetail(page, t);
    await chooseStatus(page, "CLOSED");
    await page.getByRole("dialog").getByRole("button", { name: "Close", exact: true }).click();
    await expect(page.locator(".tk-panel-success")).toContainText("Status changed to Closed.");

    // 5. The Requester sees Closed, the action and the full history.
    await page.context().clearCookies();
    await signIn(page, E2E_REQUESTER);
    await gotoRequesterDetail(page, t);
    await expect(headerBadge(page)).toHaveText(/closed/i);
    await expect(actionRow(page, "Replaced the HDMI cable")).toBeVisible();
    const rows = page.locator(".tk-history-list li");
    await expect(rows).toHaveCount(4);
    await expect(rows.nth(0)).toContainText("Created as");
    await expect(rows.nth(1)).toContainText("Open");
    await expect(rows.nth(2)).toContainText("Resolved");
    await expect(rows.nth(3)).toContainText("Closed");
  });

  test("E2E-18 Create Ticket with every field filled: a network failure keeps every value, and the retry creates exactly one Ticket (AC-91; BR-63; C-182)", async ({ page, consoleGuard }) => {
    consoleGuard.declareFailure({ url: "/api/tickets", abort: true });
    const summary = `E2E-18 retry keeps values (${vp()} ${Date.now()})`;
    const description = "Every field is filled in before the first submit attempt.";
    await page.goto("/tickets/new");
    await page.getByLabel("Category", { exact: false }).selectOption({ index: 2 });
    await page.getByLabel("Related System", { exact: false }).selectOption({ index: 2 });
    await page.getByLabel("Requested Priority", { exact: false }).selectOption("HIGH");
    await page.getByLabel("Ticket Summary", { exact: false }).fill(summary);
    await page.getByLabel("Description", { exact: false }).fill(description);
    const category = await page.getByLabel("Category", { exact: false }).inputValue();
    const system = await page.getByLabel("Related System", { exact: false }).inputValue();

    await page.route("**/api/tickets", (route) => (route.request().method() === "POST" ? route.abort("connectionrefused") : route.continue()));
    await page.getByRole("button", { name: "Submit Ticket" }).click();
    await expect(page.getByRole("alert")).toContainText("Something went wrong on our side.");
    await expect(page.getByLabel("Ticket Summary", { exact: false })).toHaveValue(summary);
    await expect(page.getByLabel("Description", { exact: false })).toHaveValue(description);
    await expect(page.getByLabel("Category", { exact: false })).toHaveValue(category);
    await expect(page.getByLabel("Related System", { exact: false })).toHaveValue(system);
    await expect(page.getByLabel("Requested Priority", { exact: false })).toHaveValue("HIGH");

    await page.unroute("**/api/tickets");
    await page.getByRole("button", { name: "Submit Ticket" }).click();
    await expect(page.getByRole("status", { name: "Ticket created" })).toBeVisible();
    const requester = await apiAs(E2E_REQUESTER);
    const list = (await (await requester.get(`/api/tickets?search=${encodeURIComponent(summary)}`)).json()) as { meta: { total: number } };
    await requester.dispose();
    expect(list.meta.total, "exactly one Ticket created").toBe(1);
  });
});

// ---------------------------------------------------------------------------
// E2E-17 - the ten ticket-workflow captures (ui-spec 15).
// ---------------------------------------------------------------------------
test.describe("Ticket workflow - captures", () => {
  test.use({ storageState: STATE.itStaff });

  test("E2E-17 captures the nine live Ticket workflow states into artifacts/lab-04/screenshots/ticket-workflow/", async ({ page, consoleGuard }) => {
    test.slow();
    consoleGuard.expectStatus(409, "/status");
    const labels = (values: string[]) => values.map((v) => v.toLowerCase().replace(/_/g, " "));

    // status-menu: exactly allowedTransitions (plus the current status, disabled).
    const menu = await openTicket("E2E-17 workflow main");
    const staff = await apiAs(IT_STAFF);
    await addAction(staff, menu.id, { description: "Diagnosed and repaired the fault", result: "Fault repaired." });
    const detail = await staffTicket(staff, menu.id);
    await gotoStaffDetail(page, menu);
    const values = await statusSelect(page).locator("option").evaluateAll((os) => os.map((o) => (o as HTMLOptionElement).value));
    expect(values, "the menu is the current status plus allowedTransitions").toEqual([detail.currentStatus, ...detail.allowedTransitions]);
    expect(labels(await statusSelect(page).locator("option").allTextContents()).length).toBe(values.length);
    await statusSelect(page).focus();
    await capture(page, "ticket-workflow", "workflow-<vp>-status-menu");

    // gate-unmet: a planned action still open.
    const gate = await openTicket("E2E-17 workflow gate");
    await addAction(staff, gate.id, { status: "PLANNED", description: "Wait for the part to arrive" });
    await gotoStaffDetail(page, gate);
    await expect(page.locator("#gate-callout")).toBeVisible();
    await capture(page, "ticket-workflow", "workflow-<vp>-gate-unmet");

    // resolve-confirm, resolved.
    await gotoStaffDetail(page, menu);
    await chooseStatus(page, "RESOLVED");
    await expect(page.getByRole("dialog")).toBeVisible();
    await capture(page, "ticket-workflow", "workflow-<vp>-resolve-confirm");
    await page.getByRole("dialog").getByRole("button", { name: "Resolve", exact: true }).click();
    await expect(page.locator(".tk-panel-success")).toContainText("Status changed to Resolved.");
    await capture(page, "ticket-workflow", "workflow-<vp>-resolved");

    // history (staff view, oldest first).
    await expect(page.locator(".tk-history-list li")).toHaveCount(3);
    await page.locator(".tk-history").scrollIntoViewIfNeeded();
    await capture(page, "ticket-workflow", "workflow-<vp>-history");

    // cancel-blocked.
    const blocked = await openTicket("E2E-17 workflow cancel blocked");
    await addAction(staff, blocked.id, { status: "PLANNED", description: "Collect the loan laptop" });
    await gotoStaffDetail(page, blocked);
    await chooseStatus(page, "CANCELLED");
    await page.getByRole("dialog").getByRole("button", { name: "Cancel Ticket" }).click();
    await expect(statusControls(page).getByRole("alert")).toContainText("This ticket still has planned actions.");
    await capture(page, "ticket-workflow", "workflow-<vp>-cancel-blocked");

    // conflict: STALE_UPDATE on the status control.
    const stale = await openTicket("E2E-17 workflow conflict");
    await gotoStaffDetail(page, stale);
    await statusSelect(page).selectOption("IN_PROGRESS");
    const b = await apiAs(ADMINISTRATOR);
    const current = await staffTicket(b, stale.id);
    expect((await b.patch(`/api/staff/tickets/${stale.id}/it-priority`, { data: { itPriority: "HIGH", version: current.version } })).status()).toBe(200);
    await b.dispose();
    await statusControls(page).getByRole("button", { name: "Save Changes" }).click();
    await expect(statusControls(page).getByRole("alert")).toContainText("This changed while you were working");
    await capture(page, "ticket-workflow", "workflow-<vp>-conflict");

    // reopened.
    const reopen = await openTicket("E2E-17 workflow reopened");
    await addAction(staff, reopen.id, { description: "Reset the account" });
    await moveStatus(staff, reopen.id, "RESOLVED");
    await gotoStaffDetail(page, reopen);
    await chooseStatus(page, "REOPENED");
    await expect(page.locator(".tk-panel-success")).toContainText("Status changed to Reopened.");
    await expect(page.locator("#gate-callout")).toBeVisible();
    await capture(page, "ticket-workflow", "workflow-<vp>-reopened");
    await staff.dispose();

    // requester-history: the Requester's view of the resolved Ticket.
    await page.context().clearCookies();
    await signIn(page, E2E_REQUESTER);
    await gotoRequesterDetail(page, menu);
    await expect(page.locator(".tk-history-list li")).toHaveCount(3);
    await capture(page, "ticket-workflow", "workflow-<vp>-requester-history");
  });

  // C-188: the legacy-history state needs a Ticket created before the Lab 4
  // migration, and a fresh evidence database has none. It runs against
  // toktickit_rehearsal (the Lab 3 dump, migrated), with the servers pointed at
  // it and E2E_LEGACY_HISTORY=1; in every other run it is skipped.
  test("E2E-17 legacy-history: a Lab 3 Ticket shows the C-179 line and no date (AC-77; C-179, C-188)", async ({ page }) => {
    test.skip(!process.env.E2E_LEGACY_HISTORY, "needs toktickit_rehearsal (C-188): run with E2E_LEGACY_HISTORY=1 and the servers on that database");
    const staff = await apiAs(IT_STAFF);
    const legacy = (await staffTicket(staff, 1)) as unknown as { historyComplete: boolean };
    await staff.dispose();
    expect(legacy.historyComplete, "Ticket 1 predates the migration").toBe(false);
    await page.goto("/queue/1");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText("Status changes made before this history began were not recorded.")).toBeVisible();
    await page.locator(".tk-history").scrollIntoViewIfNeeded();
    await capture(page, "ticket-workflow", "workflow-<vp>-legacy-history");
  });
});

