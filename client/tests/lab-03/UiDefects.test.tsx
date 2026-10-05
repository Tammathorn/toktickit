import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import fs from "node:fs";
import path from "node:path";
import App from "../../src/App.js";
import * as api from "../../src/api.js";
import { ADMINISTRATOR, IT_STAFF, REQUESTER_A, signInAs } from "../support/auth.js";

// Issue #12 (feature/lab3-12-ui-evidence): the visual-checklist defects whose
// fix is visible in the DOM or the theme. The layout defects (the Queue table
// at 1280, User Management at 834) need real CSS and a real viewport, so they
// are Playwright's job: e2e/lab-03/visual-evidence.spec.ts, RESP-11..RESP-13.
// jsdom has no matchMedia, so useMediaQuery reports the widest layout here.

function row(id: number, summary: string, extra: Partial<api.TicketListRow> = {}): api.TicketListRow {
  return {
    id,
    ticketNumber: `TKT-2026-${String(id).padStart(6, "0")}`,
    summary,
    category: { id: 2, name: "Hardware" },
    relatedSystem: { id: 6, name: "Printer" },
    requestedPriority: "MEDIUM",
    itPriority: "MEDIUM",
    currentStatus: "NEW",
    requesterResolvedAt: null,
    createdAt: "2026-09-05T04:12:33.000Z",
    updatedAt: "2026-09-05T04:12:33.041Z",
    ...extra,
  };
}

function staffTicket(): api.StaffTicket {
  return {
    id: 77,
    ticketNumber: "TKT-2026-000077",
    requester: { id: 1, name: "Anucha Prasert", email: "anucha.p@example.ac.th" },
    category: { id: 2, name: "Hardware" },
    relatedSystem: { id: 6, name: "Printer" },
    summary: "Laptop battery drains quickly",
    description: "Line one.",
    requestedPriority: "MEDIUM",
    itPriority: "MEDIUM",
    currentStatus: "NEW",
    owner: null,
    requesterResolvedAt: null,
    createdAt: "2026-09-05T04:12:33.000Z",
    updatedAt: "2026-09-05T05:02:44.000Z",
    attachments: [],
    publicComments: [],
    internalNotes: [],
  };
}

function requesterTicket(): api.Ticket {
  const s = staffTicket();
  return {
    id: s.id, ticketNumber: s.ticketNumber, requester: { id: s.requester.id, name: s.requester.name },
    category: s.category, relatedSystem: s.relatedSystem, summary: s.summary, description: s.description,
    requestedPriority: s.requestedPriority, itPriority: s.itPriority, currentStatus: "OPEN", owner: null,
    requesterResolvedAt: null, createdAt: s.createdAt, updatedAt: s.updatedAt, attachments: [], publicComments: [],
  };
}

function entry(id: number, body: string): api.Entry {
  return { id, body, author: { id: 6, name: "Araya Methee", role: "IT_STAFF" }, createdAt: "2026-09-05T06:00:00.000Z" };
}

// ui-spec 20.1 Success: a --tk-pale panel, a check icon and a sentence,
// announced politely - never colour alone.
function expectSuccess(text: HTMLElement) {
  const panel = text.closest(".tk-panel-success") as HTMLElement;
  expect(panel, "inside the success panel").not.toBeNull();
  expect(panel).toHaveClass("tk-panel-pale");
  expect(panel).toHaveAttribute("role", "status");
  expect(panel).toHaveAttribute("aria-live", "polite");
  expect(panel.querySelector("svg.tk-success-icon")).not.toBeNull();
}

beforeEach(() => {
  window.history.replaceState({}, "", "/");
  signInAs(REQUESTER_A);
  vi.spyOn(api, "fetchCategories").mockResolvedValue([{ id: 2, name: "Hardware" }]);
  vi.spyOn(api, "fetchRelatedSystems").mockResolvedValue([{ id: 6, name: "Printer" }]);
});
afterEach(() => vi.restoreAllMocks());

describe("Visual-checklist defects (Issue #12)", () => {
  it("UI-54 My Tickets: the Current Status cell also carries the IT Priority badge for the md table, hidden from lg where IT Priority has its own column (C-116, FR-31)", async () => {
    vi.spyOn(api, "fetchTickets").mockResolvedValue({
      data: [row(41, "Laptop battery drains quickly", { itPriority: "HIGH", currentStatus: "OPEN" })],
      meta: { page: 1, pageSize: 10, total: 1, totalPages: 1, sort: "createdAt:desc" },
    });
    window.history.pushState({}, "", "/tickets");
    render(<App />);
    const table = await screen.findByRole("table");
    const statusIndex = within(table).getAllByRole("columnheader").findIndex((h) => h.textContent === "Current Status");
    const cell = within(table).getAllByRole("row")[1].querySelectorAll("td")[statusIndex];
    const inCell = cell.querySelector(".d-lg-none");
    expect(inCell, "an md-only IT Priority wrapper in the Current Status cell").not.toBeNull();
    expect(inCell!.textContent).toMatch(/IT.*High/);
  });

  it("UI-55 a 404 renders the Not found state of ui-spec 20.1 - heading, a body naming what was addressed, a secondary link back - not the failure panel, and not Forbidden (C-65)", async () => {
    vi.spyOn(api, "fetchTicket").mockRejectedValue(new api.ApiError(404, "TICKET_NOT_FOUND", "That item does not exist."));
    window.history.pushState({}, "", "/tickets/999999");
    render(<App />);
    const heading = await screen.findByRole("heading", { level: 1, name: "That item does not exist." });
    const panel = heading.closest(".tk-not-found")!;
    expect(panel, "the Not found component").not.toBeNull();
    expect(panel).toHaveTextContent("There is no ticket with the ID 999999");
    expect(within(panel as HTMLElement).getByRole("link", { name: "Back to My Tickets" })).toHaveClass("btn-secondary");
    // not the --tk-danger failure panel (it keeps role="alert" so it is announced)
    expect(document.querySelector(".tk-panel-danger")).toBeNull();
    expect(screen.queryByText("You do not have access to that page.")).not.toBeInTheDocument();
  });

  it("UI-56 IT Staff Ticket Detail renders the same Not found state for a 404, linking back to the Ticket Queue (ui-spec 20.1)", async () => {
    signInAs(IT_STAFF);
    vi.spyOn(api, "fetchAssignableUsers").mockResolvedValue([]);
    vi.spyOn(api, "fetchStaffTicket").mockRejectedValue(new api.ApiError(404, "TICKET_NOT_FOUND", "That item does not exist."));
    window.history.pushState({}, "", "/queue/999999");
    render(<App />);
    const heading = await screen.findByRole("heading", { level: 1, name: "That item does not exist." });
    const panel = heading.closest(".tk-not-found") as HTMLElement;
    expect(panel).toHaveTextContent("There is no ticket with the ID 999999");
    expect(within(panel).getByRole("link", { name: "Back to the Ticket Queue" })).toHaveClass("btn-secondary");
    expect(document.querySelector(".tk-panel-danger")).toBeNull();
  });

  it("UI-57 IT Staff Ticket Detail confirms each write with the ui-spec 20.1 success panel - pale, check icon, sentence, polite (C-119)", async () => {
    signInAs(IT_STAFF);
    vi.spyOn(api, "fetchAssignableUsers").mockResolvedValue([]);
    const base = staffTicket();
    vi.spyOn(api, "fetchStaffTicket").mockResolvedValue(base);
    vi.spyOn(api, "claimTicket").mockResolvedValue({ ...base, owner: { id: 6, name: "Araya Methee", role: "IT_STAFF", isActive: true } });
    vi.spyOn(api, "postPublicComment").mockResolvedValue(entry(1, "We are looking at it."));
    vi.spyOn(api, "postInternalNote").mockResolvedValue(entry(2, "Battery model checked."));
    window.history.pushState({}, "", "/queue/77");
    render(<App />);
    await screen.findByRole("heading", { level: 1, name: "TKT-2026-000077" });
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Claim" }));
    expectSuccess(await screen.findByText("Ticket claimed."));

    await user.type(screen.getByLabelText("Add a comment"), "We are looking at it.");
    await user.click(screen.getByRole("button", { name: "Post Comment" }));
    expectSuccess(await screen.findByText("Comment posted."));

    await user.type(screen.getByLabelText("Add an internal note"), "Battery model checked.");
    await user.click(screen.getByRole("button", { name: "Add Note" }));
    expectSuccess(await screen.findByText("Internal note added."));
  });

  it("UI-58 Requester Ticket Detail confirms a posted comment with the success panel (C-119)", async () => {
    vi.spyOn(api, "fetchTicket").mockResolvedValue(requesterTicket());
    vi.spyOn(api, "postPublicComment").mockResolvedValue(entry(3, "Still happening after a restart."));
    window.history.pushState({}, "", "/tickets/77");
    render(<App />);
    await screen.findByRole("heading", { level: 1, name: "TKT-2026-000077" });
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Add a comment"), "Still happening after a restart.");
    await user.click(screen.getByRole("button", { name: "Post Comment" }));
    expectSuccess(await screen.findByText("Comment posted."));
  });

  it("UI-59 the User Management panels are real modals: Tab wraps inside, Escape closes, focus returns to the opener (ui-spec 22, checklist A11y row 4)", async () => {
    signInAs(ADMINISTRATOR);
    vi.spyOn(api, "fetchUsers").mockResolvedValue([
      { id: 10, name: "Panida Srisawat", email: "panida.s@example.test", role: "ADMINISTRATOR", isActive: true, mustChangePassword: false, createdAt: "2026-08-01T03:00:00.000Z", updatedAt: "2026-09-20T07:41:00.000Z" },
    ]);
    window.history.pushState({}, "", "/users");
    render(<App />);
    const opener = await screen.findByRole("button", { name: "Create User" });
    const user = userEvent.setup();
    await user.click(opener);
    const dialog = await screen.findByRole("dialog");
    const focusables = Array.from(dialog.querySelectorAll<HTMLElement>("input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])"));
    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    last.focus();
    await user.tab();
    expect(document.activeElement, "Tab past the last control wraps to the first").toBe(first);
    await user.tab({ shift: true });
    expect(document.activeElement, "Shift+Tab before the first wraps to the last").toBe(last);

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.activeElement, "focus restored to Create User").toBe(opener);
  });

  it("UI-60 a refused resolution report is the ui-spec 20.1 Conflict state: the message stays inline in the information card and the view is refreshed (C-76, 14.3)", async () => {
    const open = requesterTicket();
    vi.spyOn(api, "fetchTicket")
      .mockResolvedValueOnce(open)
      .mockResolvedValueOnce({ ...open, currentStatus: "RESOLVED" });
    vi.spyOn(api, "postRequesterResolved").mockRejectedValue(
      new api.ApiError(409, "RESOLUTION_NOT_PERMITTED_IN_STATUS", "You can only report this while the ticket is open or in progress."),
    );
    window.history.pushState({}, "", "/tickets/77");
    render(<App />);
    await screen.findByRole("heading", { level: 1, name: "TKT-2026-000077" });
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Problem Appears Resolved" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Report it" }));

    const info = screen.getByRole("region", { name: "Ticket information" });
    const conflict = await within(info).findByText("You can only report this while the ticket is open or in progress.");
    expect(conflict).toHaveClass("tk-conflict");
    // refreshed: the header now shows the status the server holds
    expect(await within(info).findByText("Resolved")).toHaveClass("tk-badge");
    expect(within(info).queryByRole("button", { name: "Problem Appears Resolved" })).not.toBeInTheDocument();
  });

  it("UI-61 User Management's Empty and No results states carry the ui-spec 20.1 icon and body, and differ from each other (17.3, C-121)", async () => {
    signInAs(ADMINISTRATOR);
    vi.spyOn(api, "fetchUsers").mockResolvedValue([]);
    window.history.pushState({}, "", "/users");
    render(<App />);
    const empty = (await screen.findByRole("heading", { name: "No users yet" })).closest(".tk-empty") as HTMLElement;
    expect(empty.querySelector("svg.tk-empty-icon"), "outline document icon").not.toBeNull();
    expect(empty).toHaveTextContent("There are no user accounts yet. Use Create User to add the first one.");

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Search"), "zzz");
    const none = (await screen.findByRole("heading", { name: "No matches" })).closest(".tk-empty") as HTMLElement;
    expect(none.querySelector("svg.tk-empty-icon"), "outline magnifier icon").not.toBeNull();
    expect(none.querySelector("svg")!.innerHTML).not.toBe(empty.querySelector("svg")?.innerHTML ?? "");
  });

  it("STYLE-13 a disabled primary and a disabled secondary button stay visibly different levels: filled versus outlined (C-118, ui-spec 7, 19)", () => {
    const css = fs.readFileSync(path.resolve(__dirname, "../../src/theme.css"), "utf8");
    const rule = (selector: string) => {
      const i = css.indexOf(selector + " {");
      expect(i, `${selector} rule exists`).toBeGreaterThan(-1);
      return css.slice(i, css.indexOf("}", i));
    };
    const primary = rule(".btn-primary:disabled, .btn-primary.disabled, .btn-danger:disabled, .btn-danger.disabled");
    expect(primary).toMatch(/--bs-btn-disabled-bg: var\(--tk-text-muted\)/);
    expect(primary).toMatch(/--bs-btn-disabled-color: var\(--tk-surface\)/);
    const secondary = rule(".btn-secondary:disabled, .btn-secondary.disabled");
    expect(secondary).toMatch(/--bs-btn-disabled-bg: var\(--tk-surface\)/);
    expect(secondary).toMatch(/--bs-btn-disabled-color: var\(--tk-text-muted\)/);
    expect(secondary).toMatch(/--bs-btn-disabled-border-color: var\(--tk-border\)/);
  });
});
