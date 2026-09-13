import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App.js";
import * as api from "../../src/api.js";
import { STORAGE_KEY } from "../../src/requester/RequesterContext.js";

// UI-01..UI-09 from tests.md section 2.3 (C-48). fetch is mocked at the module
// boundary by spying on api.fetchRequesters, the same pattern as the Lab 1 test.

const ACTIVE = [
  { id: 1, name: "Anucha Prasert", email: "anucha.p@example.ac.th" },
  { id: 2, name: "Kanya Somsri", email: "kanya.s@example.ac.th" },
  { id: 3, name: "Nattapong Wong", email: "nattapong.w@example.ac.th" },
];
const INACTIVE_NAME = "Prasit Boonmee";

function mockRequesters(value: typeof ACTIVE) {
  return vi.spyOn(api, "fetchRequesters").mockResolvedValue(value);
}

beforeEach(() => {
  window.localStorage.clear();
  window.history.replaceState({}, "", "/");
});
afterEach(() => vi.restoreAllMocks());

describe("Development Requester Selection", () => {
  it("UI-01 lists every active Requester as an option and no inactive one", async () => {
    mockRequesters(ACTIVE);
    render(<App />);

    const select = await screen.findByRole("combobox", { name: "Development Requester" });
    const options = within(select).getAllByRole("option").map((o) => o.textContent);
    for (const r of ACTIVE) expect(options).toContain(r.name);
    expect(options).not.toContain(INACTIVE_NAME);
    // placeholder plus one option per active Requester, nothing else
    expect(options).toHaveLength(ACTIVE.length + 1);
  });

  it("UI-02 shows the loading state with the select and Continue disabled", async () => {
    vi.spyOn(api, "fetchRequesters").mockReturnValue(new Promise(() => {}));
    render(<App />);

    expect(screen.getByText("Loading Development Requesters…")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("combobox", { name: "Development Requester" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
  });

  it("UI-03 shows the empty state with no select and Continue disabled", async () => {
    mockRequesters([]);
    render(<App />);

    expect(
      await screen.findByText("No active Development Requester is available. Seed the database and reload."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
  });

  it("UI-04 shows the failure panel with Retry, stores nothing, and Retry refetches", async () => {
    const spy = vi
      .spyOn(api, "fetchRequesters")
      .mockRejectedValueOnce(new Error("ECONNREFUSED /var/lib/postgresql"))
      .mockResolvedValueOnce(ACTIVE);
    render(<App />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "Something went wrong on our side. Your work has not been lost - please try again.",
    );
    // safe failure: no internal detail leaks into the page (BR-38)
    expect(document.body.textContent).not.toMatch(/ECONNREFUSED|postgresql/);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByRole("combobox", { name: "Development Requester" })).toBeInTheDocument();
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("UI-05 states that this is not a login screen", async () => {
    mockRequesters(ACTIVE);
    render(<App />);

    expect(
      await screen.findByText(/This is not a login screen/),
    ).toHaveTextContent(
      "Select a Development Requester to test requester-specific ticket behavior. This is not a login screen. Authentication and role-based access will be introduced in Lab 3.",
    );
  });

  it("selecting a Requester and pressing Continue stores the id and shows the shell", async () => {
    mockRequesters(ACTIVE);
    render(<App />);

    const select = await screen.findByRole("combobox", { name: "Development Requester" });
    const cont = screen.getByRole("button", { name: "Continue" });
    expect(cont).toBeDisabled();
    await userEvent.selectOptions(select, "2");
    expect(cont).toBeEnabled();
    await userEvent.click(cont);

    expect(await screen.findByRole("banner")).toHaveTextContent("Kanya Somsri");
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("2");
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("UI-06 restores a stored selection on mount and the shell shows the name", async () => {
    window.localStorage.setItem(STORAGE_KEY, "3");
    mockRequesters(ACTIVE);
    render(<App />);

    expect(await screen.findByRole("banner")).toHaveTextContent("Nattapong Wong");
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("UI-07 clears a stored id absent from the active list and explains why", async () => {
    window.localStorage.setItem(STORAGE_KEY, "99");
    mockRequesters(ACTIVE);
    render(<App />);

    expect(
      await screen.findByText("Your previous Development Requester is no longer available. Choose another."),
    ).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Development Requester" })).toBeInTheDocument();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(screen.queryByRole("banner")).not.toBeInTheDocument();
  });

  it("UI-08 renders the Selection screen when My Tickets is opened with no selection", async () => {
    window.history.pushState({}, "", "/tickets");
    mockRequesters(ACTIVE);
    render(<App />);

    expect(await screen.findByRole("combobox", { name: "Development Requester" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("TokTickIT");
    expect(screen.queryByRole("heading", { name: "My Tickets" })).not.toBeInTheDocument();
    expect(screen.queryByRole("banner")).not.toBeInTheDocument();
  });

  it("UI-09 offers Change Requester in the shell and it returns to the Selection screen", async () => {
    window.localStorage.setItem(STORAGE_KEY, "1");
    mockRequesters(ACTIVE);
    render(<App />);

    const banner = await screen.findByRole("banner");
    expect(banner).toHaveTextContent("Anucha Prasert");
    await userEvent.click(within(banner).getByRole("button", { name: "Change Requester" }));

    expect(await screen.findByRole("combobox", { name: "Development Requester" })).toBeInTheDocument();
    expect(screen.queryByRole("banner")).not.toBeInTheDocument();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
