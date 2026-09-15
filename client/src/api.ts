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
export async function uploadAttachment(ticketId: number, requesterId: number, file: File): Promise<AttachmentMeta> {
  const form = new FormData();
  form.append("file", file, file.name);
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/attachments?requesterId=${requesterId}`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw await toApiError(res);
  return res.json();
}
