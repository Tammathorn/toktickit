import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App.js";
import * as api from "../../src/api.js";
import { IT_STAFF, signInAs } from "../support/auth.js";

// Planned rows from tests.md section 2.3: UI-16..UI-24, STYLE-03, STYLE-04
// (Issue #41). The API module is mocked at its boundary; the screen is
// reached through <App /> at /queue as a signed-in IT Staff user, so the
// guard and the shell are exercised as the user would see them.
//
// jsdom has no matchMedia, so useMediaQuery (ui-spec 15.2 vs 15.3 vs 15.4)
// always assumes the widest layout here (useMediaQuery.ts) - every test below
// exercises the desktop table. The tablet column count (RESP-04) and the
// mobile card layout are Playwright's job at real viewport widths (#48).

const CATEGORIES = [
  { id: 1, name: "Account and Access" },
  { id: 2, name: "Hardware" },
];

function row(id: number, summary: string, extra: Partial<api.QueueRow> = {}): api.QueueRow {
  return {
    id,
    ticketNumber: `TKT-2026-${String(id).padStart(6, "0")}`,
    summary,
    category: CATEGORIES[1],
    requestedPriority: "MEDIUM",
    itPriority: "MEDIUM",
    currentStatus: "NEW",
    owner: null,
    requesterResolvedAt: null,
    createdAt: "2026-09-05T04:12:33.000Z",
    updatedAt: "2026-09-05T04:12:33.041Z",
    ...extra,
  };
}

function page(data: api.QueueRow[], meta: Partial<api.QueuePage["meta"]> = {}): api.QueuePage {
  return {
    data,
    meta: {
      page: 1,
      pageSize: 10,
      total: data.length,
      totalPages: Math.max(1, Math.ceil(data.length / 10)),
      sort: "itPriority:desc,createdAt:asc",
      ...meta,
    },
  };
}

const ROWS = [
  row(41, "Laptop battery drains quickly", { itPriority: "HIGH", owner: { id: 6, name: "Araya Methee", isActive: true } }),
  row(42, "VPN drops every hour", { itPriority: "LOW" }),
];

function mockBase() {
  vi.spyOn(api, "fetchCategories").mockResolvedValue(CATEGORIES);
  vi.spyOn(api, "fetchAssignableUsers").mockRejectedValue(new Error("not built until #42"));
}

function renderQueue(path = "/queue") {
  window.history.pushState({}, "", path);
  render(<App />);
}

beforeEach(() => {
  window.history.replaceState({}, "", "/");
  signInAs(IT_STAFF);
  mockBase();
});
afterEach(() => vi.restoreAllMocks());

describe("IT Staff Ticket Queue", () => {
  it("UI-16 renders all nine FR-39 columns at desktop width (ui-spec 15.2)", async () => {
    vi.spyOn(api, "fetchQueue").mockResolvedValue(page(ROWS));
    renderQueue();

    const table = await screen.findByRole("table");
    const headers = within(table).getAllByRole("columnheader").map((h) => h.textContent);
    expect(headers).toEqual([
      "Ticket Number",
      "Created",
      "Ticket Summary",
      "Category",
      "Requested Priority",
      "IT Priority",
      "Current Status",
      "Ticket Owner",
      "Last Updated",
    ]);
  });

  it("UI-17 an owned row shows the owner's name; an unassigned row shows Unassigned on a pale cell (FR-40)", async () => {
    vi.spyOn(api, "fetchQueue").mockResolvedValue(page(ROWS));
    renderQueue();
    await screen.findByText("TKT-2026-000041");

    const table = screen.getByRole("table");
    expect(within(table).getByText("Araya Methee")).toBeInTheDocument();
    const unassigned = within(table).getByText("Unassigned");
    expect(unassigned).toHaveClass("tk-owner-unassigned");
    expect(unassigned.closest("td")).toHaveClass("tk-owner-cell-pale");
  });

  it("UI-18 a row whose owner is inactive renders Name (inactive) (AC-75, FR-46)", async () => {
    const rows = [row(50, "Printer offline", { owner: { id: 9, name: "Somchai Boon", isActive: false } })];
    vi.spyOn(api, "fetchQueue").mockResolvedValue(page(rows));
    renderQueue();

    await screen.findByText("TKT-2026-000050");
    expect(screen.getByText("Somchai Boon")).toBeInTheDocument();
    expect(screen.getByText("(inactive)")).toBeInTheDocument();
  });

  it("UI-19 the resolution marker renders for a resolved-by-requester Ticket, and is not in the status column (AC-60, FR-40)", async () => {
    const rows = [row(55, "Monitor flickers", { requesterResolvedAt: "2026-09-07T01:00:00.000Z", currentStatus: "WAITING_FOR_REQUESTER" })];
    vi.spyOn(api, "fetchQueue").mockResolvedValue(page(rows));
    renderQueue();

    await screen.findByText("TKT-2026-000055");
    const table = screen.getByRole("table");
    const marker = within(table).getByText("Requester says resolved");
    expect(marker).toHaveClass("tk-resolved-marker");
    const statusBadge = within(table).getByText("Waiting for Requester");
    expect(statusBadge.closest("td")).not.toContainElement(marker);
  });

  it("UI-20 shows the empty state with no filter active, and the distinct no-matches state with a filter active (FR-41, AC-69)", async () => {
    const fetchQueue = vi.spyOn(api, "fetchQueue").mockResolvedValue(page([]));
    renderQueue();

    expect(await screen.findByRole("heading", { name: "No tickets in the queue" })).toBeInTheDocument();
    expect(screen.getByText("There are no open tickets right now.")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "No matches" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Clear filters" })).not.toBeInTheDocument();

    fetchQueue.mockResolvedValue(page([]));
    renderQueue("/queue?search=nothing-here");
    const heading = await screen.findAllByRole("heading", { name: "No matches" });
    expect(heading[heading.length - 1]).toBeInTheDocument();
    expect(screen.getAllByText("No tickets match your search or filters.").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Clear filters" }).length).toBeGreaterThan(0);
  });

  it("UI-21 shows a loading skeleton with aria-busy, then a safe failure panel with Retry that keeps the toolbar (FR-41)", async () => {
    let release!: (value: api.QueuePage) => void;
    const fetchQueue = vi.spyOn(api, "fetchQueue").mockImplementation(() => new Promise((resolve) => (release = resolve)));
    renderQueue();

    const region = await screen.findByRole("region", { name: "Ticket queue" });
    expect(region).toHaveAttribute("aria-busy", "true");
    release(page(ROWS));
    expect(await screen.findByText("TKT-2026-000041")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Ticket queue" })).not.toHaveAttribute("aria-busy", "true");

    const failing = vi.spyOn(api, "fetchQueue").mockRejectedValueOnce(new Error('relation "Ticket" at /var/lib/postgresql'));
    failing.mockResolvedValueOnce(page(ROWS));
    const user = userEvent.setup();
    renderQueue("/queue?reload=1");
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/Something went wrong/);
    expect(document.body.textContent).not.toMatch(/postgresql|relation|SELECT/i);
    expect(screen.getByLabelText("Search")).toBeInTheDocument();
    await user.click(within(alert).getByRole("button", { name: "Retry" }));
    expect(await screen.findAllByText("TKT-2026-000041")).not.toHaveLength(0);
    void fetchQueue;
  });

  it("UI-22 an INVALID_QUERY_PARAM fields message renders beside its own control, and Clear filters replaces Retry (FR-42, AC-68)", async () => {
    vi.spyOn(api, "fetchQueue").mockRejectedValue(new api.ApiError(400, "INVALID_QUERY_PARAM", "Some search or filter values are not valid.", { sort: "sort must be field:direction..." }));
    renderQueue("/queue?sort=bogus");

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/not valid/);
    expect(within(alert).queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
    expect(within(alert).getByRole("button", { name: "Clear filters" })).toBeInTheDocument();
    const sortSelect = screen.getByLabelText("Sort");
    expect(sortSelect).toHaveAttribute("aria-invalid", "true");
    expect(sortSelect.closest("div")).toHaveTextContent("sort must be field:direction...");
  });

  it("UI-23 each toolbar control issues a request carrying its matching parameter, and search resets page to 1 (FR-35, FR-36, FR-37)", async () => {
    const fetchQueue = vi.spyOn(api, "fetchQueue").mockResolvedValue(page(ROWS, { total: 25, totalPages: 3 }));
    const user = userEvent.setup();
    renderQueue("/queue?page=3");
    await screen.findByText("TKT-2026-000041");

    await user.selectOptions(screen.getByLabelText("Current Status"), "OPEN");
    await waitFor(() => expect(fetchQueue).toHaveBeenLastCalledWith(expect.objectContaining({ currentStatus: "OPEN", page: 1 })));

    await user.selectOptions(screen.getByLabelText("IT Priority"), "HIGH");
    await waitFor(() => expect(fetchQueue).toHaveBeenLastCalledWith(expect.objectContaining({ itPriority: "HIGH", page: 1 })));

    await user.selectOptions(screen.getByLabelText("Ticket Owner"), "unassigned");
    await waitFor(() => expect(fetchQueue).toHaveBeenLastCalledWith(expect.objectContaining({ owner: "unassigned", page: 1 })));

    await user.selectOptions(screen.getByLabelText("Category"), "2");
    await waitFor(() => expect(fetchQueue).toHaveBeenLastCalledWith(expect.objectContaining({ categoryId: "2", page: 1 })));

    await user.selectOptions(screen.getByLabelText("Sort"), "itPriority:desc");
    await waitFor(() => expect(fetchQueue).toHaveBeenLastCalledWith(expect.objectContaining({ sort: "itPriority:desc", page: 1 })));

    await user.selectOptions(screen.getByLabelText("Per page"), "25");
    await waitFor(() => expect(fetchQueue).toHaveBeenLastCalledWith(expect.objectContaining({ pageSize: 25, page: 1 })));

    await user.type(screen.getByLabelText("Search"), "laptop");
    await waitFor(() => expect(fetchQueue).toHaveBeenLastCalledWith(expect.objectContaining({ search: "laptop", page: 1 })));
  });

  it("UI-24 a 403 from the API renders the Forbidden state, not a blank screen (FR-24, AC-97)", async () => {
    vi.spyOn(api, "fetchQueue").mockRejectedValue(new api.ApiError(403, "FORBIDDEN_ROLE", "You do not have access to that page."));
    renderQueue();

    expect(await screen.findByRole("heading", { name: "You do not have access to that page." })).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("STYLE-03 each of the eight statuses renders its own treatment and title-case text, never the raw enum (ui-spec 8.2)", async () => {
    const statuses: api.TicketStatus[] = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CLOSED", "REOPENED", "CANCELLED"];
    const rows = statuses.map((s, i) => row(100 + i, `Status fixture ${s}`, { currentStatus: s }));
    vi.spyOn(api, "fetchQueue").mockResolvedValue(page(rows));
    renderQueue();
    await screen.findByText("TKT-2026-000100");
    const table = screen.getByRole("table");

    const expected: Record<api.TicketStatus, [string, string]> = {
      NEW: ["New", "tk-status-new"],
      OPEN: ["Open", "tk-status-open"],
      IN_PROGRESS: ["In Progress", "tk-status-in-progress"],
      WAITING_FOR_REQUESTER: ["Waiting for Requester", "tk-status-waiting"],
      RESOLVED: ["Resolved", "tk-status-resolved"],
      CLOSED: ["Closed", "tk-status-closed"],
      REOPENED: ["Reopened", "tk-status-reopened"],
      CANCELLED: ["Cancelled", "tk-status-cancelled"],
    };
    const classes = new Set<string>();
    for (const s of statuses) {
      const [label, className] = expected[s];
      const badge = within(table).getByText(label);
      expect(badge).toHaveClass("tk-badge", "tk-badge-square", className);
      classes.add(className);
    }
    expect(classes.size).toBe(8);
    for (const s of statuses) expect(within(table).queryByText(s)).not.toBeInTheDocument();
  });

  it("STYLE-04 every row renders an IT Priority badge, never absent (FR-31, BR-49)", async () => {
    vi.spyOn(api, "fetchQueue").mockResolvedValue(page(ROWS));
    renderQueue();
    await screen.findByText("TKT-2026-000041");

    expect(screen.getByText("IT High")).toBeInTheDocument();
    expect(screen.getByText("IT Low")).toBeInTheDocument();
    expect(screen.getAllByText(/^IT (Low|Medium|High)$/)).toHaveLength(ROWS.length);
  });
});
