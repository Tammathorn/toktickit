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
  userIdByEmail,
  vp,
} from "../support/lab4-shots";

// Actions Taken end to end - tests.md E2E-01 to E2E-10, plus E2E-08's 15
// captures (ui-spec 15, artifacts/lab-04/screenshots/actions-taken/). Issue #70.
//
// Every Ticket is created through the API as the dedicated E2E Requester, whose
// counts nothing else reads (#40), and its summary carries the viewport so the
// three parallel projects never share one. IT Staff is Araya Methee, the second
// staff user is the seeded Administrator, Panida Srisawat, who may also record
// actions. The console-error fixture (C-149) watches every test; each expected
// 4xx is declared with `consoleGuard.expectStatus`.
// Requires the manual start sequence in docs/lab-04/tests.md section 5.

test.describe("Actions Taken - IT Staff", () => {
  test.use({ storageState: STATE.itStaff });

  test("E2E-01 create planned, edit, then complete: each step shows its success copy and the list updates from the response (AC-01, AC-18, AC-19; FR-02, FR-04, FR-05)", async ({ page }) => {
    const t = await newTicket("E2E-01 actions flow");
    await gotoStaffDetail(page, t);
    await expect(page.getByText("No actions recorded yet.")).toBeVisible();

    await page.getByRole("radio", { name: "Planned" }).check();
    await page.locator("#action-description").fill("Order a replacement cable");
    await page.getByRole("button", { name: "Add Action" }).click();
    await expect(page.locator(".tk-panel-success")).toContainText("Action added.");
    let row = actionRow(page, "Order a replacement cable");
    await expect(row.locator(".tk-action-badge")).toContainText("Planned");

    await row.getByRole("button", { name: "Edit", exact: true }).click();
    const editPanel = page.getByRole("group", { name: "Edit action" });
    await editPanel.getByLabel("Description").fill("Order a replacement HDMI cable");
    await editPanel.getByRole("button", { name: "Save Action" }).click();
    await expect(page.locator(".tk-panel-success")).toContainText("Action saved.");
    row = actionRow(page, "Order a replacement HDMI cable");
    await expect(row).toBeVisible();
    await expect(row.locator(".tk-action-badge")).toContainText("Planned");

    await row.getByRole("button", { name: "Complete", exact: true }).click();
    const completePanel = page.getByRole("group", { name: "Complete action" });
    await completePanel.getByLabel("Result").fill("Cable replaced and tested.");
    await completePanel.getByRole("button", { name: "Complete Action" }).click();
    await expect(page.locator(".tk-panel-success")).toContainText("Action completed.");
    row = actionRow(page, "Order a replacement HDMI cable");
    await expect(row.locator(".tk-action-badge")).toContainText("Completed");
    await expect(row).toContainText("Completed by Araya Methee");
    await expect(row).toContainText("Cable replaced and tested.");
  });

  test("E2E-02 created already completed with follow-up: the note appears on tick, clears on untick, and the saved row shows Follow-up needed (AC-09, AC-22)", async ({ page }) => {
    const t = await newTicket("E2E-02 follow-up");
    await gotoStaffDetail(page, t);

    const box = page.locator("#action-followUpRequired");
    const note = page.locator("#action-followUpNote");
    await expect(note).toHaveCount(0);
    await box.check();
    await expect(note).toBeVisible();
    await note.fill("Re-test the battery next week");
    await box.uncheck();
    await expect(note).toHaveCount(0);
    await box.check();
    await expect(note, "unticking cleared the note (BR-05)").toHaveValue("");

    await page.locator("#action-description").fill("Replaced the projector lamp");
    await page.locator("#action-result").fill("Lamp replaced, picture restored.");
    await note.fill("Re-test the battery next week");
    await page.getByRole("button", { name: "Add Action" }).click();
    await expect(page.locator(".tk-panel-success")).toContainText("Action added.");
    const row = actionRow(page, "Replaced the projector lamp");
    await expect(row).toContainText("Follow-up needed: Re-test the battery next week");
  });

  test("E2E-03 cancel a planned action with a reason: the row shows Cancelled by and Reason (AC-21; FR-06)", async ({ page }) => {
    const t = await newTicket("E2E-03 cancel action");
    const staff = await apiAs(IT_STAFF);
    await addAction(staff, t.id, { status: "PLANNED", description: "Visit the lab on Friday" });
    await staff.dispose();
    await gotoStaffDetail(page, t);

    let row = actionRow(page, "Visit the lab on Friday");
    await row.getByRole("button", { name: "Cancel action", exact: true }).click();
    const panel = page.getByRole("group", { name: "Cancel action" });
    await panel.getByLabel("Reason").fill("The Requester fixed it themselves.");
    await panel.getByRole("button", { name: "Cancel Action", exact: true }).click();
    await expect(page.locator(".tk-panel-success")).toContainText("Action cancelled.");
    row = actionRow(page, "Visit the lab on Friday");
    await expect(row.locator(".tk-action-badge")).toContainText("Cancelled");
    await expect(row).toContainText("Cancelled by Araya Methee");
    await expect(row.locator("dt", { hasText: "Reason" })).toBeVisible();
    await expect(row).toContainText("The Requester fixed it themselves.");
  });

  test("E2E-04 an inactive assignee is refused with 422 at the Assignee field and nothing is saved (AC-28)", async ({ page, consoleGuard }) => {
    consoleGuard.expectStatus(422, "/api/tickets/");
    const t = await newTicket("E2E-04 inactive assignee");
    const admin = await apiAs(ADMINISTRATOR);
    const inactiveId = await userIdByEmail(admin, "somkid.r@example.ac.th");
    await admin.dispose();
    await gotoStaffDetail(page, t);

    // The picker lists only active users, so the request is rewritten in flight
    // to name the inactive one; the 422 is the real server's answer.
    await page.route("**/api/tickets/*/actions", async (route) => {
      const body = route.request().postDataJSON() as Record<string, unknown>;
      await route.continue({ postData: JSON.stringify({ ...body, assigneeId: inactiveId }) });
    });
    await page.locator("#action-description").fill("Reassign the printer");
    await page.locator("#action-result").fill("Done.");
    await page.getByRole("button", { name: "Add Action" }).click();
    await expect(page.locator("#action-assigneeId-error")).toHaveText("Choose an active IT Staff or Administrator user.");
    await page.unroute("**/api/tickets/*/actions");

    const staff = await apiAs(IT_STAFF);
    expect((await staffTicket(staff, t.id)).actions, "nothing saved").toHaveLength(0);
    await staff.dispose();
  });

  test("E2E-05 two contexts: B edits an action A has open, A saves (409): conflict panel, A's draft kept, Apply my changes again succeeds (AC-60; C-153)", async ({ page, browser, consoleGuard }) => {
    consoleGuard.expectStatus(409, "/api/actions/");
    const t = await newTicket("E2E-05 stale action");
    const staff = await apiAs(IT_STAFF);
    await addAction(staff, t.id, { status: "PLANNED", description: "Calibrate the display" });
    await staff.dispose();

    // A: opens Edit and types a new description, not yet saved.
    await gotoStaffDetail(page, t);
    let row = actionRow(page, "Calibrate the display");
    await row.getByRole("button", { name: "Edit", exact: true }).click();
    const panel = page.getByRole("group", { name: "Edit action" });
    await panel.getByLabel("Description").fill("Calibrate the display and the projector");

    // B: a second browser context (the Administrator) saves a change to the same action first.
    const contextB = await browser.newContext({ storageState: STATE.administrator });
    const pageB = await contextB.newPage();
    await gotoStaffDetail(pageB, t);
    const rowB = actionRow(pageB, "Calibrate the display");
    await rowB.getByRole("button", { name: "Edit", exact: true }).click();
    const panelB = pageB.getByRole("group", { name: "Edit action" });
    await panelB.getByLabel("Attachment Notes").fill("See photo 2, the cable label");
    await panelB.getByRole("button", { name: "Save Action" }).click();
    await expect(pageB.locator(".tk-panel-success")).toContainText("Action saved.");
    await contextB.close();

    // A saves: 409 STALE_UPDATE.
    await panel.getByRole("button", { name: "Save Action" }).click();
    const conflict = panel.getByRole("alert");
    await expect(conflict).toContainText("This changed while you were working");
    await expect(panel.getByLabel("Description"), "A's draft is kept").toHaveValue("Calibrate the display and the projector");

    await conflict.getByRole("button", { name: "Apply my changes again" }).click();
    await expect(page.locator(".tk-panel-success")).toContainText("Action saved.");
    row = actionRow(page, "Calibrate the display and the projector");
    await expect(row, "A's description saved").toBeVisible();
    await expect(row, "B's change kept: only A's changed field was sent").toContainText("See photo 2, the cable label");
  });

  test("E2E-09 a double-click on Add Action creates exactly one action (AC-68; BR-44)", async ({ page }) => {
    const t = await newTicket("E2E-09 double click");
    await gotoStaffDetail(page, t);
    await page.locator("#action-description").fill("Cleaned the keyboard");
    await page.locator("#action-result").fill("Keys respond again.");
    await page.getByRole("button", { name: "Add Action" }).dblclick();
    await expect(actionRow(page, "Cleaned the keyboard")).toHaveCount(1);
    await expect(page.locator(".tk-panel-success")).toContainText("Action added.");
    const staff = await apiAs(IT_STAFF);
    expect((await staffTicket(staff, t.id)).actions, "exactly one action").toHaveLength(1);
    await staff.dispose();
  });

  test("E2E-07 on a Resolved and a Closed Ticket the list is read-only with no composer and the matching line (AC-37, AC-38)", async ({ page }) => {
    const t = await newTicket("E2E-07 terminal actions");
    const staff = await apiAs(IT_STAFF);
    await claim(staff, t.id);
    await moveStatus(staff, t.id, "OPEN");
    await addAction(staff, t.id, { description: "Rebuilt the profile" });
    await moveStatus(staff, t.id, "RESOLVED");

    await gotoStaffDetail(page, t);
    await expect(page.getByText("This ticket is resolved. Reopen it first to record more work.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Record an action" })).toHaveCount(0);
    const card = page.getByRole("region", { name: "Actions Taken" });
    await expect(card.getByRole("button", { name: /^(Edit|Complete|Cancel action)$/ })).toHaveCount(0);
    await expect(actionRow(page, "Rebuilt the profile")).toBeVisible();

    await moveStatus(staff, t.id, "CLOSED");
    await staff.dispose();
    await gotoStaffDetail(page, t);
    await expect(page.getByText("This ticket is closed - create a new ticket if the problem returns.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Record an action" })).toHaveCount(0);
    await expect(card.getByRole("button", { name: /^(Edit|Complete|Cancel action)$/ })).toHaveCount(0);
    await expect(actionRow(page, "Rebuilt the profile")).toBeVisible();
  });
});

test.describe("Actions Taken - Requester", () => {
  test.use({ storageState: STATE.requester });

  test("E2E-06 the Requester sees every action read-only, names only, and no @ in the page (AC-31, AC-33; FR-07)", async ({ page }) => {
    const t = await newTicket("E2E-06 requester view");
    const staff = await apiAs(IT_STAFF);
    await addAction(staff, t.id, { status: "PLANNED", description: "Book the engineer" });
    await addAction(staff, t.id, { description: "Swapped the router", result: "Link restored." });
    await staff.dispose();

    await gotoRequesterDetail(page, t);
    const card = page.getByRole("region", { name: "Actions Taken" });
    await expect(card).toContainText("Recorded by IT Staff.");
    await expect(actionRow(page, "Book the engineer")).toBeVisible();
    await expect(actionRow(page, "Swapped the router")).toContainText("Completed by Araya Methee");
    await expect(card.getByRole("button")).toHaveCount(0);
    await expect(card.locator("textarea, input, select")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Record an action" })).toHaveCount(0);
    const html = await page.locator("#root").innerHTML();
    expect(html.includes("@"), "no email address anywhere in the page").toBe(false);
  });

  test("E2E-10 a Requester's browser POST to /api/tickets/:id/actions is refused with 403 and no action appears for staff (AC-03)", async ({ page, consoleGuard }) => {
    consoleGuard.expectStatus(403, "/actions");
    const t = await newTicket("E2E-10 requester post");
    await page.goto("/dashboard");
    const status = await page.evaluate(async (id) => {
      const res = await fetch(`/api/tickets/${id}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "COMPLETED", actionAt: new Date().toISOString(), description: "x", result: "y", followUpRequired: false }),
      });
      return res.status;
    }, t.id);
    expect(status).toBe(403);
    const staff = await apiAs(IT_STAFF);
    expect((await staffTicket(staff, t.id)).actions, "no action created").toHaveLength(0);
    await staff.dispose();
  });
});

// ---------------------------------------------------------------------------
// E2E-08 - the 15 Actions Taken captures (ui-spec 15), every one from the real
// app. Five Tickets: one with actions by three staff users and a Requester
// view, one empty and used for the composer states, one with two planned
// actions for the row panels, one for the 422, one for the 409, one Resolved.
// ---------------------------------------------------------------------------
test.describe("Actions Taken - captures", () => {
  test.use({ storageState: STATE.itStaff });

  test("E2E-08 captures the 15 Actions Taken states into artifacts/lab-04/screenshots/actions-taken/", async ({ page, browser, consoleGuard }) => {
    test.slow();
    consoleGuard.expectStatus(422, "/api/tickets/");
    consoleGuard.expectStatus(409, "/api/actions/");

    const araya = await apiAs(IT_STAFF);
    const panida = await apiAs(ADMINISTRATOR);
    const decha = await apiAs({ email: "decha.i@example.ac.th", password: IT_STAFF.password });
    const dechaId = await userIdByEmail(panida, "decha.i@example.ac.th");

    // 1. list - one Ticket, actions by three staff users (BR-02).
    const listed = await newTicket("E2E-08 actions list");
    await addAction(araya, listed.id, { description: "Checked the switch port", result: "Port was disabled; enabled it." });
    await addAction(decha, listed.id, { status: "PLANNED", description: "Replace the patch cable", assigneeId: dechaId });
    await addAction(panida, listed.id, { description: "Confirmed the link with the Requester", result: "Requester confirmed.", followUpRequired: true, followUpNote: "Watch the port for a day" });
    await gotoStaffDetail(page, listed);
    await expect(page.locator("li.tk-action-row")).toHaveCount(3);
    await capture(page, "actions-taken", "actions-<vp>-list");

    // 2. empty, then the composer states on one empty Ticket.
    const empty = await newTicket("E2E-08 actions composer");
    await gotoStaffDetail(page, empty);
    await expect(page.getByText("No actions recorded yet.")).toBeVisible();
    await capture(page, "actions-taken", "actions-<vp>-empty");

    await page.getByRole("radio", { name: "Planned" }).check();
    await page.locator("#action-description").fill("Order a replacement toner cartridge");
    await capture(page, "actions-taken", "actions-<vp>-create-planned");

    await page.getByRole("radio", { name: "Completed" }).check();
    await page.locator("#action-description").fill("Replaced the toner cartridge");
    await page.locator("#action-result").fill("Prints are sharp again.");
    await capture(page, "actions-taken", "actions-<vp>-create-completed");

    await page.locator("#action-followUpRequired").check();
    await expect(page.locator("#action-followUpNote")).toBeVisible();
    await capture(page, "actions-taken", "actions-<vp>-follow-up-note");

    // validation - submit with the note required and empty, and clear the description.
    await page.locator("#action-description").fill("");
    await page.getByRole("button", { name: "Add Action" }).click();
    await expect(page.locator("#action-description-error")).toBeVisible();
    await expect(page.locator("#action-followUpNote-error")).toBeVisible();
    await capture(page, "actions-taken", "actions-<vp>-validation");

    // success - fix the form and add the action.
    await page.locator("#action-description").fill("Replaced the toner cartridge");
    await page.locator("#action-followUpNote").fill("Check the counter next week");
    await page.getByRole("button", { name: "Add Action" }).click();
    await expect(page.locator(".tk-panel-success")).toContainText("Action added.");
    await expect(actionRow(page, "Replaced the toner cartridge")).toBeVisible();
    await capture(page, "actions-taken", "actions-<vp>-success");

    // 3. row panels: edit, complete, cancel, then the finished rows.
    const panels = await newTicket("E2E-08 actions row panels");
    await addAction(araya, panels.id, { status: "PLANNED", description: "Install the new access point" });
    await addAction(araya, panels.id, { status: "PLANNED", description: "Visit room 204 on Friday" });
    await gotoStaffDetail(page, panels);
    const first = actionRow(page, "Install the new access point");
    await first.getByRole("button", { name: "Edit", exact: true }).click();
    await expect(page.getByRole("group", { name: "Edit action" })).toBeVisible();
    await capture(page, "actions-taken", "actions-<vp>-edit");
    await page.getByRole("group", { name: "Edit action" }).getByRole("button", { name: "Close" }).click();

    await first.getByRole("button", { name: "Complete", exact: true }).click();
    const completePanel = page.getByRole("group", { name: "Complete action" });
    await completePanel.getByLabel("Result").fill("Access point installed and online.");
    await capture(page, "actions-taken", "actions-<vp>-complete");
    await completePanel.getByRole("button", { name: "Complete Action" }).click();
    await expect(page.locator(".tk-panel-success")).toContainText("Action completed.");

    const second = actionRow(page, "Visit room 204 on Friday");
    await second.getByRole("button", { name: "Cancel action", exact: true }).click();
    const cancelPanel = page.getByRole("group", { name: "Cancel action" });
    await cancelPanel.getByLabel("Reason").fill("The room was moved to the new wing.");
    await capture(page, "actions-taken", "actions-<vp>-cancel");
    await cancelPanel.getByRole("button", { name: "Cancel Action", exact: true }).click();
    await expect(page.locator(".tk-panel-success")).toContainText("Action cancelled.");
    await expect(actionRow(page, "Visit room 204 on Friday")).toContainText("Cancelled by Araya Methee");
    await expect(actionRow(page, "Install the new access point")).toContainText("Completed by Araya Methee");
    await capture(page, "actions-taken", "actions-<vp>-finished");

    // 4. inactive assignee - the real 422 at the Assignee field.
    const inactive = await newTicket("E2E-08 actions inactive assignee");
    const inactiveId = await userIdByEmail(panida, "somkid.r@example.ac.th");
    await gotoStaffDetail(page, inactive);
    await page.route("**/api/tickets/*/actions", async (route) => {
      const body = route.request().postDataJSON() as Record<string, unknown>;
      await route.continue({ postData: JSON.stringify({ ...body, assigneeId: inactiveId }) });
    });
    await page.locator("#action-description").fill("Move the monitor to the new desk");
    await page.locator("#action-result").fill("Moved.");
    await page.getByRole("button", { name: "Add Action" }).click();
    await expect(page.locator("#action-assigneeId-error")).toBeVisible();
    await capture(page, "actions-taken", "actions-<vp>-inactive-assignee");
    await page.unroute("**/api/tickets/*/actions");

    // 5. conflict - B saves first, A's save is refused with the draft kept.
    const stale = await newTicket("E2E-08 actions conflict");
    await addAction(araya, stale.id, { status: "PLANNED", description: "Update the firmware" });
    await gotoStaffDetail(page, stale);
    const staleRow = actionRow(page, "Update the firmware");
    await staleRow.getByRole("button", { name: "Edit", exact: true }).click();
    const stalePanel = page.getByRole("group", { name: "Edit action" });
    await stalePanel.getByLabel("Description").fill("Update the firmware on both switches");
    const contextB = await browser.newContext({ storageState: STATE.administrator });
    const pageB = await contextB.newPage();
    await gotoStaffDetail(pageB, stale);
    const rowB = actionRow(pageB, "Update the firmware");
    await rowB.getByRole("button", { name: "Edit", exact: true }).click();
    await pageB.getByRole("group", { name: "Edit action" }).getByLabel("Attachment Notes").fill("Firmware file on the shared drive");
    await pageB.getByRole("group", { name: "Edit action" }).getByRole("button", { name: "Save Action" }).click();
    await expect(pageB.locator(".tk-panel-success")).toContainText("Action saved.");
    await contextB.close();
    await stalePanel.getByRole("button", { name: "Save Action" }).click();
    await expect(stalePanel.getByRole("alert")).toContainText("This changed while you were working");
    await expect(stalePanel.getByLabel("Description")).toHaveValue("Update the firmware on both switches");
    await capture(page, "actions-taken", "actions-<vp>-conflict");

    // 6. terminal - a Resolved Ticket: read-only list, no composer.
    const terminal = await newTicket("E2E-08 actions terminal");
    await claim(araya, terminal.id);
    await moveStatus(araya, terminal.id, "OPEN");
    await addAction(araya, terminal.id, { description: "Re-imaged the laptop", result: "Boots normally." });
    await moveStatus(araya, terminal.id, "RESOLVED");
    await gotoStaffDetail(page, terminal);
    await expect(page.getByText("This ticket is resolved. Reopen it first to record more work.")).toBeVisible();
    await capture(page, "actions-taken", "actions-<vp>-terminal");

    // 7. requester - the same list the Requester sees, read-only, names only.
    await page.context().clearCookies();
    await signIn(page, E2E_REQUESTER);
    await gotoRequesterDetail(page, terminal);
    await expect(page.getByRole("region", { name: "Actions Taken" })).toContainText("Recorded by IT Staff.");
    await capture(page, "actions-taken", "actions-<vp>-requester");

    await araya.dispose();
    await panida.dispose();
    await decha.dispose();
  });
});
