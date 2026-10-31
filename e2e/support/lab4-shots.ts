import fs from "node:fs";
import path from "node:path";
import { expect, type APIRequestContext, type Page } from "@playwright/test";
import { test } from "./console";
import { ADMINISTRATOR, E2E_REQUESTER, apiAs, settle } from "./auth";

// Shared helpers for the Issue #70 specs (e2e/lab-04/). Screenshots are written
// by the specs into artifacts/lab-04/screenshots/<folder>/ under the names
// ui-spec.md section 15 fixes: <screen>-<viewport>-<state>.png. Every capture
// waits for transitions to settle, and every image is the real running app
// (CLAUDE.md, Evidence); the one mocked state is named "-mocked".

export type ShotFolder = "staff-dashboard" | "requester-dashboard" | "actions-taken" | "ticket-workflow" | "regression";

export const SHOTS_ROOT = path.resolve(__dirname, "../../artifacts/lab-04/screenshots");

export const vp = () => test.info().project.name;
export const SIGNED_OUT = { cookies: [], origins: [] };

export async function capture(page: Page, folder: ShotFolder, name: string, fullPage = true): Promise<void> {
  await settle(page);
  const dir = path.join(SHOTS_ROOT, folder);
  fs.mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: path.join(dir, `${name.replace("<vp>", vp())}.png`), fullPage });
}

export async function openNavIfMobile(page: Page): Promise<void> {
  if (vp() === "mobile") {
    await page.getByRole("button", { name: "Toggle navigation" }).click();
    await expect(page.locator("#tk-nav-panel")).toHaveClass(/show/);
  }
}

// Holds every request matching `pattern` until release(), then lets it through.
// Used to catch a Loading state the real server answers too quickly to see.
export async function hold(page: Page, pattern: string): Promise<() => Promise<void>> {
  let release!: () => void;
  const held = new Promise<void>((resolve) => (release = resolve));
  const pending: Promise<void>[] = [];
  await page.route(pattern, (route) => {
    const handled = (async () => {
      await held;
      await route.continue();
    })();
    pending.push(handled);
    return handled;
  });
  return async () => {
    release();
    await Promise.all(pending);
    await page.unroute(pattern);
  };
}

export type TicketRef = { id: number; ticketNumber: string };

// A Ticket created through the API as the dedicated E2E Requester (the demo
// seed never touches this account, #40). The summary carries the viewport so
// the three parallel projects never share a Ticket.
export async function newTicket(summary: string, overrides: Record<string, unknown> = {}): Promise<TicketRef> {
  const requester = await apiAs(E2E_REQUESTER);
  try {
    const categories = (await (await requester.get("/api/categories")).json()) as Array<{ id: number }>;
    const systems = (await (await requester.get("/api/related-systems")).json()) as Array<{ id: number }>;
    const res = await requester.post("/api/tickets", {
      data: {
        categoryId: categories[0].id,
        relatedSystemId: systems[0].id,
        summary: `${summary} (${vp()})`,
        description: `Created by an e2e/lab-04 spec (${vp()}).`,
        requestedPriority: "MEDIUM",
        ...overrides,
      },
    });
    expect(res.status(), summary).toBe(201);
    return (await res.json()) as TicketRef;
  } finally {
    await requester.dispose();
  }
}

export type NewAction = {
  status?: "PLANNED" | "COMPLETED";
  description?: string;
  result?: string;
  followUpRequired?: boolean;
  followUpNote?: string;
  assigneeId?: number;
  attachmentNotes?: string;
};

// Records an action through the real API (api-spec 3.1) and returns the Ticket.
export async function addAction(staff: APIRequestContext, ticketId: number, a: NewAction = {}) {
  const status = a.status ?? "COMPLETED";
  const res = await staff.post(`/api/tickets/${ticketId}/actions`, {
    data: {
      status,
      actionAt: new Date().toISOString(),
      description: a.description ?? "Checked the equipment on site.",
      ...(a.assigneeId ? { assigneeId: a.assigneeId } : {}),
      ...(a.attachmentNotes ? { attachmentNotes: a.attachmentNotes } : {}),
      ...(status === "COMPLETED"
        ? { result: a.result ?? "Working again.", followUpRequired: a.followUpRequired ?? false, ...(a.followUpRequired ? { followUpNote: a.followUpNote ?? "Check again next week." } : {}) }
        : {}),
    },
  });
  expect(res.status(), `action on ticket ${ticketId}`).toBe(201);
  return (await res.json()) as StaffTicketJson;
}

export type StaffTicketJson = {
  id: number;
  version: number;
  currentStatus: string;
  actions: Array<{ id: number; version: number; status: string; description: string; allowedOperations: string[] }>;
  allowedTransitions: string[];
  resolutionGate: { met: boolean; reasons: string[] };
};

export async function staffTicket(staff: APIRequestContext, id: number): Promise<StaffTicketJson> {
  const res = await staff.get(`/api/staff/tickets/${id}`);
  expect(res.status(), `GET staff ticket ${id}`).toBe(200);
  return (await res.json()) as StaffTicketJson;
}

export async function claim(staff: APIRequestContext, id: number): Promise<void> {
  const res = await staff.post(`/api/staff/tickets/${id}/claim`);
  expect(res.status(), `claim ${id}`).toBe(200);
}

export async function userIdByEmail(admin: APIRequestContext, email: string): Promise<number> {
  const res = await admin.get(`/api/users?search=${encodeURIComponent(email)}`);
  expect(res.status()).toBe(200);
  const rows = (await res.json()) as Array<{ id: number; email: string }>;
  const row = rows.find((r) => r.email === email);
  if (!row) throw new Error(`no user ${email}`);
  return row.id;
}

// The staff Ticket Detail screen, loaded and showing its Ticket Number.
export async function gotoStaffDetail(page: Page, t: TicketRef): Promise<void> {
  await page.goto(`/queue/${t.id}`);
  await expect(page.getByRole("heading", { level: 1, name: t.ticketNumber })).toBeVisible();
  await expect(page.getByRole("region", { name: "Actions Taken" })).toBeVisible();
}

export async function gotoRequesterDetail(page: Page, t: TicketRef): Promise<void> {
  await page.goto(`/tickets/${t.id}`);
  await expect(page.getByRole("heading", { level: 1, name: t.ticketNumber })).toBeVisible();
}

export function actionRow(page: Page, text: string) {
  return page.locator("li.tk-action-row", { hasText: text });
}

export async function expectNoHorizontalScroll(page: Page): Promise<void> {
  // Against the configured width: a mobile browser widens window.innerWidth to fit overflowing content.
  const width = test.info().project.use.viewport!.width;
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(scrollWidth, `scrollWidth ${scrollWidth} > viewport ${width} on ${page.url()}`).toBeLessThanOrEqual(width);
}

// An Administrator account created for one test through the real route
// (api-spec 9.2) and brought out of its first-login state through the real
// change-password route, so it owns nothing: the honest source of the
// dashboard's "zero" state wherever the seeded Administrator has since claimed
// Tickets. Every call is the one the screens make; no row is written by hand.
//
// The account is active only while the test needs it: `retire` deactivates it
// through PATCH /api/users/:id (the Administrator's own action), so the "exactly
// one active Administrator" precondition of Lab 3's E2E-23 holds again within
// seconds. Call it in a `finally`.
export async function freshAdministrator(label: string): Promise<{ email: string; password: string; retire: () => Promise<void> }> {
  const admin = await apiAs(ADMINISTRATOR);
  const initial = "Zero-Admin#2026";
  const email = `zero.admin.${label}.${Date.now()}@example.ac.th`;
  let id = 0;
  try {
    const created = await admin.post("/api/users", {
      data: { name: "Zero Admin", email, role: "ADMINISTRATOR", isActive: true, initialPassword: initial },
    });
    expect(created.status(), "create the zero-state Administrator").toBe(201);
    id = ((await created.json()) as { id: number }).id;
  } finally {
    await admin.dispose();
  }
  const password = "Zero-Admin#2027";
  const fresh = await apiAs({ email, password: initial });
  try {
    const changed = await fresh.post("/api/auth/change-password", {
      data: { currentPassword: initial, newPassword: password, confirmPassword: password },
    });
    expect(changed.status(), "first password change").toBe(200);
  } finally {
    await fresh.dispose();
  }
  const retire = async () => {
    const again = await apiAs(ADMINISTRATOR);
    try {
      const res = await again.patch(`/api/users/${id}`, { data: { name: "Zero Admin", email, role: "ADMINISTRATOR", isActive: false } });
      expect(res.status(), "retire the zero-state Administrator").toBe(200);
    } finally {
      await again.dispose();
    }
  };
  return { email, password, retire };
}
