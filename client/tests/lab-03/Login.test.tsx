import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import fs from "node:fs";
import path from "node:path";
import App from "../../src/App.js";
import * as api from "../../src/api.js";
import { ADMINISTRATOR, IT_STAFF, REQUESTER_A, signInAs } from "../support/auth.js";

// tests.md section 2.9 UI-01..UI-08 and UI-51, section 2.10 STYLE-01 and
// STYLE-12 (Issue #39); UI-49 and UI-50, per-role landing and the Forbidden
// screen (Issue #40).
//
// Deferred, by Issue: STYLE-02's three Lab 3 tokens arrive with the screens
// that use them (#41, #42).
//
// The API module is mocked at its boundary, as in the Lab 2 client tests,
// except UI-51, which stubs fetch itself so a real 401 travels through the
// real api.ts into AuthContext.

const CLIENT = path.resolve(__dirname, "../..");

const REQUESTER = REQUESTER_A;

const MESSAGES = {
  email: "Email Address is required.",
  password: "Password is required.",
  invalid: "That email address and password do not match an account.",
  inactive: "That account is not active. Contact an administrator.",
  failure: "Something went wrong on our side. Your work has not been lost - please try again.",
  ended: "Your session has ended. Please sign in again.",
};

function signedOut() {
  vi.spyOn(api, "fetchCurrentUser").mockResolvedValue(null);
}

function renderAt(pathname = "/tickets") {
  window.history.pushState({}, "", pathname);
  render(<App />);
}

async function fillAndSubmit(email: string, password: string) {
  const user = userEvent.setup();
  await screen.findByRole("button", { name: "Sign In" });
  if (email) await user.type(screen.getByLabelText(/Email Address/), email);
  if (password) await user.type(screen.getByLabelText(/^Password/), password);
  await user.click(screen.getByRole("button", { name: "Sign In" }));
  return user;
}

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  window.history.replaceState({}, "", "/");
  vi.spyOn(api, "fetchCategories").mockResolvedValue([]);
  vi.spyOn(api, "fetchRelatedSystems").mockResolvedValue([]);
  vi.spyOn(api, "fetchTickets").mockResolvedValue({
    data: [],
    meta: { page: 1, pageSize: 10, total: 0, totalPages: 1, sort: "createdAt:desc" },
  });
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Login", () => {
  it("UI-01 renders Email Address and Password, both required, and one Sign In button (FR-01)", async () => {
    signedOut();
    renderAt();
    const email = await screen.findByLabelText(/Email Address/);
    const password = screen.getByLabelText(/^Password/);
    expect(email).toHaveAttribute("type", "email");
    expect(email).toHaveAttribute("autocomplete", "username");
    expect(email).toBeRequired();
    expect(password).toHaveAttribute("type", "password");
    expect(password).toHaveAttribute("autocomplete", "current-password");
    expect(password).toBeRequired();
    expect(screen.getByLabelText(/Email Address/).closest("form")).not.toBeNull();
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Sign In" })).toBeEnabled();
  });

  it("UI-02 submitting empty shows both catalogue messages below their fields and sends nothing (FR-01)", async () => {
    signedOut();
    const login = vi.spyOn(api, "login");
    renderAt();
    await fillAndSubmit("", "");
    const email = screen.getByLabelText(/Email Address/);
    const password = screen.getByLabelText(/^Password/);
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(document.getElementById(email.getAttribute("aria-describedby")!)).toHaveTextContent(MESSAGES.email);
    expect(document.getElementById(password.getAttribute("aria-describedby")!)).toHaveTextContent(MESSAGES.password);
    expect(email).toHaveFocus();
    expect(login).not.toHaveBeenCalled();
  });

  it("UI-03 while signing in the button shows Signing in…, is disabled, and a second click sends nothing (FR-01)", async () => {
    signedOut();
    let release!: (user: api.AuthUser) => void;
    const login = vi.spyOn(api, "login").mockReturnValue(new Promise((resolve) => (release = resolve)));
    renderAt();
    const user = await fillAndSubmit(REQUESTER.email, "Requester#2026");
    const busy = screen.getByRole("button", { name: /Signing in…/ });
    expect(busy).toBeDisabled();
    expect(busy).toHaveAttribute("aria-busy", "true");
    expect(screen.getByLabelText(/Email Address/)).toBeDisabled();
    expect(screen.getByLabelText(/^Password/)).toBeDisabled();
    await user.click(busy);
    expect(login).toHaveBeenCalledTimes(1);
    release(REQUESTER);
    await waitFor(() => expect(screen.queryByRole("button", { name: /Signing in…/ })).not.toBeInTheDocument());
  });

  it("UI-04 invalid credentials: the generic banner above the fields, password cleared, email kept, not tied to the email field (AC-05)", async () => {
    signedOut();
    vi.spyOn(api, "login").mockRejectedValue(new api.ApiError(401, "INVALID_CREDENTIALS", "x"));
    renderAt();
    await fillAndSubmit(REQUESTER.email, "Wrong#Password1");
    const banner = await screen.findByText(MESSAGES.invalid);
    const email = screen.getByLabelText(/Email Address/);
    const password = screen.getByLabelText(/^Password/);
    expect(email).toHaveValue(REQUESTER.email);
    expect(password).toHaveValue("");
    expect(password).toHaveFocus();
    expect(email).not.toHaveAttribute("aria-invalid", "true");
    expect(email).not.toHaveAttribute("aria-describedby");
    // Above the fields: the banner precedes the email control in document order.
    expect(banner.compareDocumentPosition(email) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("UI-05 an inactive account shows its own message, in the warning treatment, not the generic one (AC-08)", async () => {
    signedOut();
    vi.spyOn(api, "login").mockRejectedValue(new api.ApiError(403, "ACCOUNT_INACTIVE", "x"));
    renderAt();
    await fillAndSubmit("prasit.b@example.ac.th", "Requester#2026");
    const message = await screen.findByText(MESSAGES.inactive);
    expect(screen.queryByText(MESSAGES.invalid)).not.toBeInTheDocument();
    expect(message.closest(".tk-panel")).toHaveClass("tk-panel-warning");
    expect(screen.getByLabelText(/^Password/)).toHaveValue("");
  });

  it("UI-06 an API failure shows the INTERNAL_ERROR banner with Retry, and keeps the email (FR-67)", async () => {
    signedOut();
    vi.spyOn(api, "login").mockRejectedValue(new api.ApiError(0, "INTERNAL_ERROR", "Network error"));
    renderAt();
    const user = await fillAndSubmit(REQUESTER.email, "Requester#2026");
    const banner = (await screen.findByText(MESSAGES.failure)).closest(".tk-panel")!;
    expect(banner).toHaveClass("tk-panel-danger");
    expect(banner).toHaveAttribute("aria-live", "assertive");
    expect(screen.getByLabelText(/Email Address/)).toHaveValue(REQUESTER.email);
    expect(screen.getByLabelText(/^Password/)).toHaveValue("");
    await user.click(within(banner as HTMLElement).getByRole("button", { name: "Retry" }));
    expect(screen.queryByText(MESSAGES.failure)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/^Password/)).toHaveFocus();
  });

  it("UI-07 offers no forgot-password, create-account, remember-me, SSO or social sign-in (LS 4.2)", async () => {
    signedOut();
    renderAt();
    await screen.findByLabelText(/Email Address/);
    const text = document.body.textContent ?? "";
    for (const excluded of [/forgot/i, /reset/i, /create (an )?account/i, /sign up/i, /register/i, /remember me/i, /single sign/i, /\bSSO\b/, /google|microsoft|facebook|github/i]) {
      expect(text).not.toMatch(excluded);
    }
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });

  it("UI-08 after a successful sign-in nothing is written to localStorage or sessionStorage (AC-34, BR-25)", async () => {
    signedOut();
    vi.spyOn(api, "login").mockResolvedValue(REQUESTER);
    renderAt();
    await fillAndSubmit(REQUESTER.email, "Requester#2026");
    await waitFor(() => expect(screen.queryByLabelText(/Email Address/)).not.toBeInTheDocument());
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });

  it("STYLE-12 the screen and the page title spell TokTickIT, and TikTockIT appears nowhere in the client (L2 C-41)", async () => {
    signedOut();
    renderAt();
    expect(await screen.findByText("TokTickIT")).toBeInTheDocument();
    expect(fs.readFileSync(path.join(CLIENT, "index.html"), "utf8")).toContain("<title>TokTickIT</title>");
    const sources: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else sources.push(fs.readFileSync(full, "utf8"));
      }
    };
    walk(path.join(CLIENT, "src"));
    expect(sources.join("\n")).not.toContain("TikTockIT");
  });
});

describe("the authenticated shell", () => {
  const signedIn = () => signInAs(REQUESTER);

  function walk(dir: string, into: string[] = []): string[] {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full, into);
      else into.push(fs.readFileSync(full, "utf8"));
    }
    return into;
  }

  it("UI-49 the shell shows name, Role badge and Log Out, and 'Development Requester' and 'Change Requester' exist nowhere in the client (AC-30, FR-09, BR-94)", async () => {
    signedIn();
    renderAt();
    const header = await screen.findByRole("banner");
    expect(within(header).getByText(REQUESTER.name)).toHaveClass("tk-identity-name");
    const badge = within(header).getByText("Requester", { selector: ".tk-badge-role" });
    expect(badge).toHaveClass("tk-badge-square");
    expect(within(header).getByRole("button", { name: "Log Out" })).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/Development Requester|Change Requester/);
    const sources = walk(path.join(CLIENT, "src")).join("\n");
    expect(sources).not.toContain("Development Requester");
    expect(sources).not.toContain("Change Requester");
    expect(sources).not.toContain("toktickit.requesterId");
  });

  it("UI-50 navigation is derived from the role: Requester, IT Staff and Administrator each see exactly their destinations (AC-31..AC-33, BR-36)", async () => {
    const expected: Array<[api.AuthUser, string[]]> = [
      [REQUESTER, ["My Tickets", "Create Ticket"]],
      [IT_STAFF, ["Ticket Queue"]],
      [ADMINISTRATOR, ["Ticket Queue", "User Management"]],
    ];
    for (const [user, destinations] of expected) {
      signInAs(user);
      renderAt("/");
      const nav = await screen.findByRole("navigation", { name: "Main navigation" });
      await within(nav).findByText(user.name);
      const links = within(nav)
        .getAllByRole("link")
        .filter((link) => !link.classList.contains("tk-brand"))
        .map((link) => link.textContent);
      expect(links, user.role).toEqual(destinations);
      cleanup();
    }
  });

  it("each role lands on its own screen: a Requester on My Tickets, IT Staff and Administrator on the Ticket Queue (ui-spec 9.1)", async () => {
    for (const [user, heading, pathname] of [
      [REQUESTER, "My Tickets", "/tickets"],
      [IT_STAFF, "Ticket Queue", "/queue"],
      [ADMINISTRATOR, "Ticket Queue", "/queue"],
    ] as const) {
      signInAs(user);
      renderAt("/");
      expect(await screen.findByRole("heading", { level: 1, name: heading }), user.role).toBeInTheDocument();
      expect(window.location.pathname).toBe(pathname);
      cleanup();
    }
  });

  it("a destination the role may not use renders the Forbidden state inside the shell and fetches nothing for it (FR-24, BR-40)", async () => {
    const fetchTickets = vi.mocked(api.fetchTickets);
    for (const [user, pathname] of [
      [REQUESTER, "/queue"],
      [REQUESTER, "/users"],
      [IT_STAFF, "/tickets"],
      [IT_STAFF, "/tickets/new"],
      [IT_STAFF, "/users"],
      [ADMINISTRATOR, "/tickets/42"],
    ] as const) {
      signInAs(user);
      fetchTickets.mockClear();
      renderAt(pathname);
      expect(await screen.findByRole("heading", { name: "You do not have access to that page." }), `${user.role} ${pathname}`).toBeInTheDocument();
      expect(screen.getByText("Your role does not allow this. Choose a destination from the menu above.")).toBeInTheDocument();
      expect(screen.getByRole("banner")).toBeInTheDocument();
      const back = screen.getByRole("link", { name: /Go to / });
      expect(back).toHaveClass("btn-primary");
      expect(fetchTickets).not.toHaveBeenCalled();
      cleanup();
    }
  });

  it("Log Out ends the session and shows Login without the session-ended banner (FR-06, BR-23)", async () => {
    signedIn();
    const logout = vi.spyOn(api, "logout").mockResolvedValue();
    renderAt();
    await userEvent.setup().click(await screen.findByRole("button", { name: "Log Out" }));
    expect(logout).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole("button", { name: "Sign In" })).toBeInTheDocument();
    expect(screen.queryByRole("banner")).not.toBeInTheDocument();
    expect(screen.queryByText(MESSAGES.ended)).not.toBeInTheDocument();
  });

  it("UI-51 a 401 from a screen's own request discards the user and shows Login with the session-ended message (AC-35, BR-34)", async () => {
    vi.restoreAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        const json = (status: number, body: unknown) =>
          new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
        if (url.endsWith("/api/auth/me")) return json(200, REQUESTER);
        if (url.includes("/api/categories") || url.includes("/api/related-systems")) return json(200, []);
        return json(401, { error: { code: "AUTH_REQUIRED", message: MESSAGES.ended } });
      }),
    );
    renderAt("/tickets");
    expect(await screen.findByText(MESSAGES.ended)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign In" })).toBeInTheDocument();
    expect(screen.queryByRole("banner")).not.toBeInTheDocument();
    expect(screen.queryByText(REQUESTER.name)).not.toBeInTheDocument();
  });
});

describe("theme", () => {
  it("STYLE-01 the theme carries the four fixed Zen Green values unchanged (ui-spec 2.1)", () => {
    const css = fs.readFileSync(path.join(CLIENT, "src", "theme.css"), "utf8");
    for (const hex of ["#006B3C", "#0B7A46", "#EAF6EF", "#F5F7F6"]) expect(css).toContain(hex);
  });
});
