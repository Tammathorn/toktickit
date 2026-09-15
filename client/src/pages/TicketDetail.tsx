import { useEffect, useState } from "react";
import { ApiError, fetchTicket, type Ticket } from "../api.js";
import { Link } from "../router.js";
import { useRequester } from "../requester/RequesterContext.js";
import { formatDisplayTimestamp } from "../format.js";
import { messageForCode } from "../validation.js";
import { PriorityBadge, StatusBadge, titleCase } from "../components/Badge.js";

// Requester Ticket Detail - ui-spec.md section 13. Issue #14 lands the load
// states and Card 1 (the read-only Ticket information), because the Part 7
// cross-requester rejection is captured on this screen. Card 2, the
// attachment lifecycle, lands with Issue #15.

type LoadState =
  | { kind: "loading" }
  | { kind: "ready"; ticket: Ticket }
  | { kind: "refused"; message: string }
  | { kind: "error" };

export default function TicketDetail({ id }: { id: number }) {
  const { selected } = useRequester();
  const requesterId = selected!.id;
  const [load, setLoad] = useState<LoadState>({ kind: "loading" });
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoad({ kind: "loading" });
    fetchTicket(id, requesterId).then(
      (ticket) => {
        if (!cancelled) setLoad({ kind: "ready", ticket });
      },
      (err) => {
        if (cancelled) return;
        // 403 TICKET_FORBIDDEN and 404 TICKET_NOT_FOUND are refusals with their
        // own 6.1 message (BR-21, C-13); anything else is the safe failure.
        if (err instanceof ApiError && (err.status === 403 || err.status === 404)) {
          setLoad({ kind: "refused", message: messageForCode(err.code) });
        } else {
          setLoad({ kind: "error" });
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [id, requesterId, reloadToken]);

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

  if (load.kind === "refused" || load.kind === "error") {
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

  const t = load.ticket;
  return (
    <section aria-labelledby="ticket-detail-title">
      <div className="card tk-card mb-3">
        <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
          <h1 id="ticket-detail-title" className="tk-title mb-0">{t.ticketNumber}</h1>
          <StatusBadge value={t.currentStatus} />
          {t.itPriority && <PriorityBadge value={t.itPriority} it />}
        </div>

        <dl className="row tk-detail-list">
          <div className="col-12 col-md-6 col-lg-4"><dt>Ticket Date</dt><dd className="tk-readonly-value">{formatDisplayTimestamp(t.createdAt)}</dd></div>
          <div className="col-12 col-md-6 col-lg-4"><dt>Requester</dt><dd className="tk-readonly-value">{t.requester.name}</dd></div>
          <div className="col-12 col-md-6 col-lg-4"><dt>Category</dt><dd className="tk-readonly-value">{t.category.name}</dd></div>
          <div className="col-12 col-md-6 col-lg-4"><dt>Related System</dt><dd className="tk-readonly-value">{t.relatedSystem.name}</dd></div>
          <div className="col-12 col-md-6 col-lg-4"><dt>Requested Priority</dt><dd className="tk-readonly-value">{titleCase(t.requestedPriority)}</dd></div>
          <div className="col-12 col-md-6 col-lg-4"><dt>Last Updated</dt><dd className="tk-readonly-value">{formatDisplayTimestamp(t.updatedAt)}</dd></div>
          <div className="col-12"><dt>Ticket Summary</dt><dd className="tk-readonly-value">{t.summary}</dd></div>
          <div className="col-12"><dt>Description</dt><dd className="tk-readonly-value tk-prewrap">{t.description}</dd></div>
        </dl>
      </div>

      <Link to="/tickets" className="btn btn-secondary">Back to My Tickets</Link>
    </section>
  );
}
