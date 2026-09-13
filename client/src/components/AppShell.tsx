import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Link, useRouter } from "../router.js";
import { useRequester } from "../requester/RequesterContext.js";

// Application shell — ui-spec.md section 9. Rendered only once a valid
// Development Requester is selected (BR-15, FR-10); App decides that.
//
// Desktop and tablet: one primary-green header bar with the wordmark, the two
// nav items, the selected Requester's name and Change Requester (FR-07, FR-08).
// Mobile: wordmark plus a toggler; the expanded panel lists the same four rows
// and traps focus while open.

const NAV_ITEMS = [
  { to: "/tickets", label: "My Tickets", matches: (p: string) => p === "/" || p.startsWith("/tickets") && p !== "/tickets/new" },
  { to: "/tickets/new", label: "Create Ticket", matches: (p: string) => p === "/tickets/new" },
];

const FOCUSABLE = 'a[href], button:not([disabled])';

export default function AppShell({ children }: { children: ReactNode }) {
  const { path } = useRouter();
  const { selected, clearSelection } = useRequester();
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
            <Link to="/tickets" className="navbar-brand tk-brand">
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
                {NAV_ITEMS.map((item) => {
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

              <div className="tk-requester">
                <span className="tk-requester-name">
                  <span className="tk-requester-label">Development Requester:</span>{" "}
                  <strong>{selected?.name}</strong>
                </span>
                <button type="button" className="btn tk-btn-tertiary tk-btn-on-primary" onClick={clearSelection}>
                  Change Requester
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
