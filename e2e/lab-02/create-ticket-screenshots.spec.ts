import { test, expect, type Page } from "@playwright/test";
import path from "node:path";
import { API_URL } from "../../playwright.config";

// Create Ticket - screenshot evidence for LS 14 Part 6: the six states
// ui-spec.md section 11 fixes, at the three C-10 viewports, written to
// artifacts/lab-02/screenshots/create-ticket/create-<vp>-<state>.png.
//
// Initial, validation, success and invalid-attachment use the real API.
// Submitting delays POST /api/tickets at the network layer; API failure
// fulfils it with the api-spec.md 1.1 INTERNAL_ERROR envelope.
//
// The success capture creates one real Ticket per viewport. It does so as the
// LAST active Development Requester, which the demo seed never touches: the
// seed assigns Part 7's fixture to the first three active Requesters (A with
// 14 Tickets, B with 3, C with none), so rows created here can never drift
// those counts. The graded seed guarantees at least four active Requesters.
//
// Requires the manual start sequence in docs/lab-02/tests.md section 5.

const SHOT_DIR = path.resolve(__dirname, "../../artifacts/lab-02/screenshots/create-ticket");
const STORAGE_KEY = "toktickit.requesterId";
const TICKETS_ROUTE = "**/api/tickets";

const SUMMARY = "Laptop battery drains quickly";
const DESCRIPTION = "The battery drops from full to twenty percent within an hour of light use.";

function shot(page: Page, state: string) {
  const vp = test.info().project.name;
  return page.screenshot({ path: path.join(SHOT_DIR, `create-${vp}-${state}.png`), fullPage: true });
}

async function openForm(page: Page) {
  await page.goto("/tickets/new");
  const category = page.getByLabel("Category", { exact: false });
  await expect(category).toBeEnabled();
  await expect(page.getByLabel("Related System", { exact: false })).toBeEnabled();
  // Submit is disabled while reference data loads; let its 150 ms transition to
  // the primary fill finish so no capture shows a half-painted button
  await expect(page.getByRole("button", { name: "Submit Ticket" })).toHaveCSS("background-color", "rgb(0, 107, 60)");
  return { category };
}

async function fillValid(page: Page) {
  await page.getByLabel("Category", { exact: false }).selectOption({ index: 1 });
  await page.getByLabel("Related System", { exact: false }).selectOption({ index: 1 });
  await page.getByLabel("Ticket Summary", { exact: false }).fill(SUMMARY);
  await page.getByLabel("Description", { exact: false }).fill(DESCRIPTION);
}

test.beforeEach(async ({ page, request }) => {
  // Select the screenshot Requester before the app boots, the same way the
  // Selection screen would have stored it (C-32). See the note above on why
  // it is the last active Requester and never one of the demo seed's three.
  const res = await request.get(`${API_URL}/api/requesters`);
  expect(res.ok()).toBeTruthy();
  const requesters: Array<{ id: number }> = await res.json();
  expect(requesters.length, "the graded seed provides at least four active Requesters").toBeGreaterThanOrEqual(4);
  const screenshotRequester = requesters[requesters.length - 1];
  await page.addInitScript(
    ([key, id]) => window.localStorage.setItem(key, String(id)),
    [STORAGE_KEY, screenshotRequester.id] as const,
  );
});

test.describe("Create Ticket", () => {
  test("initial: reference data loaded, Medium preset, Submit enabled", async ({ page }) => {
    await openForm(page);
    await expect(page.getByLabel("Requested Priority", { exact: false })).toHaveValue("MEDIUM");
    await expect(page.getByLabel("Ticket Number")).toHaveValue("Generated on submission");
    await expect(page.getByRole("button", { name: "Submit Ticket" })).toBeEnabled();
    await shot(page, "initial");
  });

  test("validation: catalogue messages under each field, no request sent", async ({ page }) => {
    let posted = false;
    await page.route(TICKETS_ROUTE, (route) => {
      posted = true;
      return route.continue();
    });
    await openForm(page);
    await page.getByLabel("Requested Priority", { exact: false }).selectOption("");
    await page.getByRole("button", { name: "Submit Ticket" }).click();

    await expect(page.getByText("Ticket Summary is required and must be between 5 and 120 characters.")).toBeVisible();
    await expect(page.getByText("Description is required and must be between 20 and 5000 characters.")).toBeVisible();
    await expect(page.getByText("Category is required.")).toBeVisible();
    await expect(page.getByText("Related System is required.")).toBeVisible();
    await expect(page.getByText("Requested Priority is required.")).toBeVisible();
    await expect(page.getByLabel("Category", { exact: false })).toBeFocused();
    expect(posted).toBe(false);
    await shot(page, "validation");
  });

  test("submitting: busy button, fields locked", async ({ page }) => {
    await page.route(TICKETS_ROUTE, async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      await new Promise((resolve) => setTimeout(resolve, 4000));
      await route.continue();
    });
    await openForm(page);
    await fillValid(page);
    await page.getByRole("button", { name: "Submit Ticket" }).click();

    const busy = page.getByRole("button", { name: "Submitting…" });
    await expect(busy).toBeVisible();
    await expect(busy).toBeDisabled();
    await expect(page.getByLabel("Ticket Summary", { exact: false })).toHaveAttribute("readonly", "");
    await shot(page, "submitting");
  });

  test("success: the generated Ticket Number and the next actions", async ({ page }) => {
    await openForm(page);
    await fillValid(page);
    await page.getByRole("button", { name: "Submit Ticket" }).click();

    const panel = page.getByRole("status", { name: "Ticket created" });
    await expect(panel).toBeVisible();
    await expect(panel.locator(".tk-ticket-number")).toHaveText(/^TKT-\d{4}-\d{6}$/);
    await expect(panel.getByRole("link", { name: "View Ticket" })).toBeVisible();
    await expect(panel.getByRole("button", { name: "Create another ticket" })).toBeVisible();
    await shot(page, "success");
  });

  test("api-failure: safe banner, every entered value preserved", async ({ page }) => {
    await page.route(TICKETS_ROUTE, (route) =>
      route.request().method() === "POST"
        ? route.fulfill({
            status: 500,
            contentType: "application/json",
            body: JSON.stringify({ error: { code: "INTERNAL_ERROR", message: "Something went wrong on our side." } }),
          })
        : route.continue(),
    );
    await openForm(page);
    await fillValid(page);
    await page.getByLabel("Requested Priority", { exact: false }).selectOption("HIGH");
    await page.getByLabel("Attachments").setInputFiles({
      name: "screenshot.png",
      mimeType: "image/png",
      buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64"),
    });
    await page.getByRole("button", { name: "Submit Ticket" }).click();

    const alert = page.getByRole("alert");
    await expect(alert).toContainText("Something went wrong on our side. Your work has not been lost - please try again.");
    await expect(page.getByLabel("Ticket Summary", { exact: false })).toHaveValue(SUMMARY);
    await expect(page.getByLabel("Description", { exact: false })).toHaveValue(DESCRIPTION);
    await expect(page.getByLabel("Requested Priority", { exact: false })).toHaveValue("HIGH");
    await expect(page.getByText("screenshot.png")).toBeVisible();
    await expect(page.getByRole("button", { name: "Submit Ticket" })).toBeEnabled();
    await shot(page, "api-failure");
  });

  test("invalid-attachment: the client marks a refused file before any request", async ({ page }) => {
    await openForm(page);
    await fillValid(page);
    await page.getByLabel("Attachments").setInputFiles([
      { name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("plain text") },
      { name: "report.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 minimal") },
    ]);

    await expect(
      page.getByText("notes.txt is not a permitted file type. Allowed types are JPG, PNG, WEBP and PDF."),
    ).toBeVisible();
    await expect(page.getByText("report.pdf")).toBeVisible();
    await expect(page.getByRole("button", { name: "Remove notes.txt" })).toBeVisible();
    await shot(page, "invalid-attachment");
  });
});
