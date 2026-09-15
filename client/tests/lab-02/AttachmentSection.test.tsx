import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App.js";
import * as api from "../../src/api.js";
import { STORAGE_KEY } from "../../src/requester/RequesterContext.js";

// UI-26..UI-31 from tests.md: the attachment lifecycle on Ticket Detail
// (ui-spec 14.2, 14.3). The API module is mocked at its boundary; every
// assertion is about what the Requester sees and which requests are made.

const REQUESTERS = [{ id: 1, name: "Anucha Prasert", email: "anucha.p@example.ac.th" }];

const ACTIVE: api.AttachmentMeta = {
  id: 7, originalFilename: "battery-report.pdf", mimeType: "application/pdf", sizeBytes: 184320,
  uploadedAt: "2026-09-05T04:15:02.000Z", isRemoved: false, removedAt: null, removalReason: null,
};
const REMOVED: api.AttachmentMeta = {
  id: 8, originalFilename: "screenshot.png", mimeType: "image/png", sizeBytes: 91204,
  uploadedAt: "2026-09-05T04:20:11.000Z", isRemoved: true, removedAt: "2026-09-05T05:02:44.000Z",
  removalReason: "Uploaded the wrong screenshot.",
};

function ticket(attachments: api.AttachmentMeta[]): api.Ticket {
  return {
    id: 42,
    ticketNumber: "TKT-2026-000042",
    requesterId: 1,
    requester: { id: 1, name: "Anucha Prasert" },
    category: { id: 2, name: "Hardware" },
    relatedSystem: { id: 6, name: "Printer" },
    summary: "Laptop battery drains quickly",
    description: "The battery drops from full to twenty percent within an hour of light use.",
    requestedPriority: "MEDIUM",
    itPriority: null,
    currentStatus: "NEW",
    createdAt: "2026-09-05T04:12:33.000Z",
    updatedAt: "2026-09-05T05:02:44.000Z",
    attachments,
  };
}

async function renderDetail(attachments: api.AttachmentMeta[] = [ACTIVE, REMOVED]) {
  vi.spyOn(api, "fetchTicket").mockResolvedValue(ticket(attachments));
  window.localStorage.setItem(STORAGE_KEY, "1");
  window.history.pushState({}, "", "/tickets/42");
  render(<App />);
  await screen.findByRole("heading", { level: 1, name: /TKT-2026-000042/ });
}

const activeGroup = () => screen.getByRole("list", { name: "Active attachments" });
const removedGroup = () => screen.getByRole("list", { name: "Removed attachments" });

beforeEach(() => {
  window.localStorage.clear();
  window.history.replaceState({}, "", "/");
  vi.spyOn(api, "fetchRequesters").mockResolvedValue(REQUESTERS);
});
afterEach(() => vi.restoreAllMocks());

describe("Attachment section", () => {
  it("UI-26 adds a permitted file to the active group without leaving the screen (AC-32)", async () => {
    const upload = vi.spyOn(api, "uploadAttachment").mockResolvedValue({
      id: 9, originalFilename: "new-photo.png", mimeType: "image/png", sizeBytes: 9,
      uploadedAt: "2026-09-06T01:00:00.000Z", isRemoved: false, removedAt: null, removalReason: null,
    });
    const user = userEvent.setup();
    await renderDetail();
    expect(within(activeGroup()).getAllByRole("listitem")).toHaveLength(1);

    await user.upload(screen.getByLabelText("Add attachment"), new File(["png-bytes"], "new-photo.png", { type: "image/png" }));

    await waitFor(() => expect(within(activeGroup()).getAllByRole("listitem")).toHaveLength(2));
    expect(within(activeGroup()).getByText("new-photo.png")).toBeInTheDocument();
    expect(upload).toHaveBeenCalledTimes(1);
    expect(upload.mock.calls[0][0]).toBe(42);
    expect(upload.mock.calls[0][1]).toBe(1);
    expect(screen.getByText("2 of 5 active")).toBeInTheDocument();
    expect(window.location.pathname).toBe("/tickets/42");
  });

  it("UI-27 / UI-28 removal dialog: Cancel issues no request; Remove is gated on a reason and then removes (AC-33)", async () => {
    const remove = vi.spyOn(api, "removeAttachment").mockResolvedValue({
      ...ACTIVE, isRemoved: true, removedAt: "2026-09-06T02:00:00.000Z", removalReason: "Superseded by a newer report.",
    });
    const user = userEvent.setup();
    await renderDetail();
    const row = within(activeGroup()).getByRole("listitem");

    await user.click(within(row).getByRole("button", { name: "Remove battery-report.pdf" }));
    const dialog = screen.getByRole("dialog", { name: "Remove attachment" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(within(dialog).getByText(/Remove battery-report\.pdf\?/)).toBeInTheDocument();

    // UI-28: Confirm stays disabled until the reason is non-empty after trimming
    const confirm = within(dialog).getByRole("button", { name: "Remove" });
    const reason = within(dialog).getByLabelText(/^Removal reason/);
    expect(confirm).toBeDisabled();
    await user.type(reason, "   ");
    expect(confirm).toBeDisabled();
    await user.type(reason, "Superseded by a newer report.");
    expect(confirm).toBeEnabled();

    // Cancel: dialog closes, nothing sent, row still active
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(remove).not.toHaveBeenCalled();
    expect(within(activeGroup()).getByText("battery-report.pdf")).toBeInTheDocument();

    // Confirm with a reason: the row moves to the removed group with the reason shown
    await user.click(within(row).getByRole("button", { name: "Remove battery-report.pdf" }));
    const dialog2 = screen.getByRole("dialog", { name: "Remove attachment" });
    await user.type(within(dialog2).getByLabelText(/^Removal reason/), "Superseded by a newer report.");
    await user.click(within(dialog2).getByRole("button", { name: "Remove" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(remove).toHaveBeenCalledWith(7, 1, "Superseded by a newer report.");
    expect(within(removedGroup()).getByText("battery-report.pdf")).toBeInTheDocument();
    expect(within(removedGroup()).getByText(/Reason: Superseded by a newer report\./)).toBeInTheDocument();
    // the active group is now empty and says so
    expect(screen.queryByRole("list", { name: "Active attachments" })).not.toBeInTheDocument();
    expect(screen.getByText("No active attachments.")).toBeInTheDocument();
    expect(screen.getByText("0 of 5 active")).toBeInTheDocument();
  });

  it("UI-29 keeps a removed attachment's metadata and reason visible with no Preview and no Download (AC-34)", async () => {
    await renderDetail();
    const row = within(removedGroup()).getByRole("listitem");
    expect(within(row).getByText("screenshot.png")).toBeInTheDocument();
    expect(within(row).getByText("Removed")).toHaveClass("tk-badge");
    expect(within(row).getByText(/Removed 05 Sep 2026 12:02/)).toBeInTheDocument();
    expect(within(row).getByText(/Reason: Uploaded the wrong screenshot\./)).toBeInTheDocument();
    expect(within(row).queryByRole("button", { name: /Preview/ })).not.toBeInTheDocument();
    expect(within(row).queryByRole("button", { name: /Download/ })).not.toBeInTheDocument();
    expect(within(row).queryByRole("button", { name: /Remove/ })).not.toBeInTheDocument();
  });

  it("UI-30 shows the unavailable state on a 410 for a row believed active, with Refresh (C-46)", async () => {
    vi.spyOn(api, "downloadAttachment").mockRejectedValue(new api.ApiError(410, "ATTACHMENT_REMOVED", "gone"));
    const refetch = vi.spyOn(api, "fetchAttachments").mockResolvedValue([{ ...ACTIVE, isRemoved: true, removedAt: "2026-09-06T02:00:00.000Z", removalReason: "Removed elsewhere." }, REMOVED]);
    const user = userEvent.setup();
    await renderDetail();
    const row = within(activeGroup()).getByRole("listitem");

    await user.click(within(row).getByRole("button", { name: "Download battery-report.pdf" }));

    expect(await within(row).findByText("This attachment cannot be opened right now.")).toBeInTheDocument();
    expect(within(row).getByRole("button", { name: "Download battery-report.pdf" })).toBeDisabled();
    expect(within(row).getByRole("button", { name: "Preview battery-report.pdf" })).toBeDisabled();
    expect(within(row).getByRole("button", { name: "Remove battery-report.pdf" })).toBeDisabled();

    await user.click(within(row).getByRole("button", { name: "Refresh" }));
    expect(refetch).toHaveBeenCalledWith(42, 1);
    await waitFor(() => expect(within(removedGroup()).getAllByRole("listitem")).toHaveLength(2));
    expect(screen.getByText("0 of 5 active")).toBeInTheDocument();
  });

  it("UI-31 renders the 6.1 message naming the file for 415 and 413, with Retry and Discard (AC-24, AC-25)", async () => {
    const upload = vi
      .spyOn(api, "uploadAttachment")
      .mockRejectedValueOnce(new api.ApiError(415, "UNSUPPORTED_FILE_TYPE", "no"))
      .mockRejectedValueOnce(new api.ApiError(413, "FILE_TOO_LARGE", "no"))
      .mockResolvedValueOnce({
        id: 10, originalFilename: "big.pdf", mimeType: "application/pdf", sizeBytes: 1,
        uploadedAt: "2026-09-06T03:00:00.000Z", isRemoved: false, removedAt: null, removalReason: null,
      });
    const user = userEvent.setup({ applyAccept: false });
    await renderDetail([]);

    await user.upload(screen.getByLabelText("Add attachment"), [
      new File(["x"], "odd.pdf", { type: "application/pdf" }),
      new File(["y"], "big.pdf", { type: "application/pdf" }),
    ]);

    expect(await screen.findByText("odd.pdf is not a permitted file type. Allowed types are JPG, PNG, WEBP and PDF.")).toBeInTheDocument();
    expect(await screen.findByText("big.pdf is larger than 5 MB.")).toBeInTheDocument();
    const invalid = screen.getAllByRole("listitem").filter((li) => li.classList.contains("tk-attachment-invalid"));
    expect(invalid).toHaveLength(2);
    expect(screen.getByText("0 of 5 active")).toBeInTheDocument(); // invalid never counts

    // Discard removes the row; Retry re-sends and, on success, the file becomes active
    await user.click(within(invalid[0]).getByRole("button", { name: "Discard odd.pdf" }));
    expect(screen.queryByText(/odd\.pdf/)).not.toBeInTheDocument();
    await user.click(within(invalid[1]).getByRole("button", { name: "Retry big.pdf" }));
    await waitFor(() => expect(within(activeGroup()).getByText("big.pdf")).toBeInTheDocument());
    expect(upload).toHaveBeenCalledTimes(3);
    expect(screen.getByText("1 of 5 active")).toBeInTheDocument();
  });

  it("STYLE-03 (hierarchy) renders Preview and Download as tertiary and Remove as destructive (ui-spec 7)", async () => {
    await renderDetail();
    const row = within(activeGroup()).getByRole("listitem");
    expect(within(row).getByRole("button", { name: "Preview battery-report.pdf" })).toHaveClass("tk-btn-tertiary");
    expect(within(row).getByRole("button", { name: "Download battery-report.pdf" })).toHaveClass("tk-btn-tertiary");
    expect(within(row).getByRole("button", { name: "Remove battery-report.pdf" })).toHaveClass("btn-danger");
    expect(screen.getByRole("link", { name: "Back to My Tickets" })).toHaveClass("btn-secondary");
    // no primary action on the detail: it is read-only apart from the attachment lifecycle
    expect(document.querySelectorAll("main .btn-primary")).toHaveLength(0);
  });

  it("downloads an active attachment through the API and reports it (AC-30)", async () => {
    const download = vi.spyOn(api, "downloadAttachment").mockResolvedValue(new Blob(["%PDF"], { type: "application/pdf" }));
    window.URL.createObjectURL = vi.fn(() => "blob:mock");
    window.URL.revokeObjectURL = vi.fn();
    // jsdom cannot navigate to a blob: URL. The component saves the file by
    // clicking a detached anchor, so hand it one whose click is observable and inert.
    const click = vi.fn();
    const realCreate = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string, options?: ElementCreationOptions) => {
      const el = realCreate(tag, options);
      if (tag === "a") (el as HTMLAnchorElement).click = click;
      return el;
    });
    const user = userEvent.setup();
    await renderDetail();
    const row = within(activeGroup()).getByRole("listitem");

    await user.click(within(row).getByRole("button", { name: "Download battery-report.pdf" }));
    expect(download).toHaveBeenCalledWith(7, 1, "attachment");
    expect(await within(row).findByText(/Downloaded battery-report\.pdf/)).toBeInTheDocument();
    expect(click).toHaveBeenCalledTimes(1);
  });
});
