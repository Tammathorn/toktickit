import { useEffect, useRef, useState, type FormEvent } from "react";
import * as api from "../api.js";
import { useAuth } from "../auth/AuthContext.js";
import { AUTH_MESSAGES } from "../auth/password-policy.js";
import RequiredMarker from "../components/RequiredMarker.js";
import { INTERNAL_ERROR_MESSAGE } from "../validation.js";

// Login - ui-spec.md section 10. No shell; a centred card on the page ground.
//
// The client checks PRESENCE only (FR-01). It never checks the password
// policy here: the policy governs setting a password, not supplying one.
// One banner position above the fields serves every refusal, and a refusal
// is never attached to the email field, which would imply the address was the
// problem (BR-07, AC-05). The password is cleared on every failure.

type Banner = "invalid" | "inactive" | "failure" | "ended";

const BANNERS: Record<Banner, { text: string; className: string }> = {
  invalid: { text: "That email address and password do not match an account.", className: "tk-panel-danger" },
  // Not the person's mistake, so the warning treatment, not danger (ui-spec 10).
  inactive: { text: "That account is not active. Contact an administrator.", className: "tk-panel-warning" },
  failure: { text: INTERNAL_ERROR_MESSAGE, className: "tk-panel-danger" },
  ended: { text: "Your session has ended. Please sign in again.", className: "tk-panel-warning" },
};

export default function Login({ sessionEnded = false }: { sessionEnded?: boolean }) {
  const { signedIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [banner, setBanner] = useState<Banner | null>(sessionEnded ? "ended" : null);
  const [submitting, setSubmitting] = useState(false);
  // Focus can only move to a field once it is enabled again, so a request to
  // focus is recorded here and carried out after the next render.
  const [focusTarget, setFocusTarget] = useState<"email" | "password" | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!focusTarget || submitting) return;
    (focusTarget === "email" ? emailRef : passwordRef).current?.focus();
    setFocusTarget(null);
  }, [focusTarget, submitting]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    const found: typeof errors = {};
    if (email.trim() === "") found.email = AUTH_MESSAGES.emailRequired;
    if (password === "") found.password = AUTH_MESSAGES.passwordRequired;
    setErrors(found);
    if (found.email || found.password) {
      setFocusTarget(found.email ? "email" : "password");
      return;
    }

    setBanner(null);
    setSubmitting(true);
    try {
      signedIn(await api.login(email, password));
    } catch (error) {
      const code = error instanceof api.ApiError ? error.code : "INTERNAL_ERROR";
      setBanner(code === "INVALID_CREDENTIALS" ? "invalid" : code === "ACCOUNT_INACTIVE" ? "inactive" : "failure");
      setPassword("");
      setFocusTarget("password");
      setSubmitting(false);
    }
  }

  // Retry cannot resend: the password was cleared, as on every failure. It
  // returns the person to the one field they must fill again.
  function retry() {
    setBanner(null);
    setFocusTarget("password");
  }

  const shown = banner ? BANNERS[banner] : null;

  return (
    <main className="tk-auth">
      <div className="tk-auth-card">
        <p className="tk-wordmark">TokTickIT</p>
        <div className="tk-card">
          <h1 className="tk-title">Sign In</h1>

          {shown && (
            <div
              className={`tk-panel ${shown.className}`}
              role="alert"
              aria-live={banner === "failure" ? "assertive" : "polite"}
            >
              <p>{shown.text}</p>
              {banner === "failure" && (
                <button type="button" className="btn btn-secondary" onClick={retry}>
                  Retry
                </button>
              )}
            </div>
          )}

          <form noValidate onSubmit={handleSubmit}>
            <div className="mb-3">
              <label htmlFor="login-email" className="tk-label form-label">
                Email Address
                <RequiredMarker />
              </label>
              <input
                ref={emailRef}
                id="login-email"
                type="email"
                className="form-control"
                autoComplete="username"
                required
                value={email}
                disabled={submitting}
                aria-invalid={errors.email ? "true" : undefined}
                aria-describedby={errors.email ? "login-email-error" : undefined}
                onChange={(e) => setEmail(e.target.value)}
              />
              {errors.email && (
                <div id="login-email-error" className="tk-invalid-feedback">
                  {errors.email}
                </div>
              )}
            </div>

            <div className="mb-3">
              <label htmlFor="login-password" className="tk-label form-label">
                Password
                <RequiredMarker />
              </label>
              <input
                ref={passwordRef}
                id="login-password"
                type="password"
                className="form-control"
                autoComplete="current-password"
                required
                value={password}
                disabled={submitting}
                aria-invalid={errors.password ? "true" : undefined}
                aria-describedby={errors.password ? "login-password-error" : undefined}
                onChange={(e) => setPassword(e.target.value)}
              />
              {errors.password && (
                <div id="login-password-error" className="tk-invalid-feedback">
                  {errors.password}
                </div>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary w-100"
              disabled={submitting}
              aria-busy={submitting ? "true" : undefined}
            >
              {submitting && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />}
              {submitting ? "Signing in…" : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
