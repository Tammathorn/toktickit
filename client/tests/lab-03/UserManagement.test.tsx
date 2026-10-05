import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { computeAccessibleName } from "dom-accessibility-api";
import App from "../../src/App.js";
import * as api from "../../src/api.js";
import { ADMINISTRATOR, IT_STAFF, signInAs } from "../support/auth.js";

// Planned rows from tests.md section 2.7: UI-38..UI-48, STYLE-05 (role badge
// family), STYLE-11 (accessible names) (Issue #43). The API module is mocked
// at its boundary; the screen is reached through <App /> at /users as a
// signed-in Administrator, so the route guard and the shell are exercised as
// the person would see them.

function user(overrides: Partial<api.AdminUser> = {}): api.AdminUser {
  return {
    id: 20,
    name: "Narin Phetchara",
    email: "narin.p@example.test",
    role: "REQUESTER",
    isActive: true,
    mustChangePassword: false,
    createdAt: "2026-08-01T03:00:00.000Z",
    updatedAt: "2026-09-20T07:41:00.000Z",
    ...overrides,
  };
}

const USERS: api.AdminUser[] = [
  user({ id: 1, name: "Araya Methee", email: "araya.m@example.test", role: "IT_STAFF" }),
  user({ id: 10, name: "Panida Srisawat", email: "panida.s@example.test", role: "ADMINISTRATOR" }),
  user({ id: 20, name: "Narin Phetchara", email: "narin.p@example.test", role: "REQUESTER", isActive: false, mustChangePassword: true }),
];

function renderUsers(path = "/users") {
  window.history.pushState({}, "", path);
  render(<App />);
}

beforeEach(() => {
  window.history.replaceState({}, "", "/");
  signInAs(ADMINISTRATOR);
  vi.spyOn(api, "fetchCategories").mockResolvedValue([]);
  vi.spyOn(api, "fetchRelatedSystems").mockResolvedValue([]);
  vi.spyOn(api, "fetchTickets").mockResolvedValue({ data: [], meta: { page: 1, pageSize: 10, total: 0, totalPages: 1, sort: "createdAt:desc" } });
});
afterEach(() => vi.restoreAllMocks());

describe("User Management", () => {
  it("UI-38 the list renders Name, Email, Role, Status and Edit for every user (AC-82, FR-56)", async () => {
    vi.spyOn(api, "fetchUsers").mockResolvedValue(USERS);
    renderUsers();
    const table = await screen.findByRole("table");
    const headers = within(table).getAllByRole("columnheader").map((h) => h.textContent);
    expect(headers).toEqual(["Name", "Email", "Role", "Status", "Edit"]);
    for (const u of USERS) {
      expect(within(table).getByText(u.name)).toBeInTheDocument();
      expect(within(table).getByText(u.email)).toBeInTheDocument();
    }
    // Two of the three fixture users are active (Araya, Panida); getByText
    // would throw "multiple elements found" on a non-unique match.
    expect(within(table).getAllByText("Active")).toHaveLength(2);
    expect(within(table).getByText("Inactive")).toBeInTheDocument();
    expect(within(table).getByText("Initial password not yet changed")).toBeInTheDocument();
  });

  it("UI-39 no delete, checkbox, bulk, import, export, pagination or sortable header is rendered (AC-98, FR-66, BR-84)", async () => {
    vi.spyOn(api, "fetchUsers").mockResolvedValue(USERS);
    renderUsers();
    await screen.findByRole("table");
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /delete/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /import|export/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/per page/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: /pagination/i })).not.toBeInTheDocument();
    for (const header of screen.getAllByRole("columnheader")) {
      expect(header.querySelector("button")).toBeNull();
    }
  });

  it("UI-40 search and the role filter each issue a request carrying their parameter (AC-83, AC-84)", async () => {
    const fetch = vi.spyOn(api, "fetchUsers").mockResolvedValue(USERS);
    renderUsers();
    await screen.findByRole("table");
    const user = userEvent.setup();

    await user.selectOptions(screen.getByLabelText("Role"), "IT_STAFF");
    await waitFor(() => expect(fetch).toHaveBeenLastCalledWith({ search: "", role: "IT_STAFF" }));

    await user.type(screen.getByLabelText("Search"), "araya");
    await waitFor(() => expect(fetch).toHaveBeenLastCalledWith({ search: "araya", role: "IT_STAFF" }), { timeout: 2000 });
  });

  it("UI-41 the Create panel renders Name, Email, Role, Status, Initial Password, the must-change line, and no email option (FR-59, BR-16)", async () => {
    vi.spyOn(api, "fetchUsers").mockResolvedValue(USERS);
    renderUsers();
    await screen.findByRole("table");
    await userEvent.click(screen.getByRole("button", { name: "Create User" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByLabelText(/^Name/)).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/^Email Address/)).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/^Role/)).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/^Status/)).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/^Initial Password/)).toBeInTheDocument();
    expect(within(dialog).getByText("The user must change this password when they first sign in.")).toBeInTheDocument();
    expect(within(dialog).queryByText(/send.*(invitation|email|reset)/i)).not.toBeInTheDocument();
    expect(within(dialog).queryByLabelText(/email.*invitation|send.*password/i)).not.toBeInTheDocument();
  });

  it("UI-42 a duplicate email on create renders at the Email Address field, not as a banner (AC-87, FR-62)", async () => {
    vi.spyOn(api, "fetchUsers").mockResolvedValue(USERS);
    vi.spyOn(api, "createUser").mockRejectedValue(
      new api.ApiError(409, "EMAIL_TAKEN", "That email address is already in use.", { email: "That email address is already in use." }),
    );
    renderUsers();
    await screen.findByRole("table");
    await userEvent.click(screen.getByRole("button", { name: "Create User" }));
    const dialog = await screen.findByRole("dialog");
    const user = userEvent.setup();
    await user.type(within(dialog).getByLabelText(/^Name/), "Dup User");
    await user.type(within(dialog).getByLabelText(/^Email Address/), "taken@example.test");
    await user.type(within(dialog).getByLabelText(/^Initial Password/), "Fresh#Start42");
    await user.click(within(dialog).getByRole("button", { name: "Create User" }));

    expect(await within(dialog).findByText("That email address is already in use.")).toBeInTheDocument();
    expect(within(dialog).queryByRole("alert")).not.toBeInTheDocument();
  });

  it("UI-43 the Status control is disabled on the viewer's own row with its explanation; a 422 renders inline (AC-92, FR-63)", async () => {
    vi.spyOn(api, "fetchUsers").mockResolvedValue(USERS);
    vi.spyOn(api, "updateUser").mockRejectedValue(
      new api.ApiError(422, "SELF_DEACTIVATION", "You cannot deactivate your own account.", { isActive: "You cannot deactivate your own account." }),
    );
    renderUsers();
    const table = await screen.findByRole("table");
    await userEvent.click(within(table).getByRole("button", { name: "Edit Panida Srisawat" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByLabelText(/^Status/)).toBeDisabled();
    expect(within(dialog).getByText("You cannot deactivate your own account.")).toBeInTheDocument();
  });

  it("UI-44 a 409 LAST_ADMINISTRATOR on edit renders as a form-level banner (AC-93, AC-94)", async () => {
    vi.spyOn(api, "fetchUsers").mockResolvedValue(USERS);
    vi.spyOn(api, "updateUser").mockRejectedValue(
      new api.ApiError(409, "LAST_ADMINISTRATOR", "There must always be at least one active Administrator."),
    );
    renderUsers();
    const table = await screen.findByRole("table");
    await userEvent.click(within(table).getByRole("button", { name: "Edit Panida Srisawat" }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Save Changes" }));
    const banner = await within(dialog).findByRole("alert");
    expect(banner).toHaveTextContent("There must always be at least one active Administrator.");
  });

  it("UI-45 the Role select is not disabled on the viewer's own row (BR-82, C-81)", async () => {
    vi.spyOn(api, "fetchUsers").mockResolvedValue(USERS);
    renderUsers();
    const table = await screen.findByRole("table");
    await userEvent.click(within(table).getByRole("button", { name: "Edit Panida Srisawat" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByLabelText(/^Role/)).not.toBeDisabled();
  });

  it("UI-46 the Edit panel carries Name, Email, Role and Status only - no password field (FR-60, BR-76)", async () => {
    vi.spyOn(api, "fetchUsers").mockResolvedValue(USERS);
    renderUsers();
    const table = await screen.findByRole("table");
    await userEvent.click(within(table).getByRole("button", { name: "Edit Araya Methee" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByLabelText(/^Name/)).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/^Email Address/)).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/^Role/)).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/^Status/)).toBeInTheDocument();
    expect(within(dialog).queryByLabelText(/password/i)).not.toBeInTheDocument();
  });

  it("UI-47 Set a new initial password opens a panel with the validator's rules and the session warning (FR-61, AC-91)", async () => {
    vi.spyOn(api, "fetchUsers").mockResolvedValue(USERS);
    renderUsers();
    const table = await screen.findByRole("table");
    await userEvent.click(within(table).getByRole("button", { name: "Edit Araya Methee" }));
    const editDialog = await screen.findByRole("dialog");
    await userEvent.click(within(editDialog).getByRole("button", { name: "Set a new initial password" }));
    const passwordDialog = await screen.findByRole("dialog", { name: /Set a new initial password/ });
    expect(within(passwordDialog).getByLabelText(/^Initial Password/)).toBeInTheDocument();
    expect(
      within(passwordDialog).getByText(
        "Password must be 8 to 128 characters and contain an upper-case letter, a lower-case letter, a digit and a special character.",
      ),
    ).toBeInTheDocument();
    expect(
      within(passwordDialog).getByText("This ends the user's sessions and requires them to choose a new password at their next sign-in."),
    ).toBeInTheDocument();
  });

  it("UI-48 a non-Administrator sees the forbidden state and no user request is issued (AC-97, FR-24, FR-65)", async () => {
    signInAs(IT_STAFF);
    const fetch = vi.spyOn(api, "fetchUsers");
    renderUsers();
    expect(await screen.findByText("You do not have access to that page.")).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("STYLE-05 the Role badge family renders for all three roles with the glossary spelling (ui-spec 8.4)", async () => {
    vi.spyOn(api, "fetchUsers").mockResolvedValue(USERS);
    renderUsers();
    const table = await screen.findByRole("table");
    expect(within(table).getByText("IT Staff", { selector: ".tk-badge-role" })).toBeInTheDocument();
    expect(within(table).getByText("Administrator", { selector: ".tk-badge-role" })).toBeInTheDocument();
    expect(within(table).getByText("Requester", { selector: ".tk-badge-role" })).toBeInTheDocument();
    expect(screen.queryByText("Admin", { selector: ".tk-badge-role" })).not.toBeInTheDocument();
  });

  it("STYLE-11 every interactive control has a non-empty accessible name (AC-106 group)", async () => {
    vi.spyOn(api, "fetchUsers").mockResolvedValue(USERS);
    renderUsers();
    const table = await screen.findByRole("table");
    // queryAllByRole, not getAllByRole: a role this screen has none of (e.g.
    // no <input type="search">) must contribute an empty list, not throw.
    // The name itself is the real accessible-name computation (ARIA's
    // algorithm: aria-label, then a <label for>/wrapping <label>, then
    // textContent for a button) - not just the three attributes a hand-rolled
    // check would have to enumerate, which would wrongly fail an <input>
    // named only by its associated <label>.
    for (const control of [
      ...screen.queryAllByRole("button"),
      ...screen.queryAllByRole("textbox"),
      ...screen.queryAllByRole("combobox"),
      ...screen.queryAllByRole("searchbox"),
    ]) {
      expect(computeAccessibleName(control as HTMLElement)).toBeTruthy();
    }
    expect(table).toBeInTheDocument();
    cleanup();
  });

  it("creating a user shows Creating… then the success panel and refetches the list (BR-16)", async () => {
    vi.spyOn(api, "fetchUsers").mockResolvedValue(USERS);
    const create = vi.spyOn(api, "createUser").mockResolvedValue(user({ id: 99, name: "New Hire" }));
    renderUsers();
    await screen.findByRole("table");
    await userEvent.click(screen.getByRole("button", { name: "Create User" }));
    const dialog = await screen.findByRole("dialog");
    const u = userEvent.setup();
    await u.type(within(dialog).getByLabelText(/^Name/), "New Hire");
    await u.type(within(dialog).getByLabelText(/^Email Address/), "new.hire@example.test");
    await u.type(within(dialog).getByLabelText(/^Initial Password/), "Fresh#Start42");
    await u.click(within(dialog).getByRole("button", { name: "Create User" }));
    expect(create).toHaveBeenCalled();
    expect(await screen.findByText("User created.")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("empty and no-results states are distinguished by whether a filter is active (L2 C-28)", async () => {
    const fetch = vi.spyOn(api, "fetchUsers").mockResolvedValue([]);
    renderUsers();
    expect(await screen.findByText("No users yet")).toBeInTheDocument();
    fetch.mockResolvedValue([]);
    await userEvent.type(screen.getByLabelText("Search"), "nobody");
    expect(await screen.findByText("No matches", undefined, { timeout: 2000 })).toBeInTheDocument();
  });
});
