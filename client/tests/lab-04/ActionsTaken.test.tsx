import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App.js";
import * as api from "../../src/api.js";
import { bangkokLocalToIso, isoToBangkokLocal } from "../../src/components/ActionsTaken.js";
import { formatDisplayTimestamp } from "../../src/format.js";
import { lab4Fields, withStaffLab4 } from "../support/lab4.js";
import { IT_STAFF, REQUESTER_A, signInAs } from "../support/auth.js";

// tests.md 2.3 - Actions Taken (ui-spec 8): UNIT-09 to UNIT-11, UI-21 to
// UI-39, STYLE-01 to STYLE-08. The API is mocked at its boundary; every write
// answers with the staff Ticket DTO (C-136).

const USERS: api.AssignableUser[] = [
  { id: 6, name: "Araya Methee", role: "IT_STAFF" },
  { id: 7, name: "Decha Intharat", role: "IT_STAFF" },
];

const ARAYA = { id: 6, name: "Araya Methee", isActive: true };
const DECHA = { id: 7, name: "Decha Intharat", isActive: true };

function action(overrides: Partial<api.StaffAction> = {}): api.StaffAction {
  return {
    id: 31,
    status: "PLANNED",
    actionAt: "2026-10-27T03:00:00.000Z",
    description: "Replace the laptop battery.",
    result: null,
    followUpRequired: false,
    followUpNote: null,
    attachmentNotes: null,
    assignee: DECHA,
    createdBy: ARAYA,
    performedBy: null,
    createdAt: "2026-10-26T03:00:00.000Z",
    finishedAt: null,
    version: 0,
    allowedOperations: ["EDIT", "COMPLETE", "CANCEL"],
    ...overrides,
  };
}

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
    owner: { id: 6, name: "Araya Methee", role: "IT_STAFF", isActive: true },
    requesterResolvedAt: null,
    createdAt: "2026-10-20T03:00:00.000Z",
    updatedAt: "2026-10-27T03:00:00.000Z",
    attachments: [],
    publicComments: [],
    internalNotes: [],
    ...lab4Fields("2026-10-27T03:00:00.000Z"),
    ...overrides,
  });
}

async function renderDetail(t: api.StaffTicket = ticket()) {
  vi.spyOn(api, "fetchStaffTicket").mockResolvedValue(t);
  window.history.pushState({}, "", "/queue/77");
  render(<App />);
  return (await screen.findByRole("region", { name: "Actions Taken" })) as HTMLElement;
}

beforeEach(() => {
  window.history.replaceState({}, "", "/");
  signInAs(IT_STAFF);
  vi.spyOn(api, "fetchAssignableUsers").mockResolvedValue(USERS);
});
afterEach(() => vi.restoreAllMocks());

describe("Actions Taken - units", () => {
  it("UNIT-09 a datetime-local value is read as Asia/Bangkok and sent with +07:00; back again (BR-07, AC-14)", () => {
    expect(bangkokLocalToIso("2026-10-28T14:05")).toBe("2026-10-28T14:05:00+07:00");
    expect(bangkokLocalToIso("2026-10-28 14:05")).toBeNull();
    expect(bangkokLocalToIso("")).toBeNull();
    expect(isoToBangkokLocal("2026-10-28T07:05:00.000Z")).toBe("2026-10-28T14:05");
    // The Ticket's creation minute is sent as createdAt itself, so "now" on a
    // Ticket created this minute is not refused as before creation (BR-07);
    // an earlier minute is sent unchanged, for the server to refuse.
    expect(bangkokLocalToIso("2026-10-28T14:05", "2026-10-28T07:05:30.120Z")).toBe("2026-10-28T07:05:30.120Z");
    expect(bangkokLocalToIso("2026-10-28T14:06", "2026-10-28T07:05:30.120Z")).toBe("2026-10-28T14:06:00+07:00");
    expect(bangkokLocalToIso("2026-10-28T14:04", "2026-10-28T07:05:30.120Z")).toBe("2026-10-28T14:04:00+07:00");
  });

  it("UNIT-10 action times display as DD MMM YYYY HH:mm in Asia/Bangkok", () => {
    expect(formatDisplayTimestamp("2026-10-27T03:00:00.000Z")).toBe("27 Oct 2026 10:00");
  });

  it("UNIT-11 newClientRequestId mints a fresh RFC 4122 UUID each call (BR-42)", () => {
    const a = api.newClientRequestId();
    const b = api.newClientRequestId();
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect(a).not.toBe(b);
  });
});

describe("Actions Taken - IT Staff Ticket Detail", () => {
  it("UI-21 lists every action newest first with status, people, result and follow-up (FR-01, BR-22)", async () => {
    const done = action({
      id: 30,
      status: "COMPLETED",
      actionAt: "2026-10-25T03:00:00.000Z",
      description: "Ran the battery diagnostic.",
      result: "Battery health 41%.",
      followUpRequired: true,
      followUpNote: "Order a replacement battery.",
      performedBy: ARAYA,
      finishedAt: "2026-10-25T03:00:00.000Z",
      allowedOperations: [],
    });
    const card = await renderDetail(ticket({ actions: [action(), done] }));
    const rows = within(card).getAllByRole("listitem");
    expect(rows[0]).toHaveTextContent("Replace the laptop battery.");
    expect(rows[1]).toHaveTextContent("Battery health 41%.");
    expect(rows[1]).toHaveTextContent("Follow-up needed: Order a replacement battery.");
    expect(rows[1]).toHaveTextContent("Completed by Araya Methee on 25 Oct 2026 10:00");
    expect(rows[0]).toHaveTextContent("Created by Araya Methee on 26 Oct 2026 10:00");
  });

  it("UI-22 an empty list says so, with the composer still present", async () => {
    const card = await renderDetail();
    expect(within(card).getByText("No actions recorded yet.")).toBeInTheDocument();
    expect(within(card).getByRole("button", { name: "Add Action" })).toBeInTheDocument();
  });

  it("UI-23 composer defaults: Completed, now in Bangkok, the signed-in user as assignee (BR-18)", async () => {
    const card = await renderDetail();
    expect(within(card).getByLabelText("Completed")).toBeChecked();
    expect(within(card).getByLabelText(/^Action Date\/Time/)).toHaveValue(isoToBangkokLocal(new Date()));
    expect(within(card).getByLabelText("Assignee")).toHaveValue("6");
  });

  it("UI-24 Result and Follow-Up show only for Completed; the note only when ticked, and unticking clears it (BR-05, AC-09)", async () => {
    const user = userEvent.setup();
    const card = await renderDetail();
    await user.click(within(card).getByLabelText("Planned"));
    expect(within(card).queryByLabelText(/^Result/)).not.toBeInTheDocument();
    expect(within(card).queryByLabelText("Follow-Up Required?")).not.toBeInTheDocument();
    await user.click(within(card).getByLabelText("Completed"));
    expect(within(card).queryByLabelText(/^Follow-up Note/)).not.toBeInTheDocument();
    await user.click(within(card).getByLabelText("Follow-Up Required?"));
    await user.type(within(card).getByLabelText(/^Follow-up Note/), "Order a battery.");
    await user.click(within(card).getByLabelText("Follow-Up Required?"));
    await user.click(within(card).getByLabelText("Follow-Up Required?"));
    expect(within(card).getByLabelText(/^Follow-up Note/)).toHaveValue("");
  });

  it("UI-25 the request body: trimmed text, +07:00 time, the replay key, and no follow-up note when unticked (BR-04, BR-07, BR-42)", async () => {
    const user = userEvent.setup();
    const create = vi.spyOn(api, "createAction").mockResolvedValue(ticket({ actions: [action()] }));
    const card = await renderDetail();
    await user.clear(within(card).getByLabelText(/^Action Date\/Time/));
    await user.type(within(card).getByLabelText(/^Action Date\/Time/), "2026-10-27T09:30");
    await user.type(within(card).getByLabelText(/^Description/), "  Ran the diagnostic.  ");
    await user.type(within(card).getByLabelText(/^Result/), "Health 41%.");
    await user.click(within(card).getByRole("button", { name: "Add Action" }));
    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    const [id, body] = create.mock.calls[0];
    expect(id).toBe(77);
    expect(body).toMatchObject({
      status: "COMPLETED",
      actionAt: "2026-10-27T09:30:00+07:00",
      description: "Ran the diagnostic.",
      result: "Health 41%.",
      followUpRequired: false,
      assigneeId: 6,
    });
    expect(body).not.toHaveProperty("followUpNote");
    expect(body.clientRequestId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("UI-26 client validation shows the catalogue messages below their fields and sends nothing", async () => {
    const user = userEvent.setup();
    const create = vi.spyOn(api, "createAction");
    const card = await renderDetail();
    await user.click(within(card).getByRole("button", { name: "Add Action" }));
    expect(within(card).getByText("Description is required and must be 2000 characters or fewer.")).toBeInTheDocument();
    expect(within(card).getByText("Result is required and must be 2000 characters or fewer.")).toBeInTheDocument();
    expect(within(card).getByLabelText(/^Description/)).toHaveFocus();
    expect(create).not.toHaveBeenCalled();
  });

  it("UI-27 success shows Action added., resets the form and mints a new key (FR-08, BR-44)", async () => {
    const user = userEvent.setup();
    const create = vi.spyOn(api, "createAction").mockResolvedValue(ticket({ actions: [action()] }));
    const card = await renderDetail();
    await user.type(within(card).getByLabelText(/^Description/), "First.");
    await user.type(within(card).getByLabelText(/^Result/), "Done.");
    await user.click(within(card).getByRole("button", { name: "Add Action" }));
    expect(await screen.findByText("Action added.")).toBeInTheDocument();
    expect(within(card).getByLabelText(/^Description/)).toHaveValue("");
    await user.type(within(card).getByLabelText(/^Description/), "Second.");
    await user.type(within(card).getByLabelText(/^Result/), "Done.");
    await user.click(within(card).getByRole("button", { name: "Add Action" }));
    await waitFor(() => expect(create).toHaveBeenCalledTimes(2));
    expect(create.mock.calls[0][1].clientRequestId).not.toBe(create.mock.calls[1][1].clientRequestId);
  });

  it("UI-28 while in flight the button is busy and disabled, so a second click sends nothing (BR-44)", async () => {
    const user = userEvent.setup();
    let resolve!: (t: api.StaffTicket) => void;
    const create = vi.spyOn(api, "createAction").mockImplementation(() => new Promise((r) => (resolve = r)));
    const card = await renderDetail();
    await user.type(within(card).getByLabelText(/^Description/), "x");
    await user.type(within(card).getByLabelText(/^Result/), "y");
    await user.click(within(card).getByRole("button", { name: "Add Action" }));
    const busy = within(card).getByRole("button", { name: "Adding…" });
    expect(busy).toBeDisabled();
    expect(busy).toHaveAttribute("aria-busy", "true");
    await user.click(busy);
    expect(create).toHaveBeenCalledTimes(1);
    resolve(ticket());
  });

  it("UI-29 a failure keeps every typed value (BR-63, C-147)", async () => {
    const user = userEvent.setup();
    vi.spyOn(api, "createAction").mockRejectedValue(new api.ApiError(0, "INTERNAL_ERROR", "Network error"));
    const card = await renderDetail();
    await user.type(within(card).getByLabelText(/^Description/), "Kept description.");
    await user.type(within(card).getByLabelText(/^Result/), "Kept result.");
    await user.click(within(card).getByRole("button", { name: "Add Action" }));
    expect(await within(card).findByText("Something went wrong on our side. Your work has not been lost - please try again.")).toBeInTheDocument();
    expect(within(card).getByLabelText(/^Description/)).toHaveValue("Kept description.");
    expect(within(card).getByLabelText(/^Result/)).toHaveValue("Kept result.");
  });

  it("UI-30 row controls come from allowedOperations only (FR-09, C-174)", async () => {
    const card = await renderDetail(ticket({ actions: [action({ allowedOperations: ["EDIT"] })] }));
    const row = within(card).getAllByRole("listitem")[0];
    expect(within(row).getByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(within(row).queryByRole("button", { name: "Complete" })).not.toBeInTheDocument();
    expect(within(row).queryByRole("button", { name: "Cancel action" })).not.toBeInTheDocument();
  });

  it("UI-31 Edit sends only the changed fields with the action's version; Save is disabled until something differs (BR-90, C-175)", async () => {
    const user = userEvent.setup();
    const edit = vi.spyOn(api, "editAction").mockResolvedValue(ticket({ actions: [action({ version: 1 })] }));
    const card = await renderDetail(ticket({ actions: [action({ version: 3 })] }));
    await user.click(within(card).getByRole("button", { name: "Edit" }));
    const panel = within(card).getByRole("group", { name: "Edit action" });
    const save = within(panel).getByRole("button", { name: "Save Action" });
    expect(save).toBeDisabled();
    await user.type(within(panel).getByLabelText(/^Description/), " Recalibrate.");
    await user.click(save);
    await waitFor(() => expect(edit).toHaveBeenCalledWith(31, { version: 3, description: "Replace the laptop battery. Recalibrate." }));
    expect(await screen.findByText("Action saved.")).toBeInTheDocument();
    // A successful write returns the row to view mode.
    expect(within(card).queryByRole("group", { name: "Edit action" })).not.toBeInTheDocument();
  });

  it("UI-32 Complete sends result, follow-up and version; the stored time is not re-sent unless changed (BR-11, C-168)", async () => {
    const user = userEvent.setup();
    const complete = vi.spyOn(api, "completeAction").mockResolvedValue(
      ticket({ actions: [action({ status: "COMPLETED", result: "Battery replaced.", version: 3, allowedOperations: [] })] }),
    );
    const card = await renderDetail(ticket({ actions: [action({ version: 2 })] }));
    await user.click(within(card).getByRole("button", { name: "Complete" }));
    const panel = within(card).getByRole("group", { name: "Complete action" });
    await user.type(within(panel).getByLabelText(/^Result/), "Battery replaced.");
    await user.click(within(panel).getByRole("button", { name: "Complete Action" }));
    await waitFor(() => expect(complete).toHaveBeenCalledWith(31, { version: 2, result: "Battery replaced.", followUpRequired: false }));
    expect(await screen.findByText("Action completed.")).toBeInTheDocument();
    // A successful write returns the row to view mode: no panel on a finished action.
    expect(within(card).queryByRole("group", { name: "Complete action" })).not.toBeInTheDocument();
  });

  it("UI-33 Cancel needs a Reason, warns it is final, and sends it as the result (BR-12)", async () => {
    const user = userEvent.setup();
    const cancel = vi.spyOn(api, "cancelAction").mockResolvedValue(
      ticket({ actions: [action({ status: "CANCELLED", result: "No longer needed.", version: 1, allowedOperations: [] })] }),
    );
    const card = await renderDetail(ticket({ actions: [action()] }));
    await user.click(within(card).getByRole("button", { name: "Cancel action" }));
    const panel = within(card).getByRole("group", { name: "Cancel action" });
    expect(within(panel).getByText("Cancelling is final. The action stays on the record with your reason.")).toBeInTheDocument();
    await user.click(within(panel).getByRole("button", { name: "Cancel Action" }));
    expect(within(panel).getByText("Reason is required and must be 2000 characters or fewer.")).toBeInTheDocument();
    expect(cancel).not.toHaveBeenCalled();
    await user.type(within(panel).getByLabelText(/^Reason/), "No longer needed.");
    await user.click(within(panel).getByRole("button", { name: "Cancel Action" }));
    await waitFor(() => expect(cancel).toHaveBeenCalledWith(31, { version: 0, result: "No longer needed." }));
    // A successful write returns the row to view mode: no panel on a finished action.
    await waitFor(() => expect(within(card).queryByRole("group", { name: "Cancel action" })).not.toBeInTheDocument());
  });

  it("UI-34 STALE_UPDATE on an edit: re-fetch, keep the draft, apply again with the fresh version (BR-39, C-153)", async () => {
    const user = userEvent.setup();
    const edit = vi
      .spyOn(api, "editAction")
      .mockRejectedValueOnce(new api.ApiError(409, "STALE_UPDATE", "x"))
      .mockResolvedValueOnce(ticket());
    const card = await renderDetail(ticket({ actions: [action({ version: 0 })] }));
    // Another user changed a field this user never touched: Apply must not
    // send it back with the old value (C-138, the lost update).
    vi.mocked(api.fetchStaffTicket).mockResolvedValue(ticket({ actions: [action({ version: 1, attachmentNotes: "Theirs." })] }));
    await user.click(within(card).getByRole("button", { name: "Edit" }));
    const panel = within(card).getByRole("group", { name: "Edit action" });
    await user.type(within(panel).getByLabelText(/^Description/), " Mine.");
    await user.click(within(panel).getByRole("button", { name: "Save Action" }));
    const alert = await within(panel).findByRole("alert");
    expect(alert).toHaveTextContent("This changed while you were working");
    expect(within(panel).getByLabelText(/^Description/)).toHaveValue("Replace the laptop battery. Mine.");
    await user.click(within(alert).getByRole("button", { name: "Apply my changes again" }));
    await waitFor(() => expect(edit).toHaveBeenLastCalledWith(31, { version: 1, description: "Replace the laptop battery. Mine." }));
  });

  it("UI-35 ACTION_NOT_PLANNED re-fetches and shows its message without the two buttons", async () => {
    const user = userEvent.setup();
    vi.spyOn(api, "completeAction").mockRejectedValue(
      new api.ApiError(409, "ACTION_NOT_PLANNED", "This action is already finished and cannot be changed. Record a new action instead."),
    );
    const card = await renderDetail(ticket({ actions: [action()] }));
    await user.click(within(card).getByRole("button", { name: "Complete" }));
    const panel = within(card).getByRole("group", { name: "Complete action" });
    await user.type(within(panel).getByLabelText(/^Result/), "x");
    await user.click(within(panel).getByRole("button", { name: "Complete Action" }));
    const alert = await within(panel).findByRole("alert");
    expect(alert).toHaveTextContent("This action is already finished and cannot be changed.");
    expect(within(alert).queryByRole("button", { name: "Apply my changes again" })).not.toBeInTheDocument();
    expect(api.fetchStaffTicket).toHaveBeenCalledTimes(2);
  });

  it("UI-36 a 422 ASSIGNEE_NOT_ELIGIBLE renders at the Assignee field (BR-18)", async () => {
    const user = userEvent.setup();
    vi.spyOn(api, "createAction").mockRejectedValue(new api.ApiError(422, "ASSIGNEE_NOT_ELIGIBLE", "x"));
    const card = await renderDetail();
    await user.type(within(card).getByLabelText(/^Description/), "x");
    await user.type(within(card).getByLabelText(/^Result/), "y");
    await user.click(within(card).getByRole("button", { name: "Add Action" }));
    expect(await within(card).findByText("Choose an active IT Staff or Administrator user.")).toBeInTheDocument();
  });

  it("UI-37 a Resolved Ticket shows the reopen line and no composer; a Closed one no controls at all (BR-24)", async () => {
    let card = await renderDetail(ticket({ currentStatus: "RESOLVED", actions: [action({ allowedOperations: [] })] }));
    expect(within(card).getByText("This ticket is resolved. Reopen it first to record more work.")).toBeInTheDocument();
    expect(within(card).queryByRole("button")).not.toBeInTheDocument();
    document.body.innerHTML = "";
    card = await renderDetail(ticket({ currentStatus: "CLOSED", actions: [action({ allowedOperations: [] })] }));
    expect(within(card).queryByRole("button")).not.toBeInTheDocument();
    expect(within(card).getByText("Replace the laptop battery.")).toBeInTheDocument();
  });

  it("UI-39 text renders as plain text: markup is shown, never parsed (BR-08)", async () => {
    const card = await renderDetail(ticket({ actions: [action({ description: "<img src=x onerror=alert(1)> <b>bold</b>" })] }));
    expect(within(card).getByText("<img src=x onerror=alert(1)> <b>bold</b>")).toBeInTheDocument();
    expect(card.querySelector("img, b")).toBeNull();
  });

  it("STYLE-01 Actions Taken is distinct: primary left bar class, clipboard icon, standing label (ui-spec 8.1, BR-21)", async () => {
    const card = await renderDetail();
    expect(card).toHaveClass("tk-actions-card");
    expect(card.querySelector("h2 svg")).not.toBeNull();
    expect(within(card).getByText("Shown to the Requester.")).toBeInTheDocument();
  });

  it("STYLE-02 each action status badge carries an icon and its text, so it reads without colour", async () => {
    const card = await renderDetail(
      ticket({
        actions: [
          action(),
          action({ id: 32, status: "COMPLETED", result: "r", performedBy: ARAYA, finishedAt: "2026-10-27T03:00:00.000Z", allowedOperations: [] }),
          action({ id: 33, status: "CANCELLED", result: "r", performedBy: ARAYA, finishedAt: "2026-10-27T03:00:00.000Z", allowedOperations: [] }),
        ],
      }),
    );
    for (const text of ["Planned", "Completed", "Cancelled"]) {
      const badge = within(card).getByText(text, { selector: ".tk-action-badge span" }).closest(".tk-action-badge") as HTMLElement;
      expect(badge.querySelector("svg")).not.toBeNull();
    }
  });

  it("STYLE-06 button levels: Add Action primary, Cancel Action destructive, Close secondary", async () => {
    const user = userEvent.setup();
    const card = await renderDetail(ticket({ actions: [action()] }));
    expect(within(card).getByRole("button", { name: "Add Action" })).toHaveClass("btn-primary");
    await user.click(within(card).getByRole("button", { name: "Cancel action" }));
    const panel = within(card).getByRole("group", { name: "Cancel action" });
    expect(within(panel).getByRole("button", { name: "Cancel Action" })).toHaveClass("btn-danger");
    expect(within(panel).getByRole("button", { name: "Close" })).toHaveClass("btn-secondary");
  });
});

describe("Actions Taken - Requester Ticket Detail", () => {
  it("UI-38 read-only: every action, names only, the Recorded by IT Staff label, and no control (BR-20, C-123)", async () => {
    vi.restoreAllMocks();
    signInAs(REQUESTER_A);
    const t: api.Ticket = {
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
      updatedAt: "2026-10-27T03:00:00.000Z",
      attachments: [],
      publicComments: [],
      ...lab4Fields("2026-10-27T03:00:00.000Z"),
      actions: [
        {
          id: 31,
          status: "PLANNED",
          actionAt: "2026-10-27T03:00:00.000Z",
          description: "Replace the laptop battery.",
          result: null,
          followUpRequired: false,
          followUpNote: null,
          attachmentNotes: null,
          assignee: { name: "Decha Intharat" },
          createdBy: { name: "Araya Methee" },
          performedBy: null,
          createdAt: "2026-10-26T03:00:00.000Z",
          finishedAt: null,
        },
      ],
    };
    vi.spyOn(api, "fetchTicket").mockResolvedValue(t);
    window.history.pushState({}, "", "/tickets/77");
    render(<App />);
    const card = await screen.findByRole("region", { name: "Actions Taken" });
    expect(within(card).getByText("Recorded by IT Staff.")).toBeInTheDocument();
    expect(within(card).getByText("Replace the laptop battery.")).toBeInTheDocument();
    expect(within(card).getByText("Decha Intharat")).toBeInTheDocument();
    expect(within(card).queryByRole("button")).not.toBeInTheDocument();
    expect(within(card).queryByRole("textbox")).not.toBeInTheDocument();
    expect(card.textContent).not.toMatch(/@/);
  });
});
