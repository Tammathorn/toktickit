import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import {
  ApiError,
  createTicket,
  fetchCategories,
  fetchRelatedSystems,
  uploadAttachment,
  type AttachmentMeta,
  type Category,
  type RelatedSystem,
  type RequestedPriority,
  type Ticket,
} from "../api.js";
import { Link } from "../router.js";
import { useRequester } from "../requester/RequesterContext.js";
import { formatBytes, formatDisplayTimestamp } from "../format.js";
import {
  DESCRIPTION_MAX,
  SUMMARY_MAX,
  checkFile,
  messageForCode,
  validateTicketForm,
  type TicketFieldErrors,
  type TicketFormValues,
} from "../validation.js";

// Create Ticket - ui-spec.md section 11, LS 8.2. One card: system-generated
// values first, then classification, then the long text, then attachments,
// then actions. Six states: initial, loading, validation failure, submitting,
// success, API failure. Attachments upload after the Ticket exists (C-15), one
// request per file, so the Ticket survives any upload failure (BR-40).

type FieldName = keyof TicketFormValues;
const FIELD_ORDER: FieldName[] = ["categoryId", "relatedSystemId", "summary", "requestedPriority", "description"];

interface PendingFile {
  key: number;
  file: File;
  /** ui-spec 6.1 message when the client can already tell the file is invalid. */
  clientError: string | null;
}

type UploadOutcome =
  | { key: number; file: File; status: "pending" }
  | { key: number; file: File; status: "uploaded"; meta: AttachmentMeta }
  | { key: number; file: File; status: "failed"; message: string }
  | { key: number; file: File; status: "skipped"; message: string };

const EMPTY_VALUES: TicketFormValues = {
  categoryId: "",
  relatedSystemId: "",
  summary: "",
  description: "",
  requestedPriority: "MEDIUM", // BR-08
};

let fileKey = 0;

function RequiredMark() {
  return (
    <>
      {" "}
      <span className="tk-required" aria-hidden="true">*</span>
      <span className="visually-hidden"> (required)</span>
    </>
  );
}

export default function CreateTicket() {
  const { selected } = useRequester();
  const requesterId = selected!.id;

  const [categories, setCategories] = useState<Category[]>([]);
  const [systems, setSystems] = useState<RelatedSystem[]>([]);
  const [refsState, setRefsState] = useState<"loading" | "ready" | "error">("loading");
  const [refsToken, setRefsToken] = useState(0);

  const [values, setValues] = useState<TicketFormValues>(EMPTY_VALUES);
  const [errors, setErrors] = useState<TicketFieldErrors>({});
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [created, setCreated] = useState<Ticket | null>(null);
  const [uploads, setUploads] = useState<UploadOutcome[]>([]);
  const [openedAt] = useState(() => new Date());

  const fieldRefs = useRef<Partial<Record<FieldName, HTMLElement | null>>>({});
  const submittingRef = useRef(false);

  // FR-11: Category and Related System come from the API, never hard-coded.
  useEffect(() => {
    let cancelled = false;
    setRefsState("loading");
    Promise.all([fetchCategories(), fetchRelatedSystems()]).then(
      ([cats, syss]) => {
        if (cancelled) return;
        setCategories(cats);
        setSystems(syss);
        setRefsState("ready");
      },
      () => {
        if (!cancelled) setRefsState("error");
      },
    );
    return () => {
      cancelled = true;
    };
  }, [refsToken]);

  function setField(name: FieldName, value: string) {
    setValues((v) => ({ ...v, [name]: value }));
    if (errors[name]) setErrors((e) => ({ ...e, [name]: undefined }));
  }

  function focusFirstInvalid(fieldErrors: TicketFieldErrors) {
    const first = FIELD_ORDER.find((name) => fieldErrors[name]);
    if (first) fieldRefs.current[first]?.focus();
  }

  function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const chosen = Array.from(event.target.files ?? []);
    // BR-37: the selection lives in component state, never re-read from the input.
    setFiles((current) => [
      ...current,
      ...chosen.map((file) => ({ key: ++fileKey, file, clientError: checkFile(file) })),
    ]);
    event.target.value = "";
  }

  function removeFile(key: number) {
    setFiles((current) => current.filter((f) => f.key !== key));
  }

  async function runUpload(ticket: Ticket, entry: PendingFile): Promise<UploadOutcome> {
    try {
      const meta = await uploadAttachment(ticket.id, requesterId, entry.file);
      return { key: entry.key, file: entry.file, status: "uploaded", meta };
    } catch (err) {
      const message =
        err instanceof ApiError ? messageForCode(err.code, entry.file.name) : messageForCode("INTERNAL_ERROR");
      return { key: entry.key, file: entry.file, status: "failed", message };
    }
  }

  async function uploadAll(ticket: Ticket, pending: PendingFile[]) {
    for (const entry of pending) {
      if (entry.clientError) continue;
      const outcome = await runUpload(ticket, entry);
      setUploads((current) => current.map((u) => (u.key === entry.key ? outcome : u)));
    }
  }

  async function retryUpload(key: number) {
    if (!created) return;
    const entry = files.find((f) => f.key === key);
    if (!entry) return;
    setUploads((current) => current.map((u) => (u.key === key ? { key, file: entry.file, status: "pending" } : u)));
    const outcome = await runUpload(created, entry);
    setUploads((current) => current.map((u) => (u.key === key ? outcome : u)));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submittingRef.current) return; // BR-36: one request per submit

    const fieldErrors = validateTicketForm(values);
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      focusFirstInvalid(fieldErrors);
      return; // AC-17: no API call
    }

    submittingRef.current = true;
    setSubmitting(true);
    setBanner(null);
    try {
      const ticket = await createTicket({
        requesterId,
        categoryId: Number(values.categoryId),
        relatedSystemId: Number(values.relatedSystemId),
        summary: values.summary.trim(),
        description: values.description.trim(),
        requestedPriority: values.requestedPriority as RequestedPriority,
      });
      const outcomes: UploadOutcome[] = files.map((f) =>
        f.clientError
          ? { key: f.key, file: f.file, status: "skipped", message: f.clientError }
          : { key: f.key, file: f.file, status: "pending" },
      );
      setUploads(outcomes);
      setCreated(ticket);
      void uploadAll(ticket, files);
    } catch (err) {
      // BR-37 / AC-22: every entered value stays in state; only the banner or
      // the field messages change.
      if (err instanceof ApiError && err.code === "VALIDATION_FAILED" && err.fields) {
        const serverErrors: TicketFieldErrors = {};
        for (const name of FIELD_ORDER) if (err.fields[name]) serverErrors[name] = err.fields[name];
        setErrors(serverErrors);
        focusFirstInvalid(serverErrors);
      } else {
        setBanner(messageForCode(err instanceof ApiError ? err.code : "INTERNAL_ERROR"));
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  function resetForm() {
    setValues(EMPTY_VALUES);
    setErrors({});
    setFiles([]);
    setBanner(null);
    setCreated(null);
    setUploads([]);
  }

  const refsLoading = refsState === "loading";
  const locked = submitting;

  function describedBy(name: FieldName, extra?: string) {
    const ids = [extra, errors[name] ? `${name}-error` : undefined].filter(Boolean);
    return ids.length ? ids.join(" ") : undefined;
  }

  function fieldError(name: FieldName) {
    return errors[name] ? (
      <div id={`${name}-error`} className="tk-invalid-feedback">
        {errors[name]}
      </div>
    ) : null;
  }

  if (created) {
    return (
      <section
        role="status"
        aria-labelledby="created-heading"
        aria-live="polite"
        className="card tk-card tk-panel-pale tk-success"
      >
        <h2 id="created-heading" className="tk-section-title">Ticket created</h2>
        <p className="tk-ticket-number h2">{created.ticketNumber}</p>
        <p className="mb-3">
          Your ticket has been created and is now <strong>New</strong>. Keep the Ticket Number for reference.
        </p>

        {uploads.length > 0 && (
          <div className="mb-3">
            <h3 className="tk-label">Attachments</h3>
            <ul className="list-unstyled mb-0 tk-upload-list">
              {uploads.map((u) => (
                <li key={u.key} className="tk-upload-row">
                  <span className="tk-upload-name">{u.file.name}</span>
                  {u.status === "pending" && (
                    <span className="tk-muted" aria-busy="true">
                      <span className="spinner-border spinner-border-sm me-1" aria-hidden="true" />
                      Uploading…
                    </span>
                  )}
                  {u.status === "uploaded" && <span className="tk-upload-ok">Uploaded</span>}
                  {(u.status === "failed" || u.status === "skipped") && (
                    <span className="tk-upload-failed">
                      <span className="tk-invalid-feedback d-inline">{u.message}</span>
                      {u.status === "failed" && (
                        <button type="button" className="btn btn-sm btn-secondary ms-2" onClick={() => retryUpload(u.key)}>
                          Retry
                        </button>
                      )}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="d-flex flex-wrap gap-2">
          <Link to={`/tickets/${created.id}`} className="btn btn-primary">
            View Ticket
          </Link>
          <button type="button" className="btn btn-secondary" onClick={resetForm}>
            Create another ticket
          </button>
        </div>
      </section>
    );
  }

  return (
    <form className="card tk-card" onSubmit={handleSubmit} noValidate aria-labelledby="create-ticket-title">
      <h1 id="create-ticket-title" className="tk-title">Create Ticket</h1>

      {refsState === "error" && (
        <div className="tk-panel tk-panel-danger" role="alert" aria-live="assertive">
          <p>{messageForCode("INTERNAL_ERROR")}</p>
          <button type="button" className="btn btn-secondary" onClick={() => setRefsToken((n) => n + 1)}>
            Retry
          </button>
        </div>
      )}

      {/* System-generated values: read-only, never entered (BR-05, BR-06, FR-13..FR-15) */}
      <div className="row g-3 mb-3">
        <div className="col-12 col-md-6 col-lg-4">
          <label htmlFor="ticket-number" className="form-label tk-label">Ticket Number</label>
          <input
            id="ticket-number"
            className="form-control tk-readonly tk-readonly-placeholder"
            value="Generated on submission"
            readOnly
          />
        </div>
        <div className="col-12 col-md-6 col-lg-4">
          <label htmlFor="ticket-date" className="form-label tk-label">Ticket Date</label>
          <input id="ticket-date" className="form-control tk-readonly" value={formatDisplayTimestamp(openedAt)} readOnly />
        </div>
        <div className="col-12 col-md-6 col-lg-4">
          <label htmlFor="ticket-requester" className="form-label tk-label">Requester</label>
          <input id="ticket-requester" className="form-control tk-readonly" value={selected!.name} readOnly />
        </div>
      </div>

      {/* Classification */}
      <div className="row g-3 mb-3">
        <div className="col-12 col-md-6 col-lg-4">
          <label htmlFor="categoryId" className="form-label tk-label">
            Category<RequiredMark />
          </label>
          <select
            id="categoryId"
            ref={(el) => (fieldRefs.current.categoryId = el)}
            className="form-select"
            value={values.categoryId}
            disabled={refsLoading || locked}
            aria-invalid={errors.categoryId ? "true" : undefined}
            aria-describedby={describedBy("categoryId")}
            onChange={(e) => setField("categoryId", e.target.value)}
          >
            <option value="">{refsLoading ? "Loading…" : "Choose a Category"}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {fieldError("categoryId")}
        </div>

        <div className="col-12 col-md-6 col-lg-4">
          <label htmlFor="relatedSystemId" className="form-label tk-label">
            Related System<RequiredMark />
          </label>
          <select
            id="relatedSystemId"
            ref={(el) => (fieldRefs.current.relatedSystemId = el)}
            className="form-select"
            value={values.relatedSystemId}
            disabled={refsLoading || locked}
            aria-invalid={errors.relatedSystemId ? "true" : undefined}
            aria-describedby={describedBy("relatedSystemId")}
            onChange={(e) => setField("relatedSystemId", e.target.value)}
          >
            <option value="">{refsLoading ? "Loading…" : "Choose a Related System"}</option>
            {systems.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          {fieldError("relatedSystemId")}
        </div>

        <div className="col-12 col-md-6 col-lg-4">
          <label htmlFor="requestedPriority" className="form-label tk-label">
            Requested Priority<RequiredMark />
          </label>
          <select
            id="requestedPriority"
            ref={(el) => (fieldRefs.current.requestedPriority = el)}
            className="form-select"
            value={values.requestedPriority}
            disabled={locked}
            aria-invalid={errors.requestedPriority ? "true" : undefined}
            aria-describedby={describedBy("requestedPriority")}
            onChange={(e) => setField("requestedPriority", e.target.value)}
          >
            <option value="">Choose a priority</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
          {fieldError("requestedPriority")}
        </div>
      </div>

      {/* Long text: full width at every band (LS 8.2) */}
      <div className="mb-3">
        <label htmlFor="summary" className="form-label tk-label">
          Ticket Summary<RequiredMark />
        </label>
        <input
          id="summary"
          ref={(el) => (fieldRefs.current.summary = el)}
          type="text"
          className="form-control"
          value={values.summary}
          readOnly={locked}
          maxLength={SUMMARY_MAX + 20}
          aria-invalid={errors.summary ? "true" : undefined}
          aria-describedby={describedBy("summary", "summary-count")}
          onChange={(e) => setField("summary", e.target.value)}
        />
        {fieldError("summary")}
        <div id="summary-count" className="tk-muted tk-counter">{values.summary.trim().length} / {SUMMARY_MAX}</div>
      </div>

      <div className="mb-3">
        <label htmlFor="description" className="form-label tk-label">
          Description<RequiredMark />
        </label>
        <textarea
          id="description"
          ref={(el) => (fieldRefs.current.description = el)}
          className="form-control tk-description"
          rows={5}
          value={values.description}
          readOnly={locked}
          aria-invalid={errors.description ? "true" : undefined}
          aria-describedby={describedBy("description", "description-count")}
          onChange={(e) => setField("description", e.target.value)}
        />
        {fieldError("description")}
        <div id="description-count" className="tk-muted tk-counter">{values.description.trim().length} / {DESCRIPTION_MAX}</div>
      </div>

      {/* Attachments - optional; uploaded after creation (C-15) */}
      <div className="mb-3">
        <label htmlFor="attachments" className="form-label tk-label">Attachments</label>
        <input
          id="attachments"
          type="file"
          className="form-control"
          multiple
          accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
          disabled={locked}
          aria-describedby="attachments-help"
          onChange={handleFiles}
        />
        <div id="attachments-help" className="tk-muted">JPG, PNG, WEBP or PDF, up to 5 MB each, at most five per ticket.</div>
        {files.length > 0 && (
          <ul className="list-unstyled mt-2 mb-0 tk-chip-list">
            {files.map((f) => (
              <li key={f.key} className={`tk-chip${f.clientError ? " tk-chip-invalid" : ""}`}>
                <span className="tk-chip-body">
                  <span className="tk-chip-name">{f.file.name}</span>
                  <span className="tk-muted"> {formatBytes(f.file.size)}</span>
                  {f.clientError && <span className="tk-invalid-feedback">{f.clientError}</span>}
                </span>
                <button
                  type="button"
                  className="btn btn-sm tk-btn-tertiary tk-chip-remove"
                  aria-label={`Remove ${f.file.name}`}
                  disabled={locked}
                  onClick={() => removeFile(f.key)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {banner && (
        <div className="tk-panel tk-panel-danger" role="alert" aria-live="assertive">
          <p>{banner}</p>
        </div>
      )}

      <div className="d-flex flex-wrap gap-2 tk-actions">
        <button type="submit" className="btn btn-primary" disabled={locked || refsLoading} aria-busy={locked ? "true" : undefined}>
          {locked && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />}
          {locked ? "Submitting…" : "Submit Ticket"}
        </button>
        <Link to="/tickets" className="btn btn-secondary">Cancel</Link>
      </div>
    </form>
  );
}
