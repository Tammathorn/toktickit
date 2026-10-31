import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App.js";
import * as api from "../../src/api.js";
import { REQUESTER_A, signInAs } from "../support/auth.js";

// tests.md 2.3 - the Requester Dashboard (ui-spec 7), UI-13 to UI-20.

const CARDS: api.DashboardCard[] = [
  { key: "openTickets", label: "Open tickets", count: 3, drillDown: "/tickets?statusGroup=open" },
  { key: "waitingForYou", label: "Waiting for you", count: 1, drillDown: "/tickets?currentStatus=WAITING_FOR_REQUESTER" },
  { key: "resolvedAwaitingClosure", label: "Resolved - awaiting closure", count: 1, drillDown: "/tickets?currentStatus=RESOLVED" },
  { key: "closed", label: "Closed", count: 4, drillDown: "/tickets?currentStatus=CLOSED" },
];

const ITEM: api.DashboardTicketItem = {
  id: 37,
  ticketNumber: "TKT-2026-000037",
  summary: "Shared departmental mailbox missing from Outlook",
  currentStatus: "RESOLVED",
  itPriority: "MEDIUM",
  lastActivityAt: "2026-10-27T03:00:00.000Z",
  resolvedAt: "2026-10-26T03:00:00.000Z",
};

function dashboard(overrides: Partial<api.RequesterDashboard> = {}): api.RequesterDashboard {
  return {
    generatedAt: "2026-10-28T07:00:00.000Z",
    timeZone: "Asia/Bangkok",
    cards: CARDS,
    lists: {
      recentlyUpdated: { items: [ITEM], viewAll: "/tickets?sort=lastActivityAt:desc" },
      recentlyResolved: { items: [ITEM], viewAll: null },
    },
    ...overrides,
  };
}

async function renderDashboard() {
  window.history.pushState({}, "", "/dashboard");
  render(<App />);
  return screen.findByRole("heading", { level: 1, name: "Dashboard" });
}

beforeEach(() => {
  window.history.replaceState({}, "", "/");
  signInAs(REQUESTER_A);
  vi.spyOn(api, "fetchCategories").mockResolvedValue([]);
  vi.spyOn(api, "fetchRelatedSystems").mockResolvedValue([]);
  vi.spyOn(api, "fetchTickets").mockResolvedValue({ data: [], meta: { page: 1, pageSize: 10, total: 0, totalPages: 0, sort: "createdAt:desc" } });
});
afterEach(() => vi.restoreAllMocks());

describe("Requester Dashboard", () => {
  it("UI-13 four link cards to My Tickets, each with its count, Waiting for you with its badge (FR-20)", async () => {
    vi.spyOn(api, "fetchRequesterDashboard").mockResolvedValue(dashboard());
    await renderDashboard();
    const grid = await screen.findByRole("list", { name: "Your ticket metrics" });
    const links = within(grid).getAllByRole("link");
    expect(links.map((l) => l.getAttribute("href"))).toEqual(CARDS.map((c) => c.drillDown));
    expect(links[0]).toHaveAccessibleName("Open tickets: 3. Open My Tickets filtered to open tickets.");
    expect(within(links[1]).getByText("Waiting for Requester")).toHaveClass("tk-badge");
  });

  it("UI-14 Recently updated has View all; Recently resolved shows the resolved time and none (BR-77, BR-78)", async () => {
    vi.spyOn(api, "fetchRequesterDashboard").mockResolvedValue(dashboard());
    await renderDashboard();
    const updated = (await screen.findByRole("heading", { name: "Recently updated" })).closest("section") as HTMLElement;
    expect(within(updated).getByRole("link", { name: "TKT-2026-000037" })).toHaveAttribute("href", "/tickets/37");
    expect(within(updated).getByRole("link", { name: "View all" })).toHaveAttribute("href", "/tickets?sort=lastActivityAt:desc");
    const resolved = screen.getByRole("heading", { name: "Recently resolved" }).closest("section") as HTMLElement;
    expect(within(resolved).getByText("Resolved 26 Oct 2026 10:00")).toBeInTheDocument();
    expect(within(resolved).queryByRole("link", { name: "View all" })).not.toBeInTheDocument();
  });

  it("UI-15 the zero account: every card 0 and still a link; both lists show Empty (BR-57)", async () => {
    vi.spyOn(api, "fetchRequesterDashboard").mockResolvedValue(
      dashboard({
        cards: CARDS.map((c) => ({ ...c, count: 0 })),
        lists: { recentlyUpdated: { items: [], viewAll: "/tickets?sort=lastActivityAt:desc" }, recentlyResolved: { items: [], viewAll: null } },
      }),
    );
    await renderDashboard();
    const grid = await screen.findByRole("list", { name: "Your ticket metrics" });
    for (const link of within(grid).getAllByRole("link")) expect(link.querySelector(".tk-metric-count")).toHaveTextContent("0");
    expect(screen.getByText("None of your tickets changed in the last 7 days.")).toBeInTheDocument();
    expect(screen.getByText("None of your tickets were resolved in the last 7 days.")).toBeInTheDocument();
  });

  it("UI-16 one Quick Action, Create Ticket; no My Tickets table repeated, no staff content (LS 8.2, C-144)", async () => {
    vi.spyOn(api, "fetchRequesterDashboard").mockResolvedValue(dashboard());
    await renderDashboard();
    const quick = (await screen.findByRole("heading", { name: "Quick Actions" })).closest("section") as HTMLElement;
    expect(within(quick).getAllByRole("link").map((l) => l.getAttribute("href"))).toEqual(["/tickets/new"]);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/internal note|unassigned|my planned actions/i);
  });

  it("UI-17 Refresh calls the API again; it never calls the staff dashboard", async () => {
    const fetch = vi.spyOn(api, "fetchRequesterDashboard").mockResolvedValue(dashboard());
    const staff = vi.spyOn(api, "fetchStaffDashboard");
    await renderDashboard();
    await screen.findByRole("list", { name: "Your ticket metrics" });
    await userEvent.setup().click(screen.getByRole("button", { name: "Refresh" }));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    expect(staff).not.toHaveBeenCalled();
  });

  it("UI-18 the Open tickets card lands on My Tickets with the Open tickets filter selected (BR-88)", async () => {
    vi.spyOn(api, "fetchRequesterDashboard").mockResolvedValue(dashboard());
    await renderDashboard();
    await userEvent.setup().click(await screen.findByRole("link", { name: /^Open tickets: 3\./ }));
    await waitFor(() => expect(api.fetchTickets).toHaveBeenCalledWith(expect.objectContaining({ statusGroup: "open", currentStatus: "" })));
    expect(screen.getByLabelText("Current Status")).toHaveValue("__open");
  });

  it("UI-19 loading skeleton, then a safe failure panel with Retry", async () => {
    vi.spyOn(api, "fetchRequesterDashboard").mockRejectedValue(new api.ApiError(0, "INTERNAL_ERROR", "Network error"));
    await renderDashboard();
    const alert = await screen.findByRole("alert");
    expect(within(alert).getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("UI-20 the Forbidden state links to the Dashboard (C-144)", async () => {
    window.history.pushState({}, "", "/queue");
    render(<App />);
    const link = await screen.findByRole("link", { name: "Go to Dashboard" });
    expect(link).toHaveAttribute("href", "/dashboard");
  });
});
