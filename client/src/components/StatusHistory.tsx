import type { HistoryRow } from "../api.js";
import { formatDisplayTimestamp } from "../format.js";
import { StatusBadge, STATUS_LABELS } from "./Badge.js";

// ui-spec.md 9.4 - status history on both Ticket Detail screens, oldest first
// (BR-23). An ordered list, so the order is announced; no edit or delete
// control (BR-15). A legacy Ticket shows the C-179 line and no date.
export default function StatusHistory({ rows, complete }: { rows: HistoryRow[]; complete: boolean }) {
  return (
    <section className="tk-history mt-3" aria-labelledby="status-history-title">
      <h2 id="status-history-title" className="tk-label">Status history</h2>
      {!complete && <p className="tk-muted mb-2">Status changes made before this history began were not recorded.</p>}
      {rows.length > 0 && (
        <ol className="tk-history-list">
          {rows.map((h) => (
            <li key={h.id}>
              <span className="tk-muted">{formatDisplayTimestamp(h.changedAt)}</span>{" - "}
              {h.fromStatus === null ? (
                <>Created as <StatusBadge value={h.toStatus} /> by {h.changedBy.name}</>
              ) : (
                <>
                  <StatusBadge value={h.fromStatus} /> <span aria-hidden="true">-&gt;</span>
                  <span className="visually-hidden">changed from {STATUS_LABELS[h.fromStatus]} to</span>{" "}
                  <StatusBadge value={h.toStatus} /> by {h.changedBy.name}
                </>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
