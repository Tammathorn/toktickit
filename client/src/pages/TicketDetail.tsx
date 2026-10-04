import { useEffect, useState } from "react";
import { ApiError, fetchTicket, postRequesterResolved, type Entry, type Ticket, type TicketStatus } from "../api.js";
import { Link } from "../router.js";
import { formatDisplayTimestamp } from "../format.js";
import { messageForCode } from "../validation.js";
import { PriorityBadge, ResolvedMarker, StatusBadge, titleCase } from "../components/Badge.js";
import { PublicCommentsCard } from "../components/Communications.js";
import ConfirmDialog from "../components/ConfirmDialog.js";
import AttachmentSection from "../components/AttachmentSection.js";
import Forbidden from "../components/Forbidden.js";

// Requester Ticket Detail - ui-spec.md section 13, extended by section 14 for
// Lab 3. Card 1 is the read-only Ticket information (BR-61, AC-53), now with
// a Ticket Owner row; Card 2 is Public Comments (14.2); Card 3 is the
// attachment lifecycle (AttachmentSection), locked on a terminal Ticket
// (14.4, C-109). The "Problem Appears Resolved" action sits in Card 1 (14.3).
// Nothing of the IT Staff workflow is rendered, not even as a placeholder
// (BR-63): no status control, no IT Priority, no Internal Notes.

// ui-spec.md 14.3, specification.md 5.1 / C-76 - where the Requester may
// report the problem appears resolved, mirrored client-side.
const RESOLUTION_FLAG_STATUSES: readonly TicketStatus[] = ["OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "REOPENED"];
const TERMINAL_STATUSES: readonly TicketStatus[] = ["CLOSED", "CANCELLED"];

function terminalMessage(status: TicketStatus): string {
  return status === "CANCELLED"
    ? "This ticket is cancelled - create a new ticket if the problem returns."
    : "This ticket is closed - create a new ticket if the problem returns.";
}

type LoadState =
  | { kind: "loading" }
  | { kind: "ready" }
  | { kind: "refused"; message: string }
  | { kind: "forbidden" }
  | { kind: "error" };

export default function TicketDetail({ id }: { id: number }) {
  const [load, setLoad] = useState<LoadState>({ kind: "loading" });
  const [reloadToken, setReloadToken] = useState(0);
  const [ticket, setTicket] = useState<Ticket | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoad({ kind: "loading" });
    setTicket(null);
    fetchTicket(id).then(
      (t) => {
        if (cancelled) return;
        setTicket(t);
        setLoad({ kind: "ready" });
      },
      (err) => {
        if (cancelled) return;
        // ui-spec 20.1: the status decides. 404 is Not found - a missing
        // Ticket and another Requester's are the same answer (C-65); 403
        // FORBIDDEN_ROLE is the Forbidden state; anything else is the safe
        // failure. PASSWORD_CHANGE_REQUIRED is handled by AuthContext.
        if (err instanceof ApiError && err.status === 404) {
          setLoad({ kind: "refused", message: messageForCode(err.code) });
        } else if (err instanceof ApiError && err.code === "FORBIDDEN_ROLE") {
          setLoad({ kind: "forbidden" });
        } else {
          setLoad({ kind: "error" });
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [id, reloadToken]);

  if (load.kind === "loading") {
    return (
      <section aria-label="Ticket detail" aria-busy="true" className="tk-skeleton" role="region">
        <div className="card tk-card">
          <div className="tk-skeleton-row" />
          <div className="tk-skeleton-row" />
          <div className="tk-skeleton-row" />
        </div>
      </section>
    );
  }

  if (load.kind === "forbidden") return <Forbidden />;

  if (load.kind === "refused" || load.kind === "error" || !ticket) {
    return (
      <section aria-label="Ticket detail">
        <div className="tk-panel tk-panel-danger" role="alert" aria-live="assertive">
          <p>{load.kind === "refused" ? load.message : messageForCode("INTERNAL_ERROR")}</p>
          <div className="d-flex flex-wrap gap-2">
            {load.kind === "error" && (
              <button type="button" className="btn btn-secondary" onClick={() => setReloadToken((n) => n + 1)}>Retry</button>
            )}
            <Link to="/tickets" className="btn btn-secondary">Back to My Tickets</Link>
          </div>
        </div>
      </section>
    );
  }

  const t = ticket;
  const isTerminal = TERMINAL_STATUSES.includes(t.currentStatus);
  return (
    <section aria-labelledby="ticket-detail-title">
      <div className="card tk-card mb-3" role="region" aria-label="Ticket information">
        <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
          <h1 id="ticket-detail-title" className="tk-title mb-0">{t.ticketNumber}</h1>
          <StatusBadge value={t.currentStatus} />
          {/* FR-31, C-71: never null now, so the badge always renders. */}
          <PriorityBadge value={t.itPriority} it />
          {t.requesterResolvedAt && <ResolvedMarker />}
        </div>

        <dl className="row tk-detail-list">
          <div className="col-12 col-md-6 col-lg-4"><dt>Ticket Date</dt><dd className="tk-readonly-value">{formatDisplayTimestamp(t.createdAt)}</dd></div>
          <div className="col-12 col-md-6 col-lg-4"><dt>Requester</dt><dd className="tk-readonly-value">{t.requester.name}</dd></div>
          <div className="col-12 col-md-6 col-lg-4"><dt>Category</dt><dd className="tk-readonly-value">{t.category.name}</dd></div>
          <div className="col-12 col-md-6 col-lg-4"><dt>Related System</dt><dd className="tk-readonly-value">{t.relatedSystem.name}</dd></div>
          <div className="col-12 col-md-6 col-lg-4"><dt>Requested Priority</dt><dd className="tk-readonly-value">{titleCase(t.requestedPriority)}</dd></div>
          {/* ui-spec 14.1: name and activation state only - the owner's email
              appears nowhere on this screen (BR-100, C-95, AC-115, C-114). */}
          <div className="col-12 col-md-6 col-lg-4">
            <dt>Ticket Owner</dt>
            <dd className="tk-readonly-value">
              {t.owner ? (
                <>
                  {t.owner.name}
                  {!t.owner.isActive && <span className="tk-owner-inactive"> (inactive)</span>}
                </>
              ) : (
                "Unassigned"
              )}
            </dd>
          </div>
          <div className="col-12 col-md-6 col-lg-4"><dt>Last Updated</dt><dd className="tk-readonly-value">{formatDisplayTimestamp(t.updatedAt)}</dd></div>
          <div className="col-12"><dt>Ticket Summary</dt><dd className="tk-readonly-value">{t.summary}</dd></div>
          <div className="col-12"><dt>Description</dt><dd className="tk-readonly-value tk-prewrap">{t.description}</dd></div>
        </dl>

        <ResolutionAction ticket={t} onUpdated={setTicket} />
      </div>

      <PublicCommentsCard
        ticketId={t.id}
        entries={t.publicComments}
        locked={isTerminal}
        onPosted={(entry: Entry) => setTicket((cur) => (cur ? { ...cur, publicComments: [entry, ...cur.publicComments] } : cur))}
      />
      {/* ui-spec 14.4, C-109: the terminal line, once, below the comment list. */}
      {isTerminal && <p className="tk-muted mb-3">{terminalMessage(t.currentStatus)}</p>}

      <AttachmentSection key={t.id} ticketId={t.id} initial={t.attachments} locked={isTerminal} />

      <Link to="/tickets" className="btn btn-secondary">Back to My Tickets</Link>
    </section>
  );
}

// ui-spec.md 14.3 - "Problem Appears Resolved". A tertiary action, enabled
// only in the RESOLUTION_FLAG_STATUSES, with a confirmation modal; after the
// action the marker renders and the action is replaced by a muted line
// (FR-30, BR-59, BR-61).
function ResolutionAction({ ticket: t, onUpdated }: { ticket: Ticket; onUpdated: (t: Ticket) => void }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (t.requesterResolvedAt) {
    return <p className="tk-muted mb-0">You reported this on {formatDisplayTimestamp(t.requesterResolvedAt)}.</p>;
  }
  if (!RESOLUTION_FLAG_STATUSES.includes(t.currentStatus)) return null;

  return (
    <>
      <button type="button" className="btn tk-btn-tertiary p-0" onClick={() => setConfirming(true)}>Problem Appears Resolved</button>
      <p className="tk-muted mb-0">Tell IT Staff the problem looks fixed. They will confirm and resolve the ticket.</p>
      {error && <p className="tk-invalid-feedback">{error}</p>}
      {confirming && (
        <ConfirmDialog
          titleId="resolved-confirm-title"
          title="Report that the problem appears resolved"
          body="IT Staff will be told the problem looks fixed. The ticket stays open until they confirm it."
          confirmLabel="Report it"
          busyLabel="Reporting…"
          onCancel={() => setConfirming(false)}
          onConfirm={async () => {
            try {
              onUpdated(await postRequesterResolved(t.id));
              setConfirming(false);
            } catch (err) {
              setError(err instanceof ApiError ? err.message : messageForCode("INTERNAL_ERROR"));
              setConfirming(false);
            }
          }}
        />
      )}
    </>
  );
}
