import { test, expect, type Page, type Locator, type APIRequestContext } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { getPrisma } from "../../server/src/prisma";
import {
  ADMINISTRATOR,
  E2E_REQUESTER,
  FIRST_LOGIN,
  IT_STAFF,
  REQUESTER_C,
  STATE,
  apiAs,
  settle,
  signIn,
  withFirstLoginAccount,
} from "../support/auth";

// Issue #12 (feature/lab3-12-ui-evidence) - the visual checklist, ui-spec.md
// section 24, made provable at all three C-90 viewports.
//
// Part 1: the layout defects the checklist found, asserted on real CSS at a
// real viewport (jsdom cannot measure layout). Each runs at the one width its
// defect lives at and skips the others.
// Part 2: the section 20 state matrix - every Y cell, captured at every
// viewport into artifacts/lab-03/screenshots/states/<screen>-<vp>-<state>.png
// (the section 23 pattern; the folder is noted in evidence.md).
// Part 3: accessibility proof a screenshot cannot carry alone - a keyboard
// focus-ring walk, aria-current, the modal focus trap, and an ARIA snapshot of
// every major screen - written as JSON to artifacts/lab-03/a11y/.
//
// States are produced the Lab 2 way: a busy state holds the real request open
// until the capture, a failure aborts it in the browser. The two states the
// seeded data can never hold - the Queue's and User Management's true Empty -
// use a mocked empty response, and the capture name says "mocked". Every
// Ticket is created as the dedicated E2E Requester (C-83).
// Requires the manual start sequence in tests.md section 6.

const vp = () => test.info().project.name;
const STATES = path.resolve(__dirname, "../../artifacts/lab-03/screenshots/states");
const A11Y = path.resolve(__dirname, "../../artifacts/lab-03/a11y");
const FAILURE_TEXT = "Something went wrong on our side. Your work has not been lost - please try again.";
const SIGNED_OUT = { cookies: [], origins: [] };

async function shot(page: Page, name: string, fullPage = true) {
  await settle(page);
  fs.mkdirSync(STATES, { recursive: true });
  await page.screenshot({ path: path.join(STATES, `${name.replace("<vp>", vp())}.png`), fullPage });
}

function writeJson(name: string, data: unknown) {
  fs.mkdirSync(A11Y, { recursive: true });
  fs.writeFileSync(path.join(A11Y, `${name.replace("<vp>", vp())}.json`), JSON.stringify(data, null, 2) + "\n");
}

// Holds every request matching `pattern` until release(); then lets it
// through, or aborts it when the capture must not cause a write.
async function hold(page: Page, pattern: string, then: "continue" | "abort" = "continue") {
  let release!: () => void;
  const held = new Promise<void>((resolve) => (release = resolve));
  const pending: Promise<void>[] = [];
  await page.route(pattern, (route) => {
    const handled = (async () => {
      await held;
      if (then === "abort") await route.abort("connectionrefused");
      else await route.continue();
    })();
    pending.push(handled);
    return handled;
  });
  // Unroute only once every held request has been let through (or aborted):
  // unrouting first would leave a pending route the handler then re-handles.
  return async () => {
    release();
    await Promise.all(pending);
    await page.unroute(pattern);
  };
}

async function failRequests(page: Page, pattern: string) {
  await page.route(pattern, (route) => route.abort("connectionrefused"));
}

async function createTicket(api: APIRequestContext, summary: string) {
  const categories = await (await api.get("/api/categories")).json();
  const systems = await (await api.get("/api/related-systems")).json();
  const res = await api.post("/api/tickets", {
    data: {
      categoryId: categories[0].id,
      relatedSystemId: systems[0].id,
      summary,
      description: `Created by visual-evidence.spec.ts (${vp()}) for the Part 9 state matrix.`,
      requestedPriority: "MEDIUM",
    },
  });
  expect(res.status(), summary).toBe(201);
  return (await res.json()) as { id: number; ticketNumber: string };
}

async function e2eTicket(summary: string) {
  const requester = await apiAs(E2E_REQUESTER);
  try {
    return await createTicket(requester, `${summary} (${vp()})`);
  } finally {
    await requester.dispose();
  }
}

// Moves a Ticket along the section 5.1 matrix as IT Staff, through the API.
async function staffMoves(id: number, steps: Array<"claim" | "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED" | "CANCELLED">) {
  const staff = await apiAs(IT_STAFF);
  try {
    for (const step of steps) {
      const res =
        step === "claim"
          ? await staff.post(`/api/staff/tickets/${id}/claim`)
          : await staff.patch(`/api/staff/tickets/${id}/status`, { data: { currentStatus: step } });
      expect(res.status(), `${step} on ticket ${id}`).toBe(200);
    }
  } finally {
    await staff.dispose();
  }
}

async function openNavIfMobile(page: Page) {
  if (vp() === "mobile") {
    await page.getByRole("button", { name: "Toggle navigation" }).click();
    await expect(page.locator("#tk-nav-panel")).toHaveClass(/show/);
  }
}

// Every cell's box lies inside the card that clips its table: nothing is cut
// off by the card's overflow: hidden (ui-spec 21, "no hidden control").
async function expectInsideCard(card: Locator, cells: Locator) {
  const cardBox = (await card.boundingBox())!;
  const n = await cells.count();
  expect(n).toBeGreaterThan(0);
  for (let i = 0; i < n; i++) {
    const box = (await cells.nth(i).boundingBox())!;
    const label = (await cells.nth(i).textContent())?.trim();
    expect(box.x + box.width, `"${label}" ends inside the card`).toBeLessThanOrEqual(cardBox.x + cardBox.width + 0.5);
  }
}

async function tableFitsCard(page: Page) {
  return page.locator(".tk-table-card").evaluate((card) => {
    const table = card.querySelector("table")!;
    return { table: table.scrollWidth, card: card.clientWidth };
  });
}

test.describe("Visual checklist defects (Issue #12)", () => {
  test.describe("IT Staff", () => {
    test.use({ storageState: STATE.itStaff });

    test("RESP-11 at 1280 px the Queue's nine columns all fit the card: Current Status, Ticket Owner and Last Updated are visible (ui-spec 15.2, 21)", async ({ page }) => {
      test.skip(vp() !== "desktop", "the lg table");
      await page.goto("/queue");
      const card = page.locator(".tk-table-card");
      await expect(card.locator("tbody tr").first()).toBeVisible();
      const fit = await tableFitsCard(page);
      expect(fit.table, "table width within the card").toBeLessThanOrEqual(fit.card);
      await expectInsideCard(card, card.locator("thead th"));
      for (const name of ["Current Status", "Ticket Owner", "Last Updated"]) {
        await expect(card.getByRole("columnheader", { name })).toBeInViewport();
      }
    });
  });

  test.describe("Administrator", () => {
    test.use({ storageState: STATE.administrator });

    test("RESP-12 at 834 px User Management shows its Edit column inside the card, and the header identity stays on one line (ui-spec 17.1, 9)", async ({ page }) => {
      test.skip(vp() !== "tablet", "the md table and header");
      await page.goto("/users");
      const card = page.locator(".tk-table-card");
      await expect(card.locator("tbody tr").first()).toBeVisible();
      const fit = await tableFitsCard(page);
      expect(fit.table, "table width within the card").toBeLessThanOrEqual(fit.card);
      await expectInsideCard(card, card.locator("thead th"));
      await expectInsideCard(card, card.getByRole("button", { name: /^Edit / }));

      const identity = page.locator(".tk-identity-shell");
      const name = identity.locator(".tk-identity-name");
      const badge = identity.locator(".tk-badge-role, .tk-role-administrator").first();
      const nameBox = (await name.boundingBox())!;
      const badgeBox = (await badge.boundingBox())!;
      // one line: the badge sits beside the name, not below it
      expect(Math.abs(badgeBox.y + badgeBox.height / 2 - (nameBox.y + nameBox.height / 2)), "badge centred on the name's line").toBeLessThan(6);
      // ... and Log Out stays one line too, with nothing pushed past the header
      const logOut = identity.getByRole("button", { name: "Log Out" });
      const lineHeight = await logOut.evaluate((el) => parseFloat(getComputedStyle(el).lineHeight) || 24);
      const textHeight = await logOut.evaluate((el) => {
        const r = document.createRange();
        r.selectNodeContents(el);
        return r.getBoundingClientRect().height;
      });
      expect(textHeight, "Log Out on a single line").toBeLessThan(lineHeight * 1.5);
      const overflow = await page.locator(".tk-header .container").evaluate((c) => c.scrollWidth - c.clientWidth);
      expect(overflow, "nothing overflows the header").toBeLessThanOrEqual(0);
    });
  });

  test.describe("Requester", () => {
    test.use({ storageState: STATE.requester });

    test("RESP-13 at 834 px every My Tickets row shows its IT Priority badge (C-116, FR-31)", async ({ page }) => {
      test.skip(vp() !== "tablet", "the md table");
      await page.goto("/tickets");
      const rows = page.locator(".tk-table-card tbody tr");
      await expect(rows.first()).toBeVisible();
      const n = await rows.count();
      for (let i = 0; i < n; i++) {
        // the row also holds the lg column's copy, hidden at md - count the visible one
        await expect(rows.nth(i).getByText(/^IT (Low|Medium|High)$/).filter({ visible: true }), `row ${i + 1}`).toHaveCount(1);
      }
    });
  });
});

// ===========================================================================
// Part 2 - the ui-spec section 20 state matrix, every Y cell, every viewport.
// ===========================================================================
test.describe("State matrix (ui-spec 20) - signed out", () => {
  test.use({ storageState: SIGNED_OUT });

  test("E2E-27 Login: validation, saving and failure at this viewport (ui-spec 10, 20)", async ({ page }) => {
    await page.goto("/");
    const signInButton = page.getByRole("button", { name: "Sign In" });
    await signInButton.click();
    await expect(page.getByText("Email Address is required.")).toBeVisible();
    await shot(page, "login-<vp>-validation");

    await page.getByLabel(/Email Address/).fill(E2E_REQUESTER.email);
    await page.getByLabel(/^Password/).fill(E2E_REQUESTER.password);
    const release = await hold(page, "**/api/auth/login", "abort");
    await signInButton.click();
    await expect(page.getByRole("button", { name: /Signing in…/ })).toBeDisabled();
    await shot(page, "login-<vp>-saving");
    await release();
    await expect(page.getByText(FAILURE_TEXT)).toBeVisible();
    await shot(page, "login-<vp>-failure");
  });

  test("E2E-28 Check System: loading and failure at this viewport (ui-spec 18 - unchanged from Lab 1, C-87 - and 20)", async ({ page }) => {
    await page.goto("/system-check");
    const release = await hold(page, "**/api/health");
    await page.getByRole("button", { name: "Check System" }).click();
    await expect(page.getByRole("button", { name: "Loading…" })).toBeDisabled();
    await shot(page, "system-check-<vp>-loading");
    await release();
    await expect(page.getByText("System Status: Online")).toBeVisible();

    await failRequests(page, "**/api/health");
    await page.getByRole("button", { name: "Check System" }).click();
    await expect(page.getByText("System Status: Offline")).toBeVisible();
    await shot(page, "system-check-<vp>-failure");
  });

  test("E2E-29 Change Password: validation, saving, failure and success at this viewport (ui-spec 11, 20)", async ({ page }) => {
    await withFirstLoginAccount(async () => {
      await page.goto("/");
      await page.getByLabel(/Email Address/).fill(FIRST_LOGIN.email);
      await page.getByLabel(/^Password/).fill(FIRST_LOGIN.password);
      await page.getByRole("button", { name: "Sign In" }).click();
      const submit = page.getByRole("button", { name: "Change Password" });
      await expect(page.getByRole("heading", { level: 1, name: "Change Password" })).toBeVisible();

      await submit.click();
      await expect(page.getByText("Current Password is required.")).toBeVisible();
      await shot(page, "change-password-<vp>-validation");

      const next = "Fresh#Start2026x";
      const fill = async () => {
        await page.getByLabel(/^Current Password/).fill(FIRST_LOGIN.password);
        await page.getByLabel(/^New Password/).fill(next);
        await page.getByLabel(/^Confirm New Password/).fill(next);
      };
      await fill();
      const release = await hold(page, "**/api/auth/change-password", "abort");
      await submit.click();
      await expect(page.getByRole("button", { name: /Saving…/ })).toBeDisabled();
      await shot(page, "change-password-<vp>-saving");
      await release();
      await expect(page.getByText(FAILURE_TEXT)).toBeVisible();
      await shot(page, "change-password-<vp>-failure");

      await fill();
      await page.getByRole("button", { name: "Change Password" }).click();
      await expect(page.locator(".tk-panel-success")).toBeVisible();
      await shot(page, "change-password-<vp>-success");
    });
  });
});

test.describe("State matrix (ui-spec 20) - Requester screens", () => {
  test.use({ storageState: SIGNED_OUT });

  test("E2E-30 My Tickets: loading, empty, populated with the md IT Priority badge, no results, failure (ui-spec 12, 20, C-116)", async ({ page }) => {
    await signIn(page, REQUESTER_C);
    const release = await hold(page, "**/api/tickets?*");
    await page.goto("/tickets");
    await expect(page.getByRole("region", { name: "Ticket list" })).toHaveAttribute("aria-busy", "true");
    await shot(page, "my-tickets-<vp>-loading");
    await release();
    await expect(page.getByRole("heading", { name: "No tickets yet" })).toBeVisible();
    await shot(page, "my-tickets-<vp>-empty");

    await signIn(page, E2E_REQUESTER);
    await page.goto("/tickets");
    await expect(page.getByRole("heading", { level: 1, name: "My Tickets" })).toBeVisible();
    await expect(page.getByText(/^IT (Low|Medium|High)$/).filter({ visible: true }).first()).toBeVisible();
    await shot(page, "my-tickets-<vp>-populated");
    await page.goto("/tickets?search=zzz-no-ticket-matches-this-zzz");
    await expect(page.getByRole("heading", { name: "No matches" })).toBeVisible();
    await shot(page, "my-tickets-<vp>-no-results");

    await failRequests(page, "**/api/tickets?*");
    await page.goto("/tickets");
    await expect(page.getByText(FAILURE_TEXT)).toBeVisible();
    await shot(page, "my-tickets-<vp>-failure");
  });

  test("E2E-31 Create Ticket: loading, validation, saving, failure and success (ui-spec 13, 20)", async ({ page }) => {
    await signIn(page, E2E_REQUESTER);
    const release = await hold(page, "**/api/categories");
    await page.goto("/tickets/new");
    // L2 ui-spec 13 (Create Ticket's own rule): the two reference selects are
    // disabled and read "Loading…" while their requests are in flight.
    const category = page.getByLabel("Category", { exact: false });
    await expect(category).toBeDisabled();
    await expect(category.locator("option").first()).toHaveText("Loading…");
    await expect(page.getByRole("button", { name: "Submit Ticket" })).toBeDisabled();
    await shot(page, "create-ticket-<vp>-loading");
    await release();

    const submit = page.getByRole("button", { name: "Submit Ticket" });
    await expect(page.getByLabel("Category", { exact: false })).toBeEnabled();
    await submit.click();
    await expect(page.locator(".tk-invalid-feedback, .invalid-feedback").first()).toBeVisible();
    await shot(page, "create-ticket-<vp>-validation");

    await page.getByLabel("Category", { exact: false }).selectOption({ index: 1 });
    await page.getByLabel("Related System", { exact: false }).selectOption({ index: 1 });
    await page.getByLabel("Ticket Summary", { exact: false }).fill(`State matrix: printer jams on tray 2 (${vp()})`);
    await page.getByLabel("Description", { exact: false }).fill("The printer on floor 3 jams every few pages from tray 2.");
    const releasePost = await hold(page, "**/api/tickets", "abort");
    await submit.click();
    await expect(page.getByRole("button", { name: /Submitting…/ })).toBeDisabled();
    await shot(page, "create-ticket-<vp>-saving");
    await releasePost();
    await expect(page.getByText(FAILURE_TEXT)).toBeVisible();
    await shot(page, "create-ticket-<vp>-failure");

    await page.getByRole("button", { name: "Submit Ticket" }).click();
    await expect(page.getByRole("heading", { name: "Ticket created" })).toBeVisible();
    await shot(page, "create-ticket-<vp>-success");
  });

  test("E2E-32 Requester Ticket Detail: loading, empty, validation, saving, success, conflict, terminal, not found, failure (ui-spec 14, 20, C-119)", async ({ page }) => {
    const ticket = await e2eTicket("State matrix: requester detail");
    await signIn(page, E2E_REQUESTER);
    const url = `/tickets/${ticket.id}`;

    const release = await hold(page, `**/api/tickets/${ticket.id}`);
    await page.goto(url);
    await expect(page.locator("section[aria-busy='true']")).toBeVisible();
    await shot(page, "requester-detail-<vp>-loading");
    await release();
    await expect(page.getByText("No comments yet.")).toBeVisible();
    await shot(page, "requester-detail-<vp>-empty");

    const composer = page.getByLabel("Add a comment");
    await composer.fill("x".repeat(2001));
    await expect(page.getByRole("button", { name: "Post Comment" })).toBeDisabled();
    await shot(page, "requester-detail-<vp>-validation");

    await composer.fill("The printer still jams after a restart.");
    const releasePost = await hold(page, `**/api/tickets/${ticket.id}/public-comments`);
    await page.getByRole("button", { name: "Post Comment" }).click();
    await expect(page.getByRole("button", { name: /Posting…/ })).toBeDisabled();
    await shot(page, "requester-detail-<vp>-saving");
    await releasePost();
    await expect(page.locator(".tk-panel-success")).toContainText("Comment posted.");
    await shot(page, "requester-detail-<vp>-success");

    // Conflict: the screen offers the resolution action while the Ticket is
    // Open; IT Staff resolve it meanwhile, so the real request is refused.
    await staffMoves(ticket.id, ["claim", "OPEN"]);
    await page.goto(url);
    await page.getByRole("button", { name: "Problem Appears Resolved" }).click();
    await staffMoves(ticket.id, ["RESOLVED"]);
    await page.getByRole("dialog").getByRole("button", { name: "Report it" }).click();
    await expect(page.locator(".tk-conflict")).toBeVisible();
    // refreshed: the header shows the status the server now holds
    await expect(page.getByRole("region", { name: "Ticket information" }).locator(".tk-badge", { hasText: "Resolved" })).toBeVisible();
    await shot(page, "requester-detail-<vp>-conflict");

    await staffMoves(ticket.id, ["CLOSED"]);
    await page.goto(url);
    await expect(page.getByText("This ticket is closed - create a new ticket if the problem returns.")).toHaveCount(1);
    await expect(page.getByLabel("Add a comment")).toHaveCount(0);
    // 14.4: no upload control and no Remove action on a terminal Ticket
    await expect(page.getByLabel("Add attachment")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Remove/ })).toHaveCount(0);
    await shot(page, "requester-detail-<vp>-terminal");

    await page.goto("/tickets/999999999");
    await expect(page.getByRole("heading", { level: 1, name: "That item does not exist." })).toBeVisible();
    await shot(page, "requester-detail-<vp>-not-found");

    await failRequests(page, `**/api/tickets/${ticket.id}`);
    await page.goto(url);
    await expect(page.getByText(FAILURE_TEXT)).toBeVisible();
    await shot(page, "requester-detail-<vp>-failure");
  });
});

test.describe("State matrix (ui-spec 20) - Forbidden for IT Staff", () => {
  test.use({ storageState: STATE.itStaff });

  test("E2E-33 IT Staff meets the Forbidden state on My Tickets, Create Ticket, Requester Ticket Detail and User Management (ui-spec 20.1, FR-24)", async ({ page }) => {
    for (const [route, name] of [["/tickets", "my-tickets"], ["/tickets/new", "create-ticket"], ["/tickets/1", "requester-detail"], ["/users", "users"]] as const) {
      await page.goto(route);
      await expect(page.getByRole("heading", { level: 1, name: "You do not have access to that page." })).toBeVisible();
      await shot(page, `${name}-<vp>-forbidden`);
    }
  });
});

test.describe("State matrix (ui-spec 20) - IT Staff screens", () => {
  test.use({ storageState: STATE.itStaff });

  test("E2E-34 Ticket Queue: loading, populated, invalid query, no results, empty (mocked), failure (ui-spec 15.5)", async ({ page }) => {
    const release = await hold(page, "**/api/staff/tickets?*");
    await page.goto("/queue");
    await expect(page.getByRole("region", { name: "Ticket queue", exact: true })).toHaveAttribute("aria-busy", "true");
    await shot(page, "queue-<vp>-loading");
    await release();
    await expect(page.getByRole("region", { name: "Ticket queue", exact: true })).not.toHaveAttribute("aria-busy", "true");
    await shot(page, "queue-<vp>-populated");

    await page.goto("/queue?sort=nonsense:sideways");
    await expect(page.locator(".tk-panel-danger, .tk-invalid-feedback").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Clear filters" }).first()).toBeVisible();
    await shot(page, "queue-<vp>-validation");

    await page.goto("/queue?search=zzz-no-ticket-matches-this-zzz");
    await expect(page.getByRole("heading", { name: "No matches" })).toBeVisible();
    await shot(page, "queue-<vp>-no-results");

    await page.route("**/api/staff/tickets?*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: [], meta: { page: 1, pageSize: 10, total: 0, totalPages: 0, sort: "createdAt:desc" } }),
      }),
    );
    await page.goto("/queue");
    await expect(page.getByRole("heading", { name: "No tickets in the queue" })).toBeVisible();
    await shot(page, "queue-<vp>-empty-mocked");
    await page.unroute("**/api/staff/tickets?*");

    await failRequests(page, "**/api/staff/tickets?*");
    await page.goto("/queue");
    await expect(page.getByText(FAILURE_TEXT)).toBeVisible();
    await shot(page, "queue-<vp>-failure");
  });

  test("E2E-35 IT Staff Ticket Detail: loading, empty, validation, conflict, saving, success, not found, failure (ui-spec 16, 20, C-118, C-119)", async ({ page }) => {
    const ticket = await e2eTicket("State matrix: staff detail");
    const url = `/queue/${ticket.id}`;

    const release = await hold(page, `**/api/staff/tickets/${ticket.id}`);
    await page.goto(url);
    await expect(page.locator("section[aria-busy='true']")).toBeVisible();
    await shot(page, "staff-detail-<vp>-loading");
    await release();
    await expect(page.getByText("No comments yet.")).toBeVisible();
    await expect(page.getByText("No internal notes yet.")).toBeVisible();
    // C-118: both composers empty, so Post Comment (primary) and Add Note
    // (secondary) are disabled in one frame - filled versus outlined.
    await expect(page.getByRole("button", { name: "Post Comment" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Add Note" })).toBeDisabled();
    await shot(page, "staff-detail-<vp>-empty");
    const fills = await page.evaluate(() =>
      ["Post Comment", "Add Note"].map((label) => {
        const b = Array.from(document.querySelectorAll("button")).find((x) => x.textContent?.trim() === label)!;
        const cs = getComputedStyle(b);
        return { label, disabled: (b as HTMLButtonElement).disabled, background: cs.backgroundColor, color: cs.color, border: cs.borderColor };
      }),
    );
    expect(fills[0].background, "a disabled primary and a disabled secondary differ").not.toBe(fills[1].background);
    writeJson("disabled-buttons-<vp>", { screen: "IT Staff Ticket Detail", viewport: vp(), decision: "C-118", buttons: fills });

    await page.getByLabel("Add an internal note").fill("y".repeat(2001));
    await expect(page.getByRole("button", { name: "Add Note" })).toBeDisabled();
    await shot(page, "staff-detail-<vp>-validation");
    await page.getByLabel("Add an internal note").fill("");

    // Conflict: an Administrator claims the Ticket after this screen loaded.
    const admin = await apiAs(ADMINISTRATOR);
    expect((await admin.post(`/api/staff/tickets/${ticket.id}/claim`)).status()).toBe(200);
    await admin.dispose();
    await page.getByRole("button", { name: "Claim" }).click();
    await expect(page.locator(".tk-conflict")).toBeVisible();
    await shot(page, "staff-detail-<vp>-conflict");

    const second = await e2eTicket("State matrix: staff detail claim");
    await page.goto(`/queue/${second.id}`);
    const releaseClaim = await hold(page, `**/api/staff/tickets/${second.id}/claim`);
    await page.getByRole("button", { name: "Claim" }).click();
    await expect(page.locator("button[aria-busy='true'], button:disabled").filter({ hasText: /Claim/ }).first()).toBeVisible();
    await shot(page, "staff-detail-<vp>-saving");
    await releaseClaim();
    await expect(page.locator(".tk-panel-success")).toContainText("Ticket claimed.");
    await shot(page, "staff-detail-<vp>-success");

    await page.goto("/queue/999999999");
    await expect(page.getByRole("heading", { level: 1, name: "That item does not exist." })).toBeVisible();
    await shot(page, "staff-detail-<vp>-not-found");

    await failRequests(page, `**/api/staff/tickets/${ticket.id}`);
    await page.goto(url);
    await expect(page.getByText(FAILURE_TEXT)).toBeVisible();
    await shot(page, "staff-detail-<vp>-failure");
  });

  test("E2E-36 IT Staff Ticket Detail on a Closed and a Cancelled Ticket: no composer, the line once (C-109, C-117)", async ({ page }) => {
    const closed = await e2eTicket("State matrix: closed");
    await staffMoves(closed.id, ["claim", "OPEN", "RESOLVED", "CLOSED"]);
    await page.goto(`/queue/${closed.id}`);
    await expect(page.getByText("This ticket is closed - create a new ticket if the problem returns.")).toHaveCount(1);
    await expect(page.getByLabel("Add a comment")).toHaveCount(0);
    await expect(page.getByLabel("Add an internal note")).toHaveCount(0);
    await shot(page, "staff-detail-<vp>-closed");

    const cancelled = await e2eTicket("State matrix: cancelled");
    await staffMoves(cancelled.id, ["CANCELLED"]);
    await page.goto(`/queue/${cancelled.id}`);
    await expect(page.getByText("This ticket is cancelled - create a new ticket if the problem returns.")).toHaveCount(1);
    await shot(page, "staff-detail-<vp>-cancelled");
  });

  test("E2E-37 the inactive-owner marker renders inline at this viewport (ui-spec 8.5, AC-75)", async ({ page }) => {
    const ticket = await e2eTicket("State matrix: inactive owner");
    // The same direct fixture staff-ticket-flow.spec.ts uses: the assign API
    // refuses an inactive assignee, so the owner is written directly.
    const prisma = getPrisma();
    const somkid = await prisma.user.findUniqueOrThrow({ where: { email: "somkid.r@example.ac.th" } });
    await prisma.ticket.update({ where: { id: ticket.id }, data: { ownerId: somkid.id } });
    await page.goto(`/queue/${ticket.id}`);
    await expect(page.locator(".tk-owner-inactive").first()).toBeVisible();
    await shot(page, "staff-detail-<vp>-inactive-owner");
  });
});

test.describe("State matrix (ui-spec 20) - Forbidden for a Requester", () => {
  test.use({ storageState: STATE.requester });

  test("E2E-38 a Requester meets the Forbidden state on the Queue and IT Staff Ticket Detail (FR-24, C-65)", async ({ page }) => {
    for (const [route, name] of [["/queue", "queue"], ["/queue/1", "staff-detail"]] as const) {
      await page.goto(route);
      await expect(page.getByRole("heading", { level: 1, name: "You do not have access to that page." })).toBeVisible();
      await shot(page, `${name}-<vp>-forbidden`);
    }
  });
});

test.describe("State matrix (ui-spec 20) - User Management", () => {
  test.use({ storageState: STATE.administrator });

  test("E2E-39 User Management: loading, populated, validation, conflict, saving, success, no results, empty (mocked), failure (ui-spec 17.3)", async ({ page }) => {
    const release = await hold(page, "**/api/users*");
    await page.goto("/users");
    await expect(page.getByRole("region", { name: "Users" })).toHaveAttribute("aria-busy", "true");
    await shot(page, "users-<vp>-loading");
    await release();
    await expect(page.getByRole("button", { name: /^Edit / }).first()).toBeVisible();
    await shot(page, "users-<vp>-populated");

    await page.getByRole("button", { name: "Create User" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Create User" }).click();
    await expect(dialog.locator(".tk-invalid-feedback, .invalid-feedback").first()).toBeVisible();
    await shot(page, "users-<vp>-validation");

    await dialog.getByLabel(/^Name/).fill("Duplicate Check");
    await dialog.getByLabel(/^Email Address/).fill(ADMINISTRATOR.email);
    await dialog.getByLabel(/^Role/).selectOption("REQUESTER");
    await dialog.getByLabel(/^Initial Password/).fill("Welcome#2026ab");
    await dialog.getByRole("button", { name: "Create User" }).click();
    await expect(dialog.getByText(/already/i)).toBeVisible();
    await shot(page, "users-<vp>-conflict");

    await dialog.getByLabel(/^Email Address/).fill(`state-matrix-${vp()}-${Date.now()}@e2e.test`);
    const releasePost = await hold(page, "**/api/users", "abort");
    await dialog.getByRole("button", { name: "Create User" }).click();
    await expect(dialog.getByRole("button", { name: /Creating…/ })).toBeDisabled();
    await shot(page, "users-<vp>-saving");
    await releasePost();
    await expect(dialog.getByText(FAILURE_TEXT)).toBeVisible();

    await dialog.getByRole("button", { name: "Create User" }).click();
    await expect(page.locator(".tk-panel-success")).toContainText("User created.");
    await shot(page, "users-<vp>-success");

    await page.getByLabel("Search", { exact: true }).fill("zzz-no-user-matches-this-zzz");
    await expect(page.getByRole("heading", { name: "No matches" })).toBeVisible();
    await shot(page, "users-<vp>-no-results");

    await page.route("**/api/users*", (route) => route.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
    await page.goto("/users");
    await expect(page.getByRole("heading", { name: "No users yet" })).toBeVisible();
    await shot(page, "users-<vp>-empty-mocked");
    await page.unroute("**/api/users*");

    await failRequests(page, "**/api/users*");
    await page.goto("/users");
    await expect(page.getByText(FAILURE_TEXT)).toBeVisible();
    await shot(page, "users-<vp>-failure");
  });
});

// ===========================================================================
// Part 3 - accessibility proof (ui-spec 22; checklist Accessibility rows).
// ===========================================================================
const FOCUSABLE = "a[href], button:not([disabled]), input:not([disabled]):not([type='hidden']), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";

// Tabs through the whole page with the keyboard, recording every stop and
// whether it shows a visible ring once transitions settle (the L2 focus-ring
// lesson); captures the first stop inside <main>. The record goes to a11y/.
async function focusWalk(page: Page, screen: string) {
  // Count only once the screen's data has landed - a list renders its row
  // links after the heading, and an early count would cap the walk short.
  await page.waitForLoadState("networkidle");
  await settle(page);
  const expected = await page.evaluate((sel) => {
    const visible = (el: Element) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none";
    };
    return Array.from(document.querySelectorAll(sel)).filter(visible).length;
  }, FOCUSABLE);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  const stops: Array<{ element: string; name: string; ring: string | null }> = [];
  const seen = new Set<string>();
  let captured = false;
  let completedCycle = false;
  for (let i = 0; i < expected * 3 + 20; i++) {
    await page.keyboard.press("Tab");
    await settle(page);
    const info = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      const cs = getComputedStyle(el);
      const outline = cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0 ? `outline ${cs.outlineWidth} ${cs.outlineStyle} ${cs.outlineColor}` : null;
      const shadow = cs.boxShadow && cs.boxShadow !== "none" ? `box-shadow ${cs.boxShadow}` : null;
      const pathOf = (n: Element): string => (n.parentElement ? `${pathOf(n.parentElement)}>${n.tagName}:${Array.from(n.parentElement.children).indexOf(n)}` : n.tagName);
      const label = (el as HTMLInputElement).labels?.[0]?.textContent ?? "";
      return {
        key: pathOf(el),
        element: `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}`,
        name: (el.getAttribute("aria-label") || label || el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 60),
        ring: outline ?? shadow,
        inMain: Boolean(el.closest("main")),
      };
    });
    if (!info) continue;
    if (seen.has(info.key)) {
      completedCycle = true;
      break;
    }
    seen.add(info.key);
    stops.push({ element: info.element, name: info.name, ring: info.ring });
    if (!captured && info.inMain) {
      await shot(page, `${screen}-<vp>-focus`, false);
      captured = true;
    }
  }
  const record = {
    screen,
    viewport: vp(),
    url: page.url().replace(/^https?:\/\/[^/]+/, ""),
    focusableVisible: expected,
    reached: stops.length,
    completedCycle,
    withoutRing: stops.filter((s) => !s.ring).length,
    stops,
  };
  writeJson(`focus-${screen}-<vp>`, record);
  return record;
}

// An interactive role printed with no quoted name in the ARIA snapshot is a
// control with no accessible name.
const UNNAMED = /^\s*- (button|link|textbox|combobox|checkbox|radio|switch|searchbox|spinbutton)(\s*\[[^\]]*\])?\s*:?\s*$/;

async function ariaRecord(page: Page, screen: string) {
  const snapshot = await page.locator("body").ariaSnapshot();
  const lines = snapshot.split("\n");
  const unnamed = lines.filter((line) => UNNAMED.test(line));
  writeJson(`aria-${screen}-<vp>`, {
    screen,
    viewport: vp(),
    url: page.url().replace(/^https?:\/\/[^/]+/, ""),
    unnamedInteractive: unnamed,
    ariaSnapshot: lines,
  });
  expect(unnamed, `${screen}: every interactive control has an accessible name`).toEqual([]);
}

async function a11yScreen(page: Page, screen: string, ready: Locator) {
  await expect(ready).toBeVisible();
  await ariaRecord(page, screen);
  const walk = await focusWalk(page, screen);
  expect(walk.completedCycle, `${screen}: Tab came back round to the first stop`).toBe(true);
  expect(walk.withoutRing, `${screen}: every keyboard stop shows a focus ring`).toBe(0);
  expect(walk.reached, `${screen}: every visible focusable control is reached by Tab`).toBeGreaterThanOrEqual(walk.focusableVisible);
}

// The dialog is already open. Tabs once past the last control and checks focus
// wrapped to the first (and Shift+Tab the other way), captures the wrapped
// state, then Escape - the dialog closes and focus returns to its opener.
async function modalTrapProof(page: Page, name: string, opener: Locator) {
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await settle(page);
  const controls = dialog.locator("input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])");
  const count = await controls.count();
  const first = controls.nth(0);
  const last = controls.nth(count - 1);
  await last.focus();
  await page.keyboard.press("Tab");
  await settle(page);
  const wrappedToFirst = await first.evaluate((el) => el === document.activeElement);
  await shot(page, `modal-${name}-<vp>-wrapped`, false);
  await page.keyboard.press("Shift+Tab");
  const wrappedToLast = await last.evaluate((el) => el === document.activeElement);
  let leftDialog = false;
  for (let i = 0; i < count + 2; i++) {
    await page.keyboard.press("Tab");
    leftDialog ||= await dialog.evaluate((d) => !d.contains(document.activeElement));
  }
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  const restored = await opener.evaluate((el) => el === document.activeElement);
  writeJson(`modal-${name}-<vp>`, {
    dialog: name,
    viewport: vp(),
    controls: count,
    tabFromLastWrapsToFirst: wrappedToFirst,
    shiftTabFromFirstWrapsToLast: wrappedToLast,
    focusLeftDialogWhileTabbing: leftDialog,
    escapeClosed: true,
    focusRestoredToOpener: restored,
  });
  expect(wrappedToFirst, "Tab from the last control wraps to the first").toBe(true);
  expect(wrappedToLast, "Shift+Tab from the first wraps to the last").toBe(true);
  expect(leftDialog, "focus never leaves the dialog").toBe(false);
  expect(restored, "focus returns to the opener").toBe(true);
}

test.describe("Accessibility proof - signed out and Requester", () => {
  test.use({ storageState: SIGNED_OUT });

  test("E2E-42 Login: accessible names and a visible focus ring at every Tab stop", async ({ page }) => {
    await page.goto("/");
    await a11yScreen(page, "login", page.getByRole("button", { name: "Sign In" }));
  });

  test("E2E-43 Change Password: accessible names and a visible focus ring at every Tab stop", async ({ page }) => {
    await withFirstLoginAccount(async () => {
      await page.goto("/");
      await page.getByLabel(/Email Address/).fill(FIRST_LOGIN.email);
      await page.getByLabel(/^Password/).fill(FIRST_LOGIN.password);
      await page.getByRole("button", { name: "Sign In" }).click();
      await a11yScreen(page, "change-password", page.getByRole("button", { name: "Change Password" }));
    });
  });

  test("E2E-44 My Tickets, Create Ticket and Requester Ticket Detail: accessible names and focus rings", async ({ page }) => {
    const ticket = await e2eTicket("A11Y: requester detail");
    await signIn(page, E2E_REQUESTER);
    await page.goto("/tickets");
    await a11yScreen(page, "my-tickets", page.getByRole("heading", { level: 1, name: "My Tickets" }));
    await page.goto("/tickets/new");
    await a11yScreen(page, "create-ticket", page.getByRole("button", { name: "Submit Ticket" }));
    await page.goto(`/tickets/${ticket.id}`);
    await a11yScreen(page, "requester-detail", page.getByRole("button", { name: "Post Comment" }));
  });
});

test.describe("Accessibility proof - IT Staff", () => {
  test.use({ storageState: STATE.itStaff });

  test("E2E-45 Queue and IT Staff Ticket Detail: accessible names and focus rings", async ({ page }) => {
    const ticket = await e2eTicket("A11Y: staff detail");
    await page.goto("/queue");
    await a11yScreen(page, "queue", page.getByRole("heading", { level: 1, name: "Ticket Queue" }));
    await page.goto(`/queue/${ticket.id}`);
    await a11yScreen(page, "staff-detail", page.getByRole("button", { name: "Claim" }));
  });

  test("E2E-46 the status confirmation traps focus, closes on Escape and restores focus (ui-spec 16.2, 22)", async ({ page }) => {
    const ticket = await e2eTicket("A11Y: confirm dialog");
    await staffMoves(ticket.id, ["claim", "OPEN"]);
    await page.goto(`/queue/${ticket.id}`);
    await page.locator("#status-select").selectOption({ label: "Resolved" });
    const save = page.getByRole("group", { name: "Current Status controls" }).getByRole("button", { name: "Save Changes" });
    await save.focus();
    await page.keyboard.press("Enter");
    await modalTrapProof(page, "status-confirm", save);
  });
});

test.describe("Accessibility proof - Administrator", () => {
  test.use({ storageState: STATE.administrator });

  test("E2E-47 User Management: accessible names and focus rings; the Create User panel traps and restores focus", async ({ page }) => {
    await page.goto("/users");
    await a11yScreen(page, "users", page.getByRole("button", { name: /^Edit / }).first());
    const opener = page.getByRole("button", { name: "Create User" });
    await opener.focus();
    await page.keyboard.press("Enter");
    await modalTrapProof(page, "users-create", opener);
  });
});

const NAV_CASES = [
  { role: "requester", state: STATE.requester, pages: [["/tickets", "My Tickets"], ["/tickets/new", "Create Ticket"]] },
  { role: "it-staff", state: STATE.itStaff, pages: [["/queue", "Ticket Queue"]] },
  { role: "administrator", state: STATE.administrator, pages: [["/queue", "Ticket Queue"], ["/users", "User Management"]] },
] as const;

for (const c of NAV_CASES) {
  test.describe(`Accessibility proof - aria-current (${c.role})`, () => {
    test.use({ storageState: c.state });

    test(`E2E-48 ${c.role}: exactly the active destination carries aria-current="page", with weight and underline`, async ({ page }) => {
      const records: unknown[] = [];
      for (const [route, active] of c.pages) {
        await page.goto(route);
        await openNavIfMobile(page);
        await expect(page.locator(".tk-nav-link[aria-current='page']")).toHaveCount(1);
        await settle(page);
        const links = await page.locator(".tk-nav-link").evaluateAll((els) =>
          els.map((el) => {
            const cs = getComputedStyle(el);
            return {
              label: el.textContent?.trim(),
              ariaCurrent: el.getAttribute("aria-current"),
              fontWeight: cs.fontWeight,
              borderBottom: `${cs.borderBottomWidth} ${cs.borderBottomStyle} ${cs.borderBottomColor}`,
            };
          }),
        );
        expect(links.filter((l) => l.ariaCurrent === "page").map((l) => l.label), `${route}: the one active item`).toEqual([active]);
        await shot(page, `nav-<vp>-${c.role}-${route.slice(1).replace(/\//g, "-")}`, false);
        records.push({ route, links });
      }
      writeJson(`aria-current-${c.role}-<vp>`, { role: c.role, viewport: vp(), pages: records });
    });
  });
}

// ===========================================================================
// Part 4 - the rows a single capture per state does not reach.
// ===========================================================================
const STATUSES = [
  ["NEW", "New"], ["OPEN", "Open"], ["IN_PROGRESS", "In Progress"], ["WAITING_FOR_REQUESTER", "Waiting for Requester"],
  ["RESOLVED", "Resolved"], ["CLOSED", "Closed"], ["REOPENED", "Reopened"], ["CANCELLED", "Cancelled"],
] as const;

test.describe("Badges - every Current Status and the resolution marker (ui-spec 8.2, 8.5)", () => {
  test.use({ storageState: STATE.itStaff });

  test("E2E-40 each of the eight Current Status values renders in the Queue as its 8.2 badge, as text, at this viewport", async ({ page }) => {
    const seen: Array<{ status: string; badgeText: string; className: string }> = [];
    for (const [value, label] of STATUSES) {
      await page.goto(`/queue?currentStatus=${value}`);
      const badge = page.locator(".tk-badge-square", { hasText: new RegExp(`^${label}$`, "i") }).filter({ visible: true }).first();
      await expect(badge, label).toBeVisible();
      seen.push({ status: value, badgeText: (await badge.textContent())!.trim(), className: (await badge.getAttribute("class"))! });
      await shot(page, `queue-<vp>-status-${value.toLowerCase().replace(/_/g, "-")}`, false);
    }
    writeJson("status-badges-<vp>", { screen: "Ticket Queue", viewport: vp(), badges: seen });
  });

  test("E2E-41 the Requester says resolved marker renders in the Queue as a marker, never in the status column (FR-40, AC-60)", async ({ page }) => {
    const ticket = await e2eTicket("Marker: requester says resolved");
    await staffMoves(ticket.id, ["claim", "OPEN"]);
    const requester = await apiAs(E2E_REQUESTER);
    expect((await requester.post(`/api/tickets/${ticket.id}/requester-resolved`)).status()).toBe(200);
    await requester.dispose();
    await page.goto(`/queue?search=${ticket.ticketNumber}`);
    const marker = page.getByText("Requester says resolved").filter({ visible: true }).first();
    await expect(marker).toBeVisible();
    await expect(page.locator(".tk-badge-square", { hasText: /^Open$/i }).filter({ visible: true }).first()).toBeVisible();
    await shot(page, "queue-<vp>-resolved-marker", false);
  });
});

test.describe("Accessibility proof - the Requester's two dialogs", () => {
  test.use({ storageState: SIGNED_OUT });

  test("E2E-49 the resolution confirmation and the attachment removal dialog trap focus, close on Escape and restore focus (ui-spec 14.3, 22)", async ({ page }) => {
    const ticket = await e2eTicket("A11Y: requester dialogs");
    await staffMoves(ticket.id, ["claim", "OPEN"]);
    await signIn(page, E2E_REQUESTER);
    await page.goto(`/tickets/${ticket.id}`);

    const report = page.getByRole("button", { name: "Problem Appears Resolved" });
    await report.focus();
    await page.keyboard.press("Enter");
    await modalTrapProof(page, "resolution-confirm", report);

    await page.getByLabel("Add attachment").setInputFiles({ name: "receipt.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64") });
    const remove = page.getByRole("button", { name: "Remove receipt.png" });
    await expect(remove).toBeEnabled();
    await remove.focus();
    await page.keyboard.press("Enter");
    await modalTrapProof(page, "attachment-removal", remove);
  });
});
