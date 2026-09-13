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
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function toApiError(res: Response): Promise<ApiError> {
  try {
    const body = await res.json();
    if (body?.error?.code) return new ApiError(res.status, body.error.code, body.error.message);
  } catch {
    // non-JSON body: fall through to the generic error
  }
  return new ApiError(res.status, "INTERNAL_ERROR", "Request failed");
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
