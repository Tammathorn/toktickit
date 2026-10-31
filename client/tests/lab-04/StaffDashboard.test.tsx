import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import path from "node:path";
import App from "../../src/App.js";
import * as api from "../../src/api.js";
import { ADMINISTRATOR, IT_STAFF, signInAs } from "../support/auth.js";

// tests.md 2.3 - the IT Staff and Administrator Dashboard (ui-spec 6), UI-01
// to UI-12 and STYLE-09, STYLE-10, STYLE-12. The API is mocked at its
// boundary: every number on screen comes from the response (BR-52).

const CARDS: api.DashboardCard[] = [
  { key: "unassigned", label: "Unassigned", count: 4, drillDown: "/queue?owner=unassigned" },
  { key: "mine", label: "Mine", count: 0, drillDown: "/queue?owner=me" },
  { key: "statusNew", label: "New", count: 1, drillDown: "/queue?currentStatus=NEW" },
  { key: "statusOpen", label: "Open", count: 2, drillDown: "/queue?currentStatus=OPEN" },
  { key: "statusInProgress", label: "In Progress", count: 1, drillDown: "/queue?currentStatus=IN_PROGRESS" },
  { key: "statusWaitingForRequester", label: "Waiting for Requester", count: 1, drillDown: "/queue?currentStatus=WAITING_FOR_REQUESTER" },
  { key: "statusReopened", label: "Reopened", count: 1, drillDown: "/queue?currentStatus=REOPENED" },
  { key: "statusResolved", label: "Resolved", count: 1, drillDown: "/queue?currentStatus=RESOLVED" },
  { key: "highItPriority", label: "High IT Priority", count: 2, drillDown: "/queue?itPriority=HIGH" },
  { key: "requesterSaysResolved", label: "Requester says resolved", count: 1, drillDown: "/queue?requesterResolved=true" },
  { key: "myPlannedActions", label: "My planned actions", count: 1, drillDown: "/dashboard#my-actions" },
];

const ITEM: api.DashboardTicketItem = {
  id: 42,
  ticketNumber: "TKT-2026-000042",
  summary: "VPN disconnects after roughly three minutes",
  currentStatus: "IN_PROGRESS",
  itPriority: "HIGH",
  lastActivityAt: "2026-10-27T03:00:00.000Z",
  createdAt: "2026-10-24T03:00:00.000Z",
};

function dashboard(overrides: Partial<api.StaffDashboard> = {}): api.StaffDashboard {
  return {
    generatedAt: "2026-10-28T07:00:00.000Z",
    timeZone: "Asia/Bangkok",
    cards: CARDS,
    lists: {
      myPlannedActions: {
        items: [
          {
            id: 31,
            actionAt: "2026-10-29T03:00:00.000Z",
            description: "Re-test the VPN for 30 minutes after the gateway profile change.",
            ticket: { id: 42, ticketNumber: "TKT-2026-000042", summary: ITEM.summary, currentStatus: "IN_PROGRESS" },
          },
        ],
        viewAll: null,
      },
      recentlyUpdated: { items: [ITEM], viewAll: "/queue?sort=lastActivityAt:desc" },
      urgent: { items: [ITEM], viewAll: "/queue?itPriority=HIGH" },
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
  signInAs(IT_STAFF);
  // The drill-down screens the cards open (UI-10, UI-11).
  vi.spyOn(api, "fetchQueue").mockResolvedValue({ data: [], meta: { page: 1, pageSize: 10, total: 0, totalPages: 0, sort: "itPriority:desc,createdAt:asc" } });
  vi.spyOn(api, "fetchCategories").mockResolvedValue([]);
  vi.spyOn(api, "fetchAssignableUsers").mockResolvedValue([]);
  vi.spyOn(api, "fetchUsers").mockResolvedValue([]);
});
afterEach(() => vi.restoreAllMocks());

describe("IT Staff and Administrator Dashboard", () => {
  it("UI-01 renders one link card per API card, in API order, each with its count and drill-down (FR-18, BR-56)", async () => {
    vi.spyOn(api, "fetchStaffDashboard").mockResolvedValue(dashboard());
    await renderDashboard();
    const grid = await screen.findByRole("list", { name: "Ticket metrics" });
    const links = within(grid).getAllByRole("link");
    expect(links.map((l) => l.getAttribute("href"))).toEqual(CARDS.map((c) => c.drillDown));
    expect(links[0]).toHaveAccessibleName("Unassigned: 4. Open the Ticket Queue filtered to unassigned tickets.");
  });

  it("UI-02 the Administrator sees the User accounts row with N active; IT Staff does not (BR-87, AC-87)", async () => {
    const userCounts: api.UserCountCard[] = [
      { key: "requesters", label: "Requesters", count: 6, activeCount: 5, drillDown: "/users?role=REQUESTER" },
      { key: "itStaff", label: "IT Staff", count: 4, activeCount: 3, drillDown: "/users?role=IT_STAFF" },
      { key: "administrators", label: "Administrators", count: 1, activeCount: 1, drillDown: "/users?role=ADMINISTRATOR" },
    ];
    vi.spyOn(api, "fetchStaffDashboard").mockResolvedValue(dashboard());
    await renderDashboard();
    await screen.findByRole("list", { name: "Ticket metrics" });
    expect(screen.queryByRole("heading", { name: "User accounts" })).not.toBeInTheDocument();

    vi.restoreAllMocks();
    signInAs(ADMINISTRATOR);
    vi.spyOn(api, "fetchStaffDashboard").mockResolvedValue(dashboard({ userCounts }));
    document.body.innerHTML = "";
    await renderDashboard();
    const row = await screen.findByRole("list", { name: "User accounts" });
    const staff = within(row).getByRole("link", { name: /^IT Staff: 4 accounts, 3 active\./ });
    expect(staff).toHaveAttribute("href", "/users?role=IT_STAFF");
    expect(within(staff).getByText("3 active")).toBeInTheDocument();
  });

  it("UI-03 a zero card shows 0 and stays a link; empty lists show their Empty copy (BR-57)", async () => {
    vi.spyOn(api, "fetchStaffDashboard").mockResolvedValue(
      dashboard({
        lists: {
          myPlannedActions: { items: [], viewAll: null },
          recentlyUpdated: { items: [], viewAll: "/queue?sort=lastActivityAt:desc" },
          urgent: { items: [], viewAll: "/queue?itPriority=HIGH" },
        },
      }),
    );
    await renderDashboard();
    const mine = await screen.findByRole("link", { name: /^Mine: 0\./ });
    expect(mine).toHaveAttribute("href", "/queue?owner=me");
    expect(screen.getByText("No planned actions are assigned to you.")).toBeInTheDocument();
    expect(screen.getByText("No tickets were updated in the last 7 days.")).toBeInTheDocument();
    expect(screen.getByText("No High IT Priority tickets are open.")).toBeInTheDocument();
    // tests.md UI-03: View all stays on the empty lists that have one.
    for (const [heading, href] of [["Recently updated", "/queue?sort=lastActivityAt:desc"], ["Urgent", "/queue?itPriority=HIGH"]]) {
      const section = screen.getByRole("heading", { name: heading }).closest("section") as HTMLElement;
      expect(within(section).getByRole("link", { name: "View all" })).toHaveAttribute("href", href);
    }
  });

  it("UI-04 Refresh calls the API again; nothing polls on its own (BR-58)", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const fetch = vi.spyOn(api, "fetchStaffDashboard").mockResolvedValue(dashboard());
    await renderDashboard();
    await screen.findByRole("list", { name: "Ticket metrics" });
    expect(fetch).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(15 * 60 * 1000);
    expect(fetch).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
    expect(screen.getByText("Updated 28 Oct 2026 14:00 (Asia/Bangkok)")).toBeInTheDocument();
    // The second load is held, so the in-flight state can be read.
    let resolve!: (d: api.StaffDashboard) => void;
    fetch.mockImplementationOnce(() => new Promise((r) => (resolve = r)));
    await userEvent.setup().click(screen.getByRole("button", { name: "Refresh" }));
    expect(fetch).toHaveBeenCalledTimes(2);
    const busy = screen.getByRole("button", { name: "Refreshing…" });
    expect(busy).toBeDisabled();
    expect(busy).toHaveAttribute("aria-busy", "true");
    resolve(dashboard({ generatedAt: "2026-10-28T07:05:00.000Z" }));
    expect(await screen.findByText("Updated 28 Oct 2026 14:05 (Asia/Bangkok)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refresh" })).toBeEnabled();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("UI-05 shows the generated-at line and no 'from yesterday' delta anywhere (C-142, X-5)", async () => {
    vi.spyOn(api, "fetchStaffDashboard").mockResolvedValue(dashboard());
    await renderDashboard();
    expect(await screen.findByText("Updated 28 Oct 2026 14:00 (Asia/Bangkok)")).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/from yesterday/i);
    expect(document.body.textContent).not.toMatch(/[+-]\d+\s*(from|since|vs)/i);
  });

  it("UI-06 Quick Actions are Search Tickets and My Queue, with no Create Ticket (C-144, L3 C-101)", async () => {
    vi.spyOn(api, "fetchStaffDashboard").mockResolvedValue(dashboard());
    await renderDashboard();
    const quick = (await screen.findByRole("heading", { name: "Quick Actions" })).closest("section") as HTMLElement;
    expect(within(quick).getAllByRole("link").map((l) => [l.textContent, l.getAttribute("href")])).toEqual([
      ["Search Tickets", "/queue"],
      ["My Queue", "/queue?owner=me"],
    ]);
    expect(screen.queryByText("Create Ticket")).not.toBeInTheDocument();
  });

  it("UI-07 the My planned actions card moves focus to the #my-actions panel, which lists every row (BR-84, C-169)", async () => {
    vi.spyOn(api, "fetchStaffDashboard").mockResolvedValue(dashboard());
    await renderDashboard();
    const card = await screen.findByRole("link", { name: "My planned actions: 1. Go to My planned actions on this page." });
    await userEvent.setup().click(card);
    expect(screen.getByRole("heading", { name: "My planned actions" })).toHaveFocus();
    const panel = document.getElementById("my-actions") as HTMLElement;
    expect(within(panel).getByRole("link", { name: "TKT-2026-000042" })).toHaveAttribute("href", "/queue/42");
    expect(within(panel).getByText("1 planned action")).toBeInTheDocument();
  });

  it("UI-07 (seven rows) arriving at /dashboard#my-actions focuses the panel heading; seven rows in API order, card 7, footer '7 planned actions'", async () => {
    // API order, deliberately not ticket-number order: the client never re-sorts.
    const ids = [47, 41, 45, 43, 46, 42, 44];
    const items = ids.map((id, i) => ({
      id: 100 + i,
      actionAt: `2026-10-29T0${i}:00:00.000Z`,
      description: `Planned step ${i + 1}`,
      ticket: { id, ticketNumber: `TKT-2026-0000${id}`, summary: `Ticket ${id}`, currentStatus: "IN_PROGRESS" as const },
    }));
    const cards = CARDS.map((c) => (c.key === "myPlannedActions" ? { ...c, count: 7 } : c));
    vi.spyOn(api, "fetchStaffDashboard").mockResolvedValue(dashboard({ cards, lists: { ...dashboard().lists, myPlannedActions: { items, viewAll: null } } }));
    window.history.pushState({}, "", "/dashboard#my-actions");
    render(<App />);
    expect(await screen.findByRole("link", { name: "My planned actions: 7. Go to My planned actions on this page." })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("heading", { name: "My planned actions" })).toHaveFocus());
    const panel = document.getElementById("my-actions") as HTMLElement;
    expect(within(panel).getAllByRole("link").map((l) => l.textContent)).toEqual(ids.map((id) => `TKT-2026-0000${id}`));
    expect(within(panel).getByText("7 planned actions")).toBeInTheDocument();
  });

  it("UI-08 list rows link to the staff detail and keep the API order (C-161)", async () => {
    const second = { ...ITEM, id: 43, ticketNumber: "TKT-2026-000043" };
    vi.spyOn(api, "fetchStaffDashboard").mockResolvedValue(
      dashboard({ lists: { ...dashboard().lists, recentlyUpdated: { items: [ITEM, second], viewAll: "/queue?sort=lastActivityAt:desc" } } }),
    );
    await renderDashboard();
    const list = (await screen.findByRole("heading", { name: "Recently updated" })).closest("section") as HTMLElement;
    const links = within(list).getAllByRole("link");
    expect(links.map((l) => l.textContent)).toEqual(["TKT-2026-000042", "TKT-2026-000043", "View all"]);
    expect(links[2]).toHaveAttribute("href", "/queue?sort=lastActivityAt:desc");
  });

  it("UI-09 shows a skeleton while loading and a safe failure panel with Retry (ui-spec 12.1)", async () => {
    let reject!: (e: unknown) => void;
    vi.spyOn(api, "fetchStaffDashboard").mockImplementationOnce(() => new Promise((_, r) => (reject = r)));
    await renderDashboard();
    expect(screen.getByRole("region", { name: "Dashboard loading" })).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("button", { name: /Refresh/ })).toBeDisabled();
    reject(new api.ApiError(500, "INTERNAL_ERROR", "x"));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Something went wrong on our side. Your work has not been lost - please try again.");
    expect(within(alert).getByRole("button", { name: "Retry" })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Refresh" })).toBeEnabled();
  });

  it("UI-10 a card opens the queue already filtered (FR-16, BR-56)", async () => {
    vi.spyOn(api, "fetchStaffDashboard").mockResolvedValue(dashboard());
    await renderDashboard();
    await userEvent.setup().click(await screen.findByRole("link", { name: /^Unassigned: 4\./ }));
    await waitFor(() => expect(api.fetchQueue).toHaveBeenCalledWith(expect.objectContaining({ owner: "unassigned" })));
    expect(window.location.pathname + window.location.search).toBe("/queue?owner=unassigned");
  });

  it("UI-10 (requesterResolved) /queue?requesterResolved=true shows the filter as Only these, requests it, and Last updated shows lastActivityAt (FR-16, BR-48)", async () => {
    vi.mocked(api.fetchQueue).mockResolvedValue({
      data: [
        {
          id: 42,
          ticketNumber: "TKT-2026-000042",
          summary: "VPN disconnects after roughly three minutes",
          category: { id: 2, name: "Network" },
          requestedPriority: "MEDIUM",
          itPriority: "HIGH",
          currentStatus: "IN_PROGRESS",
          owner: null,
          requesterResolvedAt: "2026-10-20T04:00:00.000Z",
          createdAt: "2026-09-30T01:00:00.000Z",
          updatedAt: "2026-10-01T01:00:00.000Z",
          lastActivityAt: "2026-10-20T05:00:00.000Z",
        },
      ],
      meta: { page: 1, pageSize: 10, total: 1, totalPages: 1, sort: "itPriority:desc,createdAt:asc" },
    });
    window.history.pushState({}, "", "/queue?requesterResolved=true");
    render(<App />);
    await waitFor(() => expect(api.fetchQueue).toHaveBeenCalledWith(expect.objectContaining({ requesterResolved: "true" })));
    const select = (await screen.findByLabelText("Requester says resolved")) as HTMLSelectElement;
    expect(select).toHaveValue("true");
    expect(select.selectedOptions[0].textContent).toBe("Only these");
    expect((await screen.findAllByText(/20 Oct 2026 12:00/)).length).toBeGreaterThan(0);
    expect(screen.queryByText(/01 Oct 2026 08:00/)).not.toBeInTheDocument();
  });

  it("UI-11 a user card opens User Management already filtered by role (FR-24)", async () => {
    vi.restoreAllMocks();
    signInAs(ADMINISTRATOR);
    vi.spyOn(api, "fetchUsers").mockResolvedValue([]);
    vi.spyOn(api, "fetchStaffDashboard").mockResolvedValue(
      dashboard({ userCounts: [{ key: "itStaff", label: "IT Staff", count: 4, activeCount: 3, drillDown: "/users?role=IT_STAFF" }] }),
    );
    await renderDashboard();
    await userEvent.setup().click(await screen.findByRole("link", { name: /^IT Staff: 4 accounts/ }));
    await waitFor(() => expect(api.fetchUsers).toHaveBeenCalledWith(expect.objectContaining({ role: "IT_STAFF" })));
    expect(screen.getByLabelText("Role")).toHaveValue("IT_STAFF");
    await userEvent.setup().selectOptions(screen.getByLabelText("Role"), "REQUESTER");
    expect(window.location.pathname + window.location.search).toBe("/users?role=REQUESTER");
    await waitFor(() => expect(api.fetchUsers).toHaveBeenCalledWith(expect.objectContaining({ role: "REQUESTER" })));
  });

  it("UI-12 Dashboard is the first navigation item and is marked current (C-144)", async () => {
    vi.spyOn(api, "fetchStaffDashboard").mockResolvedValue(dashboard());
    await renderDashboard();
    const nav = screen.getByRole("navigation", { name: "Main navigation" });
    const links = within(nav).getAllByRole("link").filter((l) => !l.classList.contains("tk-brand"));
    expect(links.map((l) => l.textContent)).toEqual(["Dashboard", "Ticket Queue"]);
    expect(links[0]).toHaveAttribute("aria-current", "page");
    expect(within(nav).getByText("TokTickIT").closest("a")).toHaveAttribute("href", "/dashboard");
  });

  it("UI-12 (hash) on /dashboard#my-actions Dashboard is still the current navigation item (C-144)", async () => {
    vi.spyOn(api, "fetchStaffDashboard").mockResolvedValue(dashboard());
    window.history.pushState({}, "", "/dashboard#my-actions");
    render(<App />);
    await screen.findByRole("list", { name: "Ticket metrics" });
    const nav = screen.getByRole("navigation", { name: "Main navigation" });
    expect(within(nav).getByRole("link", { name: "Dashboard" })).toHaveAttribute("aria-current", "page");
    expect(within(nav).getByRole("link", { name: "Ticket Queue" })).not.toHaveAttribute("aria-current");
  });

  it("STYLE-09 a metric card shows its label, a count and a 'View list' line, so it reads as a link without colour", async () => {
    vi.spyOn(api, "fetchStaffDashboard").mockResolvedValue(dashboard());
    await renderDashboard();
    const card = await screen.findByRole("link", { name: /^Unassigned: 4\./ });
    expect(card).toHaveClass("tk-metric-card");
    expect(card.querySelector(".tk-metric-count")).toHaveTextContent("4");
    expect(within(card).getByText(/View list/)).toBeInTheDocument();
    // Status cards carry their status badge (tests.md STYLE-09).
    const statusCard = screen.getByRole("link", { name: /^Waiting for Requester: 1\./ });
    expect(within(statusCard).getAllByText("Waiting for Requester").length).toBe(2);
  });

  it("STYLE-10 the panels are labelled landmarks and the #my-actions heading is focusable", async () => {
    vi.spyOn(api, "fetchStaffDashboard").mockResolvedValue(dashboard());
    await renderDashboard();
    for (const name of ["My planned actions", "Recently updated", "Urgent", "Quick Actions"]) {
      const heading = await screen.findByRole("heading", { name });
      expect(heading.closest("section")).toHaveAttribute("aria-labelledby", heading.id);
    }
    expect(screen.getByRole("heading", { name: "My planned actions" })).toHaveAttribute("tabindex", "-1");
    // tests.md STYLE-10: the Updated line is a polite live region; one h1;
    // every card, list link and Quick Action has a non-empty accessible name.
    expect(screen.getByText(/^Updated /)).toHaveAttribute("aria-live", "polite");
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    const main = document.querySelector("main") as HTMLElement;
    for (const link of within(main).getAllByRole("link")) {
      expect(link.getAttribute("aria-label") || link.textContent?.trim(), link.outerHTML).toBeTruthy();
    }
  });

  it("STYLE-12 Lab 4 components use tokens, never a hard-coded colour", () => {
    const src = path.resolve(__dirname, "../../src");
    for (const file of ["pages/Dashboard.tsx", "components/ActionsTaken.tsx", "components/ConflictPanel.tsx", "components/StatusHistory.tsx"]) {
      const text = readFileSync(path.join(src, file), "utf8");
      expect(text, file).not.toMatch(/#[0-9a-fA-F]{3,6}\b|rgb\(/);
    }
  });
});
