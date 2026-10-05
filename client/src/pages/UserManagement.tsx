import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import {
  ApiError,
  createUser,
  fetchUsers,
  setInitialPassword,
  updateUser,
  type AdminUser,
  type UserRole,
} from "../api.js";
import { useCurrentUser } from "../auth/AuthContext.js";
import { checkPasswordPolicy, AUTH_MESSAGES } from "../auth/password-policy.js";
import { MESSAGES, messageForCode } from "../validation.js";
import { RoleBadge } from "../components/Badge.js";
import RequiredMarker from "../components/RequiredMarker.js";
import { useMediaQuery, MD_AND_UP } from "../useMediaQuery.js";

// User Management - ui-spec.md section 17, `LS 8.5`. One screen: the list, a
// Create panel, an Edit panel and a Set-initial-password panel, never
// separate routes (specification.md section 6). Administrator only; the App
// route guard sends any other role to the Forbidden state before this
// component is ever reached, so no user data is fetched for them (AC-97).
//
// No pagination, no page-size select, no second filter and no sortable
// column headers (BR-84, FR-66, AC-98) - `LS 4.2` excludes user-list
// pagination, multi-column sorting and multiple simultaneous filters, so
// those controls do not exist here to be disabled.

const ROLE_OPTIONS: Array<[string, string]> = [
  ["", "All roles"],
  ["REQUESTER", "Requester"],
  ["IT_STAFF", "IT Staff"],
  ["ADMINISTRATOR", "Administrator"],
];
const SEARCH_DEBOUNCE_MS = 300;

type LoadState =
  | { kind: "loading" }
  | { kind: "ready"; users: AdminUser[] }
  | { kind: "forbidden" }
  | { kind: "error" };

type Panel =
  | { kind: "none" }
  | { kind: "create" }
  | { kind: "edit"; user: AdminUser }
  | { kind: "password"; user: AdminUser };

export default function UserManagement() {
  const currentUser = useCurrentUser();
  const [search, setSearch] = useState("");
  const [searchText, setSearchText] = useState("");
  const [role, setRole] = useState("");
  const [load, setLoad] = useState<LoadState>({ kind: "loading" });
  const [reloadToken, setReloadToken] = useState(0);
  const [panel, setPanel] = useState<Panel>({ kind: "none" });
  const [success, setSuccess] = useState<string | null>(null);
  const atLeastTablet = useMediaQuery(MD_AND_UP);

  useEffect(() => {
    let cancelled = false;
    setLoad({ kind: "loading" });
    fetchUsers({ search, role }).then(
      (users) => {
        if (!cancelled) setLoad({ kind: "ready", users });
      },
      (err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.code === "FORBIDDEN_ROLE") setLoad({ kind: "forbidden" });
        else setLoad({ kind: "error" });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [search, role, reloadToken]);

  useEffect(() => {
    if (searchText === search) return;
    const handle = window.setTimeout(() => setSearch(searchText.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);

  useEffect(() => {
    if (!success) return;
    const timer = window.setTimeout(() => setSuccess(null), 2500);
    return () => window.clearTimeout(timer);
  }, [success]);

  function clearFilters() {
    setSearchText("");
    setSearch("");
    setRole("");
  }

  function onSaved(message: string) {
    setPanel({ kind: "none" });
    setSuccess(message);
    setReloadToken((n) => n + 1);
  }

  if (load.kind === "forbidden") {
    // ui-spec 20.1's Forbidden state is rendered by App's route guard before
    // this screen mounts at all for a non-Administrator (AC-97); reaching
    // this branch means a 403 arrived from a request this screen itself
    // issued, which the same state covers.
    return (
      <div className="tk-forbidden">
        <div className="card tk-card tk-forbidden-card">
          <h1 className="tk-title">You do not have access to that page.</h1>
          <p>Your role does not allow this.</p>
        </div>
      </div>
    );
  }

  const active = Boolean(search || role);
  const ready = load.kind === "ready" ? load.users : null;

  return (
    <section aria-labelledby="users-title">
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
        <h1 id="users-title" className="tk-title mb-0">User Management</h1>
        <button type="button" className="btn btn-primary" onClick={() => setPanel({ kind: "create" })}>
          Create User
        </button>
      </div>

      {success && (
        <div className="tk-panel tk-panel-pale tk-panel-success" role="status" aria-live="polite">
          <p>
            <svg className="tk-success-icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
              <path d="M13.5 4.5 6.5 11.5 2.5 7.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>{" "}
            {success}
          </p>
        </div>
      )}

      <div className="card tk-card tk-toolbar mb-3" role="search" aria-label="Search and filter users">
        <div className="row g-3">
          <div className="col-12 col-md-6">
            <label htmlFor="users-search" className="form-label tk-label">Search</label>
            <input
              id="users-search"
              type="search"
              className="form-control"
              placeholder="Name or email address"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>
          <div className="col-12 col-md-4">
            <label htmlFor="users-role" className="form-label tk-label">Role</label>
            <select id="users-role" className="form-select" value={role} onChange={(e) => setRole(e.target.value)}>
              {ROLE_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>
        {active && (
          <div className="mt-3">
            <button type="button" className="btn btn-secondary" onClick={clearFilters}>Clear filters</button>
          </div>
        )}
      </div>

      <div className="tk-list-region" role="region" aria-label="Users" aria-busy={load.kind === "loading" ? "true" : undefined} aria-live="polite">
        {load.kind === "loading" && <UsersSkeleton wide={atLeastTablet} />}

        {load.kind === "error" && (
          <div className="tk-panel tk-panel-danger" role="alert" aria-live="assertive">
            <p>{messageForCode("INTERNAL_ERROR")}</p>
            <button type="button" className="btn btn-secondary" onClick={() => setReloadToken((n) => n + 1)}>Retry</button>
          </div>
        )}

        {ready && ready.length === 0 && !active && (
          <div className="card tk-card tk-empty text-center">
            <DocumentIcon />
            <h2 className="tk-section-title">No users yet</h2>
            <p>There are no user accounts yet. Use Create User to add the first one.</p>
          </div>
        )}

        {ready && ready.length === 0 && active && (
          <div className="card tk-card tk-empty text-center">
            <MagnifierIcon />
            <h2 className="tk-section-title">No matches</h2>
            <p>No users match your search or filter.</p>
            <button type="button" className="btn btn-secondary align-self-center" onClick={clearFilters}>Clear filters</button>
          </div>
        )}

        {ready && ready.length > 0 && (
          atLeastTablet ? (
            <UsersTable users={ready} currentUserId={currentUser.id} onEdit={(u) => setPanel({ kind: "edit", user: u })} />
          ) : (
            <UsersCards users={ready} currentUserId={currentUser.id} onEdit={(u) => setPanel({ kind: "edit", user: u })} />
          )
        )}
      </div>

      {panel.kind === "create" && <CreatePanel onCancel={() => setPanel({ kind: "none" })} onSaved={() => onSaved("User created.")} />}
      {panel.kind === "edit" && (
        <EditPanel
          user={panel.user}
          isSelf={panel.user.id === currentUser.id}
          onCancel={() => setPanel({ kind: "none" })}
          onSaved={() => onSaved("Changes saved.")}
          onSetPassword={() => setPanel({ kind: "password", user: panel.user })}
        />
      )}
      {panel.kind === "password" && (
        <SetPasswordPanel user={panel.user} onCancel={() => setPanel({ kind: "none" })} onSaved={() => onSaved("Initial password set.")} />
      )}
    </section>
  );
}

function StatusValue({ isActive }: { isActive: boolean }) {
  return isActive ? (
    <span className="tk-status-active">Active</span>
  ) : (
    <span className="tk-status-inactive">
      <span className="tk-status-dot" aria-hidden="true" /> Inactive
    </span>
  );
}

function NameCell({ user, currentUserId }: { user: AdminUser; currentUserId: number }) {
  return (
    <>
      {user.name} {user.id === currentUserId && <span className="tk-muted">(you)</span>}
      {user.mustChangePassword && <div className="tk-muted">Initial password not yet changed</div>}
    </>
  );
}

function UsersTable({ users, currentUserId, onEdit }: { users: AdminUser[]; currentUserId: number; onEdit: (u: AdminUser) => void }) {
  return (
    <div className="card tk-card tk-table-card">
      <table className="table tk-table tk-users-table mb-0">
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Email</th>
            <th scope="col">Role</th>
            <th scope="col">Status</th>
            <th scope="col">Edit</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="tk-row">
              <td><NameCell user={u} currentUserId={currentUserId} /></td>
              <td>{u.email}</td>
              <td><RoleBadge value={u.role} /></td>
              <td><StatusValue isActive={u.isActive} /></td>
              <td>
                <button type="button" className="btn btn-link tk-link-button" onClick={() => onEdit(u)} aria-label={`Edit ${u.name}`}>
                  Edit
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UsersCards({ users, currentUserId, onEdit }: { users: AdminUser[]; currentUserId: number; onEdit: (u: AdminUser) => void }) {
  return (
    <ul className="list-unstyled tk-card-list">
      {users.map((u) => (
        <li key={u.id} className="card tk-card tk-user-card">
          <div className="d-flex justify-content-between align-items-start gap-2">
            <span className="fw-semibold"><NameCell user={u} currentUserId={currentUserId} /></span>
            <RoleBadge value={u.role} />
          </div>
          <div className="tk-muted">{u.email}</div>
          <div><StatusValue isActive={u.isActive} /></div>
          <button type="button" className="btn btn-secondary mt-2" onClick={() => onEdit(u)} aria-label={`Edit ${u.name}`}>
            Edit
          </button>
        </li>
      ))}
    </ul>
  );
}

function UsersSkeleton({ wide }: { wide: boolean }) {
  return (
    <div className="tk-skeleton" aria-hidden="true" aria-busy="true">
      {wide ? (
        <div className="card tk-card">
          {[0, 1, 2, 3, 4].map((i) => <div key={i} className="tk-skeleton-row" />)}
        </div>
      ) : (
        <div className="tk-card-list">
          {[0, 1, 2].map((i) => <div key={i} className="card tk-card tk-skeleton-card" />)}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Panels - ui-spec 17.2, 17.3. One shared modal shell; each panel supplies its
// own fields, validation and submit.
// ---------------------------------------------------------------------------

function PanelShell({
  titleId,
  title,
  onClose,
  busy,
  children,
}: {
  titleId: string;
  title: string;
  onClose: () => void;
  busy: boolean;
  children: ReactNode;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  // ui-spec 22 (checklist A11y row 4): a modal traps focus and restores it on
  // close - the same contract ConfirmDialog keeps. The opener is remembered on
  // open and refocused when the panel unmounts.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    headingRef.current?.focus();
    return () => opener?.focus();
  }, []);

  function trapFocus(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      if (!busy) onClose();
      return;
    }
    if (event.key !== "Tab") return;
    const items = Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>(
        "input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), a[href]",
      ) ?? [],
    );
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || active === headingRef.current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <>
      <div className="modal-backdrop show" />
      <div className="modal d-block" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={dialogRef} onKeyDown={trapFocus}>
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content tk-dialog">
            <div className="modal-header">
              <h2 id={titleId} className="tk-section-title mb-0" ref={headingRef} tabIndex={-1}>{title}</h2>
            </div>
            {children}
          </div>
        </div>
      </div>
    </>
  );
}

type CoreFields = { name: string; email: string; role: UserRole; isActive: boolean };
type CoreErrors = Partial<Record<keyof CoreFields, string>>;

function validateCore(values: CoreFields): CoreErrors {
  const errors: CoreErrors = {};
  const name = values.name.trim();
  if (name.length < 1 || name.length > 100) errors.name = MESSAGES.nameBounds;
  const email = values.email.trim();
  if (email.length < 1 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = MESSAGES.emailBounds;
  if (!values.role) errors.role = MESSAGES.roleRequired;
  return errors;
}

function CreatePanel({ onCancel, onSaved }: { onCancel: () => void; onSaved: () => void }) {
  const [values, setValues] = useState<CoreFields & { initialPassword: string }>({
    name: "",
    email: "",
    role: "REQUESTER",
    isActive: true,
    initialPassword: "",
  });
  const [errors, setErrors] = useState<CoreErrors & { initialPassword?: string }>({});
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    const coreErrors = validateCore(values);
    const passwordError = checkPasswordPolicy(values.initialPassword);
    const found: typeof errors = { ...coreErrors, initialPassword: passwordError ?? undefined };
    if (Object.values(found).some(Boolean)) {
      setErrors(found);
      return;
    }
    setErrors({});
    setFailed(false);
    setSaving(true);
    try {
      await createUser({ ...values, name: values.name.trim(), email: values.email.trim().toLowerCase() });
      onSaved();
    } catch (error) {
      const apiError = error instanceof ApiError ? error : null;
      if (apiError?.code === "VALIDATION_FAILED" || apiError?.code === "EMAIL_TAKEN") {
        setErrors((apiError.fields ?? {}) as typeof errors);
      } else if (apiError?.status !== 401) {
        setFailed(true);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <PanelShell titleId="create-user-title" title="Create User" onClose={onCancel} busy={saving}>
      <form noValidate onSubmit={handleSubmit}>
        <div className="modal-body">
          {failed && (
            <div className="tk-panel tk-panel-danger" role="alert" aria-live="assertive">
              <p>{messageForCode("INTERNAL_ERROR")}</p>
            </div>
          )}
          <div className="mb-3">
            <label htmlFor="cu-name" className="form-label tk-label">Name<RequiredMarker /></label>
            <input
              id="cu-name"
              className="form-control"
              value={values.name}
              disabled={saving}
              aria-invalid={errors.name ? "true" : undefined}
              onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
            />
            {errors.name && <div className="tk-invalid-feedback">{errors.name}</div>}
          </div>
          <div className="mb-3">
            <label htmlFor="cu-email" className="form-label tk-label">Email Address<RequiredMarker /></label>
            <input
              id="cu-email"
              type="email"
              className="form-control"
              value={values.email}
              disabled={saving}
              aria-invalid={errors.email ? "true" : undefined}
              onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
            />
            {errors.email && <div className="tk-invalid-feedback">{errors.email}</div>}
          </div>
          <div className="mb-3">
            <label htmlFor="cu-role" className="form-label tk-label">Role<RequiredMarker /></label>
            <select
              id="cu-role"
              className="form-select"
              value={values.role}
              disabled={saving}
              onChange={(e) => setValues((v) => ({ ...v, role: e.target.value as UserRole }))}
            >
              <option value="REQUESTER">Requester</option>
              <option value="IT_STAFF">IT Staff</option>
              <option value="ADMINISTRATOR">Administrator</option>
            </select>
            {errors.role && <div className="tk-invalid-feedback">{errors.role}</div>}
          </div>
          <div className="mb-3">
            <label htmlFor="cu-status" className="form-label tk-label">Status<RequiredMarker /></label>
            <select
              id="cu-status"
              className="form-select"
              value={values.isActive ? "active" : "inactive"}
              disabled={saving}
              onChange={(e) => setValues((v) => ({ ...v, isActive: e.target.value === "active" }))}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="mb-1">
            <label htmlFor="cu-password" className="form-label tk-label">Initial Password<RequiredMarker /></label>
            <input
              id="cu-password"
              type="password"
              className="form-control"
              autoComplete="new-password"
              value={values.initialPassword}
              disabled={saving}
              aria-invalid={errors.initialPassword ? "true" : undefined}
              onChange={(e) => setValues((v) => ({ ...v, initialPassword: e.target.value }))}
            />
            {errors.initialPassword && <div className="tk-invalid-feedback">{errors.initialPassword}</div>}
          </div>
          <p className="tk-muted mt-1">{AUTH_MESSAGES.policy}</p>
          <p className="tk-muted">The user must change this password when they first sign in.</p>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={saving}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving} aria-busy={saving ? "true" : undefined}>
            {saving ? "Creating…" : "Create User"}
          </button>
        </div>
      </form>
    </PanelShell>
  );
}

function EditPanel({
  user,
  isSelf,
  onCancel,
  onSaved,
  onSetPassword,
}: {
  user: AdminUser;
  isSelf: boolean;
  onCancel: () => void;
  onSaved: () => void;
  onSetPassword: () => void;
}) {
  const [values, setValues] = useState<CoreFields>({ name: user.name, email: user.email, role: user.role, isActive: user.isActive });
  const [errors, setErrors] = useState<CoreErrors>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    const found = validateCore(values);
    if (Object.values(found).some(Boolean)) {
      setErrors(found);
      return;
    }
    setErrors({});
    setBanner(null);
    setFailed(false);
    setSaving(true);
    try {
      await updateUser(user.id, { ...values, name: values.name.trim(), email: values.email.trim().toLowerCase() });
      onSaved();
    } catch (error) {
      const apiError = error instanceof ApiError ? error : null;
      if (apiError?.code === "VALIDATION_FAILED" || apiError?.code === "EMAIL_TAKEN") {
        setErrors((apiError.fields ?? {}) as CoreErrors);
      } else if (apiError?.code === "SELF_DEACTIVATION") {
        setErrors({ isActive: apiError.fields?.isActive ?? messageForCode("SELF_DEACTIVATION") });
      } else if (apiError?.code === "LAST_ADMINISTRATOR") {
        setBanner(messageForCode("LAST_ADMINISTRATOR"));
      } else if (apiError?.status !== 401) {
        setFailed(true);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <PanelShell titleId="edit-user-title" title="Edit User" onClose={onCancel} busy={saving}>
      <form noValidate onSubmit={handleSubmit}>
        <div className="modal-body">
          {banner && (
            <div className="tk-panel tk-panel-danger" role="alert" aria-live="assertive">
              <p>{banner}</p>
            </div>
          )}
          {failed && (
            <div className="tk-panel tk-panel-danger" role="alert" aria-live="assertive">
              <p>{messageForCode("INTERNAL_ERROR")}</p>
            </div>
          )}
          <div className="mb-3">
            <label htmlFor="eu-name" className="form-label tk-label">Name<RequiredMarker /></label>
            <input
              id="eu-name"
              className="form-control"
              value={values.name}
              disabled={saving}
              aria-invalid={errors.name ? "true" : undefined}
              onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
            />
            {errors.name && <div className="tk-invalid-feedback">{errors.name}</div>}
          </div>
          <div className="mb-3">
            <label htmlFor="eu-email" className="form-label tk-label">Email Address<RequiredMarker /></label>
            <input
              id="eu-email"
              type="email"
              className="form-control"
              value={values.email}
              disabled={saving}
              aria-invalid={errors.email ? "true" : undefined}
              onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
            />
            {errors.email && <div className="tk-invalid-feedback">{errors.email}</div>}
          </div>
          <div className="mb-3">
            <label htmlFor="eu-role" className="form-label tk-label">Role<RequiredMarker /></label>
            <select
              id="eu-role"
              className="form-select"
              value={values.role}
              disabled={saving}
              onChange={(e) => setValues((v) => ({ ...v, role: e.target.value as UserRole }))}
            >
              <option value="REQUESTER">Requester</option>
              <option value="IT_STAFF">IT Staff</option>
              <option value="ADMINISTRATOR">Administrator</option>
            </select>
          </div>
          <div className="mb-1">
            <label htmlFor="eu-status" className="form-label tk-label">Status<RequiredMarker /></label>
            <select
              id="eu-status"
              className="form-select"
              value={values.isActive ? "active" : "inactive"}
              disabled={saving || isSelf}
              aria-invalid={errors.isActive ? "true" : undefined}
              onChange={(e) => setValues((v) => ({ ...v, isActive: e.target.value === "active" }))}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            {errors.isActive && <div className="tk-invalid-feedback">{errors.isActive}</div>}
            {isSelf && <p className="tk-muted mt-1">You cannot deactivate your own account.</p>}
          </div>
          <button type="button" className="btn btn-link tk-link-button mt-2 p-0" onClick={onSetPassword} disabled={saving}>
            Set a new initial password
          </button>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={saving}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving} aria-busy={saving ? "true" : undefined}>
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </form>
    </PanelShell>
  );
}

function SetPasswordPanel({ user, onCancel, onSaved }: { user: AdminUser; onCancel: () => void; onSaved: () => void }) {
  const [initialPassword, setInitialPasswordValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    const policyError = checkPasswordPolicy(initialPassword);
    if (policyError) {
      setError(policyError);
      return;
    }
    setError(null);
    setFailed(false);
    setSaving(true);
    try {
      await setInitialPassword(user.id, initialPassword);
      onSaved();
    } catch (err) {
      const apiError = err instanceof ApiError ? err : null;
      if (apiError?.code === "VALIDATION_FAILED") setError(apiError.fields?.initialPassword ?? AUTH_MESSAGES.policy);
      else if (apiError?.status !== 401) setFailed(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <PanelShell titleId="set-password-title" title={`Set a new initial password for ${user.name}`} onClose={onCancel} busy={saving}>
      <form noValidate onSubmit={handleSubmit}>
        <div className="modal-body">
          {failed && (
            <div className="tk-panel tk-panel-danger" role="alert" aria-live="assertive">
              <p>{messageForCode("INTERNAL_ERROR")}</p>
            </div>
          )}
          <div className="mb-1">
            <label htmlFor="sp-password" className="form-label tk-label">Initial Password<RequiredMarker /></label>
            <input
              id="sp-password"
              type="password"
              className="form-control"
              autoComplete="new-password"
              value={initialPassword}
              disabled={saving}
              aria-invalid={error ? "true" : undefined}
              onChange={(e) => setInitialPasswordValue(e.target.value)}
            />
            {error && <div className="tk-invalid-feedback">{error}</div>}
          </div>
          <p className="tk-muted mt-1">{AUTH_MESSAGES.policy}</p>
          <p className="tk-muted">This ends the user's sessions and requires them to choose a new password at their next sign-in.</p>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={saving}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving} aria-busy={saving ? "true" : undefined}>
            {saving ? "Saving…" : "Set Password"}
          </button>
        </div>
      </form>
    </PanelShell>
  );
}

// ui-spec 20.1 - Empty carries an outline document icon, No results an
// outline magnifier, so the two states differ at a glance (C-121). The same
// glyphs My Tickets and the Queue use.
function DocumentIcon() {
  return (
    <svg className="tk-empty-icon" viewBox="0 0 24 24" width="40" height="40" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M7 3h7l5 5v13H7z" /><path d="M14 3v5h5" /><path d="M9 13h6M9 17h6" />
    </svg>
  );
}

function MagnifierIcon() {
  return (
    <svg className="tk-empty-icon" viewBox="0 0 24 24" width="40" height="40" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5 21 21" />
    </svg>
  );
}
