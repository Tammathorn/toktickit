import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import {
  ApiError,
  downloadAttachment,
  fetchAttachments,
  removeAttachment,
  uploadAttachment,
  type AttachmentMeta,
} from "../api.js";
import { formatBytes, formatDisplayTimestamp } from "../format.js";
import { MESSAGES, checkFile, messageForCode } from "../validation.js";

// Ticket Detail, Card 2 - the attachment lifecycle (ui-spec.md 13, 14.2, 14.3).
//
// Rows are one of five states: active, uploading, invalid, removed and
// unavailable (C-46). Active and removed are two labelled groups, so the
// distinction is structural (FR-42). Adding uploads one request per file to
// the same route Create Ticket uses (C-15); removal is soft and needs a
// reason confirmed in a dialog (BR-46..BR-48). Bytes only ever come through
// the ownership-checked download route (BR-54).

const MAX_ACTIVE = 5;

type Row =
  | { kind: "active"; key: string; meta: AttachmentMeta; note?: string }
  | { kind: "uploading"; key: string; file: File; progress: number }
  | { kind: "invalid"; key: string; file: File; message: string }
  | { kind: "removed"; key: string; meta: AttachmentMeta }
  | { kind: "unavailable"; key: string; meta: AttachmentMeta };

function fromMeta(meta: AttachmentMeta): Row {
  return meta.isRemoved
    ? { kind: "removed", key: `a${meta.id}`, meta }
    : { kind: "active", key: `a${meta.id}`, meta };
}

let pendingKey = 0;

export default function AttachmentSection({
  ticketId,
  requesterId,
  initial,
}: {
  ticketId: number;
  requesterId: number;
  initial: AttachmentMeta[];
}) {
  const [rows, setRows] = useState<Row[]>(() => initial.map(fromMeta));
  const [refreshing, setRefreshing] = useState(false);
  const [dialogFor, setDialogFor] = useState<Row | null>(null);

  const activeCount = rows.filter((r) => r.kind === "active" || r.kind === "unavailable").length;
  const slotsFull = activeCount >= MAX_ACTIVE;

  function patch(key: string, next: Row | null) {
    setRows((current) => (next ? current.map((r) => (r.key === key ? next : r)) : current.filter((r) => r.key !== key)));
  }

  async function refresh() {
    setRefreshing(true);
    try {
      const list = await fetchAttachments(ticketId, requesterId);
      setRows((current) => [...list.map(fromMeta), ...current.filter((r) => r.kind === "uploading" || r.kind === "invalid")]);
    } catch {
      // keep what is on screen; the user can try again
    } finally {
      setRefreshing(false);
    }
  }

  async function send(key: string, file: File) {
    patch(key, { kind: "uploading", key, file, progress: 0 });
    try {
      const meta = await uploadAttachment(ticketId, requesterId, file, (p) => {
        setRows((current) => current.map((r) => (r.key === key && r.kind === "uploading" ? { ...r, progress: p } : r)));
      });
      patch(key, { kind: "active", key, meta });
    } catch (err) {
      const message = err instanceof ApiError ? messageForCode(err.code, file.name) : messageForCode("INTERNAL_ERROR");
      patch(key, { kind: "invalid", key, file, message });
    }
  }

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const chosen = Array.from(event.target.files ?? []);
    event.target.value = "";
    for (const file of chosen) {
      const key = `p${++pendingKey}`;
      const clientError = checkFile(file);
      if (clientError) {
        setRows((current) => [...current, { kind: "invalid", key, file, message: clientError }]);
        continue;
      }
      setRows((current) => [...current, { kind: "uploading", key, file, progress: 0 }]);
      await send(key, file);
    }
  }

  async function open(row: Extract<Row, { kind: "active" }>, disposition: "attachment" | "inline") {
    try {
      const blob = await downloadAttachment(row.meta.id, requesterId, disposition);
      const url = URL.createObjectURL(blob);
      if (disposition === "attachment") {
        const a = document.createElement("a");
        a.href = url;
        a.download = row.meta.originalFilename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        patch(row.key, { ...row, note: `Downloaded ${row.meta.originalFilename}` });
      } else if (row.meta.mimeType.startsWith("image/")) {
        patch(row.key, { ...row, note: undefined });
        setPreview({ key: row.key, url, name: row.meta.originalFilename });
        return; // the preview owns the object URL until it is closed
      } else {
        window.open(url, "_blank", "noopener");
      }
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      // 410 (removed since the view loaded) or 500: the row exists, its bytes do not (C-46)
      if (err instanceof ApiError && (err.status === 410 || err.status === 500)) {
        patch(row.key, { kind: "unavailable", key: row.key, meta: row.meta });
      } else if (err instanceof ApiError && err.status === 404) {
        patch(row.key, null);
      } else {
        patch(row.key, { kind: "unavailable", key: row.key, meta: row.meta });
      }
    }
  }

  const [preview, setPreview] = useState<{ key: string; url: string; name: string } | null>(null);
  function closePreview() {
    if (preview) URL.revokeObjectURL(preview.url);
    setPreview(null);
  }

  async function confirmRemoval(row: Row, reason: string): Promise<string | null> {
    if (row.kind !== "active") return null;
    try {
      const meta = await removeAttachment(row.meta.id, requesterId, reason);
      patch(row.key, { kind: "removed", key: row.key, meta });
      if (preview?.key === row.key) closePreview();
      return null;
    } catch (err) {
      if (err instanceof ApiError && err.code === "REMOVAL_REASON_REQUIRED") return MESSAGES.removalReason;
      if (err instanceof ApiError && err.status === 410) {
        patch(row.key, { kind: "unavailable", key: row.key, meta: row.meta });
        return null;
      }
      return messageForCode(err instanceof ApiError ? err.code : "INTERNAL_ERROR");
    }
  }

  const active = rows.filter((r) => r.kind === "active" || r.kind === "uploading" || r.kind === "invalid" || r.kind === "unavailable");
  const removed = rows.filter((r) => r.kind === "removed");

  return (
    <section className="card tk-card mb-3" aria-labelledby="attachments-title" role="region">
      <div className="d-flex flex-wrap align-items-baseline justify-content-between gap-2 mb-3">
        <h2 id="attachments-title" className="tk-section-title mb-0">Attachments</h2>
        <span className="tk-muted" aria-live="polite">{`${activeCount} of ${MAX_ACTIVE} active`}</span>
      </div>

      <div className="mb-3">
        <label htmlFor="add-attachment" className="form-label tk-label">Add attachment</label>
        <input
          id="add-attachment"
          type="file"
          className="form-control"
          multiple
          accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
          disabled={slotsFull}
          aria-describedby="add-attachment-help"
          onChange={handleFiles}
        />
        <div id="add-attachment-help" className="tk-muted">
          {slotsFull
            ? "This ticket already has five active attachments. Remove one before adding another."
            : "JPG, PNG, WEBP or PDF, up to 5 MB each, at most five per ticket."}
        </div>
      </div>

      <h3 className="tk-label" id="active-attachments-title">Active</h3>
      {active.length === 0 ? (
        <p className="tk-muted mb-3">No active attachments.</p>
      ) : (
        <ul className="list-unstyled tk-attachment-list mb-3" aria-label="Active attachments">
          {active.map((row) => (
            <li
              key={row.key}
              className={`tk-attachment tk-attachment-${row.kind}${row.kind === "invalid" ? " tk-attachment-invalid" : ""}`}
              aria-busy={row.kind === "uploading" ? "true" : undefined}
            >
              {row.kind === "active" && (
                <>
                  <div className="tk-attachment-body">
                    <span className="tk-attachment-name">{row.meta.originalFilename}</span>
                    <span className="tk-muted">
                      {typeLabel(row.meta.mimeType)} · {formatBytes(row.meta.sizeBytes)} · Uploaded {formatDisplayTimestamp(row.meta.uploadedAt)}
                    </span>
                    {row.note && <span className="tk-attachment-note" role="status">{row.note}</span>}
                  </div>
                  <div className="tk-attachment-actions">
                    <button type="button" className="btn btn-sm tk-btn-tertiary" aria-label={`Preview ${row.meta.originalFilename}`} onClick={() => open(row, "inline")}>
                      Preview
                    </button>
                    <button type="button" className="btn btn-sm tk-btn-tertiary" aria-label={`Download ${row.meta.originalFilename}`} onClick={() => open(row, "attachment")}>
                      Download
                    </button>
                    <button type="button" className="btn btn-sm btn-danger" aria-label={`Remove ${row.meta.originalFilename}`} onClick={() => setDialogFor(row)}>
                      Remove
                    </button>
                  </div>
                  {preview?.key === row.key && (
                    <figure className="tk-attachment-preview">
                      <img src={preview.url} alt={`Preview of ${preview.name}`} />
                      <figcaption>
                        <button type="button" className="btn btn-sm tk-btn-tertiary" onClick={closePreview}>Hide preview</button>
                      </figcaption>
                    </figure>
                  )}
                </>
              )}

              {row.kind === "uploading" && (
                <div className="tk-attachment-body">
                  <span className="tk-attachment-name">{row.file.name}</span>
                  <div className="progress tk-progress" role="progressbar" aria-label={`Uploading ${row.file.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={row.progress}>
                    <div className="progress-bar" style={{ width: `${row.progress}%` }} />
                  </div>
                  <span className="tk-muted">Uploading…</span>
                </div>
              )}

              {row.kind === "invalid" && (
                <>
                  <div className="tk-attachment-body">
                    <span className="tk-attachment-name">{row.file.name}</span>
                    <span className="tk-invalid-feedback">{row.message}</span>
                  </div>
                  <div className="tk-attachment-actions">
                    <button type="button" className="btn btn-sm btn-secondary" aria-label={`Retry ${row.file.name}`} onClick={() => send(row.key, row.file)}>
                      Retry
                    </button>
                    <button type="button" className="btn btn-sm tk-btn-tertiary" aria-label={`Discard ${row.file.name}`} onClick={() => patch(row.key, null)}>
                      Discard
                    </button>
                  </div>
                </>
              )}

              {row.kind === "unavailable" && (
                <>
                  <div className="tk-attachment-body">
                    <span className="tk-attachment-name">{row.meta.originalFilename}</span>
                    <span className="tk-muted">{typeLabel(row.meta.mimeType)} · {formatBytes(row.meta.sizeBytes)}</span>
                    <span className="tk-attachment-note" role="status">This attachment cannot be opened right now.</span>
                  </div>
                  <div className="tk-attachment-actions">
                    <button type="button" className="btn btn-sm tk-btn-tertiary" aria-label={`Preview ${row.meta.originalFilename}`} disabled>Preview</button>
                    <button type="button" className="btn btn-sm tk-btn-tertiary" aria-label={`Download ${row.meta.originalFilename}`} disabled>Download</button>
                    <button type="button" className="btn btn-sm btn-danger" aria-label={`Remove ${row.meta.originalFilename}`} disabled>Remove</button>
                    <button type="button" className="btn btn-sm btn-secondary" onClick={refresh} disabled={refreshing}>Refresh</button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <h3 className="tk-label" id="removed-attachments-title">Removed</h3>
      {removed.length === 0 ? (
        <p className="tk-muted mb-0">No removed attachments.</p>
      ) : (
        <ul className="list-unstyled tk-attachment-list mb-0" aria-label="Removed attachments">
          {removed.map((row) =>
            row.kind === "removed" ? (
              <li key={row.key} className="tk-attachment tk-attachment-removed">
                <div className="tk-attachment-body">
                  <span>
                    <s className="tk-attachment-name">{row.meta.originalFilename}</s>{" "}
                    <span className="tk-badge tk-badge-square tk-badge-removed">Removed</span>
                  </span>
                  <span className="tk-muted">{typeLabel(row.meta.mimeType)} · {formatBytes(row.meta.sizeBytes)} · Uploaded {formatDisplayTimestamp(row.meta.uploadedAt)}</span>
                  <span className="tk-muted">Removed {row.meta.removedAt ? formatDisplayTimestamp(row.meta.removedAt) : ""}</span>
                  <span>Reason: {row.meta.removalReason}</span>
                </div>
              </li>
            ) : null,
          )}
        </ul>
      )}

      {dialogFor && dialogFor.kind === "active" && (
        <RemovalDialog
          filename={dialogFor.meta.originalFilename}
          onCancel={() => setDialogFor(null)}
          onConfirm={async (reason) => {
            const error = await confirmRemoval(dialogFor, reason);
            if (!error) setDialogFor(null);
            return error;
          }}
        />
      )}
    </section>
  );
}

function typeLabel(mimeType: string): string {
  switch (mimeType) {
    case "image/jpeg": return "JPG";
    case "image/png": return "PNG";
    case "image/webp": return "WEBP";
    case "application/pdf": return "PDF";
    default: return mimeType;
  }
}

// ui-spec 14.3 / BR-48: names the file, requires a reason, Remove disabled until
// the reason is non-empty after trimming, Cancel changes nothing. Focus is
// trapped inside and returned to the triggering control on close.
function RemovalDialog({
  filename,
  onCancel,
  onConfirm,
}: {
  filename: string;
  onCancel: () => void;
  onConfirm: (reason: string) => Promise<string | null>;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    openerRef.current = document.activeElement as HTMLElement | null;
    reasonRef.current?.focus();
    return () => openerRef.current?.focus();
  }, []);

  function trapFocus(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onCancel();
      return;
    }
    if (event.key !== "Tab") return;
    const items = Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>("button:not([disabled]), textarea, [href]") ?? [],
    );
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

  const canConfirm = reason.trim() !== "" && !busy;

  async function confirm() {
    if (!canConfirm) return;
    setBusy(true);
    const result = await onConfirm(reason.trim());
    setBusy(false);
    if (result) setError(result);
  }

  return (
    <>
      <div className="modal-backdrop show" />
      <div
        className="modal d-block"
        role="dialog"
        aria-modal="true"
        aria-labelledby="removal-title"
        ref={dialogRef}
        onKeyDown={trapFocus}
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content tk-dialog">
            <div className="modal-header">
              <h2 id="removal-title" className="tk-section-title mb-0">Remove attachment</h2>
            </div>
            <div className="modal-body">
              <p>
                Remove {filename}? The file will stay listed with its details, but it can no longer be downloaded.
              </p>
              <label htmlFor="removal-reason" className="form-label tk-label">
                Removal reason{" "}
                <span className="tk-required" aria-hidden="true">*</span>
                <span className="visually-hidden"> (required)</span>
              </label>
              <textarea
                id="removal-reason"
                ref={reasonRef}
                className="form-control"
                rows={3}
                value={reason}
                aria-invalid={error ? "true" : undefined}
                aria-describedby={error ? "removal-reason-error" : undefined}
                onChange={(e) => {
                  setReason(e.target.value);
                  setError(null);
                }}
              />
              {error && <div id="removal-reason-error" className="tk-invalid-feedback">{error}</div>}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={busy}>Cancel</button>
              <button type="button" className="btn btn-danger" onClick={confirm} disabled={!canConfirm} aria-busy={busy ? "true" : undefined}>
                {busy ? "Removing…" : "Remove"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
