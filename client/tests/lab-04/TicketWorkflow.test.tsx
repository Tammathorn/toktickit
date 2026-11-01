import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App.js";
import * as api from "../../src/api.js";
import { lab4Fields, withStaffLab4 } from "../support/lab4.js";
import { IT_STAFF, REQUESTER_A, signInAs } from "../support/auth.js";

// tests.md 2.3 - the Ticket workflow on the detail screens (ui-spec 9, 11):
// UI-40 to UI-51 and STYLE-11.

const OWNER = { id: 6, name: "Araya Methee", role: "IT_STAFF" as const, isActive: true };

function ticket(overrides: Partial<api.StaffTicket> = {}): api.StaffTicket {
  return withStaffLab4({
    id: 77,
    ticketNumber: "TKT-2026-000077",
    requester: { id: 1, name: "Anucha Prasert", email: "anucha.p@example.ac.th" },
    category: { id: 2, name: "Hardware" },
    relatedSystem: { id: 6, name: "Printer" },
    summary: "Laptop battery drains quickly",
    description: "Line one.",
    requestedPriority: "MEDIUM",
    itPriority: "MEDIUM",
    currentStatus: "IN_PROGRESS",
    owner: OWNER,
    requesterResolvedAt: null,
    createdAt: "2026-10-20T03:00:00.000Z",
    updatedAt: "2026-10-21T03:00:00.000Z",
    attachments: [],
    publicComments: [],
    internalNotes: [],
    ...lab4Fields("2026-10-21T03:00:00.000Z"),
    version: 4,
    ...overrides,
  });
}

async function renderDetail(t: api.StaffTicket = ticket()) {
  vi.spyOn(api, "fetchStaffTicket").mockResolvedValue(t);
  window.history.pushState({}, "", "/queue/77");
  render(<App />);
  await screen.findByRole("region", { name: "Ticket Operations" });
}

function statusOptions(): { text: string | null; disabled: boolean }[] {
  return within(screen.getByLabelText("Current Status"))
    .getAllByRole("option")
    .map((o) => ({ text: o.textContent, disabled: (o as HTMLOptionElement).disabled }));
}

beforeEach(() => {
  window.history.replaceState({}, "", "/");
  signInAs(IT_STAFF);
  vi.spyOn(api, "fetchAssignableUsers").mockResolvedValue([{ id: 6, name: "Araya Methee", role: "IT_STAFF" }]);
});
afterEach(() => vi.restoreAllMocks());

describe("Ticket workflow - IT Staff Ticket Detail", () => {
  it("UI-40 the status select offers exactly allowedTransitions, whatever they are (BR-27, C-171)", async () => {
    // A pair the matrix would never offer from this status, so a client
    // filtering by its own copy of the matrix would fail here.
    await renderDetail(ticket({ allowedTransitions: ["CLOSED", "REOPENED"] }));
    expect(statusOptions().slice(1).map((o) => o.text)).toEqual(["Closed", "Reopened"]);
  });

  it("UI-41 gate unmet: Resolved is disabled with the reasons beneath, bound by aria-describedby (ui-spec 9.2)", async () => {
    await renderDetail(ticket({ resolutionGate: { met: false, reasons: ["NO_COMPLETED_ACTION", "PLANNED_ACTIONS_OPEN"] } }));
    expect(statusOptions().find((o) => o.text === "Resolved - not available yet")?.disabled).toBe(true);
    const callout = document.getElementById("gate-callout") as HTMLElement;
    expect(within(callout).getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      "Record at least one completed action.",
      "Complete or cancel every planned action.",
    ]);
    expect(screen.getByLabelText("Current Status")).toHaveAttribute("aria-describedby", "gate-callout");
  });

  it("UI-42 gate met: Resolved is enabled and there is no callout", async () => {
    await renderDetail();
    expect(statusOptions().find((o) => o.text === "Resolved")?.disabled).toBe(false);
    expect(document.getElementById("gate-callout")).toBeNull();
  });

  it("UI-43 STALE_UPDATE on status: re-fetch, keep the chosen status, re-send with the fresh version (BR-39, C-153)", async () => {
    const user = userEvent.setup();
    const set = vi
      .spyOn(api, "setTicketStatus")
      .mockRejectedValueOnce(new api.ApiError(409, "STALE_UPDATE", "x"))
      .mockResolvedValueOnce(ticket({ currentStatus: "WAITING_FOR_REQUESTER", version: 6 }));
    await renderDetail();
    vi.mocked(api.fetchStaffTicket).mockResolvedValue(ticket({ version: 5 }));
    await user.selectOptions(screen.getByLabelText("Current Status"), "WAITING_FOR_REQUESTER");
    await user.click(within(screen.getByRole("group", { name: "Current Status controls" })).getByRole("button", { name: "Save Changes" }));
    const alert = await screen.findByText("This changed while you were working");
    expect(set).toHaveBeenCalledWith(77, "WAITING_FOR_REQUESTER", 4);
    expect(screen.getByLabelText("Current Status")).toHaveValue("WAITING_FOR_REQUESTER");
    await user.click(within(alert.closest("[role=alert]") as HTMLElement).getByRole("button", { name: "Apply my changes again" }));
    await waitFor(() => expect(set).toHaveBeenLastCalledWith(77, "WAITING_FOR_REQUESTER", 5));
  });

  it("UI-44 owner and IT Priority PATCHes carry the version; STALE_UPDATE on priority keeps the draft (C-138)", async () => {
    const user = userEvent.setup();
    const priority = vi.spyOn(api, "setItPriority").mockRejectedValueOnce(new api.ApiError(409, "STALE_UPDATE", "x"));
    await renderDetail();
    await user.selectOptions(screen.getByLabelText("IT Priority"), "HIGH");
    await user.click(within(screen.getByRole("group", { name: "IT Priority controls" })).getByRole("button", { name: "Save Changes" }));
    expect(priority).toHaveBeenCalledWith(77, "HIGH", 4);
    expect(await screen.findByText("This changed while you were working")).toBeInTheDocument();
    expect(screen.getByLabelText("IT Priority")).toHaveValue("HIGH");
    await user.click(screen.getByRole("button", { name: "Discard my changes" }));
    expect(screen.getByLabelText("IT Priority")).toHaveValue("MEDIUM");
  });

  it("UI-45 a server RESOLUTION_GATE_NOT_MET renders its reasons as a conflict after a re-fetch", async () => {
    const user = userEvent.setup();
    vi.spyOn(api, "setTicketStatus").mockRejectedValue(
      new api.ApiError(409, "RESOLUTION_GATE_NOT_MET", "This ticket cannot be resolved yet.", undefined, ["FOLLOW_UP_REQUIRED"]),
    );
    await renderDetail();
    await user.selectOptions(screen.getByLabelText("Current Status"), "RESOLVED");
    await user.click(within(screen.getByRole("group", { name: "Current Status controls" })).getByRole("button", { name: "Save Changes" }));
    await user.click(await screen.findByRole("button", { name: "Resolve" }));
    expect(await screen.findByText("The latest completed action needs follow-up. Record the follow-up work first.")).toBeInTheDocument();
    expect(api.fetchStaffTicket).toHaveBeenCalledTimes(2);
  });

  it("UI-46 PLANNED_ACTIONS_OPEN on cancel shows its message and a link to Actions Taken (BR-33)", async () => {
    const user = userEvent.setup();
    vi.spyOn(api, "setTicketStatus").mockRejectedValue(new api.ApiError(409, "PLANNED_ACTIONS_OPEN", "x"));
    await renderDetail();
    await user.selectOptions(screen.getByLabelText("Current Status"), "CANCELLED");
    await user.click(within(screen.getByRole("group", { name: "Current Status controls" })).getByRole("button", { name: "Save Changes" }));
    await user.click(await screen.findByRole("button", { name: "Cancel Ticket" }));
    expect(await screen.findByText("This ticket still has planned actions. Complete or cancel them before cancelling the ticket.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to Actions Taken" })).toHaveAttribute("href", "#actions-taken");
  });

  it("UI-47 status history: oldest first, the creation row, people by name (BR-23, C-167)", async () => {
    await renderDetail(
      ticket({
        historyComplete: true,
        statusHistory: [
          { id: 1, fromStatus: null, toStatus: "NEW", changedBy: { id: 1, name: "Anucha Prasert" }, changedAt: "2026-10-20T03:00:00.000Z" },
          { id: 2, fromStatus: "NEW", toStatus: "IN_PROGRESS", changedBy: { id: 6, name: "Araya Methee" }, changedAt: "2026-10-21T03:00:00.000Z" },
        ],
      }),
    );
    const section = screen.getByRole("heading", { name: "Status history" }).closest("section") as HTMLElement;
    const rows = within(section).getAllByRole("listitem");
    expect(rows[0]).toHaveTextContent("20 Oct 2026 10:00 - Created as New by Anucha Prasert");
    expect(rows[1]).toHaveTextContent(/21 Oct 2026 10:00.*In Progress by Araya Methee/);
    expect(section.querySelector("ol")).not.toBeNull();
    expect(within(section).queryByText("Status changes made before this history began were not recorded.")).not.toBeInTheDocument();
  });

  it("UI-48 a legacy Ticket shows the history line and no date (BR-51, C-179)", async () => {
    await renderDetail(ticket({ historyComplete: false, statusHistory: [] }));
    expect(screen.getByText("Status changes made before this history began were not recorded.")).toBeInTheDocument();
  });

  it("UI-49 Last Updated shows lastActivityAt, not updatedAt (BR-48)", async () => {
    await renderDetail(ticket({ updatedAt: "2026-10-21T03:00:00.000Z", lastActivityAt: "2026-10-27T05:30:00.000Z" }));
    const info = screen.getByRole("region", { name: "Ticket information" });
    expect(within(info).getByText("27 Oct 2026 12:30")).toBeInTheDocument();
  });

  it("UI-51 the note composer sends a replay key and mints a new one after success (BR-42)", async () => {
    const user = userEvent.setup();
    const post = vi
      .spyOn(api, "postInternalNote")
      .mockImplementation(async (_id, body) => ({ id: Math.random(), body, author: { id: 6, name: "Araya Methee", role: "IT_STAFF" }, createdAt: "2026-10-28T03:00:00.000Z" }));
    await renderDetail();
    const box = screen.getByLabelText("Add an internal note");
    await user.type(box, "First note");
    await user.click(screen.getByRole("button", { name: "Add Note" }));
    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    await user.type(box, "Second note");
    await user.click(screen.getByRole("button", { name: "Add Note" }));
    await waitFor(() => expect(post).toHaveBeenCalledTimes(2));
    const keys = post.mock.calls.map((c) => c[2]);
    expect(keys[0]).toMatch(/^[0-9a-f-]{36}$/);
    expect(keys[0]).not.toBe(keys[1]);
  });

  it("STYLE-11 the gate callout is an info callout; the conflict panel is an alert with a warning icon", async () => {
    const user = userEvent.setup();
    vi.spyOn(api, "setItPriority").mockRejectedValueOnce(new api.ApiError(409, "STALE_UPDATE", "x"));
    await renderDetail(ticket({ resolutionGate: { met: false, reasons: ["NO_COMPLETED_ACTION"] } }));
    expect(document.getElementById("gate-callout")).toHaveClass("tk-callout-info");
    await user.selectOptions(screen.getByLabelText("IT Priority"), "HIGH");
    await user.click(within(screen.getByRole("group", { name: "IT Priority controls" })).getByRole("button", { name: "Save Changes" }));
    const panel = (await screen.findByText("This changed while you were working")).closest("[role=alert]") as HTMLElement;
    expect(panel).toHaveClass("tk-panel-warning");
    expect(panel.querySelector("svg[aria-hidden='true']")).not.toBeNull();
  });
});

describe("Ticket workflow - Requester Ticket Detail", () => {
  it("UI-47 (Requester) the history renders read-only, names only", async () => {
    vi.restoreAllMocks();
    signInAs(REQUESTER_A);
    vi.spyOn(api, "fetchTicket").mockResolvedValue({
      id: 77,
      ticketNumber: "TKT-2026-000077",
      requester: { id: 1, name: "Anucha Prasert" },
      category: { id: 2, name: "Hardware" },
      relatedSystem: { id: 6, name: "Printer" },
      summary: "Laptop battery drains quickly",
      description: "Line one.",
      requestedPriority: "MEDIUM",
      itPriority: "MEDIUM",
      currentStatus: "IN_PROGRESS",
      owner: { name: "Araya Methee", isActive: true },
      requesterResolvedAt: null,
      createdAt: "2026-10-20T03:00:00.000Z",
      updatedAt: "2026-10-21T03:00:00.000Z",
      attachments: [],
      publicComments: [],
      ...lab4Fields("2026-10-21T03:00:00.000Z"),
      historyComplete: true,
      statusHistory: [{ id: 1, fromStatus: null, toStatus: "NEW", changedBy: { name: "Anucha Prasert" }, changedAt: "2026-10-20T03:00:00.000Z" }],
    });
    window.history.pushState({}, "", "/tickets/77");
    render(<App />);
    const heading = await screen.findByRole("heading", { name: "Status history" });
    const section = heading.closest("section") as HTMLElement;
    expect(within(section).getByRole("listitem")).toHaveTextContent("Created as New by Anucha Prasert");
    expect(within(section).queryByRole("button")).not.toBeInTheDocument();
  });
});
