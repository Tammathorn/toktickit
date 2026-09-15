import { test, expect, type Page, type APIRequestContext } from "@playwright/test";
import path from "node:path";
import { API_URL } from "../../playwright.config";

// Requester Ticket Detail - screenshot evidence for LS 14 Part 8 at the three
// C-10 viewports, written to artifacts/lab-02/screenshots/ticket-detail/detail-<vp>-<state>.png.
//
// Every Ticket here is created through the API as the LAST active Development
// Requester - the one the demo seed never touches - so Part 7's counts for
// Requesters A, B and C (14 / 3 / 0) cannot drift. The unauthorized capture
// uses Requester B only as the caller; nothing of B's is created or changed.
//
// Requires the manual start sequence in docs/lab-02/tests.md section 5.

const SHOT_DIR = path.resolve(__dirname, "../../artifacts/lab-02/screenshots/ticket-detail");
const STORAGE_KEY = "toktickit.requesterId";

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);
const PDF = Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n");

type Requester = { id: number; name: string };

function shot(page: Page, state: string, fullPage = true) {
  const vp = test.info().project.name;
  return page.screenshot({ path: path.join(SHOT_DIR, `detail-${vp}-${state}.png`), fullPage });
}

async function requesters(request: APIRequestContext): Promise<{ owner: Requester; other: Requester }> {
  const res = await request.get(`${API_URL}/api/requesters`);
  expect(res.ok()).toBeTruthy();
  const all: Requester[] = await res.json();
  expect(all.length, "the graded seed provides at least four active Requesters").toBeGreaterThanOrEqual(4);
  return { owner: all[all.length - 1], other: all[1] };
}

async function createTicket(request: APIRequestContext, requesterId: number, summary: string): Promise<number> {
  const categories = await (await request.get(`${API_URL}/api/categories`)).json();
  const systems = await (await request.get(`${API_URL}/api/related-systems`)).json();
  const res = await request.post(`${API_URL}/api/tickets`, {
    data: {
      requesterId,
      categoryId: categories[0].id,
      relatedSystemId: systems[0].id,
      summary,
      description: `Created by ticket-detail-screenshots.spec.ts (${test.info().project.name}) for Part 8 evidence.`,
      requestedPriority: "MEDIUM",
    },
  });
  expect(res.status()).toBe(201);
  return (await res.json()).id;
}

async function attach(request: APIRequestContext, ticketId: number, requesterId: number, name: string, mimeType: string, buffer: Buffer): Promise<number> {
  const res = await request.post(`${API_URL}/api/tickets/${ticketId}/attachments?requesterId=${requesterId}`, {
    multipart: { file: { name, mimeType, buffer } },
  });
  expect(res.status()).toBe(201);
  return (await res.json()).id;
}

async function openAs(page: Page, requesterId: number, ticketId: number) {
  await page.addInitScript(([key, value]) => window.localStorage.setItem(key, String(value)), [STORAGE_KEY, requesterId] as const);
  await page.goto(`/tickets/${ticketId}`);
}

const activeGroup = (page: Page) => page.getByRole("list", { name: "Active attachments" });
const removedGroup = (page: Page) => page.getByRole("list", { name: "Removed attachments" });

test.describe("Requester Ticket Detail", () => {
  test("active: the owned detail with two active attachments", async ({ page, request }) => {
    const { owner } = await requesters(request);
    const ticketId = await createTicket(request, owner.id, "Detail evidence: active attachments");
    await attach(request, ticketId, owner.id, "battery-report.pdf", "application/pdf", PDF);
    await attach(request, ticketId, owner.id, "screenshot.png", "image/png", PNG);

    await openAs(page, owner.id, ticketId);
    await expect(page.getByRole("heading", { level: 1, name: /^TKT-/ })).toBeVisible();
    await expect(page.getByRole("region", { name: "Ticket information" })).toBeVisible();
    await expect(activeGroup(page).getByRole("listitem")).toHaveCount(2);
    await expect(page.getByText("2 of 5 active")).toBeVisible();
    await expect(page.getByRole("button", { name: "Download battery-report.pdf" })).toBeVisible();
    await shot(page, "active");
  });

  test("add-attachment: a file added from the detail appears in the active group", async ({ page, request }) => {
    const { owner } = await requesters(request);
    const ticketId = await createTicket(request, owner.id, "Detail evidence: add attachment");
    await attach(request, ticketId, owner.id, "battery-report.pdf", "application/pdf", PDF);

    await openAs(page, owner.id, ticketId);
    await expect(page.getByText("1 of 5 active")).toBeVisible();
    await page.getByLabel("Add attachment").setInputFiles({ name: "new-photo.png", mimeType: "image/png", buffer: PNG });

    await expect(activeGroup(page).getByText("new-photo.png")).toBeVisible();
    await expect(page.getByText("2 of 5 active")).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`/tickets/${ticketId}$`));
    await shot(page, "add-attachment");
  });

  test("download: an active attachment is served with Content-Disposition attachment", async ({ page, request }) => {
    const { owner } = await requesters(request);
    const ticketId = await createTicket(request, owner.id, "Detail evidence: download");
    const id = await attach(request, ticketId, owner.id, "battery-report.pdf", "application/pdf", PDF);

    const direct = await request.get(`${API_URL}/api/attachments/${id}/download?requesterId=${owner.id}`);
    expect(direct.status()).toBe(200);
    expect(direct.headers()["content-disposition"]).toBe('attachment; filename="battery-report.pdf"');

    await openAs(page, owner.id, ticketId);
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download battery-report.pdf" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("battery-report.pdf");
    await expect(page.getByText("Downloaded battery-report.pdf")).toBeVisible();
    await shot(page, "download");
  });

  test("removal-dialog: names the file, requires a reason, Remove gated on it", async ({ page, request }) => {
    const { owner } = await requesters(request);
    const ticketId = await createTicket(request, owner.id, "Detail evidence: removal dialog");
    await attach(request, ticketId, owner.id, "screenshot.png", "image/png", PNG);

    await openAs(page, owner.id, ticketId);
    await page.getByRole("button", { name: "Remove screenshot.png" }).click();
    const dialog = page.getByRole("dialog", { name: "Remove attachment" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/Remove screenshot\.png\?/)).toBeVisible();
    const confirm = dialog.getByRole("button", { name: "Remove" });
    await expect(confirm).toBeDisabled();
    await dialog.getByLabel("Removal reason", { exact: false }).fill("Uploaded the wrong screenshot.");
    await expect(confirm).toBeEnabled();
    // the destructive fill settles after Bootstrap's 150 ms button transition
    await expect(confirm).toHaveCSS("background-color", "rgb(164, 38, 44)");
    // a fixed-position modal is captured at viewport size, not stitched full-page
    await shot(page, "removal-dialog", false);
  });

  test("removed: metadata and reason stay visible after reload; no Download, no Preview", async ({ page, request }) => {
    const { owner } = await requesters(request);
    const ticketId = await createTicket(request, owner.id, "Detail evidence: removed");
    await attach(request, ticketId, owner.id, "battery-report.pdf", "application/pdf", PDF);
    await attach(request, ticketId, owner.id, "screenshot.png", "image/png", PNG);

    await openAs(page, owner.id, ticketId);
    await page.getByRole("button", { name: "Remove screenshot.png" }).click();
    const dialog = page.getByRole("dialog", { name: "Remove attachment" });
    await dialog.getByLabel("Removal reason", { exact: false }).fill("Uploaded the wrong screenshot.");
    await dialog.getByRole("button", { name: "Remove" }).click();
    await expect(dialog).toBeHidden();

    // AC-34: reload, and the removed row is still there with its reason
    await page.reload();
    const row = removedGroup(page).getByRole("listitem");
    await expect(row).toHaveCount(1);
    await expect(row).toContainText("screenshot.png");
    await expect(row).toContainText("Reason: Uploaded the wrong screenshot.");
    await expect(row.getByRole("button")).toHaveCount(0);
    await expect(page.getByText("1 of 5 active")).toBeVisible();
    await shot(page, "removed");
  });

  test("blocked-download: a removed file answers 410 and the row turns unavailable (C-46)", async ({ page, request }) => {
    const { owner } = await requesters(request);
    const ticketId = await createTicket(request, owner.id, "Detail evidence: blocked download");
    const id = await attach(request, ticketId, owner.id, "screenshot.png", "image/png", PNG);

    await openAs(page, owner.id, ticketId);
    await expect(page.getByRole("button", { name: "Download screenshot.png" })).toBeEnabled();

    // removed behind the view's back, then the direct request and the UI both refuse
    const removal = await request.delete(`${API_URL}/api/attachments/${id}?requesterId=${owner.id}`, {
      data: { removalReason: "Removed while the detail was open." },
    });
    expect(removal.status()).toBe(200);
    const direct = await request.get(`${API_URL}/api/attachments/${id}/download?requesterId=${owner.id}`);
    expect(direct.status()).toBe(410);
    expect((await direct.json()).error.code).toBe("ATTACHMENT_REMOVED");

    await page.getByRole("button", { name: "Download screenshot.png" }).click();
    await expect(page.getByText("This attachment cannot be opened right now.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Download screenshot.png" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Refresh" })).toBeVisible();
    await shot(page, "blocked-download");
  });

  test("unauthorized: another Requester opening the Ticket is refused with 403", async ({ page, request }) => {
    const { owner, other } = await requesters(request);
    const ticketId = await createTicket(request, owner.id, "Detail evidence: unauthorized");
    const id = await attach(request, ticketId, owner.id, "screenshot.png", "image/png", PNG);

    const ticket = await request.get(`${API_URL}/api/tickets/${ticketId}?requesterId=${other.id}`);
    expect(ticket.status()).toBe(403);
    const file = await request.get(`${API_URL}/api/attachments/${id}/download?requesterId=${other.id}`);
    expect(file.status()).toBe(403);
    expect((await file.json()).error.code).toBe("ATTACHMENT_FORBIDDEN");

    await openAs(page, other.id, ticketId);
    const alert = page.getByRole("alert");
    await expect(alert).toContainText("You do not have access to that item.");
    await expect(page.getByText(/^TKT-\d{4}-\d{6}$/)).toHaveCount(0);
    await expect(page.getByRole("banner")).toContainText(other.name);
    await shot(page, "unauthorized");
  });
});
