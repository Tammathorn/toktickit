import { useState } from "react";
import { ApiError, postPublicComment, postInternalNote, type Entry } from "../api.js";
import { formatDisplayTimestamp } from "../format.js";
import { ENTRY_BODY_MAX, MESSAGES, messageForCode } from "../validation.js";
import { RoleBadge } from "./Badge.js";

// ui-spec.md section 19 - Public Comments and Internal Notes, the most
// safety-critical layout rule in the document: the two must never be
// mistaken for one another. Seven differences carry the distinction so no
// single one lost to a theme change, a greyscale screenshot or colour
// blindness loses it (AC-107). Used by both the Requester screen (Public
// Comments only) and IT Staff Ticket Detail (both), so the two screens
// render the same component rather than two visual languages.

function EntryList({ entries, variant }: { entries: Entry[]; variant: "comment" | "note" }) {
  return (
    <ul className="list-unstyled tk-entry-list" aria-label={variant === "comment" ? "Public comments" : "Internal notes"}>
      {entries.map((e) => (
        <li key={e.id} className={`tk-entry tk-entry-${variant}${e.author.role === "REQUESTER" ? " tk-entry-own" : ""}`}>
          <div className="tk-entry-meta">
            <span className="fw-semibold">{e.author.name}</span>{" "}
            <RoleBadge value={e.author.role} />{" "}
            <span className="tk-muted">{formatDisplayTimestamp(e.createdAt)}</span>
          </div>
          <p className="tk-prewrap mb-0">{e.body}</p>
        </li>
      ))}
    </ul>
  );
}

function Counter({ length, inputId }: { length: number; inputId: string }) {
  return (
    <div className={`tk-char-counter${length > ENTRY_BODY_MAX ? " tk-char-counter-danger" : ""}`} id={`${inputId}-counter`} aria-live="polite">
      {length} / {ENTRY_BODY_MAX}
    </div>
  );
}

function SpeechBubbleIcon() {
  return (
    <svg className="tk-comment-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 5h16v11H9l-4 4V5Z" />
    </svg>
  );
}

function PadlockIcon() {
  return (
    <svg className="tk-internal-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="5" y="11" width="14" height="9" rx="1.5" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

// ui-spec.md 14.2, 16.4 - "Public Comments". White surface, standing label
// "Visible to the Requester.", primary "Post Comment".
export function PublicCommentsCard({
  ticketId,
  entries,
  onPosted,
  locked,
}: {
  ticketId: number;
  entries: Entry[];
  onPosted: (entry: Entry) => void;
  locked: boolean;
}) {
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trimmed = draft.trim();

  async function submit() {
    if (trimmed === "" || trimmed.length > ENTRY_BODY_MAX || busy) return;
    setBusy(true);
    setError(null);
    try {
      const entry = await postPublicComment(ticketId, trimmed);
      onPosted(entry);
      setDraft("");
    } catch (err) {
      setError(err instanceof ApiError && err.code === "VALIDATION_FAILED" ? MESSAGES.commentBody : messageForCode(err instanceof ApiError ? err.code : "INTERNAL_ERROR"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card tk-card mb-3" aria-labelledby="public-comments-title" role="region">
      <div className="d-flex align-items-center gap-2 mb-1">
        <SpeechBubbleIcon />
        <h2 id="public-comments-title" className="tk-section-title mb-0">Public Comments</h2>
      </div>
      <p className="tk-muted mb-3">Visible to the Requester.</p>

      {entries.length === 0 ? <p className="tk-muted">No comments yet.</p> : <EntryList entries={entries} variant="comment" />}

      {/* ui-spec 14.2/14.4, 16.4 - the terminal line itself is rendered once
          by the caller, below every section on the card (not duplicated per
          section) when the Ticket is Closed or Cancelled. */}
      {!locked && (
        <div className="mt-3">
          <label htmlFor="comment-body" className="form-label tk-label">Add a comment</label>
          <textarea
            id="comment-body"
            className="form-control"
            rows={3}
            value={draft}
            aria-describedby="comment-body-counter"
            aria-invalid={error ? "true" : undefined}
            onChange={(e) => {
              setDraft(e.target.value);
              setError(null);
            }}
          />
          <Counter length={draft.length} inputId="comment-body" />
          {error && <p className="tk-invalid-feedback">{error}</p>}
          <button type="button" className="btn btn-primary mt-2" disabled={trimmed === "" || trimmed.length > ENTRY_BODY_MAX || busy} aria-busy={busy ? "true" : undefined} onClick={submit}>
            {busy ? "Posting…" : "Post Comment"}
          </button>
        </div>
      )}
    </section>
  );
}

// ui-spec.md 16.4, section 19 - "Internal Notes". Warm-ivory bordered panel,
// standing label "Not visible to the Requester." always present, secondary
// "Add Note". Never rendered on a Requester-facing screen (FR-29).
export function InternalNotesCard({
  ticketId,
  entries,
  onPosted,
  locked,
}: {
  ticketId: number;
  entries: Entry[];
  onPosted: (entry: Entry) => void;
  locked: boolean;
}) {
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trimmed = draft.trim();

  async function submit() {
    if (trimmed === "" || trimmed.length > ENTRY_BODY_MAX || busy) return;
    setBusy(true);
    setError(null);
    try {
      const entry = await postInternalNote(ticketId, trimmed);
      onPosted(entry);
      setDraft("");
    } catch (err) {
      setError(err instanceof ApiError && err.code === "VALIDATION_FAILED" ? MESSAGES.noteBody : messageForCode(err instanceof ApiError ? err.code : "INTERNAL_ERROR"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="tk-internal-panel mt-3" aria-labelledby="internal-notes-title" role="region">
      <div className="d-flex align-items-center gap-2 mb-1">
        <PadlockIcon />
        <h2 id="internal-notes-title" className="tk-section-title mb-0">Internal Notes</h2>
      </div>
      <p className="tk-internal-standing-label mb-3">Not visible to the Requester.</p>

      {entries.length === 0 ? <p className="tk-muted">No internal notes yet.</p> : <EntryList entries={entries} variant="note" />}

      {!locked && (
        <div className="mt-3">
          <label htmlFor="note-body" className="form-label tk-label">Add an internal note</label>
          <textarea
            id="note-body"
            className="form-control"
            rows={3}
            placeholder="Not visible to the Requester…"
            value={draft}
            aria-describedby="note-body-counter"
            aria-invalid={error ? "true" : undefined}
            onChange={(e) => {
              setDraft(e.target.value);
              setError(null);
            }}
          />
          <Counter length={draft.length} inputId="note-body" />
          {error && <p className="tk-invalid-feedback">{error}</p>}
          <button type="button" className="btn btn-secondary mt-2" disabled={trimmed === "" || trimmed.length > ENTRY_BODY_MAX || busy} aria-busy={busy ? "true" : undefined} onClick={submit}>
            {busy ? "Adding…" : "Add Note"}
          </button>
        </div>
      )}
    </section>
  );
}
