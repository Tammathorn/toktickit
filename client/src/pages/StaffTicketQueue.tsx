import { useEffect, useMemo, useState } from "react";
import {
  ApiError,
  fetchAssignableUsers,
  fetchCategories,
  fetchQueue,
  type AssignableUser,
  type Category,
  type QueuePage,
  type QueueRow,
} from "../api.js";
import { Link, useRouter } from "../router.js";
import { useCurrentUser } from "../auth/AuthContext.js";
import { formatDisplayTimestamp } from "../format.js";
import { messageForCode } from "../validation.js";
import { PriorityBadge, ResolvedMarker, StatusBadge } from "../components/Badge.js";
import Forbidden from "../components/Forbidden.js";
import { useMediaQuery, MD_AND_UP, LG_AND_UP } from "../useMediaQuery.js";

// IT Staff Ticket Queue - ui-spec.md section 15, LS 8.3.
//
// Every toolbar control maps to one api-spec.md 8.1 query parameter, and the
// whole query lives in the address bar, exactly as My Tickets does (12.1).
// The queue is not Requester-scoped (BR-74): the server decides what the
// caller may see, and this screen sends no identity of its own beyond the
// session cookie.

const SORT_OPTIONS: Array<[string, string]> = [
  ["", "IT Priority, then oldest"],
  ["createdAt:desc", "Newest first"],
  ["createdAt:asc", "Oldest first"],
  ["updatedAt:desc", "Recently updated"],
  ["updatedAt:asc", "Least recently updated"],
  ["itPriority:desc", "IT Priority, high to low"],
  ["itPriority:asc", "IT Priority, low to high"],
  ["ticketNumber:asc", "Ticket Number, ascending"],
  ["ticketNumber:desc", "Ticket Number, descending"],
  ["currentStatus:asc", "Current Status, A to Z"],
  ["currentStatus:desc", "Current Status, Z to A"],
];
// C-111: no "All statuses" option - the default (omitted) already means
// "Open tickets", and api-spec.md 8.1 has no query for every status at once.
const STATUS_OPTIONS: Array<[string, string]> = [
  ["", "Open tickets"],
  ["NEW", "New"],
  ["OPEN", "Open"],
  ["IN_PROGRESS", "In Progress"],
  ["WAITING_FOR_REQUESTER", "Waiting for Requester"],
  ["RESOLVED", "Resolved"],
  ["CLOSED", "Closed"],
  ["REOPENED", "Reopened"],
  ["CANCELLED", "Cancelled"],
];
const IT_PRIORITY_OPTIONS: Array<[string, string]> = [
  ["", "All IT priorities"],
  ["LOW", "Low"],
  ["MEDIUM", "Medium"],
  ["HIGH", "High"],
];
const PAGE_SIZES = [10, 25, 50];
const SEARCH_DEBOUNCE_MS = 300;

interface QueueState {
  search: string;
  currentStatus: string;
  itPriority: string;
  owner: string;
  categoryId: string;
  sort: string;
  page: number;
  pageSize: number;
}

function readState(search: string): QueueState {
  const p = new URLSearchParams(search);
  const int = (name: string, fallback: number) => {
    const v = p.get(name);
    return v !== null && /^\d+$/.test(v) && Number(v) > 0 ? Number(v) : fallback;
  };
  return {
    search: p.get("search") ?? "",
    currentStatus: p.get("currentStatus") ?? "",
    itPriority: p.get("itPriority") ?? "",
    owner: p.get("owner") ?? "",
    categoryId: p.get("categoryId") ?? "",
    sort: p.get("sort") ?? "",
    page: int("page", 1),
    pageSize: int("pageSize", 10),
  };
}

function toSearch(state: QueueState): string {
  const p = new URLSearchParams();
  if (state.search) p.set("search", state.search);
  if (state.currentStatus) p.set("currentStatus", state.currentStatus);
  if (state.itPriority) p.set("itPriority", state.itPriority);
  if (state.owner) p.set("owner", state.owner);
  if (state.categoryId) p.set("categoryId", state.categoryId);
  if (state.sort) p.set("sort", state.sort);
  if (state.page !== 1) p.set("page", String(state.page));
  if (state.pageSize !== 10) p.set("pageSize", String(state.pageSize));
  const s = p.toString();
  return s ? `?${s}` : "";
}

// 15.1: Clear filters appears for a search or a non-default filter - sort is
// not one of them, it has its own stated default option.
function filtersActive(state: QueueState): boolean {
  return Boolean(state.search || state.currentStatus || state.itPriority || state.owner || state.categoryId);
}

// 15.1: the muted default-view line disappears once any filter OR sort changes.
function isDefaultView(state: QueueState): boolean {
  return !filtersActive(state) && state.sort === "";
}

type LoadState =
  | { kind: "loading" }
  | { kind: "ready"; page: QueuePage }
  | { kind: "invalid-query"; fields: Record<string, string> }
  | { kind: "forbidden" }
  | { kind: "error" };

export default function StaffTicketQueue() {
  const { search: locationSearch, navigate } = useRouter();
  const currentUser = useCurrentUser();

  const state = useMemo(() => readState(locationSearch), [locationSearch]);
  const [load, setLoad] = useState<LoadState>({ kind: "loading" });
  const [reloadToken, setReloadToken] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [assignableUsers, setAssignableUsers] = useState<AssignableUser[]>([]);
  const [searchText, setSearchText] = useState(state.search);
  const desktop = useMediaQuery(LG_AND_UP);
  const atLeastTablet = useMediaQuery(MD_AND_UP);

  // Toolbar reference data (FR-11 applies to these selects too). The
  // assignable-users endpoint does not exist until #42; a failure here just
  // leaves the owner select with its three static options.
  useEffect(() => {
    let cancelled = false;
    fetchCategories().then(
      (cats) => {
        if (!cancelled) setCategories(cats);
      },
      () => {},
    );
    fetchAssignableUsers().then(
      (users) => {
        if (!cancelled) setAssignableUsers(users);
      },
      () => {},
    );
    return () => {
      cancelled = true;
    };
  }, []);

  // The list request: one per address-bar state (and per Retry).
  useEffect(() => {
    let cancelled = false;
    setLoad({ kind: "loading" });
    fetchQueue({
      search: state.search,
      currentStatus: state.currentStatus,
      itPriority: state.itPriority,
      owner: state.owner,
      categoryId: state.categoryId,
      sort: state.sort,
      page: state.page,
      pageSize: state.pageSize,
    }).then(
      (page) => {
        if (!cancelled) setLoad({ kind: "ready", page });
      },
      (err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.code === "INVALID_QUERY_PARAM") setLoad({ kind: "invalid-query", fields: err.fields ?? {} });
        // ui-spec 20.1: a 403 is the Forbidden state, decided by the status -
        // reachable by a Requester typing the address (FR-24).
        else if (err instanceof ApiError && err.code === "FORBIDDEN_ROLE") setLoad({ kind: "forbidden" });
        else setLoad({ kind: "error" });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [state, reloadToken]);

  // Search is debounced 300 ms into the address (15.1) and resets page.
  useEffect(() => {
    if (searchText === state.search) return;
    const handle = window.setTimeout(() => {
      apply({ search: searchText.trim(), page: 1 });
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);

  // ui-spec 16: "Back to the Ticket Queue" on Staff Ticket Detail preserves
  // the queue's filters and page. The address itself carries them (toSearch),
  // so the detail screen only needs the most recent one.
  useEffect(() => {
    try {
      sessionStorage.setItem("tk-queue-search", locationSearch);
    } catch {
      // sessionStorage unavailable - the back link falls back to a bare /queue
    }
  }, [locationSearch]);

  function apply(patch: Partial<QueueState>) {
    navigate(`/queue${toSearch({ ...state, ...patch })}`, { replace: true });
  }

  // Drops sort too, not just search and the filters: an invalid sort is what
  // the invalid-query panel's Clear filters most needs to escape, and there
  // is no address this always returns to otherwise (audit finding #1).
  function clearFilters() {
    setSearchText("");
    navigate("/queue", { replace: true });
  }

  const active = filtersActive(state);
  const ready = load.kind === "ready" ? load.page : null;
  const first = ready && ready.meta.total > 0 ? (ready.meta.page - 1) * ready.meta.pageSize + 1 : 0;
  const last = ready ? Math.min(ready.meta.page * ready.meta.pageSize, ready.meta.total) : 0;

  if (load.kind === "forbidden") return <Forbidden />;

  return (
    <section aria-labelledby="queue-title">
      <h1 id="queue-title" className="tk-title">Ticket Queue</h1>

      {/* Toolbar - ui-spec 15.1; kept on every state so filters are never lost */}
      <div className="card tk-card tk-toolbar mb-3" role="search" aria-label="Search and filter the ticket queue">
        <div className="row g-3">
          <div className="col-12 col-lg-4">
            <label htmlFor="queue-search" className="form-label tk-label">Search</label>
            <input
              id="queue-search"
              type="search"
              className="form-control"
              placeholder="Ticket Number or Ticket Summary"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              aria-invalid={load.kind === "invalid-query" && load.fields.search ? "true" : undefined}
            />
            {load.kind === "invalid-query" && load.fields.search && <p className="tk-invalid-feedback">{load.fields.search}</p>}
          </div>
          <div className="col-6 col-md-3 col-lg-2">
            <label htmlFor="queue-status" className="form-label tk-label">Current Status</label>
            <select
              id="queue-status"
              className="form-select"
              value={state.currentStatus}
              onChange={(e) => apply({ currentStatus: e.target.value, page: 1 })}
              aria-invalid={load.kind === "invalid-query" && load.fields.currentStatus ? "true" : undefined}
            >
              {STATUS_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            {load.kind === "invalid-query" && load.fields.currentStatus && <p className="tk-invalid-feedback">{load.fields.currentStatus}</p>}
          </div>
          <div className="col-6 col-md-3 col-lg-2">
            <label htmlFor="queue-priority" className="form-label tk-label">IT Priority</label>
            <select
              id="queue-priority"
              className="form-select"
              value={state.itPriority}
              onChange={(e) => apply({ itPriority: e.target.value, page: 1 })}
              aria-invalid={load.kind === "invalid-query" && load.fields.itPriority ? "true" : undefined}
            >
              {IT_PRIORITY_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            {load.kind === "invalid-query" && load.fields.itPriority && <p className="tk-invalid-feedback">{load.fields.itPriority}</p>}
          </div>
          <div className="col-6 col-md-3 col-lg-2">
            <label htmlFor="queue-owner" className="form-label tk-label">Ticket Owner</label>
            <select
              id="queue-owner"
              className="form-select"
              value={state.owner}
              onChange={(e) => apply({ owner: e.target.value, page: 1 })}
              aria-invalid={load.kind === "invalid-query" && load.fields.owner ? "true" : undefined}
            >
              <option value="">Any owner</option>
              <option value="me">Assigned to me</option>
              <option value="unassigned">Unassigned</option>
              {assignableUsers.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
            {load.kind === "invalid-query" && load.fields.owner && <p className="tk-invalid-feedback">{load.fields.owner}</p>}
          </div>
          <div className="col-6 col-md-3 col-lg-2">
            <label htmlFor="queue-category" className="form-label tk-label">Category</label>
            <select
              id="queue-category"
              className="form-select"
              value={state.categoryId}
              onChange={(e) => apply({ categoryId: e.target.value, page: 1 })}
              aria-invalid={load.kind === "invalid-query" && load.fields.categoryId ? "true" : undefined}
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {load.kind === "invalid-query" && load.fields.categoryId && <p className="tk-invalid-feedback">{load.fields.categoryId}</p>}
          </div>
          <div className="col-6 col-md-3 col-lg-2">
            <label htmlFor="queue-sort" className="form-label tk-label">Sort</label>
            <select
              id="queue-sort"
              className="form-select"
              value={state.sort}
              onChange={(e) => apply({ sort: e.target.value, page: 1 })}
              aria-invalid={load.kind === "invalid-query" && load.fields.sort ? "true" : undefined}
            >
              {SORT_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            {load.kind === "invalid-query" && load.fields.sort && <p className="tk-invalid-feedback">{load.fields.sort}</p>}
          </div>
        </div>

        {isDefaultView(state) && (
          <p className="tk-muted mt-3 mb-0">Showing open tickets, highest IT Priority first. Closed and Cancelled are hidden.</p>
        )}

        {active && (
          <div className="mt-3">
            <button type="button" className="btn btn-secondary" onClick={clearFilters}>Clear filters</button>
          </div>
        )}
      </div>

      <div
        className="tk-list-region"
        role="region"
        aria-label="Ticket queue"
        aria-busy={load.kind === "loading" ? "true" : undefined}
        aria-live="polite"
      >
        {load.kind === "loading" && <QueueSkeleton wide={atLeastTablet} />}

        {load.kind === "error" && (
          <div className="tk-panel tk-panel-danger" role="alert" aria-live="assertive">
            <p>{messageForCode("INTERNAL_ERROR")}</p>
            <button type="button" className="btn btn-secondary" onClick={() => setReloadToken((n) => n + 1)}>Retry</button>
          </div>
        )}

        {/* 15.5: the toolbar is kept on an invalid query, with Clear filters rather
            than Retry - retrying the same address fails identically. */}
        {load.kind === "invalid-query" && (
          <div className="tk-panel tk-panel-danger" role="alert" aria-live="assertive">
            <p>{messageForCode("INVALID_QUERY_PARAM")}</p>
            <button type="button" className="btn btn-secondary" onClick={clearFilters}>Clear filters</button>
          </div>
        )}

        {ready && ready.data.length === 0 && !active && ready.meta.total === 0 && (
          <div className="card tk-card tk-empty text-center">
            <DocumentIcon />
            <h2 className="tk-section-title">No tickets in the queue</h2>
            <p>There are no open tickets right now.</p>
          </div>
        )}

        {/* A page past the last one (e.g. the queue shrank under a stale
            `page`) is a no-results condition too, with Clear filters as the
            way back - never the true Empty state, which offers no action
            (audit finding #2). */}
        {ready && ready.data.length === 0 && (active || ready.meta.total > 0) && (
          <div className="card tk-card tk-empty text-center">
            <MagnifierIcon />
            <h2 className="tk-section-title">No matches</h2>
            <p>No tickets match your search or filters.</p>
            <button type="button" className="btn btn-secondary align-self-center" onClick={clearFilters}>Clear filters</button>
          </div>
        )}

        {ready && ready.data.length > 0 && (
          <>
            {desktop ? (
              <QueueTable rows={ready.data} currentUserId={currentUser.id} tablet={false} onOpen={(id) => navigate(`/queue/${id}`)} />
            ) : atLeastTablet ? (
              <QueueTable rows={ready.data} currentUserId={currentUser.id} tablet onOpen={(id) => navigate(`/queue/${id}`)} />
            ) : (
              <QueueCards rows={ready.data} currentUserId={currentUser.id} />
            )}

            <nav className="tk-pagination d-flex flex-wrap align-items-center justify-content-between gap-2 mt-3" aria-label="Pagination">
              <span aria-live="polite">{`Showing ${first} to ${last} of ${ready.meta.total} tickets`}</span>
              <div className="d-flex align-items-center gap-2">
                <label htmlFor="queue-page-size" className="tk-label mb-0">Per page</label>
                <select id="queue-page-size" className="form-select tk-page-size" value={state.pageSize} onChange={(e) => apply({ pageSize: Number(e.target.value), page: 1 })}>
                  {PAGE_SIZES.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                <button type="button" className="btn btn-secondary" disabled={ready.meta.page <= 1} onClick={() => apply({ page: state.page - 1 })}>
                  Previous
                </button>
                <span className="tk-muted">Page {ready.meta.page} of {Math.max(1, ready.meta.totalPages)}</span>
                <button type="button" className="btn btn-secondary" disabled={ready.meta.page >= ready.meta.totalPages} onClick={() => apply({ page: state.page + 1 })}>
                  Next
                </button>
              </div>
            </nav>
          </>
        )}
      </div>
    </section>
  );
}

// ui-spec 15.2 - owner rendering is the column carrying the most meaning, so
// it is explicit rather than subtle. Shared by the desktop table, the tablet
// table (both carry Ticket Owner) and the mobile cards.
function OwnerValue({ owner, currentUserId }: { owner: QueueRow["owner"]; currentUserId: number }) {
  if (!owner) return <span className="tk-owner-unassigned">Unassigned</span>;
  if (!owner.isActive) {
    return (
      <span>
        {owner.name} <span className="tk-owner-inactive">(inactive)</span>
      </span>
    );
  }
  if (owner.id === currentUserId) {
    return (
      <span>
        <span className="fw-semibold">{owner.name}</span> <span className="tk-muted">(you)</span>
      </span>
    );
  }
  return <span>{owner.name}</span>;
}

// ui-spec 15.2/15.3: the desktop table (nine columns) and the tablet table
// (six named columns, C-108) - two distinct renders, so the three dropped
// columns are absent from the DOM at tablet width, not CSS-hidden (RESP-04).
function QueueTable({
  rows,
  currentUserId,
  tablet,
  onOpen,
}: {
  rows: QueueRow[];
  currentUserId: number;
  tablet: boolean;
  onOpen: (id: number) => void;
}) {
  return (
    <div className="card tk-card tk-table-card">
      <table className="table tk-table mb-0">
        <thead>
          <tr>
            <th scope="col">Ticket Number</th>
            {!tablet && <th scope="col">Created</th>}
            <th scope="col" className="tk-col-summary">Ticket Summary</th>
            {!tablet && <th scope="col">Category</th>}
            {!tablet && <th scope="col">Requested Priority</th>}
            <th scope="col">IT Priority</th>
            <th scope="col">Current Status</th>
            <th scope="col">Ticket Owner</th>
            <th scope="col">Last Updated</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <tr
              key={t.id}
              className="tk-row"
              onClick={(e) => {
                if ((e.target as HTMLElement).closest("a")) return;
                onOpen(t.id);
              }}
            >
              <td>
                <Link to={`/queue/${t.id}`} className="tk-row-link" aria-label={`Open ${t.ticketNumber}`}>
                  {t.ticketNumber}
                </Link>
              </td>
              {!tablet && <td className="tk-nowrap">{formatDisplayTimestamp(t.createdAt)}</td>}
              <td className="tk-col-summary">
                {t.summary}
                {t.requesterResolvedAt && (
                  <div className="mt-1">
                    <ResolvedMarker />
                  </div>
                )}
              </td>
              {!tablet && <td>{t.category.name}</td>}
              {!tablet && <td><PriorityBadge value={t.requestedPriority} /></td>}
              <td><PriorityBadge value={t.itPriority} it /></td>
              <td><StatusBadge value={t.currentStatus} /></td>
              <td className={t.owner ? undefined : "tk-owner-cell-pale"}>
                <OwnerValue owner={t.owner} currentUserId={currentUserId} />
              </td>
              <td className="tk-nowrap">{formatDisplayTimestamp(t.updatedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ui-spec 15.4 - cards below md, one per Ticket, the whole card the link target.
function QueueCards({ rows, currentUserId }: { rows: QueueRow[]; currentUserId: number }) {
  return (
    <ul className="list-unstyled tk-card-list">
      {rows.map((t) => (
        <li key={t.id}>
          <Link to={`/queue/${t.id}`} className="card tk-card tk-ticket-card" aria-label={`Open ${t.ticketNumber}`}>
            <div className="d-flex justify-content-between align-items-start gap-2">
              <span className="tk-ticket-card-number">{t.ticketNumber}</span>
              <StatusBadge value={t.currentStatus} />
            </div>
            <p className="tk-ticket-card-summary">{t.summary}</p>
            <div className="d-flex gap-1">
              <PriorityBadge value={t.itPriority} it />
              <PriorityBadge value={t.requestedPriority} />
            </div>
            <div>
              <span className="tk-label">Owner:</span> <OwnerValue owner={t.owner} currentUserId={currentUserId} />
            </div>
            <div className="tk-muted">Updated {formatDisplayTimestamp(t.updatedAt)}</div>
            {t.requesterResolvedAt && (
              <div className="mt-1">
                <ResolvedMarker />
              </div>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}

// 15.5: five skeleton rows at table widths (tablet and desktop), three
// skeleton cards on mobile.
function QueueSkeleton({ wide }: { wide: boolean }) {
  return (
    <div className="tk-skeleton" aria-hidden="true">
      {wide ? (
        <div className="card tk-card">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="tk-skeleton-row" />
          ))}
        </div>
      ) : (
        <div className="tk-card-list">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card tk-card tk-skeleton-card" />
          ))}
        </div>
      )}
    </div>
  );
}

function DocumentIcon() {
  return (
    <svg className="tk-empty-icon" viewBox="0 0 24 24" width="40" height="40" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M7 3h7l5 5v13H7z" /><path d="M14 3v5h5" /><path d="M9 13h6M9 17h6" />
    </svg>
  );
}

function MagnifierIcon() {
  return (
    <svg className="tk-empty-icon" viewBox="0 0 24 24" width="40" height="40" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5 21 21" />
    </svg>
  );
}
