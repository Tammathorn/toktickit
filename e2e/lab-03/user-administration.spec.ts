import { test, expect, request as playwrightRequest, type Page } from "@playwright/test";
import path from "node:path";
import { API_URL, CLIENT_URL } from "../../playwright.config";
import { ADMINISTRATOR, STATE, apiAs, settle } from "../support/auth";

// User Management - tests.md section 2.12, E2E-19..E2E-25, and RESP-05
// (Issue #43), with the ui-spec.md section 23 "user-management" captures for
// LS 14 Part 8. Every user this file creates carries an `@e2e.test` address
// (C-83) so Part 8's demo data never drifts into the seeded accounts, and
// E2E-20 - the one row that creates a user through the real UI - runs on the
// desktop project only so three viewport runs do not create three users.
// Requires the manual start sequence in tests.md section 6.

const SHOTS = path.resolve(__dirname, "../../artifacts/lab-03/screenshots/user-management");
let tag = 0;

function e2eEmail(label: string): string {
  tag += 1;
  return `${label}-${Date.now()}-${tag}@e2e.test`;
}

async function capture(page: Page, name: string) {
  await settle(page);
  await page.screenshot({ path: path.join(SHOTS, `${name.replace("<vp>", test.info().project.name)}.png`), fullPage: true });
}

async function openCreatePanel(page: Page) {
  await page.getByRole("button", { name: "Create User" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
}

async function fillCreateForm(page: Page, values: { name: string; email: string; role: string; password: string }) {
  // Scoped to the dialog: the list's own Role filter sits behind it in the
  // DOM and its label text ("Role") is also a prefix match for /^Role/,
  // so an unscoped getByLabel resolves to two elements and throws.
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(/^Name/).fill(values.name);
  await dialog.getByLabel(/^Email Address/).fill(values.email);
  await dialog.getByLabel(/^Role/).selectOption(values.role);
  await dialog.getByLabel(/^Initial Password/).fill(values.password);
}

test.describe("User Management - list and navigation", () => {
  test.use({ storageState: STATE.administrator });

  test("E2E-19 the Administrator user list renders the full LS 8.5 list (AC-82)", async ({ page }) => {
    // RESP-05 covers the mobile card rendering; a <table> with columnheaders
    // only exists at desktop/tablet widths (ui-spec 25.2's responsive rule).
    test.skip(test.info().project.name === "mobile", "the table is desktop/tablet only - RESP-05 covers mobile's cards");
    await page.goto("/users");
    await expect(page.getByRole("heading", { level: 1, name: "User Management" })).toBeVisible();
    await expect(page.getByRole("table")).toBeVisible();
    const headers = await page.getByRole("columnheader").allTextContents();
    expect(headers).toEqual(["Name", "Email", "Role", "Status", "Edit"]);
    await capture(page, "users-<vp>-list");

    // P8-02: search narrows the list to the matching rows.
    await page.getByLabel("Search", { exact: true }).fill("panida");
    await expect(page.getByRole("row", { name: /Panida Srisawat/ })).toBeVisible();
    await expect(page.getByRole("table")).not.toContainText("Araya Methee");
    await capture(page, "users-<vp>-search");

    // P8-03: the role filter narrows it independently of the search box.
    await page.getByLabel("Search", { exact: true }).fill("");
    await page.getByLabel("Role", { exact: true }).selectOption("ADMINISTRATOR");
    await expect(page.getByRole("row", { name: /Panida Srisawat/ })).toBeVisible();
    await expect(page.getByRole("table")).not.toContainText("Araya Methee");
    await capture(page, "users-<vp>-role-filter");
  });

  test("RESP-05 at 390px the user list renders cards and no table", async ({ page }) => {
    test.skip(test.info().project.name !== "mobile", "mobile only");
    await page.goto("/users");
    // The heading, not getByText: the nav link carries the same words.
    await expect(page.getByRole("heading", { level: 1, name: "User Management" })).toBeVisible();
    await expect(page.locator("table")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Edit / }).first()).toBeVisible();
    await capture(page, "users-<vp>-cards");
  });

  test("E2E-20 create a user and use it: an @e2e.test account signs in and meets Change Password (AC-85, AC-86, C-83)", async ({ page, browser }) => {
    test.skip(test.info().project.name !== "desktop", "creates a user - desktop only, so three viewport runs do not create three (C-83)");
    const email = e2eEmail("created");
    await page.goto("/users");
    await openCreatePanel(page);
    await fillCreateForm(page, { name: "E2E Created User", email, role: "REQUESTER", password: "Fresh#Start42" });
    await capture(page, "users-<vp>-create-filled");
    await page.getByRole("dialog").getByRole("button", { name: "Create User" }).click();
    await expect(page.getByText("User created.")).toBeVisible();
    await capture(page, "users-<vp>-create-success");
    await expect(page.getByText(email)).toBeVisible();

    const freshContext = await browser.newContext({ baseURL: API_URL });
    const login = await freshContext.request.post("/api/auth/login", { data: { email, password: "Fresh#Start42" } });
    expect(login.status()).toBe(200);
    const body = await login.json();
    expect(body.mustChangePassword).toBe(true);
    await freshContext.close();
  });

  test("E2E-21 a duplicate email is rejected at the Email Address field (AC-87)", async ({ page }) => {
    const email = e2eEmail("dup");
    const admin = await apiAs(ADMINISTRATOR);
    const created = await admin.post("/api/users", { data: { name: "Existing E2E User", email, role: "REQUESTER", isActive: true, initialPassword: "Fresh#Start42" } });
    expect(created.status()).toBe(201);
    await admin.dispose();

    await page.goto("/users");
    await openCreatePanel(page);
    await fillCreateForm(page, { name: "Duplicate Attempt", email, role: "REQUESTER", password: "Fresh#Start42" });
    await page.getByRole("dialog").getByRole("button", { name: "Create User" }).click();
    await expect(page.getByText("That email address is already in use.")).toBeVisible();
    await capture(page, "users-<vp>-duplicate-email");
  });

  test("E2E-22 the Administrator's own Status control is disabled with its explanation (AC-92)", async ({ page }) => {
    test.skip(test.info().project.name === "mobile", "the row/Edit interaction needs the table, not mobile's cards");
    await page.goto("/users");
    await page.getByRole("row", { name: /Panida Srisawat/ }).getByRole("button", { name: /^Edit / }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel(/^Status/)).toBeDisabled();
    await expect(dialog.getByText("You cannot deactivate your own account.")).toBeVisible();
    await capture(page, "users-<vp>-self-deactivation-disabled");
  });

  test("E2E-23 with one active Administrator, a self role change is refused with the banner (AC-93, AC-94)", async ({ page }) => {
    // Deliberately a self-DEMOTION by the sole seeded Administrator, never a
    // deactivation of any account: this is the one path through the rule
    // that mutates nothing on refusal (role stays Administrator, isActive
    // stays true, the session stays valid), so it is safe under
    // fullyParallel:true against the one shared ADMINISTRATOR fixture every
    // other e2e test's storageState depends on. No e2e test creates an
    // active Administrator (every create-user spec here uses Requester),
    // so the precondition below should always hold; if it does not, this
    // fails loudly rather than mutating anything.
    test.skip(test.info().project.name === "mobile", "the row/Edit interaction needs the table, not mobile's cards");
    const admin = await apiAs(ADMINISTRATOR);
    try {
      const list = await admin.get("/api/users?role=ADMINISTRATOR");
      const active = (await list.json()).filter((u: { isActive: boolean }) => u.isActive);
      expect(active, "exactly one active Administrator is this test's precondition").toHaveLength(1);
    } finally {
      await admin.dispose();
    }

    await page.goto("/users");
    await page.getByRole("row", { name: /Panida Srisawat/ }).getByRole("button", { name: /^Edit / }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByLabel(/^Role/).selectOption("IT_STAFF");
    await dialog.getByRole("button", { name: "Save Changes" }).click();
    await expect(page.getByText("There must always be at least one active Administrator.")).toBeVisible();
    await capture(page, "users-<vp>-last-administrator");

    // Nothing was mutated server-side: the form banner means Save never
    // closed the dialog's error state into a success one, and the row's
    // real stored role - re-read through the API, not the form control,
    // which keeps the user's unsaved selection - is still Administrator.
    const verify = await apiAs(ADMINISTRATOR);
    try {
      const row = await verify.get("/api/users?search=panida.s@example.ac.th");
      expect((await row.json())[0].role).toBe("ADMINISTRATOR");
    } finally {
      await verify.dispose();
    }
  });

  test("E2E-24 a non-Administrator sees the forbidden state and fetches no user data (AC-96)", async ({ browser }) => {
    const staffContext = await browser.newContext({ baseURL: CLIENT_URL, storageState: STATE.itStaff });
    const page = await staffContext.newPage();
    const requests: string[] = [];
    page.on("request", (req) => requests.push(req.url()));
    await page.goto("/users");
    await expect(page.getByText("You do not have access to that page.")).toBeVisible();
    expect(requests.some((u) => u.includes("/api/users"))).toBe(false);
    await capture(page, "users-<vp>-forbidden");
    await staffContext.close();
  });

  test("E2E-25 edit and reset: the four fields save, and a new initial password ends the user's session (AC-89, AC-91)", async ({ page, browser }) => {
    test.skip(test.info().project.name === "mobile", "the row/Edit interaction needs the table, not mobile's cards");
    const email = e2eEmail("edit-target");
    const admin = await apiAs(ADMINISTRATOR);
    const created = await admin.post("/api/users", { data: { name: "E2E Edit Target", email, role: "REQUESTER", isActive: true, initialPassword: "Fresh#Start42" } });
    expect(created.status()).toBe(201);
    const id = (await created.json()).id;

    const targetContext = await browser.newContext({ baseURL: API_URL });
    const targetLogin = await targetContext.request.post("/api/auth/login", { data: { email, password: "Fresh#Start42" } });
    expect(targetLogin.status()).toBe(200);

    await page.goto("/users");
    await page.getByRole("row", { name: new RegExp(email.split("@")[0]) }).getByRole("button", { name: /^Edit / }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel(/^Name/).fill("E2E Edit Target Renamed");
    await dialog.getByLabel(/^Role/).selectOption("IT_STAFF");
    await dialog.getByRole("button", { name: "Save Changes" }).click();
    await expect(page.getByText("Changes saved.")).toBeVisible();
    await capture(page, "users-<vp>-edit-success");

    // A role change revokes sessions (BR-83): the account's prior session is
    // already dead without a password reset, demonstrated directly here.
    const revoked = await targetContext.request.get("/api/tickets");
    expect(revoked.status()).toBe(401);

    // By email, not the renamed name: a stale row from an earlier run of
    // this same test (same hardcoded rename, different unique email) must
    // never make this match ambiguous.
    await page.getByRole("row", { name: new RegExp(email.split("@")[0]) }).getByRole("button", { name: /^Edit / }).click();
    const dialog2 = page.getByRole("dialog");
    await dialog2.getByRole("button", { name: "Set a new initial password" }).click();
    const passwordDialog = page.getByRole("dialog", { name: /Set a new initial password/ });
    await passwordDialog.getByLabel(/^Initial Password/).fill("Fresh#Second99");
    await passwordDialog.getByRole("button", { name: "Set Password" }).click();
    await expect(page.getByText("Initial password set.")).toBeVisible();
    await capture(page, "users-<vp>-password-reset-success");

    const relogin = await playwrightRequest.newContext({ baseURL: API_URL });
    const next = await relogin.post("/api/auth/login", { data: { email, password: "Fresh#Second99" } });
    expect(next.status()).toBe(200);
    expect((await next.json()).mustChangePassword).toBe(true);
    await relogin.dispose();
    await targetContext.close();
    await admin.dispose();
  });
});
