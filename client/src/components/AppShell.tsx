import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Link, useRouter } from "../router.js";
import { useAuth, useCurrentUser } from "../auth/AuthContext.js";
import { LANDING, NAV_ITEMS } from "../auth/roles.js";
import { RoleBadge } from "./Badge.js";

// Application shell — ui-spec.md section 9. Rendered only for a signed-in user
// with no outstanding password change; App decides that.
//
// Desktop and tablet: one primary-green header bar with the wordmark (linking
// to the role's landing screen), the role's navigation (BR-36, FR-10), and the
// signed-in user's name, Role badge and Log Out (FR-09). The Lab 2 selector's
// identity line and its switch control are gone (BR-94).
// Mobile: wordmark plus a toggler; the expanded panel lists the same rows and
// traps focus while open.

const FOCUSABLE = 'a[href], button:not([disabled])';

export default function AppShell({ children }: { children: ReactNode }) {
  const { path } = useRouter();
  const user = useCurrentUser();
  const { signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const togglerRef = useRef<HTMLButtonElement>(null);

  // Close the mobile panel whenever the route changes.
  useEffect(() => setOpen(false), [path]);

  // Focus moves into the panel when it opens and back to the toggler on close.
  useEffect(() => {
    if (open) {
      panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    }
  }, [open]);

  // A failed logout leaves the person signed in, with the button back, rather
  // than pretending the session ended (BR-23).
  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
    } catch {
      setSigningOut(false);
    }
  }

  function closePanel() {
    setOpen(false);
    togglerRef.current?.focus();
  }

  // Focus trap for the open mobile panel: Tab cycles through the toggler and
  // the panel's controls; Escape closes it (ui-spec.md section 9).
  function handlePanelKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (!open) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closePanel();
      return;
    }
    if (event.key !== "Tab") return;
    const items = [
      togglerRef.current,
      ...Array.from(panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []),
    ].filter((el): el is HTMLElement => el !== null);
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <>
      <header className="tk-header" onKeyDown={handlePanelKeyDown}>
        <nav className="navbar navbar-expand-md" aria-label="Main navigation" data-bs-theme="dark">
          <div className="container">
            <Link to={LANDING[user.role]} className="navbar-brand tk-brand">
              TokTickIT
            </Link>
            <button
              ref={togglerRef}
              type="button"
              className="navbar-toggler"
              aria-controls="tk-nav-panel"
              aria-expanded={open}
              aria-label="Toggle navigation"
              onClick={() => setOpen((v) => !v)}
            >
              <span className="navbar-toggler-icon" aria-hidden="true" />
            </button>

            <div
              id="tk-nav-panel"
              ref={panelRef}
              className={`collapse navbar-collapse${open ? " show" : ""}`}
            >
              <ul className="navbar-nav mx-auto">
                {NAV_ITEMS[user.role].map((item) => {
                  const active = item.matches(path);
                  return (
                    <li className="nav-item" key={item.to}>
                      <Link
                        to={item.to}
                        className={`nav-link tk-nav-link${active ? " tk-nav-link-active" : ""}`}
                        aria-current={active ? "page" : undefined}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>

              <div className="tk-identity tk-identity-shell">
                <span className="tk-identity-name">{user.name}</span>
                <RoleBadge value={user.role} />
                <button
                  type="button"
                  className="btn tk-btn-tertiary tk-btn-on-primary"
                  disabled={signingOut}
                  onClick={handleSignOut}
                >
                  Log Out
                </button>
              </div>
            </div>
          </div>
        </nav>
      </header>
      <main className="container tk-main">{children}</main>
    </>
  );
}
