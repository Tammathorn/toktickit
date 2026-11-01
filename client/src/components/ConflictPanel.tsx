// ui-spec.md section 11 - the conflict presentation (C-153). STALE_UPDATE gets
// the two buttons; every other conflict uses the same panel without them. The
// caller re-fetches the Ticket and keeps the user's draft (BR-39, BR-63).

export const STALE_MESSAGE =
  "Someone else changed this first. The latest version is shown, and your changes are kept so you can apply them again.";

export default function ConflictPanel({
  message,
  stale = false,
  lines,
  onApply,
  onDiscard,
  busy = false,
  children,
}: {
  message: string;
  /** STALE_UPDATE: the section 11 heading, whether or not Apply is offered. */
  stale?: boolean;
  lines?: string[];
  onApply?: () => void;
  onDiscard?: () => void;
  busy?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="tk-panel tk-panel-warning tk-conflict-panel" role="alert" aria-live="assertive">
      <p className="mb-1 fw-semibold">
        <svg className="me-1" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
          <path d="M8 1.5 15 14H1z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M8 6v4M8 11.75v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        {stale ? "This changed while you were working" : message}
      </p>
      {stale && <p className="mb-2">{message}</p>}
      {lines && lines.length > 0 && (
        <ul className="mb-2">
          {lines.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      )}
      {children}
      {(onApply || onDiscard) && (
        <div className="d-flex flex-wrap gap-2">
          {onApply && (
            <button type="button" className="btn btn-primary" onClick={onApply} disabled={busy} aria-busy={busy ? "true" : undefined}>
              {busy ? "Applying…" : "Apply my changes again"}
            </button>
          )}
          {onDiscard && (
            <button type="button" className="btn btn-secondary" onClick={onDiscard} disabled={busy}>
              Discard my changes
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ui-spec.md section 4 - the gate reason lines, in the API's order.
export const GATE_REASON_LINES: Record<string, string> = {
  NO_COMPLETED_ACTION: "Record at least one completed action.",
  PLANNED_ACTIONS_OPEN: "Complete or cancel every planned action.",
  FOLLOW_UP_REQUIRED: "The latest completed action needs follow-up. Record the follow-up work first.",
  NO_ACTION_SINCE_REOPEN: "Record an action completed since the ticket was reopened.",
};

export function gateLines(reasons: readonly string[]): string[] {
  return reasons.map((r) => GATE_REASON_LINES[r] ?? r);
}
