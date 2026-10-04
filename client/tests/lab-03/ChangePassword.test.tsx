import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import fs from "node:fs";
import path from "node:path";
import App from "../../src/App.js";
import * as api from "../../src/api.js";
import { STORAGE_KEY } from "../../src/requester/RequesterContext.js";

// tests.md section 2.9 UI-09..UI-15 and section 2.10 STYLE-09, STYLE-10
// (Issue #39). Reached through <App /> as a signed-in user whose
// mustChangePassword is true, so the client gate itself is under test.

const UI_SPEC = fs.readFileSync(path.resolve(__dirname, "../../../docs/lab-03/ui-spec.md"), "utf8");

const GATED: api.AuthUser = {
  id: 9,
  name: "Wichai Tanaka",
  email: "first.login@example.ac.th",
  role: "REQUESTER",
  isActive: true,
  mustChangePassword: true,
};

const CURRENT = "FirstLogin#2026";
const NEXT = "Fresh#Start42";

const MSG = {
  policy:
    "Password must be 8 to 128 characters and contain an upper-case letter, a lower-case letter, a digit and a special character.",
  confirm: "The confirmation does not match the new password.",
  currentRequired: "Current Password is required.",
  currentIncorrect: "That is not your current password.",
  success: "Your password has been changed.",
  explain: "You must choose a new password before you can continue.",
  failure: "Something went wrong on our side. Your work has not been lost - please try again.",
};

function renderGated(pathname = "/tickets") {
  vi.spyOn(api, "fetchCurrentUser").mockResolvedValue(GATED);
  window.history.pushState({}, "", pathname);
  render(<App />);
}

const current = () => screen.getByLabelText(/^Current Password/);
const next = () => screen.getByLabelText(/^New Password/);
const confirm = () => screen.getByLabelText(/^Confirm New Password/);

async function submit(values: { current?: string; next?: string; confirm?: string }) {
  const user = userEvent.setup();
  await screen.findByLabelText(/^Current Password/);
  if (values.current) await user.type(current(), values.current);
  if (values.next) await user.type(next(), values.next);
  if (values.confirm) await user.type(confirm(), values.confirm);
  await user.click(screen.getByRole("button", { name: "Change Password" }));
  return user;
}

function messageFor(input: HTMLElement): HTMLElement | null {
  const id = input.getAttribute("aria-describedby")?.split(" ").find((ref) => document.getElementById(ref)?.classList.contains("tk-invalid-feedback"));
  return id ? document.getElementById(id) : null;
}

beforeEach(() => {
  window.localStorage.clear();
  window.history.replaceState({}, "", "/");
  vi.spyOn(api, "fetchRequesters").mockResolvedValue([{ id: GATED.id, name: GATED.name, email: GATED.email }]);
  vi.spyOn(api, "fetchCategories").mockResolvedValue([]);
  vi.spyOn(api, "fetchRelatedSystems").mockResolvedValue([]);
  vi.spyOn(api, "fetchTickets").mockResolvedValue({
    data: [],
    meta: { page: 1, pageSize: 10, total: 0, totalPages: 1, sort: "createdAt:desc" },
  });
});
afterEach(() => vi.restoreAllMocks());

describe("Change Password", () => {
  it("UI-09 shows the signed-in user's name and Role badge at the top, and no shell (AC-22, FR-15)", async () => {
    renderGated();
    const heading = await screen.findByRole("heading", { level: 1, name: "Change Password" });
    const card = heading.closest(".tk-auth-card") as HTMLElement;
    expect(within(card).getByText(GATED.name)).toBeInTheDocument();
    expect(within(card).getByText("Requester", { selector: ".tk-badge-role" })).toBeInTheDocument();
    expect(screen.getByText(MSG.explain)).toBeInTheDocument();
    expect(screen.queryByRole("banner")).not.toBeInTheDocument();
  });

  it("UI-10 the BR-12 rule is stated before anything is typed (FR-16)", async () => {
    renderGated();
    await screen.findByLabelText(/^New Password/);
    const rule = screen.getByText(MSG.policy);
    expect(rule).not.toHaveClass("tk-invalid-feedback");
    expect(next().getAttribute("aria-describedby")).toContain(rule.id);
    expect(current()).toHaveAttribute("autocomplete", "current-password");
    expect(next()).toHaveAttribute("autocomplete", "new-password");
    expect(confirm()).toHaveAttribute("autocomplete", "new-password");
  });

  it("UI-11 a confirmation mismatch shows the catalogue message and sends no request (AC-26, BR-13)", async () => {
    const change = vi.spyOn(api, "changePassword");
    renderGated();
    await submit({ current: CURRENT, next: NEXT, confirm: "Other#Pass99" });
    expect(messageFor(confirm())).toHaveTextContent(MSG.confirm);
    expect(confirm()).toHaveAttribute("aria-invalid", "true");
    expect(change).not.toHaveBeenCalled();
  });

  it("UI-12 each policy failure renders the BR-12 message directly below New Password, with aria-invalid (AC-23, AC-24)", async () => {
    const change = vi.spyOn(api, "changePassword");
    for (const candidate of ["Aa1!xyz", "abcdef1!", "ABCDEF1!", "Abcdefg!", "Abcdefg1"]) {
      renderGated();
      await submit({ current: CURRENT, next: candidate, confirm: candidate });
      const message = messageFor(next());
      expect(message, candidate).toHaveTextContent(MSG.policy);
      expect(next()).toHaveAttribute("aria-invalid", "true");
      expect(next().parentElement).toContainElement(message);
      expect(next()).toHaveFocus();
      cleanup();
    }
    expect(change).not.toHaveBeenCalled();
  });

  it("UI-13 success shows the panel with an icon and a sentence, then continues into the application (AC-28, FR-18)", async () => {
    window.localStorage.setItem(STORAGE_KEY, String(GATED.id));
    const change = vi.spyOn(api, "changePassword").mockResolvedValue({ ...GATED, mustChangePassword: false });
    renderGated();
    await submit({ current: CURRENT, next: NEXT, confirm: NEXT });
    expect(change).toHaveBeenCalledWith({ currentPassword: CURRENT, newPassword: NEXT, confirmPassword: NEXT });
    const panel = (await screen.findByText(MSG.success)).closest(".tk-panel") as HTMLElement;
    expect(panel).toHaveClass("tk-panel-pale");
    expect(panel.querySelector("svg[aria-hidden='true']")).not.toBeNull();
    expect(await screen.findByRole("heading", { name: "My Tickets" }, { timeout: 4000 })).toBeInTheDocument();
    expect(screen.getByRole("banner")).toBeInTheDocument();
  });

  it("UI-14 a gated user sees Change Password at My Tickets, the Ticket Queue and User Management alike (FR-14, BR-20)", async () => {
    for (const pathname of ["/tickets", "/tickets/new", "/queue", "/users"]) {
      renderGated(pathname);
      expect(await screen.findByRole("heading", { level: 1, name: "Change Password" })).toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: "My Tickets" })).not.toBeInTheDocument();
      expect(screen.queryByRole("banner")).not.toBeInTheDocument();
      cleanup();
    }
  });

  it("UI-15 no password survives in the DOM: a wrong current password clears only that field, a failure clears all three (BR-88)", async () => {
    vi.spyOn(api, "changePassword")
      .mockRejectedValueOnce(new api.ApiError(422, "CURRENT_PASSWORD_INCORRECT", "x", { currentPassword: MSG.currentIncorrect }))
      .mockRejectedValueOnce(new api.ApiError(0, "INTERNAL_ERROR", "Network error"));
    renderGated();
    const user = await submit({ current: "Wrong#Current1", next: NEXT, confirm: NEXT });

    expect(await screen.findByText(MSG.currentIncorrect)).toBeInTheDocument();
    expect(messageFor(current())).toHaveTextContent(MSG.currentIncorrect);
    expect(current()).toHaveValue("");
    expect(current()).toHaveFocus();
    expect(next()).toHaveValue(NEXT);
    expect(screen.queryByRole("button", { name: "Sign In" })).not.toBeInTheDocument();
    expect(document.body.innerHTML).not.toContain("Wrong#Current1");

    await user.type(current(), CURRENT);
    await user.click(screen.getByRole("button", { name: "Change Password" }));
    expect(await screen.findByText(MSG.failure)).toBeInTheDocument();
    for (const field of [current(), next(), confirm()]) expect(field).toHaveValue("");
    for (const secret of [CURRENT, NEXT]) expect(document.body.innerHTML).not.toContain(secret);
  });

  it("STYLE-09 every validation message the screen renders exists verbatim in the ui-spec.md section 6 catalogue (BR-87)", async () => {
    renderGated();
    await submit({ next: "short", confirm: "different" });
    const rendered = Array.from(document.querySelectorAll(".tk-invalid-feedback")).map((el) => el.textContent ?? "");
    expect(rendered.length).toBeGreaterThanOrEqual(3);
    expect(rendered).toEqual(expect.arrayContaining([MSG.currentRequired, MSG.policy, MSG.confirm]));
    for (const text of rendered) expect(UI_SPEC).toContain(text);
  });

  it("STYLE-10 the success panel is not colour alone: it carries an icon and a sentence (CLAUDE.md)", async () => {
    vi.spyOn(api, "changePassword").mockResolvedValue({ ...GATED, mustChangePassword: false });
    renderGated();
    await submit({ current: CURRENT, next: NEXT, confirm: NEXT });
    const panel = (await screen.findByText(MSG.success)).closest(".tk-panel") as HTMLElement;
    expect(panel).toHaveAttribute("aria-live", "polite");
    expect(panel.querySelector("svg")).not.toBeNull();
    expect(panel.textContent?.trim()).toBe(MSG.success);
    await waitFor(() => expect(screen.queryByText(MSG.success)).not.toBeInTheDocument(), { timeout: 4000 });
  });
});
