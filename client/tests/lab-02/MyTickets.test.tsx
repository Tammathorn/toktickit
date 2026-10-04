import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App.js";
import * as api from "../../src/api.js";
import { REQUESTER_A, REQUESTER_B, signInAs } from "../support/auth.js";

// UI-10, UI-18..UI-23, STYLE-06 and STYLE-08 from tests.md (sections 2.3 and
// 2.4). The API module is mocked at its boundary. The list is reached through
// <App /> at /tickets as a signed-in Requester, so the guard, the shell and a
// change of user (BR-14) are exercised as the user would.
//
// Lab 3 (#40), docs/lab-03/tests.md section 4.2: the AuthContext wrapper
// replaces the stored selection; UI-10's "switch" is now signing out and in as
// another Requester, the same data-isolation property; the line-217 assertion
// is rewritten, not deleted - the IT Priority badge now renders with the
// backfilled value (C-71, FR-31).

const CATEGORIES = [
  { id: 1, name: "Account and Access" },
  { id: 2, name: "Hardware" },
];
const SYSTEMS = [{ id: 6, name: "Printer" }];

function row(id: number, summary: string, extra: Partial<api.TicketListRow> = {}): api.TicketListRow {
  return {
    id,
    ticketNumber: `TKT-2026-${String(id).padStart(6, "0")}`,
    summary,
    category: CATEGORIES[1],
    relatedSystem: SYSTEMS[0],
    requestedPriority: "MEDIUM",
    currentStatus: "NEW",
    createdAt: "2026-09-05T04:12:33.000Z",
    updatedAt: "2026-09-05T04:12:33.041Z",
    ...extra,
    // C-71: IT Priority starts as a copy of Requested Priority and is never null.
    itPriority: extra.itPriority ?? extra.requestedPriority ?? "MEDIUM",
  };
}

function page(data: api.TicketListRow[], meta: Partial<api.TicketListMeta> = {}): api.TicketListPage {
  return {
    data,
    meta: { page: 1, pageSize: 10, total: data.length, totalPages: Math.max(1, Math.ceil(data.length / 10)), sort: "createdAt:desc", ...meta },
  };
}

const A_ROWS = [row(41, "Laptop battery drains quickly", { requestedPriority: "HIGH" }), row(42, "VPN drops every hour", { requestedPriority: "LOW" })];
const B_ROWS = [row(77, "Projector remote missing")];

function mockBase() {
  vi.spyOn(api, "fetchCategories").mockResolvedValue(CATEGORIES);
  vi.spyOn(api, "fetchRelatedSystems").mockResolvedValue(SYSTEMS);
}

function renderList(path = "/tickets") {
  window.history.pushState({}, "", path);
  render(<App />);
}

beforeEach(() => {
  window.localStorage.clear();
  window.history.replaceState({}, "", "/");
  // Lab 3 (#40), docs/lab-03/tests.md section 4.2: the AuthContext test
  // wrapper signs Requester A in; there is no selector and nothing in storage.
  signInAs(REQUESTER_A);
  mockBase();
});
afterEach(() => vi.restoreAllMocks());

describe("My Tickets", () => {
  it("UI-21 shows a loading state until the list request settles (AC-52)", async () => {
    let release!: (value: api.TicketListPage) => void;
    const fetchTickets = vi.spyOn(api, "fetchTickets").mockImplementation(() => new Promise((resolve) => (release = resolve)));
    renderList();

    const region = await screen.findByRole("region", { name: "Ticket list" });
    expect(region).toHaveAttribute("aria-busy", "true");
    expect(within(region).queryByRole("table")).not.toBeInTheDocument();

    // the request is issued from an effect after the first paint
    await waitFor(() => expect(fetchTickets).toHaveBeenCalled());
    release(page(A_ROWS));
    expect(await screen.findByText("TKT-2026-000041")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Ticket list" })).not.toHaveAttribute("aria-busy", "true");
  });

  it("renders the owner's rows with the pagination summary and calls the API with no requester of its own", async () => {
    const fetchTickets = vi.spyOn(api, "fetchTickets").mockResolvedValue(page(A_ROWS));
    renderList();

    expect(await screen.findByText("TKT-2026-000041")).toBeInTheDocument();
    expect(screen.getByText("TKT-2026-000042")).toBeInTheDocument();
    expect(screen.getByText("Showing 1 to 2 of 2 tickets")).toBeInTheDocument();
    expect(fetchTickets).toHaveBeenCalledWith(expect.objectContaining({ page: 1, pageSize: 10, sort: "createdAt:desc" }));
    expect(fetchTickets.mock.calls[0][0]).not.toHaveProperty("requesterId");
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });

  it("UI-10 clears A's rows and fetches B's when A signs out and B signs in (AC-11, BR-14)", async () => {
    const fetchTickets = vi.spyOn(api, "fetchTickets").mockResolvedValueOnce(page(A_ROWS)).mockResolvedValue(page(B_ROWS));
    vi.spyOn(api, "logout").mockResolvedValue();
    vi.spyOn(api, "login").mockResolvedValue(REQUESTER_B);
    const user = userEvent.setup();
    renderList();
    expect(await screen.findByText("TKT-2026-000041")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Log Out" }));
    await user.type(await screen.findByLabelText(/Email Address/), REQUESTER_B.email);
    await user.type(screen.getByLabelText(/^Password/), "Requester#2026");
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    expect(await screen.findByText("TKT-2026-000077")).toBeInTheDocument();
    expect(screen.queryByText("TKT-2026-000041")).not.toBeInTheDocument();
    expect(screen.queryByText("TKT-2026-000042")).not.toBeInTheDocument();
    expect(fetchTickets).toHaveBeenCalledTimes(2);
  });

  it("UI-18 shows the empty state with a Create Ticket action when nothing is owned and no filter is active (AC-49)", async () => {
    vi.spyOn(api, "fetchTickets").mockResolvedValue(page([]));
    renderList();

    expect(await screen.findByRole("heading", { name: "No tickets yet" })).toBeInTheDocument();
    // scoped to the list region: the shell's navigation also links to Create Ticket
    const region = screen.getByRole("region", { name: "Ticket list" });
    expect(within(region).getByText("You have not created any tickets. Create your first one to get started.")).toBeInTheDocument();
    expect(within(region).getByRole("link", { name: "Create Ticket" })).toHaveAttribute("href", "/tickets/new");
    expect(screen.queryByRole("heading", { name: "No matches" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Clear filters" })).not.toBeInTheDocument();
  });

  it("UI-19 shows the distinct no-results state with Clear filters when a filter excludes everything (AC-50)", async () => {
    vi.spyOn(api, "fetchTickets").mockResolvedValue(page([]));
    renderList("/tickets?search=nothing-here");

    const heading = await screen.findByRole("heading", { name: "No matches" });
    const panel = heading.closest(".tk-empty") as HTMLElement;
    expect(within(panel).getByText("No tickets match your search or filters.")).toBeInTheDocument();
    // the panel's own action, in addition to the toolbar's (FR-35)
    expect(within(panel).getByRole("button", { name: "Clear filters" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "No tickets yet" })).not.toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Ticket list" })).queryByRole("link", { name: "Create Ticket" })).not.toBeInTheDocument();
  });

  it("UI-20 shows a safe failure panel with Retry and keeps the toolbar (AC-51)", async () => {
    const fetchTickets = vi
      .spyOn(api, "fetchTickets")
      .mockRejectedValueOnce(new Error('ECONNREFUSED at /var/lib/postgresql SELECT * FROM "Ticket"'))
      .mockResolvedValueOnce(page(A_ROWS));
    const user = userEvent.setup();
    renderList();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Something went wrong on our side. Your work has not been lost - please try again.");
    expect(document.body.textContent).not.toMatch(/ECONNREFUSED|postgresql|SELECT/);
    expect(screen.getByLabelText("Search")).toBeInTheDocument();

    await user.click(within(alert).getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("TKT-2026-000041")).toBeInTheDocument();
    expect(fetchTickets).toHaveBeenCalledTimes(2);
  });

  it("UI-22 opens the Ticket's detail route from the row (AC-62)", async () => {
    vi.spyOn(api, "fetchTickets").mockResolvedValue(page(A_ROWS));
    vi.spyOn(api, "fetchTicket").mockResolvedValue({
      ...A_ROWS[1],
        requester: { id: 1, name: "Anucha Prasert" },
      description: "The VPN session drops on the hour, every hour.",
      attachments: [],
    });
    const user = userEvent.setup();
    renderList();

    await user.click(await screen.findByRole("link", { name: "Open TKT-2026-000042" }));
    expect(window.location.pathname).toBe("/tickets/42");
    expect(await screen.findByRole("heading", { level: 1, name: /TKT-2026-000042/ })).toBeInTheDocument();
  });

  it("UI-23 shows Clear filters only once a search or filter is active, and it returns to the default list (FR-35)", async () => {
    const fetchTickets = vi.spyOn(api, "fetchTickets").mockResolvedValue(page(A_ROWS));
    const user = userEvent.setup();
    renderList();
    await screen.findByText("TKT-2026-000041");
    expect(screen.queryByRole("button", { name: "Clear filters" })).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Category"), "2");
    expect(await screen.findByRole("button", { name: "Clear filters" })).toBeInTheDocument();
    await waitFor(() => expect(fetchTickets).toHaveBeenLastCalledWith(expect.objectContaining({ categoryId: "2" })));
    expect(window.location.search).toContain("categoryId=2");

    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Clear filters" })).not.toBeInTheDocument());
    expect(window.location.search).toBe("");
  });

  it("debounces the search box into the request and resets to page 1", async () => {
    const fetchTickets = vi.spyOn(api, "fetchTickets").mockResolvedValue(page(A_ROWS, { total: 25, totalPages: 3 }));
    const user = userEvent.setup();
    renderList("/tickets?page=3");
    await screen.findByText("TKT-2026-000041");

    await user.type(screen.getByLabelText("Search"), "laptop");
    await waitFor(() => expect(fetchTickets).toHaveBeenLastCalledWith(expect.objectContaining({ search: "laptop", page: 1 })));
  });

  it("STYLE-06 renders priority badges as pills and status badges square, each with title-case text (AC-58)", async () => {
    vi.spyOn(api, "fetchTickets").mockResolvedValue(page(A_ROWS));
    renderList();
    await screen.findByText("TKT-2026-000041");

    const table = screen.getByRole("table");
    const high = within(table).getAllByText("High")[0];
    expect(high).toHaveClass("tk-badge", "tk-badge-pill", "tk-priority-high");
    const low = within(table).getAllByText("Low")[0];
    expect(low).toHaveClass("tk-badge", "tk-badge-pill", "tk-priority-low");
    const status = within(table).getAllByText("New")[0];
    expect(status).toHaveClass("tk-badge", "tk-badge-square", "tk-status-new");
    expect(within(table).queryByText("NEW")).not.toBeInTheDocument();
    expect(within(table).queryByText("HIGH")).not.toBeInTheDocument();
    // Rewritten for C-71 (tests.md 4.2): IT Priority is never null now, so its
    // badge renders on every row, carrying the backfilled value as a pill.
    const itHigh = within(table).getAllByText("IT High")[0];
    expect(itHigh).toHaveClass("tk-badge", "tk-badge-pill", "tk-priority-high");
    expect(within(table).getAllByText(/^IT (Low|Medium|High)$/)).toHaveLength(A_ROWS.length);
  });

  it("STYLE-08 marks the active navigation item with the active class and aria-current", async () => {
    vi.spyOn(api, "fetchTickets").mockResolvedValue(page(A_ROWS));
    renderList();
    await screen.findByText("TKT-2026-000041");

    const banner = screen.getByRole("banner");
    const active = within(banner).getByRole("link", { name: "My Tickets" });
    expect(active).toHaveClass("tk-nav-link-active");
    expect(active).toHaveAttribute("aria-current", "page");
    const inactive = within(banner).getByRole("link", { name: "Create Ticket" });
    expect(inactive).not.toHaveClass("tk-nav-link-active");
    expect(inactive).not.toHaveAttribute("aria-current");
  });
});
