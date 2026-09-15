import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import fs from "node:fs";
import path from "node:path";
import App from "../../src/App.js";
import * as api from "../../src/api.js";
import { STORAGE_KEY } from "../../src/requester/RequesterContext.js";
import { MESSAGES } from "../../src/validation.js";

// UI-11..UI-17 and STYLE-01..STYLE-05, STYLE-10 from tests.md (sections 2.3
// and 2.4). The API module is mocked at its boundary; nothing here touches
// the network. The form is reached through <App /> at /tickets/new with a
// stored selection, so the Requester guard and the shell are exercised too.

const REQUESTERS = [{ id: 1, name: "Anucha Prasert", email: "anucha.p@example.ac.th" }];
const CATEGORIES = [
  { id: 1, name: "Account and Access" },
  { id: 2, name: "Hardware" },
];
const SYSTEMS = [
  { id: 6, name: "Printer" },
  { id: 7, name: "Corporate Laptop" },
];

const CREATED = {
  id: 42,
  ticketNumber: "TKT-2026-000042",
  requesterId: 1,
  requester: { id: 1, name: "Anucha Prasert" },
  category: { id: 2, name: "Hardware" },
  relatedSystem: { id: 6, name: "Printer" },
  summary: "Laptop battery drains quickly",
  description: "The battery drops from full to twenty percent within an hour of light use.",
  requestedPriority: "MEDIUM" as const,
  itPriority: null,
  currentStatus: "NEW" as const,
  createdAt: "2026-09-05T04:12:33.000Z",
  updatedAt: "2026-09-05T04:12:33.041Z",
  attachments: [],
};

function mockReferenceData() {
  vi.spyOn(api, "fetchRequesters").mockResolvedValue(REQUESTERS);
  vi.spyOn(api, "fetchCategories").mockResolvedValue(CATEGORIES);
  vi.spyOn(api, "fetchRelatedSystems").mockResolvedValue(SYSTEMS);
}

async function renderForm() {
  window.localStorage.setItem(STORAGE_KEY, "1");
  window.history.pushState({}, "", "/tickets/new");
  render(<App />);
  // reference data settled: the Category select is enabled
  const category = await screen.findByLabelText(/^Category/);
  await waitFor(() => expect(category).toBeEnabled());
}

async function fillValid(user: ReturnType<typeof userEvent.setup>) {
  await user.selectOptions(screen.getByLabelText(/^Category/), "2");
  await user.selectOptions(screen.getByLabelText(/^Related System/), "6");
  await user.type(screen.getByLabelText(/^Ticket Summary/), "Laptop battery drains quickly");
  await user.type(
    screen.getByLabelText(/^Description/),
    "The battery drops from full to twenty percent within an hour of light use.",
  );
}

beforeEach(() => {
  window.localStorage.clear();
  window.history.replaceState({}, "", "/");
  mockReferenceData();
});
afterEach(() => vi.restoreAllMocks());

describe("Create Ticket", () => {
  it("UI-11 populates Category and Related System from the API and nothing else (AC-13)", async () => {
    await renderForm();
    const categoryOptions = within(screen.getByLabelText(/^Category/)).getAllByRole("option").map((o) => o.textContent);
    const systemOptions = within(screen.getByLabelText(/^Related System/)).getAllByRole("option").map((o) => o.textContent);
    expect(categoryOptions).toEqual(["Choose a Category", ...CATEGORIES.map((c) => c.name)]);
    expect(systemOptions).toEqual(["Choose a Related System", ...SYSTEMS.map((s) => s.name)]);
    // Requested Priority defaults to Medium (BR-08)
    expect(screen.getByLabelText(/^Requested Priority/)).toHaveValue("MEDIUM");
  });

  it("UI-12 blocks submit on an empty Ticket Summary and makes no API call (AC-17)", async () => {
    const create = vi.spyOn(api, "createTicket").mockResolvedValue(CREATED);
    const user = userEvent.setup();
    await renderForm();
    await user.selectOptions(screen.getByLabelText(/^Category/), "2");
    await user.selectOptions(screen.getByLabelText(/^Related System/), "6");
    await user.type(screen.getByLabelText(/^Description/), "d".repeat(25));

    await user.click(screen.getByRole("button", { name: "Submit Ticket" }));

    const summary = screen.getByLabelText(/^Ticket Summary/);
    expect(summary).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText(MESSAGES.summary)).toBeInTheDocument();
    expect(summary).toHaveFocus();
    expect(create).not.toHaveBeenCalled();
  });

  it("UI-13 renders exactly the ui-spec.md catalogue string for each BR-31..BR-34 violation (AC-23)", async () => {
    const create = vi.spyOn(api, "createTicket").mockResolvedValue(CREATED);
    const user = userEvent.setup();
    await renderForm();
    // empty form: every required rule fails at once
    await user.type(screen.getByLabelText(/^Ticket Summary/), "abcd"); // 4 chars, BR-31
    await user.type(screen.getByLabelText(/^Description/), "too short"); // BR-32
    await user.selectOptions(screen.getByLabelText(/^Requested Priority/), ""); // BR-33
    await user.click(screen.getByRole("button", { name: "Submit Ticket" }));

    expect(screen.getByText("Ticket Summary is required and must be between 5 and 120 characters.")).toBeInTheDocument();
    expect(screen.getByText("Description is required and must be between 20 and 5000 characters.")).toBeInTheDocument();
    expect(screen.getByText("Category is required.")).toBeInTheDocument();
    expect(screen.getByText("Related System is required.")).toBeInTheDocument();
    expect(screen.getByText("Requested Priority is required.")).toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();

    // BR-34 strings surface when the server rejects an id the client offered
    create.mockRejectedValueOnce(
      new api.ApiError(400, "VALIDATION_FAILED", "Some fields need attention.", {
        categoryId: "Select an active Category from the list.",
        relatedSystemId: "Select an active Related System from the list.",
        requestedPriority: "Requested Priority must be Low, Medium or High.",
      }),
    );
    await user.clear(screen.getByLabelText(/^Ticket Summary/));
    await user.clear(screen.getByLabelText(/^Description/));
    await fillValid(user);
    await user.selectOptions(screen.getByLabelText(/^Requested Priority/), "HIGH");
    await user.click(screen.getByRole("button", { name: "Submit Ticket" }));

    expect(await screen.findByText("Select an active Category from the list.")).toBeInTheDocument();
    expect(screen.getByText("Select an active Related System from the list.")).toBeInTheDocument();
    expect(screen.getByText("Requested Priority must be Low, Medium or High.")).toBeInTheDocument();
  });

  it("UI-14 / STYLE-03 prevents a double submit and shows the busy state (AC-21, BR-36)", async () => {
    let release!: (value: typeof CREATED) => void;
    const create = vi
      .spyOn(api, "createTicket")
      .mockImplementation(() => new Promise<typeof CREATED>((resolve) => (release = resolve)));
    const user = userEvent.setup();
    await renderForm();
    await fillValid(user);

    const submit = screen.getByRole("button", { name: "Submit Ticket" });
    await user.click(submit);
    const busy = screen.getByRole("button", { name: /Submitting…/ });
    expect(busy).toBeDisabled();
    expect(busy).toHaveAttribute("aria-busy", "true");
    await user.click(busy);
    await user.click(busy);
    expect(create).toHaveBeenCalledTimes(1);
    // every field is read-only for the duration
    expect(screen.getByLabelText(/^Ticket Summary/)).toHaveAttribute("readonly");

    release(CREATED);
    expect(await screen.findByRole("heading", { name: "Ticket created" })).toBeInTheDocument();
  });

  it("UI-15 shows the safe banner and keeps every value and the attachment selection on failure (AC-22, BR-37)", async () => {
    vi.spyOn(api, "createTicket").mockRejectedValue(new api.ApiError(500, "INTERNAL_ERROR", "Something went wrong on our side."));
    const user = userEvent.setup();
    await renderForm();
    await fillValid(user);
    await user.selectOptions(screen.getByLabelText(/^Requested Priority/), "HIGH");
    const file = new File(["png-bytes"], "screenshot.png", { type: "image/png" });
    await user.upload(screen.getByLabelText(/^Attachments/), file);
    expect(screen.getByText("screenshot.png")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Submit Ticket" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Something went wrong on our side. Your work has not been lost - please try again.");
    expect(document.body.textContent).not.toMatch(/stack|SQL|postgres/i);
    expect(screen.getByLabelText(/^Category/)).toHaveValue("2");
    expect(screen.getByLabelText(/^Related System/)).toHaveValue("6");
    expect(screen.getByLabelText(/^Ticket Summary/)).toHaveValue("Laptop battery drains quickly");
    expect(screen.getByLabelText(/^Description/)).toHaveValue(
      "The battery drops from full to twenty percent within an hour of light use.",
    );
    expect(screen.getByLabelText(/^Requested Priority/)).toHaveValue("HIGH");
    expect(screen.getByText("screenshot.png")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Submit Ticket" })).toBeEnabled();
  });

  it("UI-16 / STYLE-04 renders Requester and Ticket Date read-only, not disabled (AC-61)", async () => {
    await renderForm();
    const requester = screen.getByLabelText("Requester");
    const date = screen.getByLabelText("Ticket Date");
    const number = screen.getByLabelText("Ticket Number");
    for (const field of [requester, date, number]) {
      expect(field).toHaveAttribute("readonly");
      expect(field).not.toBeDisabled();
      expect(field).toHaveClass("tk-readonly");
    }
    expect(requester).toHaveValue("Anucha Prasert");
    expect((date as HTMLInputElement).value).toMatch(/^\d{2} [A-Z][a-z]{2} \d{4} \d{2}:\d{2}$/);
    expect(number).toHaveValue("Generated on submission");
  });

  it("UI-17 / STYLE-05 shows the Ticket Number, per-file outcomes and next actions on success (AC-01, AC-59)", async () => {
    vi.spyOn(api, "createTicket").mockResolvedValue(CREATED);
    const upload = vi
      .spyOn(api, "uploadAttachment")
      .mockResolvedValueOnce({
        id: 8, ticketId: 42, originalFilename: "screenshot.png", mimeType: "image/png", sizeBytes: 9,
        uploadedAt: "2026-09-05T04:20:11.000Z", isRemoved: false, removedAt: null, removalReason: null,
      })
      .mockRejectedValueOnce(new api.ApiError(413, "FILE_TOO_LARGE", "That file is larger than 5 MB."));
    const user = userEvent.setup();
    await renderForm();
    await fillValid(user);
    await user.upload(screen.getByLabelText(/^Attachments/), [
      new File(["png-bytes"], "screenshot.png", { type: "image/png" }),
      new File(["pdf-bytes"], "report.pdf", { type: "application/pdf" }),
    ]);
    await user.click(screen.getByRole("button", { name: "Submit Ticket" }));

    const panel = await screen.findByRole("status", { name: "Ticket created" });
    expect(within(panel).getByRole("heading", { level: 2 })).toHaveTextContent("Ticket created");
    expect(within(panel).getByText("TKT-2026-000042")).toHaveClass("h2"); // h2 size, not a second heading
    expect(panel).toHaveTextContent(/created/); // stated in words, not colour
    expect(within(panel).getByRole("link", { name: "View Ticket" })).toHaveAttribute("href", "/tickets/42");
    expect(within(panel).getByRole("button", { name: "Create another ticket" })).toBeInTheDocument();
    expect(upload).toHaveBeenCalledTimes(2);
    expect(within(panel).getByText("screenshot.png")).toBeInTheDocument();
    expect(within(panel).getByText("report.pdf is larger than 5 MB.")).toBeInTheDocument();
    expect(within(panel).getByRole("button", { name: /Retry/ })).toBeInTheDocument();
  });

  it("STYLE-01 / STYLE-02 places each message under its control and marks every required label", async () => {
    const user = userEvent.setup();
    await renderForm();
    // Requested Priority defaults to Medium; clear it so all five rules fail
    await user.selectOptions(screen.getByLabelText(/^Requested Priority/), "");
    await user.click(screen.getByRole("button", { name: "Submit Ticket" }));

    for (const label of [/^Category/, /^Related System/, /^Ticket Summary/, /^Requested Priority/, /^Description/]) {
      const control = screen.getByLabelText(label);
      expect(control).toHaveAttribute("aria-invalid", "true");
      const message = document.getElementById(control.getAttribute("aria-describedby")!.split(" ").pop()!);
      expect(message).not.toBeNull();
      expect(message).toHaveClass("tk-invalid-feedback");
      // the message is inside the same field group, directly after the control
      expect(control.parentElement).toBe(message!.parentElement);
      expect(control.compareDocumentPosition(message!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      // the required asterisk sits on the label
      const labelEl = control.parentElement!.querySelector("label")!;
      expect(labelEl.querySelector(".tk-required")).not.toBeNull();
    }
    // read-only fields carry no asterisk
    for (const name of ["Requester", "Ticket Date", "Ticket Number"]) {
      const control = screen.getByLabelText(name);
      expect(control.parentElement!.querySelector(".tk-required")).toBeNull();
    }
  });

  it("STYLE-10 defines the Zen Green tokens on :root", () => {
    const css = fs.readFileSync(path.resolve(__dirname, "../../src/theme.css"), "utf8");
    const root = css.slice(css.indexOf(":root {"), css.indexOf("}", css.indexOf(":root {")));
    for (const hex of ["#006B3C", "#0B7A46", "#EAF6EF", "#F5F7F6", "#FFFFFF", "#1F2A24"]) {
      expect(root.toUpperCase()).toContain(hex);
    }
  });

  it("marks a file the client can already tell is invalid, before any request (AC-24, ui-spec 14.1)", async () => {
    // applyAccept: false so the browser-side `accept` filter does not hide the
    // file before the component's own check can run on it.
    const user = userEvent.setup({ applyAccept: false });
    await renderForm();
    await user.upload(
      screen.getByLabelText(/^Attachments/),
      new File(["text"], "notes.txt", { type: "text/plain" }),
    );
    expect(screen.getByText("notes.txt is not a permitted file type. Allowed types are JPG, PNG, WEBP and PDF.")).toBeInTheDocument();
  });
});
