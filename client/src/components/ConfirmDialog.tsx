import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

// A generic confirmation modal - ui-spec.md 14.3 (Problem Appears Resolved)
// and 16.2 (the Resolved/Closed/Cancelled status confirmations). Same focus
// trap and restore as AttachmentSection's RemovalDialog (ui-spec 14.3), with
// no reason field: the caller supplies the body text and the async action.
// role="dialog", aria-modal="true" (ui-spec 22). Cancel changes nothing and
// issues no request.

export default function ConfirmDialog({
  titleId,
  title,
  body,
  confirmLabel,
  busyLabel,
  cancelLabel = "Cancel",
  variant = "primary",
  onCancel,
  onConfirm,
}: {
  titleId: string;
  title: string;
  body: ReactNode;
  confirmLabel: string;
  busyLabel: string;
  cancelLabel?: string;
  variant?: "primary" | "danger";
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    openerRef.current = document.activeElement as HTMLElement | null;
    confirmRef.current?.focus();
    return () => openerRef.current?.focus();
  }, []);

  function trapFocus(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      if (!busy) onCancel();
      return;
    }
    if (event.key !== "Tab") return;
    const items = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>("button:not([disabled])") ?? []);
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  async function confirm() {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="modal-backdrop show" />
      <div className="modal d-block" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={dialogRef} onKeyDown={trapFocus}>
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content tk-dialog">
            <div className="modal-header">
              <h2 id={titleId} className="tk-section-title mb-0">{title}</h2>
            </div>
            <div className="modal-body">{body}</div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={busy}>{cancelLabel}</button>
              <button
                type="button"
                ref={confirmRef}
                className={variant === "danger" ? "btn btn-danger" : "btn btn-primary"}
                onClick={confirm}
                disabled={busy}
                aria-busy={busy ? "true" : undefined}
              >
                {busy ? busyLabel : confirmLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
