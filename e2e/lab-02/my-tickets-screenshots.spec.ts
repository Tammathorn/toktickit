import { test, expect, type Page, type APIRequestContext } from "@playwright/test";
import path from "node:path";
import { API_URL } from "../../playwright.config";
import { REQUESTER_A, REQUESTER_B, REQUESTER_C, apiAs, signIn, type Account } from "../support/auth";

// My Tickets - screenshot evidence for LS 14 Part 7 at the three C-10
// viewports, written to artifacts/lab-02/screenshots/my-tickets/list-<vp>-<state>.png.
//
// Runs against the demo seed (server/prisma/seed-demo.ts, C-22): Requester A
// (the first active Requester) owns 14 Tickets, B owns 3, C owns none. Every
// capture is read-only; nothing here creates or changes data. Loading and
// failure are produced by intercepting GET /api/tickets at the network layer.
//
// Lab 3 (#40), docs/lab-03/tests.md section 4.2: selecting a Requester is now
// signing in as that Requester; "switched" signs A out and B in; the direct
// API refusal in "forbidden" is 404, not 403 (C-65), and the screen shows the
// not-found message. Direct API reads are made as the signed-in Requester and
// carry no ?requesterId=.
//
// Requires the manual start sequence in docs/lab-02/tests.md section 5.

const SHOT_DIR = path.resolve(__dirname, "../../artifacts/lab-02/screenshots/my-tickets");
const LIST_ROUTE = /\/api\/tickets(\?.*)?$/;

type Requester = { account: Account; name: string };
type ListRow = { id: number; ticketNumber: string };

function shot(page: Page, state: string) {
  const vp = test.info().project.name;
  return page.screenshot({ path: path.join(SHOT_DIR, `list-${vp}-${state}.png`), fullPage: true });
}

// The demo seed's three Requesters, A, B and C, in its order (C-22).
async function demoRequesters(_request: APIRequestContext): Promise<[Requester, Requester, Requester]> {
  return [
    { account: REQUESTER_A, name: "Anucha Prasert" },
    { account: REQUESTER_B, name: "Kanya Somsri" },
    { account: REQUESTER_C, name: "Nattapong Wong" },
  ];
}

// What the API returns to that Requester, signed in, for the same query.
async function listFor(who: Requester, qs = ""): Promise<{ data: ListRow[]; meta: { total: number; totalPages: number } }> {
  const api = await apiAs(who.account);
  const res = await api.get(`/api/tickets?${qs.replace(/^&/, "")}`);
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  await api.dispose();
  return body;
}

async function selectRequester(page: Page, who: Requester) {
  await signIn(page, who.account);
}

// Rows are a table at md and above and cards below (ui-spec 12.3); either way
// each row carries one "Open <ticketNumber>" link.
function rows(page: Page) {
  return page.getByRole("link", { name: /^Open TKT-/ });
}

// On mobile the header collapses to a toggler; open it so the Requester name
// is in the capture where the evidence depends on it (Part 7 switch).
async function showRequesterName(page: Page) {
  if (test.info().project.name === "mobile") {
    await page.getByRole("button", { name: "Toggle navigation" }).click();
  }
}

test.describe("My Tickets", () => {
  test("populated: Requester A's first page, newest first", async ({ page, request }) => {
    const [a] = await demoRequesters(request);
    const expected = await listFor(a);
    await selectRequester(page, a);
    await page.goto("/tickets");

    await expect(rows(page)).toHaveCount(expected.data.length);
    await expect(page.getByText(`Showing 1 to ${expected.data.length} of ${expected.meta.total} tickets`)).toBeVisible();
    await expect(page.getByRole("banner")).toContainText(a.name);
    await showRequesterName(page);
    await shot(page, "populated");
  });

  test("switched: after A signs out and B signs in, A's Tickets are gone and B's are listed", async ({ page, request }) => {
    const [a, b] = await demoRequesters(request);
    const aList = await listFor(a);
    const bList = await listFor(b);
    await selectRequester(page, a);
    await page.goto("/tickets");
    await expect(page.getByText(aList.data[0].ticketNumber)).toBeVisible();

    await showRequesterName(page);
    await page.getByRole("banner").getByRole("button", { name: "Log Out" }).click();
    await page.getByLabel(/Email Address/).fill(b.account.email);
    await page.getByLabel(/^Password/).fill(b.account.password);
    await page.getByRole("button", { name: "Sign In" }).click();

    await expect(page.getByRole("banner")).toContainText(b.name);
    await expect(rows(page)).toHaveCount(bList.data.length);
    for (const row of aList.data) await expect(page.getByText(row.ticketNumber)).toHaveCount(0);
    await showRequesterName(page);
    await shot(page, "switched");
  });

  test("search: the search box narrows the list and Clear filters appears", async ({ page, request }) => {
    const [a] = await demoRequesters(request);
    const expected = await listFor(a, "&search=laptop");
    expect(expected.meta.total).toBeGreaterThan(0);
    await selectRequester(page, a);
    await page.goto("/tickets");
    await expect(rows(page).first()).toBeVisible();

    await page.getByLabel("Search", { exact: true }).fill("laptop");
    await expect(page).toHaveURL(/search=laptop/);
    await expect(rows(page)).toHaveCount(expected.data.length);
    await expect(page.getByRole("button", { name: "Clear filters" })).toBeVisible();
    await shot(page, "search");
  });

  test("filters: Category and Current Status filters active", async ({ page, request }) => {
    const [a] = await demoRequesters(request);
    const categories: { id: number; name: string }[] = await (await request.get(`${API_URL}/api/categories`)).json();
    const cat = categories[1];
    const expected = await listFor(a, `&categoryId=${cat.id}&currentStatus=NEW`);
    expect(expected.meta.total).toBeGreaterThan(0);
    await selectRequester(page, a);
    await page.goto("/tickets");
    await expect(rows(page).first()).toBeVisible();

    await page.getByLabel("Category").selectOption(String(cat.id));
    await page.getByLabel("Current Status").selectOption("NEW");
    await expect(page).toHaveURL(new RegExp(`categoryId=${cat.id}`));
    await expect(rows(page)).toHaveCount(expected.data.length);
    await expect(page.getByRole("button", { name: "Clear filters" })).toBeVisible();
    await shot(page, "filters");
  });

  test("sorted: Ticket Number ascending", async ({ page, request }) => {
    const [a] = await demoRequesters(request);
    const expected = await listFor(a, "&sort=ticketNumber:asc");
    await selectRequester(page, a);
    await page.goto("/tickets");
    await expect(rows(page).first()).toBeVisible();

    await page.getByLabel("Sort").selectOption("ticketNumber:asc");
    await expect(page).toHaveURL(/sort=ticketNumber%3Aasc/);
    // the number text alone: the row link at md+ carries just the number, the
    // mobile card link carries the whole card, so read the number element
    // Lab 3 (#39): the URL changes before the re-sorted list arrives, so the
    // rows are read once they have re-rendered rather than at that instant -
    // the same assertion, without the race that failed 2 runs in 24.
    const numberCells = page.locator(".tk-row-link, .tk-ticket-card-number");
    await expect.poll(() => numberCells.allTextContents()).toEqual(expected.data.map((r) => r.ticketNumber));
    const numbers = await numberCells.allTextContents();
    expect(numbers).toEqual([...numbers].sort());
    await shot(page, "sorted");
  });

  test("page-2: the second page of Requester A's list", async ({ page, request }) => {
    const [a] = await demoRequesters(request);
    const expected = await listFor(a, "&page=2");
    expect(expected.meta.totalPages).toBeGreaterThanOrEqual(2);
    await selectRequester(page, a);
    await page.goto("/tickets");
    await expect(rows(page).first()).toBeVisible();

    await page.getByRole("button", { name: "Next" }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(rows(page)).toHaveCount(expected.data.length);
    await expect(page.getByText(`Showing 11 to ${10 + expected.data.length} of ${expected.meta.total} tickets`)).toBeVisible();
    await expect(page.getByRole("button", { name: "Next" })).toBeDisabled();
    await shot(page, "page-2");
  });

  test("loading: skeleton while the list request is in flight", async ({ page, request }) => {
    const [a] = await demoRequesters(request);
    await selectRequester(page, a);
    await page.route(LIST_ROUTE, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 4000));
      await route.continue();
    });
    await page.goto("/tickets");
    const region = page.getByRole("region", { name: "Ticket list" });
    await expect(region).toHaveAttribute("aria-busy", "true");
    await shot(page, "loading");
  });

  test("empty: Requester C owns nothing", async ({ page, request }) => {
    const [, , c] = await demoRequesters(request);
    const list = await listFor(c);
    expect(list.meta.total, "the demo seed leaves the third Requester without Tickets").toBe(0);
    await selectRequester(page, c);
    await page.goto("/tickets");

    await expect(page.getByRole("heading", { name: "No tickets yet" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Ticket list" }).getByRole("link", { name: "Create Ticket" })).toBeVisible();
    await shot(page, "empty");
  });

  test("no-results: a search that excludes every Ticket", async ({ page, request }) => {
    const [a] = await demoRequesters(request);
    await selectRequester(page, a);
    await page.goto("/tickets?search=zzzz-no-such-ticket");

    await expect(page.getByRole("heading", { name: "No matches" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Ticket list" }).getByRole("button", { name: "Clear filters" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "No tickets yet" })).toHaveCount(0);
    await shot(page, "no-results");
  });

  test("failure: safe panel with Retry, toolbar kept", async ({ page, request }) => {
    const [a] = await demoRequesters(request);
    await selectRequester(page, a);
    await page.route(LIST_ROUTE, (route) => route.abort("connectionrefused"));
    await page.goto("/tickets");

    const alert = page.getByRole("alert");
    await expect(alert).toContainText("Something went wrong on our side. Your work has not been lost - please try again.");
    await expect(alert.getByRole("button", { name: "Retry" })).toBeVisible();
    await expect(page.getByLabel("Search", { exact: true })).toBeVisible();
    await shot(page, "failure");
  });

  test("forbidden: Requester B opening one of A's Tickets is refused with 404 (C-65)", async ({ page, request }) => {
    const [a, b] = await demoRequesters(request);
    const aList = await listFor(a);
    const target = aList.data[0];

    const asB = await apiAs(b.account);
    const direct = await asB.get(`/api/tickets/${target.id}`);
    expect(direct.status()).toBe(404);
    expect((await direct.json()).error.code).toBe("TICKET_NOT_FOUND");
    await asB.dispose();

    await selectRequester(page, b);
    await page.goto(`/tickets/${target.id}`);
    const alert = page.getByRole("alert");
    await expect(alert).toContainText("That item does not exist.");
    await expect(page.getByText(target.ticketNumber)).toHaveCount(0);
    await expect(alert.getByRole("link", { name: "Back to My Tickets" })).toBeVisible();
    await shot(page, "forbidden");
  });
});
