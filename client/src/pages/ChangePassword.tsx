import { useEffect, useRef, useState, type FormEvent } from "react";
import * as api from "../api.js";
import { useAuth, useCurrentUser } from "../auth/AuthContext.js";
import { AUTH_MESSAGES, validatePasswordChange } from "../auth/password-policy.js";
import { RoleBadge } from "../components/Badge.js";
import RequiredMarker from "../components/RequiredMarker.js";
import { useRouter } from "../router.js";
import { INTERNAL_ERROR_MESSAGE } from "../validation.js";

// Change Password - ui-spec.md section 11. Shown to a signed-in user whose
// mustChangePassword is set, at whatever address they asked for, and to nobody
// else; no shell, because the point of the gate is that nothing else is
// reachable (FR-14). This screen is feedback. The control is the server's
// 403 PASSWORD_CHANGE_REQUIRED on every other route (BR-20).
//
// Validation is the shared validator the server runs too (C-60): the
// confirmation mismatch, in particular, is caught here before any request is
// sent (AC-26).

type Field = "currentPassword" | "newPassword" | "confirmPassword";
const FIELDS: Field[] = ["currentPassword", "newPassword", "confirmPassword"];
const EMPTY = { currentPassword: "", newPassword: "", confirmPassword: "" };

// How long the success panel shows before the application continues (FR-18).
const CONTINUE_AFTER_MS = 1500;

export default function ChangePassword() {
  const user = useCurrentUser();
  const { passwordChanged } = useAuth();
  const { navigate } = useRouter();
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const [changed, setChanged] = useState<api.AuthUser | null>(null);
  const [focusTarget, setFocusTarget] = useState<Field | null>(null);
  const refs = {
    currentPassword: useRef<HTMLInputElement>(null),
    newPassword: useRef<HTMLInputElement>(null),
    confirmPassword: useRef<HTMLInputElement>(null),
  };

  useEffect(() => {
    if (!focusTarget || saving) return;
    refs[focusTarget].current?.focus();
    setFocusTarget(null);
  }, [focusTarget, saving]); // refs are stable for the life of the screen

  // Success: the panel, then on into the application (FR-18, AC-28). The
  // landing screen per role arrives in #40; until then the application's root.
  useEffect(() => {
    if (!changed) return;
    const timer = window.setTimeout(() => {
      passwordChanged(changed);
      navigate("/");
    }, CONTINUE_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [changed, passwordChanged, navigate]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (saving || changed) return;
    setFailed(false);
    const found = validatePasswordChange(values);
    setErrors(found);
    const first = FIELDS.find((field) => found[field]);
    if (first) {
      setFocusTarget(first);
      return;
    }

    setSaving(true);
    try {
      const updated = await api.changePassword(values);
      setValues(EMPTY);
      setChanged(updated);
    } catch (error) {
      const apiError = error instanceof api.ApiError ? error : null;
      if (apiError?.code === "CURRENT_PASSWORD_INCORRECT" || apiError?.code === "VALIDATION_FAILED") {
        // A field refusal from the server renders at its field (BR-87, C-106).
        // A wrong current password clears only that field; the session is
        // fine, so the person stays here (C-106).
        const fields = (apiError.fields ?? {}) as Partial<Record<Field, string>>;
        if (apiError.code === "CURRENT_PASSWORD_INCORRECT" && !fields.currentPassword) {
          fields.currentPassword = AUTH_MESSAGES.currentIncorrect;
        }
        setErrors(fields);
        if (apiError.code === "CURRENT_PASSWORD_INCORRECT") {
          setValues((v) => ({ ...v, currentPassword: "" }));
          setFocusTarget("currentPassword");
        }
      } else if (apiError?.status !== 401) {
        // A 401 is handled by AuthContext, which shows Login. Anything else is
        // a failure: all three fields are cleared, because a retained password
        // on a failed change is a hazard (ui-spec 11).
        setFailed(true);
        setValues(EMPTY);
      }
    } finally {
      setSaving(false);
    }
  }

  function retry() {
    setFailed(false);
    setFocusTarget("currentPassword");
  }

  function describedBy(field: Field, extra?: string): string | undefined {
    const ids = [extra, errors[field] ? `cp-${field}-error` : undefined].filter(Boolean);
    return ids.length ? ids.join(" ") : undefined;
  }

  function input(field: Field, label: string, autoComplete: string, helpId?: string) {
    return (
      <div className="mb-3">
        <label htmlFor={`cp-${field}`} className="tk-label form-label">
          {label}
          <RequiredMarker />
        </label>
        <input
          ref={refs[field]}
          id={`cp-${field}`}
          type="password"
          className="form-control"
          autoComplete={autoComplete}
          required
          value={values[field]}
          disabled={saving || changed !== null}
          aria-invalid={errors[field] ? "true" : undefined}
          aria-describedby={describedBy(field, helpId)}
          onChange={(e) => setValues((v) => ({ ...v, [field]: e.target.value }))}
        />
        {errors[field] && (
          <div id={`cp-${field}-error`} className="tk-invalid-feedback">
            {errors[field]}
          </div>
        )}
        {field === "newPassword" && (
          <div id="cp-newPassword-rule" className="tk-muted mt-1">
            {AUTH_MESSAGES.policy}
          </div>
        )}
      </div>
    );
  }

  return (
    <main className="tk-auth">
      <div className="tk-auth-card tk-auth-card-wide">
        <p className="tk-wordmark">TokTickIT</p>
        <div className="tk-card">
          <div className="tk-identity">
            <span className="tk-identity-name">{user.name}</span>
            <RoleBadge value={user.role} />
          </div>
          <h1 className="tk-title">Change Password</h1>
          <p>You must choose a new password before you can continue.</p>

          {changed && (
            <div className="tk-panel tk-panel-pale tk-panel-success" role="status" aria-live="polite">
              <p>
                <svg className="tk-success-icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
                  <path d="M13.5 4.5 6.5 11.5 2.5 7.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>{" "}
                Your password has been changed.
              </p>
            </div>
          )}

          {failed && (
            <div className="tk-panel tk-panel-danger" role="alert" aria-live="assertive">
              <p>{INTERNAL_ERROR_MESSAGE}</p>
              <button type="button" className="btn btn-secondary" onClick={retry}>
                Retry
              </button>
            </div>
          )}

          <form noValidate onSubmit={handleSubmit}>
            {input("currentPassword", "Current Password", "current-password")}
            {input("newPassword", "New Password", "new-password", "cp-newPassword-rule")}
            {input("confirmPassword", "Confirm New Password", "new-password")}

            <button
              type="submit"
              className="btn btn-primary w-100"
              disabled={saving || changed !== null}
              aria-busy={saving ? "true" : undefined}
            >
              {saving && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />}
              {saving ? "Saving…" : "Change Password"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
