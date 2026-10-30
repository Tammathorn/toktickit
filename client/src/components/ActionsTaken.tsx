import { useState } from "react";
import {
  ApiError,
  cancelAction,
  completeAction,
  createAction,
  editAction,
  newClientRequestId,
  type ActionStatus,
  type AssignableUser,
  type RequesterAction,
  type StaffAction,
  type StaffTicket,
} from "../api.js";
import { formatDisplayTimestamp } from "../format.js";
import { INTERNAL_ERROR_MESSAGE } from "../validation.js";
import ConflictPanel, { STALE_MESSAGE } from "./ConflictPanel.js";
import RequiredMarker from "./RequiredMarker.js";

// ===========================================================================
// Actions Taken - ui-spec.md section 8, FR-01 to FR-09. Staff record, edit,
// complete and cancel; the Requester reads (8.6). Every write returns the full
// IT Staff Ticket DTO, so the Ticket summary refreshes from the response
// (C-136, FR-08). The server decides what a row offers (allowedOperations,
// C-174); the client never re-derives it.
// ===========================================================================

export const ACTION_MESSAGES = {
  actionAtRequired: "Action Date/Time is required.",
  actionAtFuture: "Enter the time the work was done. It cannot be in the future.",
  description: "Description is required and must be 2000 characters or fewer.",
  result: "Result is required and must be 2000 characters or fewer.",
  reason: "Reason is required and must be 2000 characters or fewer.",
  followUpNote: "Follow-up Note is required when follow-up is needed, and must be 1000 characters or fewer.",
  attachmentNotes: "Attachment Notes must be 500 characters or fewer.",
  assigneeId: "Choose an active IT Staff or Administrator user.",
} as const;

const ACTION_NOT_PLANNED_MESSAGE = "This action is already finished and cannot be changed. Record a new action instead.";
const TICKET_RESOLVED_MESSAGE = "This ticket is resolved. Reopen it first to record more work.";

const SUCCESS = {
  added: "Action added.",
  saved: "Action saved.",
  completed: "Action completed.",
  cancelled: "Action cancelled.",
} as const;

// BR-07, AC-14 - a datetime-local value is read as Asia/Bangkok (UTC+07:00,
// no daylight saving) and sent with an explicit offset.
//
// `notBefore` is the Ticket's createdAt. The input has minute precision but
// createdAt has seconds, so the creation minute itself ("now" on a Ticket
// created this minute, the composer's default) would read as before creation
// and be refused. That one minute is sent as createdAt exactly; an earlier
// minute is sent unchanged, for the server to refuse (BR-07).
export function bangkokLocalToIso(local: string, notBefore?: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) return null;
  const iso = `${local}:00+07:00`;
  if (notBefore && isoToBangkokLocal(notBefore) === local && new Date(iso).getTime() < new Date(notBefore).getTime()) {
    return new Date(notBefore).toISOString();
  }
  return iso;
}

export function isoToBangkokLocal(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const shifted = new Date(d.getTime() + 7 * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 16);
}

function len(value: string): number {
  return value.trim().length;
}

const STATUS_TEXT: Record<ActionStatus, string> = { PLANNED: "Planned", COMPLETED: "Completed", CANCELLED: "Cancelled" };

export function ActionStatusBadge({ status }: { status: ActionStatus }) {
  const icon =
    status === "PLANNED" ? (
      <path d="M8 4v4l2.5 1.5M8 14.5A6.5 6.5 0 1 1 8 1.5a6.5 6.5 0 0 1 0 13Z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    ) : status === "COMPLETED" ? (
      <path d="M13 4.5 6.5 11 3 7.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    ) : (
      <path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    );
  return (
    <span className={`tk-badge tk-badge-square tk-action-badge tk-action-${status.toLowerCase()}`}>
      <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" focusable="false">{icon}</svg>
      <span className={status === "CANCELLED" ? "text-decoration-line-through" : undefined}>{STATUS_TEXT[status]}</span>
    </span>
  );
}

function ClipboardIcon() {
  return (
    <svg className="me-2" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
      <rect x="3" y="2.5" width="10" height="12" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.25" />
      <path d="M6 2.5h4v2H6zM5.5 9l2 2 3.5-4" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

type AnyAction = RequesterAction | StaffAction;

function personName(p: { name: string; isActive?: boolean } | null): string {
  if (!p) return "";
  return p.isActive === false ? `${p.name} (inactive)` : p.name;
}

// The shared row body (8.2): every field, as plain text (BR-08).
function ActionFields({ a }: { a: AnyAction }) {
  return (
    <dl className="tk-action-fields mb-0">
      <div><dt>Action Date/Time</dt><dd>{formatDisplayTimestamp(a.actionAt)}</dd></div>
      <div><dt>Description</dt><dd className="tk-prewrap">{a.description}</dd></div>
      <div><dt>Assignee</dt><dd>{personName(a.assignee)}</dd></div>
      {a.status !== "PLANNED" && (
        <div>
          <dt>{a.status === "CANCELLED" ? "Reason" : "Result"}</dt>
          <dd className="tk-prewrap">{a.result}</dd>
        </div>
      )}
      {a.status === "COMPLETED" && (
        <div>
          <dt>Follow-up</dt>
          <dd className="tk-prewrap">{a.followUpRequired ? `Follow-up needed: ${a.followUpNote ?? ""}` : "No follow-up"}</dd>
        </div>
      )}
      {a.attachmentNotes && (
        <div><dt>Attachment Notes</dt><dd className="tk-prewrap">{a.attachmentNotes}</dd></div>
      )}
      {a.status !== "PLANNED" && a.performedBy && a.finishedAt && (
        <div>
          <dt>Finished</dt>
          <dd>{`${a.status === "CANCELLED" ? "Cancelled" : "Completed"} by ${personName(a.performedBy)} on ${formatDisplayTimestamp(a.finishedAt)}`}</dd>
        </div>
      )}
      <div className="tk-muted small">{`Created by ${personName(a.createdBy)} on ${formatDisplayTimestamp(a.createdAt)}`}</div>
    </dl>
  );
}

// ---------------------------------------------------------------------------
// Requester Ticket Detail - read-only (8.6, BR-20).
// ---------------------------------------------------------------------------
export function RequesterActionsCard({ actions }: { actions: RequesterAction[] }) {
  return (
    <section className="card tk-card tk-actions-card mb-3" aria-labelledby="actions-title" role="region">
      <h2 id="actions-title" className="tk-section-title d-flex align-items-center"><ClipboardIcon />Actions Taken</h2>
      <p className="fw-semibold mb-2">Recorded by IT Staff.</p>
      {actions.length === 0 ? (
        <p className="tk-muted mb-0">No actions recorded yet.</p>
      ) : (
        <ol className="list-unstyled tk-action-list mb-0" aria-label="Actions Taken">
          {actions.map((a) => (
            <li key={a.id} className={`tk-action-row tk-action-row-${a.status.toLowerCase()}`}>
              <div className="mb-1"><ActionStatusBadge status={a.status} /></div>
              <ActionFields a={a} />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// IT Staff Ticket Detail (8.1 to 8.5).
// ---------------------------------------------------------------------------
type Conflict = { message: string; stale: boolean } | null;

interface StaffProps {
  ticket: StaffTicket;
  assignableUsers: AssignableUser[];
  currentUserId: number;
  onUpdated: (t: StaffTicket, message: string) => void;
  onRefetch: () => Promise<StaffTicket | null>;
}

function errorText(err: unknown): string {
  return err instanceof ApiError && err.status !== 500 && err.status !== 0 ? err.message : INTERNAL_ERROR_MESSAGE;
}

export function StaffActionsCard({ ticket, assignableUsers, currentUserId, onUpdated, onRefetch }: StaffProps) {
  const writable = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "REOPENED"].includes(ticket.currentStatus);
  return (
    <section id="actions-taken" className="card tk-card tk-actions-card mb-3" aria-labelledby="actions-title" role="region" tabIndex={-1}>
      <h2 id="actions-title" className="tk-section-title d-flex align-items-center"><ClipboardIcon />Actions Taken</h2>
      <p className="fw-semibold mb-2">Shown to the Requester.</p>
      {ticket.actions.length === 0 ? (
        <p className="tk-muted">No actions recorded yet.</p>
      ) : (
        <ol className="list-unstyled tk-action-list" aria-label="Actions Taken">
          {ticket.actions.map((a) => (
            <ActionRow
              key={a.id}
              action={a}
              ticketCreatedAt={ticket.createdAt}
              assignableUsers={assignableUsers}
              onUpdated={onUpdated}
              onRefetch={onRefetch}
            />
          ))}
        </ol>
      )}
      {writable ? (
        <Composer ticket={ticket} assignableUsers={assignableUsers} currentUserId={currentUserId} onUpdated={onUpdated} onRefetch={onRefetch} />
      ) : ticket.currentStatus === "RESOLVED" ? (
        <p className="tk-muted mb-0">This ticket is resolved. Reopen it first to record more work.</p>
      ) : null}
    </section>
  );
}

// 8.3 - the composer.
function Composer({ ticket, assignableUsers, currentUserId, onUpdated, onRefetch }: StaffProps) {
  const [status, setStatus] = useState<"PLANNED" | "COMPLETED">("COMPLETED");
  const [actionAt, setActionAt] = useState(() => isoToBangkokLocal(new Date()));
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState(String(currentUserId));
  const [result, setResult] = useState("");
  const [followUpRequired, setFollowUpRequired] = useState(false);
  const [followUpNote, setFollowUpNote] = useState("");
  const [attachmentNotes, setAttachmentNotes] = useState("");
  const [clientRequestId, setClientRequestId] = useState(() => newClientRequestId());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [conflict, setConflict] = useState<Conflict>(null);

  function validate(): Record<string, string> {
    const e: Record<string, string> = {};
    const iso = bangkokLocalToIso(actionAt);
    if (!iso) e.actionAt = ACTION_MESSAGES.actionAtRequired;
    else if (status === "COMPLETED" && new Date(iso).getTime() > Date.now() + 5 * 60 * 1000) e.actionAt = ACTION_MESSAGES.actionAtFuture;
    if (len(description) < 1 || len(description) > 2000) e.description = ACTION_MESSAGES.description;
    if (status === "COMPLETED") {
      if (len(result) < 1 || len(result) > 2000) e.result = ACTION_MESSAGES.result;
      if (followUpRequired && (len(followUpNote) < 1 || len(followUpNote) > 1000)) e.followUpNote = ACTION_MESSAGES.followUpNote;
    }
    if (attachmentNotes.trim().length > 500) e.attachmentNotes = ACTION_MESSAGES.attachmentNotes;
    return e;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    const e = validate();
    setErrors(e);
    setFailure(null);
    setConflict(null);
    if (Object.keys(e).length > 0) {
      document.getElementById(`action-${Object.keys(e)[0]}`)?.focus();
      return;
    }
    setBusy(true);
    try {
      const next = await createAction(ticket.id, {
        status,
        actionAt: bangkokLocalToIso(actionAt, ticket.createdAt)!,
        description: description.trim(),
        assigneeId: Number(assigneeId),
        ...(attachmentNotes.trim() ? { attachmentNotes: attachmentNotes.trim() } : {}),
        ...(status === "COMPLETED"
          ? { result: result.trim(), followUpRequired, ...(followUpRequired ? { followUpNote: followUpNote.trim() } : {}) }
          : {}),
        clientRequestId,
      });
      onUpdated(next, SUCCESS.added);
      setDescription("");
      setResult("");
      setFollowUpRequired(false);
      setFollowUpNote("");
      setAttachmentNotes("");
      setActionAt(isoToBangkokLocal(new Date()));
      setClientRequestId(newClientRequestId());
    } catch (err) {
      if (err instanceof ApiError && err.code === "VALIDATION_FAILED" && err.fields) setErrors(err.fields);
      else if (err instanceof ApiError && err.code === "ASSIGNEE_NOT_ELIGIBLE") setErrors({ assigneeId: ACTION_MESSAGES.assigneeId });
      else if (err instanceof ApiError && err.status === 409) {
        setConflict({ message: err.message, stale: false });
        await onRefetch();
      } else setFailure(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  const fieldClass = (name: string) => `form-control${errors[name] ? " is-invalid" : ""}`;
  const err = (name: string) =>
    errors[name] ? <div id={`action-${name}-error`} className="invalid-feedback d-block">{errors[name]}</div> : null;

  return (
    <form className="tk-action-composer mt-3" onSubmit={submit} noValidate aria-labelledby="composer-title">
      <h3 id="composer-title" className="tk-label">Record an action</h3>
      {conflict && <ConflictPanel message={conflict.message} />}
      {failure && <div className="tk-panel tk-panel-danger" role="alert">{failure}</div>}

      <fieldset className="mb-2">
        <legend className="form-label tk-label">Status <RequiredMarker /></legend>
        {(["COMPLETED", "PLANNED"] as const).map((s) => (
          <div className="form-check form-check-inline" key={s}>
            <input className="form-check-input" type="radio" name="action-status" id={`action-status-${s}`} checked={status === s} onChange={() => setStatus(s)} />
            <label className="form-check-label" htmlFor={`action-status-${s}`}>{STATUS_TEXT[s]}</label>
          </div>
        ))}
      </fieldset>

      <div className="row g-2">
        <div className="col-12 col-md-6">
          <label htmlFor="action-actionAt" className="form-label tk-label">Action Date/Time <RequiredMarker /></label>
          <input id="action-actionAt" type="datetime-local" className={fieldClass("actionAt")} value={actionAt} onChange={(e) => setActionAt(e.target.value)} aria-describedby={errors.actionAt ? "action-actionAt-error" : undefined} aria-invalid={errors.actionAt ? "true" : undefined} />
          {err("actionAt")}
        </div>
        <div className="col-12 col-md-6">
          <label htmlFor="action-assigneeId" className="form-label tk-label">Assignee</label>
          <select id="action-assigneeId" className={`form-select${errors.assigneeId ? " is-invalid" : ""}`} value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} aria-describedby={errors.assigneeId ? "action-assigneeId-error" : undefined}>
            {!assignableUsers.some((u) => u.id === currentUserId) && <option value={currentUserId}>Me</option>}
            {assignableUsers.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
          {err("assigneeId")}
        </div>
      </div>

      <div className="mt-2">
        <label htmlFor="action-description" className="form-label tk-label">Description <RequiredMarker /></label>
        <textarea id="action-description" className={fieldClass("description")} rows={3} maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} aria-describedby={errors.description ? "action-description-error" : undefined} aria-invalid={errors.description ? "true" : undefined} />
        <div className="tk-counter tk-muted small">{`${description.length} / 2000`}</div>
        {err("description")}
      </div>

      {status === "COMPLETED" && (
        <>
          <div className="mt-2">
            <label htmlFor="action-result" className="form-label tk-label">Result <RequiredMarker /></label>
            <textarea id="action-result" className={fieldClass("result")} rows={2} maxLength={2000} value={result} onChange={(e) => setResult(e.target.value)} aria-describedby={errors.result ? "action-result-error" : undefined} aria-invalid={errors.result ? "true" : undefined} />
            <div className="tk-counter tk-muted small">{`${result.length} / 2000`}</div>
            {err("result")}
          </div>
          <div className="form-check mt-2">
            <input
              id="action-followUpRequired"
              className="form-check-input"
              type="checkbox"
              checked={followUpRequired}
              onChange={(e) => {
                setFollowUpRequired(e.target.checked);
                // BR-05, AC-09: unticking clears the note.
                if (!e.target.checked) setFollowUpNote("");
              }}
            />
            <label className="form-check-label" htmlFor="action-followUpRequired">Follow-Up Required?</label>
          </div>
          {followUpRequired && (
            <div className="mt-2">
              <label htmlFor="action-followUpNote" className="form-label tk-label">Follow-up Note <RequiredMarker /></label>
              <textarea id="action-followUpNote" className={fieldClass("followUpNote")} rows={2} maxLength={1000} value={followUpNote} onChange={(e) => setFollowUpNote(e.target.value)} aria-describedby={errors.followUpNote ? "action-followUpNote-error" : undefined} aria-invalid={errors.followUpNote ? "true" : undefined} />
              <div className="tk-counter tk-muted small">{`${followUpNote.length} / 1000`}</div>
              {err("followUpNote")}
            </div>
          )}
        </>
      )}

      <div className="mt-2">
        <label htmlFor="action-attachmentNotes" className="form-label tk-label">Attachment Notes</label>
        <textarea id="action-attachmentNotes" className={fieldClass("attachmentNotes")} rows={2} maxLength={500} value={attachmentNotes} onChange={(e) => setAttachmentNotes(e.target.value)} aria-describedby="action-attachmentNotes-help" />
        <div id="action-attachmentNotes-help" className="tk-muted small">{'Which file to look at, e.g. "attachment 2, the photo of the label".'}</div>
        <div className="tk-counter tk-muted small">{`${attachmentNotes.length} / 500`}</div>
        {err("attachmentNotes")}
      </div>

      <button type="submit" className="btn btn-primary mt-3" disabled={busy} aria-busy={busy ? "true" : undefined}>
        {busy ? "Adding…" : "Add Action"}
      </button>
    </form>
  );
}

// 8.4 and 8.5 - one row with its in-place panels.
function ActionRow({
  action: a,
  ticketCreatedAt,
  assignableUsers,
  onUpdated,
  onRefetch,
}: {
  action: StaffAction;
  ticketCreatedAt: string;
  assignableUsers: AssignableUser[];
  onUpdated: StaffProps["onUpdated"];
  onRefetch: StaffProps["onRefetch"];
}) {
  const [mode, setMode] = useState<"view" | "edit" | "complete" | "cancel">("view");
  const can = (op: "EDIT" | "COMPLETE" | "CANCEL") => a.allowedOperations.includes(op);
  return (
    <li className={`tk-action-row tk-action-row-${a.status.toLowerCase()}`}>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-1">
        <ActionStatusBadge status={a.status} />
        {mode === "view" && a.allowedOperations.length > 0 && (
          <div className="d-flex flex-wrap gap-1">
            {can("EDIT") && <button type="button" className="btn btn-sm tk-btn-tertiary" onClick={() => setMode("edit")}>Edit</button>}
            {can("COMPLETE") && <button type="button" className="btn btn-sm tk-btn-tertiary" onClick={() => setMode("complete")}>Complete</button>}
            {can("CANCEL") && <button type="button" className="btn btn-sm tk-btn-tertiary" onClick={() => setMode("cancel")}>Cancel action</button>}
          </div>
        )}
      </div>
      {mode === "view" && <ActionFields a={a} />}
      {mode === "edit" && <EditPanel action={a} ticketCreatedAt={ticketCreatedAt} assignableUsers={assignableUsers} onClose={() => setMode("view")} onUpdated={onUpdated} onRefetch={onRefetch} />}
      {mode === "complete" && <CompletePanel action={a} ticketCreatedAt={ticketCreatedAt} onClose={() => setMode("view")} onUpdated={onUpdated} onRefetch={onRefetch} />}
      {mode === "cancel" && <CancelPanel action={a} ticketCreatedAt={ticketCreatedAt} onClose={() => setMode("view")} onUpdated={onUpdated} onRefetch={onRefetch} />}
    </li>
  );
}

interface PanelProps {
  action: StaffAction;
  ticketCreatedAt: string;
  onClose: () => void;
  onUpdated: StaffProps["onUpdated"];
  onRefetch: StaffProps["onRefetch"];
}

// The section 11 handling every row panel shares: STALE_UPDATE re-fetches and
// offers "Apply my changes again" with the fresh version, provided the action
// is still planned; any other 409 re-fetches and shows its message. A success
// closes the panel, so the row returns to view mode with the fresh values.
function useRowWrite({ action, onClose, onUpdated, onRefetch }: Omit<PanelProps, "ticketCreatedAt">) {
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [conflict, setConflict] = useState<Conflict>(null);
  const [version, setVersion] = useState(action.version);
  const [stillPlanned, setStillPlanned] = useState(true);
  const [blockedLine, setBlockedLine] = useState<string | null>(null);

  async function run(send: (version: number) => Promise<StaffTicket>, success: string) {
    setBusy(true);
    setFailure(null);
    setConflict(null);
    try {
      onUpdated(await send(version), success);
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.code === "VALIDATION_FAILED" && err.fields) setErrors(err.fields);
      else if (err instanceof ApiError && err.code === "ASSIGNEE_NOT_ELIGIBLE") setErrors({ assigneeId: ACTION_MESSAGES.assigneeId });
      else if (err instanceof ApiError && err.status === 409) {
        const stale = err.code === "STALE_UPDATE";
        const fresh = await onRefetch();
        const freshAction = fresh?.actions.find((x) => x.id === action.id);
        if (freshAction) setVersion(freshAction.version);
        const planned = !!freshAction && freshAction.allowedOperations.length > 0;
        setStillPlanned(planned);
        // ui-spec 11.4: say why Apply is withheld - the Ticket was resolved,
        // or the action itself was finished.
        setBlockedLine(planned ? null : fresh?.currentStatus === "RESOLVED" ? TICKET_RESOLVED_MESSAGE : ACTION_NOT_PLANNED_MESSAGE);
        setConflict({ message: stale ? STALE_MESSAGE : err.message, stale });
      } else if (err instanceof ApiError && err.code === "ACTION_NOT_FOUND") {
        setFailure(err.message);
        await onRefetch();
      } else setFailure(errorText(err));
    } finally {
      setBusy(false);
    }
  }
  return { busy, errors, setErrors, failure, conflict, setConflict, run, stillPlanned, blockedLine };
}

function PanelFeedback({
  write,
  onApply,
  onDiscard,
}: {
  write: ReturnType<typeof useRowWrite>;
  onApply: () => void;
  onDiscard: () => void;
}) {
  const { conflict, failure, stillPlanned, blockedLine, busy } = write;
  return (
    <>
      {conflict &&
        (conflict.stale ? (
          <ConflictPanel
            stale
            message={conflict.message}
            lines={stillPlanned || !blockedLine ? undefined : [blockedLine]}
            onApply={stillPlanned ? onApply : undefined}
            onDiscard={onDiscard}
            busy={busy}
          />
        ) : (
          <ConflictPanel message={conflict.message} />
        ))}
      {failure && <div className="tk-panel tk-panel-danger" role="alert">{failure}</div>}
    </>
  );
}

function EditPanel({ action: a, ticketCreatedAt, assignableUsers, onClose, onUpdated, onRefetch }: PanelProps & { assignableUsers: AssignableUser[] }) {
  const initial = {
    description: a.description,
    actionAt: isoToBangkokLocal(a.actionAt),
    assigneeId: String(a.assignee.id),
    attachmentNotes: a.attachmentNotes ?? "",
  };
  const [draft, setDraft] = useState(initial);
  // The values this user started from. Compared against these, not the
  // re-fetched action, so after a STALE_UPDATE "Apply my changes again" sends
  // only what this user changed and never writes another user's field back
  // with its old value (C-138). Discard re-bases on the fresh values.
  const [base, setBase] = useState(initial);
  const write = useRowWrite({ action: a, onClose, onUpdated, onRefetch });

  // Only changed fields are sent (8.4); Save stays disabled until one differs.
  const changed: Record<string, string | number> = {};
  if (draft.description.trim() !== base.description) changed.description = draft.description.trim();
  if (draft.actionAt !== base.actionAt) changed.actionAt = bangkokLocalToIso(draft.actionAt, ticketCreatedAt) ?? "";
  if (draft.assigneeId !== base.assigneeId) changed.assigneeId = Number(draft.assigneeId);
  if (draft.attachmentNotes.trim() !== base.attachmentNotes) changed.attachmentNotes = draft.attachmentNotes.trim();
  const dirty = Object.keys(changed).length > 0;

  function save() {
    const e: Record<string, string> = {};
    if (len(draft.description) < 1 || len(draft.description) > 2000) e.description = ACTION_MESSAGES.description;
    if (!bangkokLocalToIso(draft.actionAt)) e.actionAt = ACTION_MESSAGES.actionAtRequired;
    if (draft.attachmentNotes.trim().length > 500) e.attachmentNotes = ACTION_MESSAGES.attachmentNotes;
    write.setErrors(e);
    if (Object.keys(e).length > 0) return;
    write.run((version) => editAction(a.id, { version, ...changed }), SUCCESS.saved);
  }

  const id = (n: string) => `edit-${a.id}-${n}`;
  const inactiveAssignee = !assignableUsers.some((u) => u.id === a.assignee.id);
  return (
    <div className="card tk-card tk-action-panel mt-2" role="group" aria-label="Edit action">
      <PanelFeedback write={write} onApply={save} onDiscard={() => { setDraft(initial); setBase(initial); write.setConflict(null); }} />
      <label htmlFor={id("description")} className="form-label tk-label">Description <RequiredMarker /></label>
      <textarea id={id("description")} className={`form-control${write.errors.description ? " is-invalid" : ""}`} rows={3} maxLength={2000} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
      {write.errors.description && <div className="invalid-feedback d-block">{write.errors.description}</div>}
      <label htmlFor={id("actionAt")} className="form-label tk-label mt-2">Action Date/Time <RequiredMarker /></label>
      <input id={id("actionAt")} type="datetime-local" className={`form-control${write.errors.actionAt ? " is-invalid" : ""}`} value={draft.actionAt} onChange={(e) => setDraft({ ...draft, actionAt: e.target.value })} />
      {write.errors.actionAt && <div className="invalid-feedback d-block">{write.errors.actionAt}</div>}
      <label htmlFor={id("assigneeId")} className="form-label tk-label mt-2">Assignee</label>
      <select id={id("assigneeId")} className={`form-select${write.errors.assigneeId ? " is-invalid" : ""}`} value={draft.assigneeId} onChange={(e) => setDraft({ ...draft, assigneeId: e.target.value })}>
        {inactiveAssignee && <option value={a.assignee.id}>{personName(a.assignee)}</option>}
        {assignableUsers.map((u) => (
          <option key={u.id} value={u.id}>{u.name}</option>
        ))}
      </select>
      {write.errors.assigneeId && <div className="invalid-feedback d-block">{write.errors.assigneeId}</div>}
      <label htmlFor={id("attachmentNotes")} className="form-label tk-label mt-2">Attachment Notes</label>
      <textarea id={id("attachmentNotes")} className={`form-control${write.errors.attachmentNotes ? " is-invalid" : ""}`} rows={2} maxLength={500} value={draft.attachmentNotes} onChange={(e) => setDraft({ ...draft, attachmentNotes: e.target.value })} />
      {write.errors.attachmentNotes && <div className="invalid-feedback d-block">{write.errors.attachmentNotes}</div>}
      <div className="d-flex gap-2 mt-3">
        <button type="button" className="btn btn-primary" onClick={save} disabled={!dirty || write.busy} aria-busy={write.busy ? "true" : undefined}>
          {write.busy ? "Saving…" : "Save Action"}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onClose} disabled={write.busy}>Close</button>
      </div>
    </div>
  );
}

function CompletePanel({ action: a, ticketCreatedAt, onClose, onUpdated, onRefetch }: PanelProps) {
  const [actionAt, setActionAt] = useState(isoToBangkokLocal(a.actionAt));
  // The stored time when the panel opened: actionAt is sent only if this user
  // changed it, never because another user moved it meanwhile (C-138, C-168).
  const [openedAt] = useState(() => isoToBangkokLocal(a.actionAt));
  const [result, setResult] = useState("");
  const [followUpRequired, setFollowUpRequired] = useState(false);
  const [followUpNote, setFollowUpNote] = useState("");
  const write = useRowWrite({ action: a, onClose, onUpdated, onRefetch });

  function submit() {
    const e: Record<string, string> = {};
    const iso = bangkokLocalToIso(actionAt, ticketCreatedAt);
    if (!iso) e.actionAt = ACTION_MESSAGES.actionAtRequired;
    else if (new Date(iso).getTime() > Date.now() + 5 * 60 * 1000) e.actionAt = ACTION_MESSAGES.actionAtFuture;
    if (len(result) < 1 || len(result) > 2000) e.result = ACTION_MESSAGES.result;
    if (followUpRequired && (len(followUpNote) < 1 || len(followUpNote) > 1000)) e.followUpNote = ACTION_MESSAGES.followUpNote;
    write.setErrors(e);
    if (Object.keys(e).length > 0) return;
    const sentAt = actionAt !== openedAt ? { actionAt: iso! } : {};
    write.run(
      (version) =>
        completeAction(a.id, {
          version,
          result: result.trim(),
          followUpRequired,
          ...(followUpRequired ? { followUpNote: followUpNote.trim() } : {}),
          ...sentAt,
        }),
      SUCCESS.completed,
    );
  }

  const id = (n: string) => `complete-${a.id}-${n}`;
  return (
    <div className="card tk-card tk-action-panel mt-2" role="group" aria-label="Complete action">
      <PanelFeedback write={write} onApply={submit} onDiscard={onClose} />
      <label htmlFor={id("actionAt")} className="form-label tk-label">Action Date/Time <RequiredMarker /></label>
      <input id={id("actionAt")} type="datetime-local" className={`form-control${write.errors.actionAt ? " is-invalid" : ""}`} value={actionAt} onChange={(e) => setActionAt(e.target.value)} />
      {write.errors.actionAt && <div className="invalid-feedback d-block">{write.errors.actionAt}</div>}
      <label htmlFor={id("result")} className="form-label tk-label mt-2">Result <RequiredMarker /></label>
      <textarea id={id("result")} className={`form-control${write.errors.result ? " is-invalid" : ""}`} rows={2} maxLength={2000} value={result} onChange={(e) => setResult(e.target.value)} />
      {write.errors.result && <div className="invalid-feedback d-block">{write.errors.result}</div>}
      <div className="form-check mt-2">
        <input id={id("followUp")} className="form-check-input" type="checkbox" checked={followUpRequired} onChange={(e) => { setFollowUpRequired(e.target.checked); if (!e.target.checked) setFollowUpNote(""); }} />
        <label className="form-check-label" htmlFor={id("followUp")}>Follow-Up Required?</label>
      </div>
      {followUpRequired && (
        <>
          <label htmlFor={id("followUpNote")} className="form-label tk-label mt-2">Follow-up Note <RequiredMarker /></label>
          <textarea id={id("followUpNote")} className={`form-control${write.errors.followUpNote ? " is-invalid" : ""}`} rows={2} maxLength={1000} value={followUpNote} onChange={(e) => setFollowUpNote(e.target.value)} />
          {write.errors.followUpNote && <div className="invalid-feedback d-block">{write.errors.followUpNote}</div>}
        </>
      )}
      <div className="d-flex gap-2 mt-3">
        <button type="button" className="btn btn-primary" onClick={submit} disabled={write.busy} aria-busy={write.busy ? "true" : undefined}>
          {write.busy ? "Completing…" : "Complete Action"}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onClose} disabled={write.busy}>Close</button>
      </div>
    </div>
  );
}

function CancelPanel({ action: a, onClose, onUpdated, onRefetch }: PanelProps) {
  const [reason, setReason] = useState("");
  const write = useRowWrite({ action: a, onClose, onUpdated, onRefetch });

  function submit() {
    if (len(reason) < 1 || len(reason) > 2000) {
      write.setErrors({ result: ACTION_MESSAGES.reason });
      return;
    }
    write.setErrors({});
    write.run((version) => cancelAction(a.id, { version, result: reason.trim() }), SUCCESS.cancelled);
  }

  const id = `cancel-${a.id}-reason`;
  return (
    <div className="card tk-card tk-action-panel mt-2" role="group" aria-label="Cancel action">
      <PanelFeedback write={write} onApply={submit} onDiscard={onClose} />
      <label htmlFor={id} className="form-label tk-label">Reason <RequiredMarker /></label>
      <textarea id={id} className={`form-control${write.errors.result ? " is-invalid" : ""}`} rows={2} maxLength={2000} value={reason} onChange={(e) => setReason(e.target.value)} aria-describedby={`${id}-help`} />
      <div id={`${id}-help`} className="tk-muted small">Cancelling is final. The action stays on the record with your reason.</div>
      {write.errors.result && <div className="invalid-feedback d-block">{write.errors.result}</div>}
      <div className="d-flex gap-2 mt-3">
        <button type="button" className="btn btn-danger" onClick={submit} disabled={write.busy} aria-busy={write.busy ? "true" : undefined}>
          {write.busy ? "Cancelling…" : "Cancel Action"}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onClose} disabled={write.busy}>Close</button>
      </div>
    </div>
  );
}
