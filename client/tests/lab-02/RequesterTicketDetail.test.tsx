import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App.js";
import * as api from "../../src/api.js";
import { REQUESTER_A, signInAs } from "../support/auth.js";

// UI-24, UI-25, STYLE-07 and STYLE-09 from tests.md. The detail is reached
// through <App /> at /tickets/:id as a signed-in Requester; the API module is
// mocked at its boundary.
//
// Lab 3 (#40), docs/lab-03/tests.md section 4.2: the AuthContext wrapper
// replaces the stored selection, and STYLE-07 at line 78 is rewritten, not
// deleted - the IT Priority badge now always renders (C-71, FR-31).
//
// Lab 3 (#42), ui-spec.md section 14: three additions - the Ticket Owner
// row, the Public Comments card and composer, and the "Problem Appears
// Resolved" action - plus the terminal lock (C-109). UI-24's "no action"
// assertion is rewritten, not deleted, per C-76: the resolution action is
// specified to live inside the same read-only card (14.3).

const TICKET: api.Ticket = {
  id: 42,
  ticketNumber: "TKT-2026-000042",
  requester: { id: 1, name: "Anucha Prasert" },
  category: { id: 2, name: "Hardware" },
  relatedSystem: { id: 6, name: "Printer" },
  summary: "Laptop battery drains quickly",
  description: "The battery drops from full to twenty percent.\nSecond line kept.",
  requestedPriority: "MEDIUM",
  itPriority: "MEDIUM",
  currentStatus: "NEW",
  owner: null,
  requesterResolvedAt: null,
  createdAt: "2026-09-05T04:12:33.000Z",
  updatedAt: "2026-09-05T05:02:44.000Z",
  attachments: [
    {
      id: 7, originalFilename: "battery-report.pdf", mimeType: "application/pdf", sizeBytes: 184320,
      uploadedAt: "2026-09-05T04:15:02.000Z", isRemoved: false, removedAt: null, removalReason: null,
    },
  ],
  publicComments: [],
};

async function renderDetail() {
  window.history.pushState({}, "", "/tickets/42");
  render(<App />);
  await screen.findByRole("heading", { level: 1, name: /TKT-2026-000042/ });
}

beforeEach(() => {
  window.localStorage.clear();
  window.history.replaceState({}, "", "/");
  // Lab 3 (#40), docs/lab-03/tests.md section 4.2: the AuthContext test
  // wrapper signs Requester A in; there is no selector and nothing in storage.
  signInAs(REQUESTER_A);
  vi.spyOn(api, "fetchTicket").mockResolvedValue(TICKET);
});
afterEach(() => vi.restoreAllMocks());

describe("Requester Ticket Detail", () => {
  it("UI-24 renders the Ticket information read-only with no edit, note or status control (AC-53, rewritten per C-76)", async () => {
    await renderDetail();
    const info = screen.getByRole("region", { name: "Ticket information" });

    // every header value is present, none of them is an input
    for (const value of ["Anucha Prasert", "Hardware", "Printer", "Medium", "Laptop battery drains quickly"]) {
      expect(within(info).getByText(value)).toBeInTheDocument();
    }
    expect(within(info).queryByRole("textbox")).not.toBeInTheDocument();
    expect(within(info).queryByRole("combobox")).not.toBeInTheDocument();
    // ui-spec 14.3, FR-30: the resolution action is enabled only in four
    // statuses, and this fixture's Ticket is New - none of them - so the
    // card still carries no button at all, as Lab 2 required.
    expect(within(info).queryByRole("button")).not.toBeInTheDocument();
    expect(within(info).getByText(/Second line kept/)).toHaveClass("tk-prewrap");

    // BR-63: nothing of the IT Staff workflow, not even as a placeholder
    expect(document.body.textContent).not.toMatch(/internal note|actions taken|change status|claim|reassign/i);
    expect(screen.queryByRole("button", { name: /status|edit|save/i })).not.toBeInTheDocument();
  });

  it("ui-spec 14.1 renders a Ticket Owner row, Unassigned when there is none (BR-100)", async () => {
    vi.spyOn(api, "fetchTicket").mockResolvedValue({ ...TICKET, owner: { name: "Araya Methee", isActive: true } });
    await renderDetail();
    const info = screen.getByRole("region", { name: "Ticket information" });
    expect(within(info).getByText("Ticket Owner")).toBeInTheDocument();
    expect(within(info).getByText("Araya Methee")).toBeInTheDocument();
    // BR-100, C-95, AC-115: never the owner's email, anywhere on this screen.
    expect(document.body.textContent).not.toMatch(/araya\.m@example\.ac\.th/);

    cleanup();
    vi.spyOn(api, "fetchTicket").mockResolvedValue({ ...TICKET, owner: null });
    await renderDetail();
    expect(within(screen.getByRole("region", { name: "Ticket information" })).getByText("Unassigned")).toBeInTheDocument();
  });

  it("ui-spec 14.1 / C-114 marks a deactivated owner (inactive), without saying why", async () => {
    vi.spyOn(api, "fetchTicket").mockResolvedValue({ ...TICKET, owner: { name: "Siriporn Chai", isActive: false } });
    await renderDetail();
    const info = screen.getByRole("region", { name: "Ticket information" });
    expect(within(info).getByText("Siriporn Chai")).toBeInTheDocument();
    expect(within(info).getByText("(inactive)")).toBeInTheDocument();
  });

  it("ui-spec 14.2 lists Public Comments newest first, with an empty state and a composer with a live counter (BR-67, FR-53)", async () => {
    vi.spyOn(api, "fetchTicket").mockResolvedValue({
      ...TICKET,
      publicComments: [
        { id: 2, body: "Reply from staff", author: { id: 6, name: "Araya Methee", role: "IT_STAFF" }, createdAt: "2026-09-06T02:00:00.000Z" },
        { id: 1, body: "First report", author: { id: 1, name: "Anucha Prasert", role: "REQUESTER" }, createdAt: "2026-09-05T04:20:00.000Z" },
      ],
    });
    await renderDetail();
    const card = screen.getByRole("region", { name: "Public Comments" });
    const bodies = within(card).getAllByText(/Reply from staff|First report/);
    expect(bodies[0]).toHaveTextContent("Reply from staff");
    expect(within(card).getByText("Araya Methee")).toBeInTheDocument();
    expect(within(card).getByText("Visible to the Requester.")).toBeInTheDocument();
    // the Requester's own entry carries the left-border marker
    const own = within(card).getByText("First report").closest("li");
    expect(own).toHaveClass("tk-entry-own");

    const counter = screen.getByLabelText("Add a comment");
    await userEvent.type(counter, "hello");
    expect(screen.getByText("5 / 2000")).toBeInTheDocument();
  });

  it("ui-spec 14.2 shows the empty state with the composer still present (BR-27)", async () => {
    await renderDetail();
    const card = screen.getByRole("region", { name: "Public Comments" });
    expect(within(card).getByText("No comments yet.")).toBeInTheDocument();
    expect(within(card).getByLabelText("Add a comment")).toBeInTheDocument();
  });

  it("UI-34 a comment body containing markup renders as visible text, no element from it in the DOM (AC-51, BR-66)", async () => {
    const posted: api.Entry = { id: 9, body: "<b>bold</b> text", author: { id: 1, name: "Anucha Prasert", role: "REQUESTER" }, createdAt: "2026-09-06T03:00:00.000Z" };
    vi.spyOn(api, "postPublicComment").mockResolvedValue(posted);
    await renderDetail();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Add a comment"), "<b>bold</b> text");
    await user.click(screen.getByRole("button", { name: "Post Comment" }));
    const card = await screen.findByRole("region", { name: "Public Comments" });
    expect(within(card).getByText("<b>bold</b> text")).toBeInTheDocument();
    expect(card.querySelector("b")).toBeNull();
  });

  it("ui-spec 14.3 the resolution confirmation: Cancel sends nothing, confirming sets the marker and swaps the action for a reported line (FR-30, BR-59, BR-61)", async () => {
    // FR-30: the action only renders in Open, In Progress, Waiting for
    // Requester or Reopened - not New, this suite's default fixture status.
    vi.spyOn(api, "fetchTicket").mockResolvedValue({ ...TICKET, currentStatus: "OPEN" });
    const resolved: api.Ticket = { ...TICKET, currentStatus: "OPEN", requesterResolvedAt: "2026-09-06T05:00:00.000Z" };
    const post = vi.spyOn(api, "postRequesterResolved").mockResolvedValue(resolved);
    await renderDetail();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Problem Appears Resolved" }));
    const dialog = screen.getByRole("dialog", { name: "Report that the problem appears resolved" });
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(post).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Problem Appears Resolved" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Problem Appears Resolved" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Report it" }));
    await waitFor(() => expect(post).toHaveBeenCalledWith(42));

    const info = screen.getByRole("region", { name: "Ticket information" });
    expect(within(info).getByText("Requester says resolved")).toBeInTheDocument();
    expect(screen.getByText(/You reported this on/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Problem Appears Resolved" })).not.toBeInTheDocument();
    // the status is untouched - the badge still reads Open
    expect(within(info).getByText("Open")).toBeInTheDocument();
  });

  it("ui-spec 14.4 a Closed Ticket is read-only: no composer, no upload, no Remove, and the terminal line renders once (BR-108, C-109)", async () => {
    vi.spyOn(api, "fetchTicket").mockResolvedValue({ ...TICKET, currentStatus: "CLOSED" });
    await renderDetail();
    expect(screen.queryByLabelText("Add a comment")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Add attachment")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Remove /i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Problem Appears Resolved" })).not.toBeInTheDocument();
    expect(screen.getAllByText("This ticket is closed - create a new ticket if the problem returns.")).toHaveLength(1);
    // reading stays available
    expect(screen.getByRole("button", { name: /^Download /i })).toBeInTheDocument();
  });

  it("UI-25 renders Ticket Date and Last Updated as DD MMM YYYY HH:mm in Asia/Bangkok (AC-60)", async () => {
    await renderDetail();
    const info = screen.getByRole("region", { name: "Ticket information" });
    expect(within(info).getByText("05 Sep 2026 11:12")).toBeInTheDocument(); // 04:12Z + 7h
    expect(within(info).getByText("05 Sep 2026 12:02")).toBeInTheDocument(); // 05:02Z + 7h
    const timestamps = within(info).getAllByText(/^\d{2} [A-Z][a-z]{2} \d{4} \d{2}:\d{2}$/);
    expect(timestamps).toHaveLength(2);
  });

  it("STYLE-07 renders the Current Status badge and the IT Priority badge beside it (FR-31, C-71)", async () => {
    await renderDetail();
    const heading = screen.getByRole("heading", { level: 1, name: /TKT-2026-000042/ });
    const status = within(heading.parentElement!).getByText("New");
    expect(status).toHaveClass("tk-badge", "tk-badge-square", "tk-status-new");
    const it = within(heading.parentElement!).getByText("IT Medium");
    expect(it).toHaveClass("tk-badge", "tk-badge-pill", "tk-priority-medium");
  });

  it("STYLE-09 gives every interactive control a non-empty accessible name (AC-56)", async () => {
    await renderDetail();
    const controls = document.querySelectorAll<HTMLElement>("button, a[href], input, select, textarea");
    expect(controls.length).toBeGreaterThan(0);
    for (const el of controls) {
      expect(el, el.outerHTML).toHaveAccessibleName();
    }
  });

  it("offers Back to My Tickets and a headed Attachments card with the active count", async () => {
    await renderDetail();
    expect(screen.getByRole("link", { name: "Back to My Tickets" })).toHaveAttribute("href", "/tickets");
    const attachments = screen.getByRole("region", { name: /^Attachments/ });
    expect(within(attachments).getByText("1 of 5 active")).toBeInTheDocument();
  });
});
