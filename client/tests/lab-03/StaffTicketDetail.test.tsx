import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within, waitFor, cleanup, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App.js";
import * as api from "../../src/api.js";
import { IT_STAFF, signInAs } from "../support/auth.js";

// Planned rows UI-25..UI-37 (tests.md section 2.3, Issue #42/#6). The screen
// is reached through <App /> at /queue/:id as a signed-in IT Staff user; the
// API module is mocked at its boundary. jsdom's absent matchMedia means
// useMediaQuery always assumes the widest layout, same caveat as
// StaffTicketQueue.test.tsx - the viewport-specific column counts are
// Playwright's job (staff-ticket-flow.spec.ts).

function ticket(overrides: Partial<api.StaffTicket> = {}): api.StaffTicket {
  return {
    id: 77,
    ticketNumber: "TKT-2026-000077",
    requester: { id: 1, name: "Anucha Prasert", email: "anucha.p@example.ac.th" },
    category: { id: 2, name: "Hardware" },
    relatedSystem: { id: 6, name: "Printer" },
    summary: "Laptop battery drains quickly",
    description: "Line one.\nLine two kept.",
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
    ...overrides,
  };
}

const USERS: api.AssignableUser[] = [
  { id: 6, name: "Araya Methee", role: "IT_STAFF" },
  { id: 10, name: "Panida Srisawat", role: "ADMINISTRATOR" },
];

async function renderDetail(path = "/queue/77") {
  window.history.pushState({}, "", path);
  render(<App />);
  await screen.findByRole("heading", { level: 1, name: /TKT-2026-000077/ });
}

beforeEach(() => {
  window.history.replaceState({}, "", "/");
  signInAs(IT_STAFF);
  vi.spyOn(api, "fetchAssignableUsers").mockResolvedValue(USERS);
});
afterEach(() => vi.restoreAllMocks());

describe("IT Staff Ticket Detail", () => {
  it("UI-25 the read-only group renders Requester, Category, Related System, Requested Priority and the dates with no input among them (FR-43)", async () => {
    vi.spyOn(api, "fetchStaffTicket").mockResolvedValue(ticket());
    await renderDetail();
    const info = screen.getByRole("region", { name: "Ticket information" });
    expect(within(info).getByText(/Anucha Prasert/)).toBeInTheDocument();
    expect(within(info).getByText(/anucha\.p@example\.ac\.th/)).toBeInTheDocument();
    expect(within(info).getByText("Hardware")).toBeInTheDocument();
    expect(within(info).getByText("Printer")).toBeInTheDocument();
    expect(within(info).getByText("Medium")).toBeInTheDocument();
    expect(within(info).queryByRole("textbox")).not.toBeInTheDocument();
    expect(within(info).queryByRole("combobox")).not.toBeInTheDocument();
    expect(within(info).queryByRole("button")).not.toBeInTheDocument();
  });

  it("UI-26 Claim renders only when the Ticket is unassigned (FR-44)", async () => {
    vi.spyOn(api, "fetchStaffTicket").mockResolvedValue(ticket({ owner: null }));
    await renderDetail();
    const ops = screen.getByRole("region", { name: "Ticket Operations" });
    expect(within(ops).getByRole("button", { name: "Claim" })).toBeInTheDocument();

    cleanup();
    vi.spyOn(api, "fetchStaffTicket").mockResolvedValue(ticket({ owner: { id: 6, name: "Araya Methee", role: "IT_STAFF", isActive: true } }));
    await renderDetail();
    expect(screen.queryByRole("button", { name: "Claim" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Unassign" })).toBeInTheDocument();
  });

  it("UI-27 the lost claim race renders the conflict inline, refreshes the view, and Claim is gone (FR-44, AC-71)", async () => {
    vi.spyOn(api, "fetchStaffTicket")
      .mockResolvedValueOnce(ticket({ owner: null }))
      .mockResolvedValueOnce(ticket({ owner: { id: 10, name: "Panida Srisawat", role: "ADMINISTRATOR", isActive: true } }));
    vi.spyOn(api, "claimTicket").mockRejectedValue(
      new api.ApiError(409, "ALREADY_OWNED", "Panida Srisawat claimed this ticket first. The ticket has been refreshed."),
    );
    await renderDetail();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Claim" }));

    expect(await screen.findByText("Panida Srisawat claimed this ticket first. The ticket has been refreshed.")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("region", { name: "Ticket Operations" })).toHaveTextContent("Panida Srisawat"));
    expect(screen.queryByRole("button", { name: "Claim" })).not.toBeInTheDocument();
  });

  it("UI-28 Assign/Reassign offers only the users GET /api/staff/assignable-users returns (FR-45, BR-104, C-105)", async () => {
    vi.spyOn(api, "fetchStaffTicket").mockResolvedValue(ticket({ owner: null }));
    await renderDetail();
    const select = screen.getByLabelText("Assign to…");
    const names = within(select).getAllByRole("option").map((o) => o.textContent);
    expect(names).toEqual(["Choose a user", "Araya Methee", "Panida Srisawat"]);
    expect(screen.queryByText("Anucha Prasert", { selector: "option" })).not.toBeInTheDocument();
  });

  it("UI-29 the status select offers exactly the matrix's permitted targets from each current status (ui-spec 16.2, specification 5.1)", async () => {
    const cases: Array<[api.TicketStatus, string[]]> = [
      ["NEW", ["Open", "In Progress", "Cancelled"]],
      ["OPEN", ["In Progress", "Waiting for Requester", "Resolved", "Cancelled"]],
      ["RESOLVED", ["Closed", "Reopened"]],
    ];
    for (const [status, expected] of cases) {
      vi.spyOn(api, "fetchStaffTicket").mockResolvedValue(ticket({ currentStatus: status, owner: { id: 6, name: "Araya Methee", role: "IT_STAFF", isActive: true } }));
      await renderDetail();
      const select = screen.getByLabelText("Current Status");
      const options = within(select).getAllByRole("option").map((o) => o.textContent);
      expect(options.slice(1)).toEqual(expected);
      cleanup();
    }
  });

  it("UI-30 on a Closed and on a Cancelled Ticket the status select is absent and the explanatory line renders once, below the lists (BR-58, C-98, C-117)", async () => {
    vi.spyOn(api, "fetchStaffTicket").mockResolvedValue(ticket({ currentStatus: "CLOSED", owner: { id: 6, name: "Araya Methee", role: "IT_STAFF", isActive: true } }));
    await renderDetail();
    expect(screen.queryByLabelText("Current Status")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Claim" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Unassign" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("IT Priority")).not.toBeInTheDocument();
    // C-117 rewrites this assertion (it said 2: the Operations card and below
    // the lists). The line now renders once, below the comment/note lists
    // (16.4); the Operations card shows owner and IT Priority read-only only.
    const closed = screen.getAllByText("This ticket is closed - create a new ticket if the problem returns.");
    expect(closed).toHaveLength(1);
    expect(within(screen.getByRole("region", { name: "Ticket Operations" })).queryByText(/This ticket is closed/)).not.toBeInTheDocument();

    cleanup();
    vi.spyOn(api, "fetchStaffTicket").mockResolvedValue(ticket({ currentStatus: "CANCELLED" }));
    await renderDetail();
    expect(screen.queryByLabelText("Current Status")).not.toBeInTheDocument();
    expect(screen.getAllByText("This ticket is cancelled - create a new ticket if the problem returns.")).toHaveLength(1);
  });

  it("UI-31 Resolved, Closed and Cancelled each open a confirmation and send no request until confirmed; Cancel sends nothing (AC-80, BR-57)", async () => {
    const setStatus = vi.spyOn(api, "setTicketStatus");
    vi.spyOn(api, "fetchStaffTicket").mockResolvedValue(ticket({ currentStatus: "OPEN", owner: { id: 6, name: "Araya Methee", role: "IT_STAFF", isActive: true } }));
    await renderDetail();
    const user = userEvent.setup();

    await user.selectOptions(screen.getByLabelText("Current Status"), "RESOLVED");
    await user.click(within(screen.getByRole("group", { name: "Current Status controls" })).getByRole("button", { name: "Save Changes" }));
    expect(await screen.findByRole("dialog", { name: "Resolve this ticket" })).toBeInTheDocument();
    expect(setStatus).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(setStatus).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("the Cancelled confirmation reads Keep the ticket, never Cancel beside Cancel Ticket (BR-58)", async () => {
    vi.spyOn(api, "fetchStaffTicket").mockResolvedValue(ticket({ currentStatus: "OPEN", owner: { id: 6, name: "Araya Methee", role: "IT_STAFF", isActive: true } }));
    await renderDetail();
    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText("Current Status"), "CANCELLED");
    await user.click(within(screen.getByRole("group", { name: "Current Status controls" })).getByRole("button", { name: "Save Changes" }));
    const dialog = await screen.findByRole("dialog", { name: "Cancel this ticket" });
    expect(within(dialog).getByRole("button", { name: "Keep the ticket" })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Cancel Ticket" })).toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();
  });

  it("a confirmed Resolved move sends the request and the view updates (AC-80)", async () => {
    vi.spyOn(api, "fetchStaffTicket").mockResolvedValue(ticket({ currentStatus: "OPEN", owner: { id: 6, name: "Araya Methee", role: "IT_STAFF", isActive: true } }));
    const setStatus = vi.spyOn(api, "setTicketStatus").mockResolvedValue(ticket({ currentStatus: "RESOLVED", owner: { id: 6, name: "Araya Methee", role: "IT_STAFF", isActive: true } }));
    await renderDetail();
    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText("Current Status"), "RESOLVED");
    await user.click(within(screen.getByRole("group", { name: "Current Status controls" })).getByRole("button", { name: "Save Changes" }));
    await user.click(await screen.findByRole("button", { name: "Resolve" }));
    expect(setStatus).toHaveBeenCalledWith(77, "RESOLVED");
    await waitFor(() => expect(screen.getByRole("heading", { level: 1 }).parentElement).toHaveTextContent("Resolved"));
  });

  it("a status move needing an owner, with none, renders the OWNER_REQUIRED message inline beside the status control (C-93)", async () => {
    vi.spyOn(api, "fetchStaffTicket").mockResolvedValue(ticket({ currentStatus: "NEW", owner: null }));
    vi.spyOn(api, "setTicketStatus").mockRejectedValue(
      new api.ApiError(409, "OWNER_REQUIRED", "This ticket needs a Ticket Owner first. Claim it or assign it, then try again."),
    );
    await renderDetail();
    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText("Current Status"), "IN_PROGRESS");
    await user.click(within(screen.getByRole("group", { name: "Current Status controls" })).getByRole("button", { name: "Save Changes" }));
    expect(await screen.findByText("This ticket needs a Ticket Owner first. Claim it or assign it, then try again.")).toBeInTheDocument();
  });

  it("UI-32 the resolution callout renders when the flag is set, and is not presented as a status (FR-50, AC-59)", async () => {
    vi.spyOn(api, "fetchStaffTicket").mockResolvedValue(
      ticket({ currentStatus: "WAITING_FOR_REQUESTER", requesterResolvedAt: "2026-09-07T01:00:00.000Z", owner: { id: 6, name: "Araya Methee", role: "IT_STAFF", isActive: true } }),
    );
    await renderDetail();
    const callout = screen.getByRole("status");
    expect(callout).toHaveTextContent(/The Requester reported on .* that the problem appears resolved\./);
    expect(callout).not.toHaveClass("tk-badge");
    const info = screen.getByRole("region", { name: "Ticket information" });
    expect(within(info).getByText("Waiting for Requester")).toBeInTheDocument();
    expect(within(info).getByText("Requester says resolved")).toBeInTheDocument();
  });

  it("UI-33 Public Comments and Internal Notes render distinctly: different headings, the standing label, and separation between the composers (FR-55, AC-107)", async () => {
    vi.spyOn(api, "fetchStaffTicket").mockResolvedValue(ticket());
    await renderDetail();
    expect(screen.getByRole("heading", { name: "Public Comments" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Internal Notes" })).toBeInTheDocument();
    expect(screen.getByText("Visible to the Requester.")).toBeInTheDocument();
    expect(screen.getByText("Not visible to the Requester.")).toBeInTheDocument();
    const notesPanel = screen.getByRole("region", { name: "Internal Notes" });
    expect(notesPanel).toHaveClass("tk-internal-panel");
    const commentsCard = screen.getByRole("region", { name: "Public Comments" });
    expect(commentsCard).not.toHaveClass("tk-internal-panel");
    // the two composers are not adjacent: the notes panel follows the comments card
    expect(commentsCard.compareDocumentPosition(notesPanel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("UI-34 a comment or note body containing markup renders as visible text, no element from it in the DOM (AC-51, BR-66)", async () => {
    vi.spyOn(api, "fetchStaffTicket").mockResolvedValue(ticket());
    vi.spyOn(api, "postInternalNote").mockResolvedValue({
      id: 5, body: "<i>italic</i> note", author: { id: 6, name: "Araya Methee", role: "IT_STAFF" }, createdAt: "2026-09-06T03:00:00.000Z",
    });
    await renderDetail();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Add an internal note"), "<i>italic</i> note");
    await user.click(screen.getByRole("button", { name: "Add Note" }));
    const panel = await screen.findByRole("region", { name: "Internal Notes" });
    expect(within(panel).getByText("<i>italic</i> note")).toBeInTheDocument();
    expect(panel.querySelector("i")).toBeNull();
  });

  it("UI-35 the live character counter tracks the body length and turns danger past 2000 (FR-53)", async () => {
    vi.spyOn(api, "fetchStaffTicket").mockResolvedValue(ticket());
    await renderDetail();
    const note = screen.getByLabelText("Add an internal note");
    await userEvent.type(note, "hello");
    expect(screen.getByText("5 / 2000")).toBeInTheDocument();
    // fireEvent.change rather than typing 2001 keystrokes one at a time.
    fireEvent.change(note, { target: { value: "a".repeat(2001) } });
    const counter = screen.getByText("2001 / 2000");
    expect(counter).toHaveClass("tk-char-counter-danger");
  });

  it("UI-36 no comment and no note renders an edit or delete affordance (FR-51, BR-63)", async () => {
    vi.spyOn(api, "fetchStaffTicket").mockResolvedValue(
      ticket({
        publicComments: [{ id: 1, body: "A comment", author: { id: 1, name: "Anucha Prasert", role: "REQUESTER" }, createdAt: "2026-09-05T04:20:00.000Z" }],
        internalNotes: [{ id: 2, body: "A note", author: { id: 6, name: "Araya Methee", role: "IT_STAFF" }, createdAt: "2026-09-05T04:30:00.000Z" }],
      }),
    );
    await renderDetail();
    expect(screen.queryByRole("button", { name: /edit/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /delete/i })).not.toBeInTheDocument();
  });

  it("UI-37 staff attachments are read-only: Preview and Download render, no upload and no Remove control renders (C-103, FR-49)", async () => {
    vi.spyOn(api, "fetchStaffTicket").mockResolvedValue(
      ticket({
        attachments: [
          { id: 3, originalFilename: "report.pdf", mimeType: "application/pdf", sizeBytes: 1024, uploadedAt: "2026-09-05T04:15:00.000Z", isRemoved: false, removedAt: null, removalReason: null },
        ],
      }),
    );
    await renderDetail();
    const card = screen.getByRole("region", { name: "Attachments" });
    expect(within(card).getByRole("button", { name: "Preview report.pdf" })).toBeInTheDocument();
    expect(within(card).getByRole("button", { name: "Download report.pdf" })).toBeInTheDocument();
    expect(within(card).queryByLabelText("Add attachment")).not.toBeInTheDocument();
    expect(within(card).queryByRole("button", { name: /remove/i })).not.toBeInTheDocument();
    expect(within(card).getByText("1 of 5 active")).toBeInTheDocument();
  });

  it("renders a loading skeleton, then a safe failure panel with Retry (ui-spec 20.1)", async () => {
    let release!: (value: api.StaffTicket) => void;
    vi.spyOn(api, "fetchStaffTicket").mockImplementationOnce(() => new Promise((resolve) => (release = resolve)));
    window.history.pushState({}, "", "/queue/77");
    render(<App />);
    expect(await screen.findByRole("region", { name: "Ticket detail" })).toHaveAttribute("aria-busy", "true");
    release(ticket());
    expect(await screen.findByRole("heading", { level: 1, name: /TKT-2026-000077/ })).toBeInTheDocument();

    cleanup();
    vi.spyOn(api, "fetchStaffTicket").mockRejectedValue(new Error('relation "Ticket" at /var/lib/postgresql'));
    window.history.pushState({}, "", "/queue/77");
    render(<App />);
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/Something went wrong/);
    expect(document.body.textContent).not.toMatch(/postgresql|relation/i);
    expect(within(alert).getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("a 403 FORBIDDEN_ROLE from the API renders the Forbidden state, not a blank screen (FR-24, C-63)", async () => {
    vi.spyOn(api, "fetchStaffTicket").mockRejectedValue(new api.ApiError(403, "FORBIDDEN_ROLE", "You do not have access to that page."));
    window.history.pushState({}, "", "/queue/77");
    render(<App />);
    expect(await screen.findByRole("heading", { name: "You do not have access to that page." })).toBeInTheDocument();
  });

  it("a missing Ticket renders the not-found refusal, never revealing existence (C-65)", async () => {
    vi.spyOn(api, "fetchStaffTicket").mockRejectedValue(new api.ApiError(404, "TICKET_NOT_FOUND", "That ticket does not exist."));
    window.history.pushState({}, "", "/queue/999");
    render(<App />);
    expect(await screen.findByText("That item does not exist.")).toBeInTheDocument();
  });
});
