import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import App from "../../src/App.js";
import * as api from "../../src/api.js";
import { STORAGE_KEY } from "../../src/requester/RequesterContext.js";

// UI-24, UI-25, STYLE-07 and STYLE-09 from tests.md. The detail is reached
// through <App /> at /tickets/:id with a stored selection; the API module is
// mocked at its boundary.

const REQUESTERS = [{ id: 1, name: "Anucha Prasert", email: "anucha.p@example.ac.th" }];

const TICKET: api.Ticket = {
  id: 42,
  ticketNumber: "TKT-2026-000042",
  requesterId: 1,
  requester: { id: 1, name: "Anucha Prasert" },
  category: { id: 2, name: "Hardware" },
  relatedSystem: { id: 6, name: "Printer" },
  summary: "Laptop battery drains quickly",
  description: "The battery drops from full to twenty percent.\nSecond line kept.",
  requestedPriority: "MEDIUM",
  itPriority: null,
  currentStatus: "NEW",
  createdAt: "2026-09-05T04:12:33.000Z",
  updatedAt: "2026-09-05T05:02:44.000Z",
  attachments: [
    {
      id: 7, originalFilename: "battery-report.pdf", mimeType: "application/pdf", sizeBytes: 184320,
      uploadedAt: "2026-09-05T04:15:02.000Z", isRemoved: false, removedAt: null, removalReason: null,
    },
  ],
};

async function renderDetail() {
  window.localStorage.setItem(STORAGE_KEY, "1");
  window.history.pushState({}, "", "/tickets/42");
  render(<App />);
  await screen.findByRole("heading", { level: 1, name: /TKT-2026-000042/ });
}

beforeEach(() => {
  window.localStorage.clear();
  window.history.replaceState({}, "", "/");
  vi.spyOn(api, "fetchRequesters").mockResolvedValue(REQUESTERS);
  vi.spyOn(api, "fetchTicket").mockResolvedValue(TICKET);
});
afterEach(() => vi.restoreAllMocks());

describe("Requester Ticket Detail", () => {
  it("UI-24 renders the Ticket information read-only with no comment, note, action or status control (AC-53)", async () => {
    await renderDetail();
    const info = screen.getByRole("region", { name: "Ticket information" });

    // every header value is present, none of them is an input
    for (const value of ["Anucha Prasert", "Hardware", "Printer", "Medium", "Laptop battery drains quickly"]) {
      expect(within(info).getByText(value)).toBeInTheDocument();
    }
    expect(within(info).queryByRole("textbox")).not.toBeInTheDocument();
    expect(within(info).queryByRole("combobox")).not.toBeInTheDocument();
    expect(within(info).queryByRole("button")).not.toBeInTheDocument();
    expect(within(info).getByText(/Second line kept/)).toHaveClass("tk-prewrap");

    // BR-63: nothing of the IT Staff workflow, not even as a placeholder
    expect(document.body.textContent).not.toMatch(/public comment|internal note|actions taken|change status|claim|reassign/i);
    expect(screen.queryByRole("button", { name: /status|edit|save/i })).not.toBeInTheDocument();
  });

  it("UI-25 renders Ticket Date and Last Updated as DD MMM YYYY HH:mm in Asia/Bangkok (AC-60)", async () => {
    await renderDetail();
    const info = screen.getByRole("region", { name: "Ticket information" });
    expect(within(info).getByText("05 Sep 2026 11:12")).toBeInTheDocument(); // 04:12Z + 7h
    expect(within(info).getByText("05 Sep 2026 12:02")).toBeInTheDocument(); // 05:02Z + 7h
    const timestamps = within(info).getAllByText(/^\d{2} [A-Z][a-z]{2} \d{4} \d{2}:\d{2}$/);
    expect(timestamps).toHaveLength(2);
  });

  it("STYLE-07 renders the Current Status badge and no IT Priority badge (BR-07)", async () => {
    await renderDetail();
    const heading = screen.getByRole("heading", { level: 1, name: /TKT-2026-000042/ });
    const status = within(heading.parentElement!).getByText("New");
    expect(status).toHaveClass("tk-badge", "tk-badge-square", "tk-status-new");
    expect(screen.queryByText(/^IT /)).not.toBeInTheDocument();
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
