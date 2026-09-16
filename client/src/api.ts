const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export interface Category {
  id: number;
  name: string;
}

export interface SystemStatus {
  online: boolean;
  categories: Category[];
}

// Issue 2 + Issue 4 — call the backend.
// Steps: fetch `${API_URL}/api/health`; if not ok, throw.
//        then fetch `${API_URL}/api/categories`; if not ok, throw.
//        return { online: true, categories }.
// Throwing on failure lets the UI show a single Offline/error state.
export async function checkSystem(): Promise<SystemStatus> {
  const res = await fetch(`${API_URL}/api/health`);
  if (!res.ok) throw new Error("Health check failed");
  const catRes = await fetch(`${API_URL}/api/categories`);
  if (!catRes.ok) throw new Error("Category fetch failed");
  const categories: Category[] = await catRes.json();
  return { online: true, categories };
}

// ---------------------------------------------------------------------------
// Lab 2 — api-spec.md. Every error the server sends uses the section 1.1
// envelope; ApiError carries its code so a screen can pick the ui-spec.md
// section 6.1 message. The raw server text is never rendered (BR-38).
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    /** Per-field catalogue messages on a 400 VALIDATION_FAILED (api-spec 1.1). */
    public readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function toApiError(res: Response): Promise<ApiError> {
  try {
    const body = await res.json();
    if (body?.error?.code) {
      return new ApiError(res.status, body.error.code, body.error.message, body.error.fields);
    }
  } catch {
    // non-JSON body: fall through to the generic error
  }
  return new ApiError(res.status, "INTERNAL_ERROR", "Request failed");
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) throw await toApiError(res);
  return res.json();
}

// A Development Requester as api-spec.md 2.3 returns it. No credential field
// exists on this shape (BR-65): it is a testing identity, not a login.
export interface Requester {
  id: number;
  name: string;
  email: string;
}

// GET /api/requesters — active Requesters only, ascending id (BR-11).
export async function fetchRequesters(): Promise<Requester[]> {
  const res = await fetch(`${API_URL}/api/requesters`);
  if (!res.ok) throw await toApiError(res);
  return res.json();
}

// ---------------------------------------------------------------------------
// Reference data (api-spec.md 2.1, 2.2) - active rows only, {id, name}.
// ---------------------------------------------------------------------------

export interface RelatedSystem {
  id: number;
  name: string;
}

export function fetchCategories(): Promise<Category[]> {
  return getJson("/api/categories");
}

export function fetchRelatedSystems(): Promise<RelatedSystem[]> {
  return getJson("/api/related-systems");
}

// ---------------------------------------------------------------------------
// Tickets (api-spec.md 3) and attachment upload (4.1).
// ---------------------------------------------------------------------------

export type RequestedPriority = "LOW" | "MEDIUM" | "HIGH";
export type TicketStatus = "NEW" | "IN_PROGRESS" | "RESOLVED" | "CLOSED" | "CANCELLED";

export interface AttachmentMeta {
  id: number;
  ticketId?: number;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
  isRemoved: boolean;
  removedAt: string | null;
  removalReason: string | null;
}

export interface Ticket {
  id: number;
  ticketNumber: string;
  requesterId: number;
  requester: { id: number; name: string };
  category: Category;
  relatedSystem: RelatedSystem;
  summary: string;
  description: string;
  requestedPriority: RequestedPriority;
  itPriority: RequestedPriority | null;
  currentStatus: TicketStatus;
  createdAt: string;
  updatedAt: string;
  attachments: AttachmentMeta[];
}

export interface NewTicketInput {
  requesterId: number;
  categoryId: number;
  relatedSystemId: number;
  summary: string;
  description: string;
  requestedPriority: RequestedPriority;
}

// POST /api/tickets - the one endpoint carrying requesterId in the body (C-12).
// The Ticket Number in the 201 body is assigned inside the creation transaction
// (C-49); no second request is needed.
export async function createTicket(input: NewTicketInput): Promise<Ticket> {
  const res = await fetch(`${API_URL}/api/tickets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw await toApiError(res);
  return res.json();
}

// POST /api/tickets/:id/attachments - one file per request (C-15, C-42), which
// is what makes per-file success and failure reportable.
// Uses XMLHttpRequest rather than fetch because the uploading row shows a
// determinate progress bar (ui-spec 14.2) and fetch exposes no upload progress.
export function uploadAttachment(
  ticketId: number,
  requesterId: number,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<AttachmentMeta> {
  const form = new FormData();
  form.append("file", file, file.name);
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_URL}/api/tickets/${ticketId}/attachments?requesterId=${requesterId}`);
    xhr.responseType = "text";
    xhr.upload.onprogress = (event) => {
      if (onProgress && event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onerror = () => reject(new ApiError(0, "INTERNAL_ERROR", "Network error"));
    xhr.onload = () => {
      let body: unknown = null;
      try {
        body = xhr.responseText ? JSON.parse(xhr.responseText) : null;
      } catch {
        body = null;
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve(body as AttachmentMeta);
        return;
      }
      const error = (body as { error?: { code?: string; message?: string; fields?: Record<string, string> } } | null)?.error;
      reject(new ApiError(xhr.status, error?.code ?? "INTERNAL_ERROR", error?.message ?? "Request failed", error?.fields));
    };
    xhr.send(form);
  });
}

// ---------------------------------------------------------------------------
// My Tickets (api-spec.md 3.2) and one owned Ticket (3.3).
// ---------------------------------------------------------------------------

export type TicketListRow = Omit<Ticket, "requesterId" | "requester" | "description" | "attachments">;

export interface TicketListMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  sort: string;
}

export interface TicketListPage {
  data: TicketListRow[];
  meta: TicketListMeta;
}

// The C-27 query, as strings straight from the address bar. Empty values are
// not sent, so the server's defaults apply.
export interface TicketListQuery {
  search?: string;
  categoryId?: string;
  relatedSystemId?: string;
  currentStatus?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
}

export function fetchTickets(requesterId: number, query: TicketListQuery): Promise<TicketListPage> {
  const params = new URLSearchParams({ requesterId: String(requesterId) });
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  return getJson(`/api/tickets?${params.toString()}`);
}

export function fetchTicket(id: number, requesterId: number): Promise<Ticket> {
  return getJson(`/api/tickets/${id}?requesterId=${requesterId}`);
}

// ---------------------------------------------------------------------------
// Attachment lifecycle on Ticket Detail (api-spec.md 4.2, 4.3, 4.4).
// ---------------------------------------------------------------------------

// GET /api/tickets/:id/attachments - active and removed alike, ascending id.
export function fetchAttachments(ticketId: number, requesterId: number): Promise<AttachmentMeta[]> {
  return getJson(`/api/tickets/${ticketId}/attachments?requesterId=${requesterId}`);
}

// GET /api/attachments/:id/download - the one ownership-checked route for both
// download and preview (BR-49, BR-54). The bytes come back as a Blob; a 410
// or 500 surfaces as an ApiError so the row can show the unavailable state (C-46).
export async function downloadAttachment(
  id: number,
  requesterId: number,
  disposition: "attachment" | "inline",
): Promise<Blob> {
  const res = await fetch(`${API_URL}/api/attachments/${id}/download?requesterId=${requesterId}&disposition=${disposition}`);
  if (!res.ok) throw await toApiError(res);
  return res.blob();
}

// DELETE /api/attachments/:id - soft removal with a required reason (BR-46, BR-47).
export async function removeAttachment(id: number, requesterId: number, removalReason: string): Promise<AttachmentMeta> {
  const res = await fetch(`${API_URL}/api/attachments/${id}?requesterId=${requesterId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ removalReason }),
  });
  if (!res.ok) throw await toApiError(res);
  return res.json();
}
