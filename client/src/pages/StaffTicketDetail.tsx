import { useEffect, useState } from "react";
import {
  ApiError,
  claimTicket,
  downloadAttachment,
  fetchAssignableUsers,
  fetchStaffTicket,
  setItPriority,
  setTicketOwner,
  setTicketStatus,
  type AssignableUser,
  type AttachmentMeta,
  type Entry,
  type RequestedPriority,
  type StaffTicket,
  type TicketStatus,
} from "../api.js";
import { Link } from "../router.js";
import { formatBytes, formatDisplayTimestamp } from "../format.js";
import { messageForCode } from "../validation.js";
import { PriorityBadge, ResolvedMarker, RoleBadge, StatusBadge, STATUS_LABELS, titleCase } from "../components/Badge.js";
import { PublicCommentsCard, InternalNotesCard } from "../components/Communications.js";
import ConfirmDialog from "../components/ConfirmDialog.js";
import Forbidden from "../components/Forbidden.js";

// IT Staff Ticket Detail - ui-spec.md section 16, LS 8.4. Four cards: Card 1
// (read-only Ticket information), Card 2 (Ticket Operations - the only
// editable group), Card 3 (read-only Attachments) and Card 4 (Public
// Comments and Internal Notes, section 19). Staff are not ownership-scoped
// (BR-96, C-93): any active IT Staff or Administrator user may act on any
// Ticket. The check order (C-63) and every refusal code are the server's;
// this screen only offers the moves the matrix permits (FR-48).

// specification.md section 5.1, mirrored client-side (as status-transitions.ts
// mirrors it server-side) so the status select never offers a move the
// server would refuse as INVALID_STATUS_TRANSITION.
const PERMITTED_STATUS_TRANSITIONS: Record<TicketStatus, readonly TicketStatus[]> = {
  NEW: ["OPEN", "IN_PROGRESS", "CANCELLED"],
  OPEN: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  IN_PROGRESS: ["OPEN", "WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  WAITING_FOR_REQUESTER: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
  RESOLVED: ["CLOSED", "REOPENED"],
  CLOSED: [],
  REOPENED: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  CANCELLED: [],
};
const TERMINAL_STATUSES: readonly TicketStatus[] = ["CLOSED", "CANCELLED"];
// A move into one of these needs a Ticket Owner (C-93, BR-97).
const NEEDS_OWNER: readonly TicketStatus[] = ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED"];
// Moving into one of these needs a confirmation step first (BR-57, FR-48).
const CONFIRM_TARGETS: readonly TicketStatus[] = ["RESOLVED", "CLOSED", "CANCELLED"];

const CONFIRM_COPY: Record<"RESOLVED" | "CLOSED" | "CANCELLED", {
  title: string;
  body: string;
  confirmLabel: string;
  busyLabel: string;
  variant: "primary" | "danger";
  cancelLabel?: string;
}> = {
  RESOLVED: {
    title: "Resolve this ticket",
    body: "The Requester will see the ticket as Resolved. It can be reopened if the problem returns.",
    confirmLabel: "Resolve",
    busyLabel: "Resolving…",
    variant: "primary",
  },
  CLOSED: {
    title: "Close this ticket",
    body: "Closing is final. A closed ticket cannot be reopened or changed.",
    confirmLabel: "Close",
    busyLabel: "Closing…",
    variant: "danger",
  },
  CANCELLED: {
    title: "Cancel this ticket",
    body: "Cancelling is final. A cancelled ticket cannot be reopened or changed.",
    confirmLabel: "Cancel Ticket",
    busyLabel: "Cancelling…",
    variant: "danger",
    cancelLabel: "Keep the ticket",
  },
};

const PRIORITIES: RequestedPriority[] = ["LOW", "MEDIUM", "HIGH"];
const QUEUE_SEARCH_KEY = "tk-queue-search";

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

export default function StaffTicketDetail({ id }: { id: number }) {
  const [load, setLoad] = useState<LoadState>({ kind: "loading" });
  const [reloadToken, setReloadToken] = useState(0);
  const [ticket, setTicket] = useState<StaffTicket | null>(null);
  const [assignableUsers, setAssignableUsers] = useState<AssignableUser[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoad({ kind: "loading" });
    setTicket(null);
    fetchStaffTicket(id).then(
      (t) => {
        if (cancelled) return;
        setTicket(t);
        setLoad({ kind: "ready" });
      },
      (err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) setLoad({ kind: "refused", message: messageForCode(err.code) });
        else if (err instanceof ApiError && err.code === "FORBIDDEN_ROLE") setLoad({ kind: "forbidden" });
        else setLoad({ kind: "error" });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [id, reloadToken]);

  useEffect(() => {
    let cancelled = false;
    fetchAssignableUsers().then(
      (users) => !cancelled && setAssignableUsers(users),
      () => {},
    );
    return () => {
      cancelled = true;
    };
  }, []);

  let backTo = "/queue";
  try {
    backTo = `/queue${sessionStorage.getItem(QUEUE_SEARCH_KEY) ?? ""}`;
  } catch {
    // sessionStorage unavailable (e.g. a locked-down browser) - fall back to /queue
  }

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
            <Link to={backTo} className="btn btn-secondary">Back to the Ticket Queue</Link>
          </div>
        </div>
      </section>
    );
  }

  const t = ticket;
  const isTerminal = TERMINAL_STATUSES.includes(t.currentStatus);

  return (
    <section aria-labelledby="staff-detail-title">
      <div className="row g-3 mb-3">
        <div className="col-12 col-lg-7">
          <InfoCard ticket={t} />
        </div>
        <div className="col-12 col-lg-5">
          <OperationsCard
            ticket={t}
            isTerminal={isTerminal}
            assignableUsers={assignableUsers}
            onUpdated={setTicket}
            onRefetch={() => fetchStaffTicket(t.id).then(setTicket, () => {})}
          />
        </div>
      </div>

      <AttachmentsCard attachments={t.attachments} />

      <PublicCommentsCard
        ticketId={t.id}
        entries={t.publicComments}
        locked={isTerminal}
        onPosted={(entry: Entry) => setTicket((cur) => (cur ? { ...cur, publicComments: [entry, ...cur.publicComments] } : cur))}
      />
      <InternalNotesCard
        ticketId={t.id}
        entries={t.internalNotes}
        locked={isTerminal}
        onPosted={(entry: Entry) => setTicket((cur) => (cur ? { ...cur, internalNotes: [entry, ...cur.internalNotes] } : cur))}
      />
      {/* ui-spec 16.4, C-109: the terminal line, once, below both sections. */}
      {isTerminal && <p className="tk-muted mt-3">{terminalMessage(t.currentStatus)}</p>}

      <Link to={backTo} className="btn btn-secondary mt-3">Back to the Ticket Queue</Link>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Card 1 - Ticket information, entirely read-only (ui-spec 16.1).
// ---------------------------------------------------------------------------
function InfoCard({ ticket: t }: { ticket: StaffTicket }) {
  return (
    <div className="card tk-card h-100" role="region" aria-label="Ticket information">
      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        <h1 id="staff-detail-title" className="tk-title mb-0">{t.ticketNumber}</h1>
        <StatusBadge value={t.currentStatus} />
        <PriorityBadge value={t.itPriority} it />
        {t.requesterResolvedAt && <ResolvedMarker />}
      </div>

      <dl className="row tk-detail-list">
        <div className="col-12 col-md-6 col-lg-4"><dt>Requester</dt><dd className="tk-readonly-value">{t.requester.name} ({t.requester.email})</dd></div>
        <div className="col-12 col-md-6 col-lg-4"><dt>Ticket Date</dt><dd className="tk-readonly-value">{formatDisplayTimestamp(t.createdAt)}</dd></div>
        <div className="col-12 col-md-6 col-lg-4"><dt>Category</dt><dd className="tk-readonly-value">{t.category.name}</dd></div>
        <div className="col-12 col-md-6 col-lg-4"><dt>Related System</dt><dd className="tk-readonly-value">{t.relatedSystem.name}</dd></div>
        <div className="col-12 col-md-6 col-lg-4"><dt>Requested Priority</dt><dd className="tk-readonly-value">{titleCase(t.requestedPriority)}</dd></div>
        <div className="col-12 col-md-6 col-lg-4"><dt>Last Updated</dt><dd className="tk-readonly-value">{formatDisplayTimestamp(t.updatedAt)}</dd></div>
        <div className="col-12"><dt>Ticket Summary</dt><dd className="tk-readonly-value">{t.summary}</dd></div>
        <div className="col-12"><dt>Description</dt><dd className="tk-readonly-value tk-prewrap">{t.description}</dd></div>
      </dl>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card 2 - Ticket Operations, the only editable group (ui-spec 16.2).
// ---------------------------------------------------------------------------
function OperationsCard({
  ticket: t,
  isTerminal,
  assignableUsers,
  onUpdated,
  onRefetch,
}: {
  ticket: StaffTicket;
  isTerminal: boolean;
  assignableUsers: AssignableUser[];
  onUpdated: (t: StaffTicket) => void;
  onRefetch: () => void;
}) {
  const [ownerSelect, setOwnerSelect] = useState("");
  const [ownerBusy, setOwnerBusy] = useState<"claim" | "save" | "unassign" | null>(null);
  const [ownerConflict, setOwnerConflict] = useState<string | null>(null);

  const [priorityValue, setPriorityValue] = useState<RequestedPriority>(t.itPriority);
  const [priorityBusy, setPriorityBusy] = useState(false);
  const [priorityError, setPriorityError] = useState<string | null>(null);

  const [statusValue, setStatusValue] = useState<TicketStatus>(t.currentStatus);
  const [statusBusy, setStatusBusy] = useState(false);
  const [statusConflict, setStatusConflict] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<TicketStatus | null>(null);

  function handleWriteError(err: unknown, setMessage: (m: string) => void) {
    if (err instanceof ApiError && err.code === "TICKET_CLOSED") {
      onRefetch();
      setMessage(err.message);
      return;
    }
    setMessage(err instanceof ApiError ? err.message : messageForCode("INTERNAL_ERROR"));
  }

  async function claim() {
    setOwnerBusy("claim");
    setOwnerConflict(null);
    try {
      onUpdated(await claimTicket(t.id));
    } catch (err) {
      if (err instanceof ApiError && err.code === "ALREADY_OWNED") onRefetch();
      handleWriteError(err, setOwnerConflict);
    } finally {
      setOwnerBusy(null);
    }
  }

  async function saveOwner() {
    if (ownerSelect === "") return;
    setOwnerBusy("save");
    setOwnerConflict(null);
    try {
      onUpdated(await setTicketOwner(t.id, Number(ownerSelect)));
      setOwnerSelect("");
    } catch (err) {
      handleWriteError(err, setOwnerConflict);
    } finally {
      setOwnerBusy(null);
    }
  }

  async function unassign() {
    setOwnerBusy("unassign");
    setOwnerConflict(null);
    try {
      onUpdated(await setTicketOwner(t.id, null));
    } catch (err) {
      handleWriteError(err, setOwnerConflict);
    } finally {
      setOwnerBusy(null);
    }
  }

  async function savePriority() {
    setPriorityBusy(true);
    setPriorityError(null);
    try {
      onUpdated(await setItPriority(t.id, priorityValue));
    } catch (err) {
      handleWriteError(err, setPriorityError);
    } finally {
      setPriorityBusy(false);
    }
  }

  async function sendStatus(target: TicketStatus) {
    setStatusBusy(true);
    setStatusConflict(null);
    try {
      onUpdated(await setTicketStatus(t.id, target));
    } catch (err) {
      handleWriteError(err, setStatusConflict);
    } finally {
      setStatusBusy(false);
    }
  }

  function saveStatus() {
    if (statusValue === t.currentStatus) return;
    if (CONFIRM_TARGETS.includes(statusValue)) setConfirmTarget(statusValue);
    else sendStatus(statusValue);
  }

  if (isTerminal) {
    return (
      <div className="card tk-card tk-ops-card h-100" role="region" aria-label="Ticket Operations">
        <h2 className="tk-section-title">Ticket Operations</h2>
        <div className="tk-ops-group">
          <p className="tk-label mb-1">Ticket Owner</p>
          {t.owner ? (
            <p>
              {t.owner.name} <RoleBadge value={t.owner.role} />
              {!t.owner.isActive && <span className="tk-owner-inactive"> (inactive)</span>}
            </p>
          ) : (
            <p className="tk-owner-unassigned">Unassigned</p>
          )}
        </div>
        <div className="tk-ops-group">
          <p className="tk-label mb-1">IT Priority</p>
          <PriorityBadge value={t.itPriority} it />
        </div>
        <p className="tk-muted mb-0">{terminalMessage(t.currentStatus)}</p>
      </div>
    );
  }

  const permittedTargets = PERMITTED_STATUS_TRANSITIONS[t.currentStatus];
  const confirmCopy = confirmTarget && confirmTarget in CONFIRM_COPY ? CONFIRM_COPY[confirmTarget as keyof typeof CONFIRM_COPY] : null;

  return (
    <div className="card tk-card tk-ops-card h-100" role="region" aria-label="Ticket Operations">
      <h2 className="tk-section-title">Ticket Operations</h2>

      {/* Ticket Owner */}
      <div className="tk-ops-group" role="group" aria-label="Ticket Owner">
        <p className="tk-label mb-1">Ticket Owner</p>
        <p className="mb-2">
          {t.owner ? (
            <>
              {t.owner.name} <RoleBadge value={t.owner.role} />
              {!t.owner.isActive && <span className="tk-owner-inactive"> (inactive)</span>}
            </>
          ) : (
            <span className="tk-owner-unassigned">Unassigned</span>
          )}
        </p>
        <div className="d-flex flex-wrap gap-2 align-items-end">
          {!t.owner && (
            <button type="button" className="btn btn-primary" onClick={claim} disabled={ownerBusy !== null} aria-busy={ownerBusy === "claim" ? "true" : undefined}>
              {ownerBusy === "claim" ? "Claiming…" : "Claim"}
            </button>
          )}
          <div>
            <label htmlFor="owner-select" className="form-label tk-label">{t.owner ? "Reassign to…" : "Assign to…"}</label>
            <div className="d-flex gap-2">
              <select id="owner-select" className="form-select" value={ownerSelect} onChange={(e) => setOwnerSelect(e.target.value)} disabled={ownerBusy !== null}>
                <option value="">Choose a user</option>
                {assignableUsers.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
              <button type="button" className="btn btn-secondary" onClick={saveOwner} disabled={ownerSelect === "" || ownerBusy !== null} aria-busy={ownerBusy === "save" ? "true" : undefined}>
                {ownerBusy === "save" ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
          {t.owner && (
            <button type="button" className="btn tk-btn-tertiary" onClick={unassign} disabled={ownerBusy !== null} aria-busy={ownerBusy === "unassign" ? "true" : undefined}>
              {ownerBusy === "unassign" ? "Unassigning…" : "Unassign"}
            </button>
          )}
        </div>
        {ownerConflict && <p className="tk-conflict" role="alert" aria-live="assertive">{ownerConflict}</p>}
      </div>

      {/* IT Priority */}
      <div className="tk-ops-group" role="group" aria-label="IT Priority controls">
        <label htmlFor="it-priority-select" className="form-label tk-label">IT Priority</label>
        <div className="d-flex gap-2 align-items-center">
          <select id="it-priority-select" className="form-select" value={priorityValue} onChange={(e) => setPriorityValue(e.target.value as RequestedPriority)} disabled={priorityBusy}>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>{titleCase(p)}</option>
            ))}
          </select>
          <PriorityBadge value={t.itPriority} it />
          <button type="button" className="btn btn-secondary" onClick={savePriority} disabled={priorityBusy} aria-busy={priorityBusy ? "true" : undefined}>
            {priorityBusy ? "Saving…" : "Save Changes"}
          </button>
        </div>
        {priorityError && <p className="tk-conflict" role="alert" aria-live="assertive">{priorityError}</p>}
      </div>

      {/* Current Status */}
      <div className="tk-ops-group" role="group" aria-label="Current Status controls">
        {t.requesterResolvedAt && (
          <div className="tk-callout tk-callout-info" role="status">
            The Requester reported on {formatDisplayTimestamp(t.requesterResolvedAt)} that the problem appears resolved.
          </div>
        )}
        <label htmlFor="status-select" className="form-label tk-label">Current Status</label>
        <div className="d-flex gap-2">
          <select id="status-select" className="form-select" value={statusValue} onChange={(e) => setStatusValue(e.target.value as TicketStatus)} disabled={statusBusy}>
            <option value={t.currentStatus} disabled>{STATUS_LABELS[t.currentStatus]}</option>
            {permittedTargets.map((target) => (
              <option key={target} value={target}>{STATUS_LABELS[target]}</option>
            ))}
          </select>
          <button type="button" className="btn btn-secondary" onClick={saveStatus} disabled={statusBusy || statusValue === t.currentStatus} aria-busy={statusBusy ? "true" : undefined}>
            {statusBusy ? "Saving…" : "Save Changes"}
          </button>
        </div>
        {statusConflict && <p className="tk-conflict" role="alert" aria-live="assertive">{statusConflict}</p>}
      </div>

      {confirmCopy && (
        <ConfirmDialog
          titleId="status-confirm-title"
          title={confirmCopy.title}
          body={confirmCopy.body}
          confirmLabel={confirmCopy.confirmLabel}
          busyLabel={confirmCopy.busyLabel}
          variant={confirmCopy.variant}
          cancelLabel={confirmCopy.cancelLabel}
          onCancel={() => setConfirmTarget(null)}
          onConfirm={async () => {
            await sendStatus(confirmTarget!);
            setConfirmTarget(null);
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card 3 - Attachments, read-only for staff (ui-spec 16.3, C-103).
// ---------------------------------------------------------------------------
function typeLabel(mimeType: string): string {
  switch (mimeType) {
    case "image/jpeg": return "JPG";
    case "image/png": return "PNG";
    case "image/webp": return "WEBP";
    case "application/pdf": return "PDF";
    default: return mimeType;
  }
}

function AttachmentsCard({ attachments }: { attachments: AttachmentMeta[] }) {
  const active = attachments.filter((a) => !a.isRemoved);
  const removed = attachments.filter((a) => a.isRemoved);

  async function open(meta: AttachmentMeta, disposition: "attachment" | "inline") {
    try {
      const blob = await downloadAttachment(meta.id, disposition);
      const url = URL.createObjectURL(blob);
      if (disposition === "attachment") {
        const a = document.createElement("a");
        a.href = url;
        a.download = meta.originalFilename;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else {
        window.open(url, "_blank", "noopener");
      }
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      // ui-spec 13 / C-46: the row itself cannot be made unavailable here
      // without duplicating AttachmentSection's state machine; a read-only
      // staff view simply leaves the file unopened.
    }
  }

  return (
    <section className="card tk-card mb-3" aria-labelledby="attachments-title" role="region">
      <div className="d-flex flex-wrap align-items-baseline justify-content-between gap-2 mb-3">
        <h2 id="attachments-title" className="tk-section-title mb-0">Attachments</h2>
        <span className="tk-muted">{`${active.length} of 5 active`}</span>
      </div>

      <h3 className="tk-label" id="staff-active-attachments-title">Active</h3>
      {active.length === 0 ? (
        <p className="tk-muted mb-3">No active attachments.</p>
      ) : (
        <ul className="list-unstyled tk-attachment-list mb-3" aria-label="Active attachments">
          {active.map((a) => (
            <li key={a.id} className="tk-attachment">
              <div className="tk-attachment-body">
                <span className="tk-attachment-name">{a.originalFilename}</span>
                <span className="tk-muted">{typeLabel(a.mimeType)} · {formatBytes(a.sizeBytes)} · Uploaded {formatDisplayTimestamp(a.uploadedAt)}</span>
              </div>
              <div className="tk-attachment-actions">
                <button type="button" className="btn btn-sm tk-btn-tertiary" aria-label={`Preview ${a.originalFilename}`} onClick={() => open(a, "inline")}>Preview</button>
                <button type="button" className="btn btn-sm tk-btn-tertiary" aria-label={`Download ${a.originalFilename}`} onClick={() => open(a, "attachment")}>Download</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <h3 className="tk-label" id="staff-removed-attachments-title">Removed</h3>
      {removed.length === 0 ? (
        <p className="tk-muted mb-0">No removed attachments.</p>
      ) : (
        <ul className="list-unstyled tk-attachment-list mb-0" aria-label="Removed attachments">
          {removed.map((a) => (
            <li key={a.id} className="tk-attachment tk-attachment-removed">
              <div className="tk-attachment-body">
                <span>
                  <s className="tk-attachment-name">{a.originalFilename}</s>{" "}
                  <span className="tk-badge tk-badge-square tk-badge-removed">Removed</span>
                </span>
                <span className="tk-muted">{typeLabel(a.mimeType)} · {formatBytes(a.sizeBytes)} · Uploaded {formatDisplayTimestamp(a.uploadedAt)}</span>
                <span className="tk-muted">Removed {a.removedAt ? formatDisplayTimestamp(a.removedAt) : ""}</span>
                <span>Reason: {a.removalReason}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
