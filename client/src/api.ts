// C-56 - same-origin via the Vite proxy. The fallback is "", not a
// cross-origin default, because an unset VITE_API_URL must still mean "call
// same-origin /api paths", not "fall back to a different host".
const API_URL = import.meta.env.VITE_API_URL ?? "";

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

// Lab 3, BR-34 - any 401 AUTH_REQUIRED means the session is gone, whichever
// screen's request met it. AuthContext subscribes here and swaps the screen for
// Login. Only AUTH_REQUIRED counts: a 401 INVALID_CREDENTIALS from login is a
// wrong password, not a lost session.
//
// A 403 PASSWORD_CHANGE_REQUIRED from any request means a change is owed - an
// Administrator set a new initial password behind this session, say. It has no
// banner (ui-spec 6.2): AuthContext re-reads the user and the gate shows
// Change Password instead.
type Listener = () => void;
const sessionLostListeners = new Set<Listener>();
const passwordChangeListeners = new Set<Listener>();

export function onSessionLost(listener: Listener): () => void {
  sessionLostListeners.add(listener);
  return () => sessionLostListeners.delete(listener);
}

export function onPasswordChangeRequired(listener: Listener): () => void {
  passwordChangeListeners.add(listener);
  return () => passwordChangeListeners.delete(listener);
}

function reportIfSessionLost(error: ApiError): ApiError {
  if (error.status === 401 && error.code === "AUTH_REQUIRED") sessionLostListeners.forEach((listener) => listener());
  if (error.status === 403 && error.code === "PASSWORD_CHANGE_REQUIRED") passwordChangeListeners.forEach((listener) => listener());
  return error;
}

async function toApiError(res: Response): Promise<ApiError> {
  try {
    const body = await res.json();
    if (body?.error?.code) {
      return reportIfSessionLost(new ApiError(res.status, body.error.code, body.error.message, body.error.fields));
    }
  } catch {
    // non-JSON body: fall through to the generic error
  }
  return new ApiError(res.status, "INTERNAL_ERROR", "Request failed");
}

// A fetch that never rejects with a bare TypeError: a network failure becomes
// the same INTERNAL_ERROR a 500 does, so a screen has one failure state to show.
async function send(path: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(`${API_URL}${path}`, init);
  } catch {
    throw new ApiError(0, "INTERNAL_ERROR", "Network error");
  }
}

// ---------------------------------------------------------------------------
// Lab 3 authentication (api-spec.md 2.4, 3.1-3.3). The session lives in the
// HttpOnly tt_session cookie, which script cannot read; the client learns who
// it is only from these responses and keeps that in memory (FR-11, BR-25).
// ---------------------------------------------------------------------------

export type UserRole = "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";

// api-spec.md 10.1 - exactly the six keys the server returns.
export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  mustChangePassword: boolean;
}

const JSON_HEADERS = { "Content-Type": "application/json" };

export async function login(email: string, password: string): Promise<AuthUser> {
  const res = await send("/api/auth/login", { method: "POST", headers: JSON_HEADERS, body: JSON.stringify({ email, password }) });
  if (!res.ok) throw await toApiError(res);
  return res.json();
}

// null when there is no valid session: at start-up that is the normal
// signed-out case, not a lost session, so it raises no session-ended notice.
export async function fetchCurrentUser(): Promise<AuthUser | null> {
  const res = await send("/api/auth/me");
  if (res.status === 401) return null;
  if (!res.ok) throw await toApiError(res);
  return res.json();
}

// 204, or 401 when the session had already ended - either way it is over.
export async function logout(): Promise<void> {
  const res = await send("/api/auth/logout", { method: "POST" });
  if (!res.ok && res.status !== 401) throw await toApiError(res);
}

export interface PasswordChange {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export async function changePassword(input: PasswordChange): Promise<AuthUser> {
  const res = await send("/api/auth/change-password", { method: "POST", headers: JSON_HEADERS, body: JSON.stringify(input) });
  if (!res.ok) throw await toApiError(res);
  return res.json();
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`);
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
// C-70 - all eight statuses, in the TicketStatus declaration order.
export type TicketStatus =
  | "NEW"
  | "OPEN"
  | "IN_PROGRESS"
  | "WAITING_FOR_REQUESTER"
  | "RESOLVED"
  | "CLOSED"
  | "REOPENED"
  | "CANCELLED";

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

// api-spec.md 10.2. No requesterId key: the session is the identity (C-64).
export interface Ticket {
  id: number;
  ticketNumber: string;
  requester: { id: number; name: string };
  category: Category;
  relatedSystem: RelatedSystem;
  summary: string;
  description: string;
  requestedPriority: RequestedPriority;
  // Never null since C-71: set from Requested Priority on create and backfilled.
  itPriority: RequestedPriority;
  currentStatus: TicketStatus;
  createdAt: string;
  updatedAt: string;
  attachments: AttachmentMeta[];
}

// No identity field at all: the Ticket belongs to the signed-in user (C-64).
export interface NewTicketInput {
  categoryId: number;
  relatedSystemId: number;
  summary: string;
  description: string;
  requestedPriority: RequestedPriority;
}

// POST /api/tickets - api-spec.md 4.1. The Ticket Number in the 201 body is
// assigned inside the creation transaction (C-49); no second request is needed.
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
  file: File,
  onProgress?: (percent: number) => void,
): Promise<AttachmentMeta> {
  const form = new FormData();
  form.append("file", file, file.name);
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_URL}/api/tickets/${ticketId}/attachments`);
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
      reject(reportIfSessionLost(new ApiError(xhr.status, error?.code ?? "INTERNAL_ERROR", error?.message ?? "Request failed", error?.fields)));
    };
    xhr.send(form);
  });
}

// ---------------------------------------------------------------------------
// My Tickets (api-spec.md 3.2) and one owned Ticket (3.3).
// ---------------------------------------------------------------------------

export type TicketListRow = Omit<Ticket, "requester" | "description" | "attachments">;

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

// GET /api/tickets - scoped by the server to the signed-in Requester (BR-43).
export function fetchTickets(query: TicketListQuery): Promise<TicketListPage> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  return getJson(`/api/tickets?${params.toString()}`);
}

export function fetchTicket(id: number): Promise<Ticket> {
  return getJson(`/api/tickets/${id}`);
}

// ---------------------------------------------------------------------------
// Attachment lifecycle on Ticket Detail (api-spec.md 4.2, 4.3, 4.4).
// ---------------------------------------------------------------------------

// GET /api/tickets/:id/attachments - active and removed alike, ascending id.
export function fetchAttachments(ticketId: number): Promise<AttachmentMeta[]> {
  return getJson(`/api/tickets/${ticketId}/attachments`);
}

// GET /api/attachments/:id/download - the one ownership-checked route for both
// download and preview (BR-49, BR-54). The bytes come back as a Blob; a 410
// or 500 surfaces as an ApiError so the row can show the unavailable state (C-46).
export async function downloadAttachment(id: number, disposition: "attachment" | "inline"): Promise<Blob> {
  const res = await fetch(`${API_URL}/api/attachments/${id}/download?disposition=${disposition}`);
  if (!res.ok) throw await toApiError(res);
  return res.blob();
}

// DELETE /api/attachments/:id - soft removal with a required reason (BR-46, BR-47).
export async function removeAttachment(id: number, removalReason: string): Promise<AttachmentMeta> {
  const res = await fetch(`${API_URL}/api/attachments/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ removalReason }),
  });
  if (!res.ok) throw await toApiError(res);
  return res.json();
}

// ---------------------------------------------------------------------------
// The Ticket Queue (api-spec.md 8.1). IT Staff and Administrator only; not
// scoped to any Requester (BR-74), so the row carries no requester key.
// ---------------------------------------------------------------------------

export interface QueueOwner {
  id: number;
  name: string;
  isActive: boolean;
}

// api-spec.md 10.4 - exactly the nine FR-39 columns plus the two markers.
export interface QueueRow {
  id: number;
  ticketNumber: string;
  summary: string;
  category: Category;
  requestedPriority: RequestedPriority;
  itPriority: RequestedPriority;
  currentStatus: TicketStatus;
  owner: QueueOwner | null;
  requesterResolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface QueuePage {
  data: QueueRow[];
  meta: TicketListMeta;
}

// The C-78 query, as strings straight from the address bar. Empty values are
// not sent, so the BR-72 server defaults apply.
export interface QueueListQuery {
  search?: string;
  currentStatus?: string;
  itPriority?: string;
  /** "me", "unassigned", or a user id as a string. */
  owner?: string;
  categoryId?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
}

export function fetchQueue(query: QueueListQuery): Promise<QueuePage> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  return getJson(`/api/staff/tickets?${params.toString()}`);
}

// GET /api/staff/assignable-users (api-spec.md 8.7, C-105) - active IT Staff
// and Administrator users, for the Ticket Owner filter's named-user options.
// Not yet implemented server-side (that lands with #42's staff routes), so a
// failure here is swallowed and the filter falls back to its three static
// options rather than showing an error for a toolbar control.
export interface AssignableUser {
  id: number;
  name: string;
  role: UserRole;
}

export async function fetchAssignableUsers(): Promise<AssignableUser[]> {
  return getJson("/api/staff/assignable-users");
}
