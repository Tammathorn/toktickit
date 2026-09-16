import { useEffect, useMemo, useState } from "react";
import {
  ApiError,
  fetchCategories,
  fetchRelatedSystems,
  fetchTickets,
  type Category,
  type RelatedSystem,
  type TicketListPage,
  type TicketListRow,
} from "../api.js";
import { Link, useRouter } from "../router.js";
import { useRequester } from "../requester/RequesterContext.js";
import { formatDisplayTimestamp } from "../format.js";
import { messageForCode } from "../validation.js";
import { PriorityBadge, StatusBadge } from "../components/Badge.js";
import { useMediaQuery, MD_AND_UP } from "../useMediaQuery.js";

// My Tickets - ui-spec.md section 12, LS 8.4.
//
// Every toolbar control maps to one api-spec.md 3.2 query parameter, and the
// whole query lives in the address bar: reloading, sharing or hand-editing the
// URL reproduces the same list, and a bad hand-edited value reaches the
// INVALID_QUERY_PARAM panel (6.1). Ownership is the server's job (BR-20): the
// client only supplies the stored requesterId, and a Requester switch remounts
// this screen (App keys the shell by Requester id), which discards A's rows
// and fetches B's (BR-14).

const SORT_OPTIONS: Array<[string, string]> = [
  ["createdAt:desc", "Newest first"],
  ["createdAt:asc", "Oldest first"],
  ["ticketNumber:asc", "Ticket Number, ascending"],
  ["ticketNumber:desc", "Ticket Number, descending"],
  ["summary:asc", "Ticket Summary, A to Z"],
  ["summary:desc", "Ticket Summary, Z to A"],
  ["currentStatus:asc", "Current Status, A to Z"],
  ["currentStatus:desc", "Current Status, Z to A"],
];
const STATUS_OPTIONS: Array<[string, string]> = [
  ["NEW", "New"],
  ["IN_PROGRESS", "In Progress"],
  ["RESOLVED", "Resolved"],
  ["CLOSED", "Closed"],
  ["CANCELLED", "Cancelled"],
];
const PAGE_SIZES = [10, 25, 50];
const SEARCH_DEBOUNCE_MS = 300;

interface ListState {
  search: string;
  categoryId: string;
  relatedSystemId: string;
  currentStatus: string;
  sort: string;
  page: number;
  pageSize: number;
}

function readState(search: string): ListState {
  const p = new URLSearchParams(search);
  const int = (name: string, fallback: number) => {
    const v = p.get(name);
    return v !== null && /^\d+$/.test(v) && Number(v) > 0 ? Number(v) : fallback;
  };
  return {
    search: p.get("search") ?? "",
    categoryId: p.get("categoryId") ?? "",
    relatedSystemId: p.get("relatedSystemId") ?? "",
    currentStatus: p.get("currentStatus") ?? "",
    sort: p.get("sort") ?? "createdAt:desc",
    page: int("page", 1),
    pageSize: int("pageSize", 10),
  };
}

function toSearch(state: ListState): string {
  const p = new URLSearchParams();
  if (state.search) p.set("search", state.search);
  if (state.categoryId) p.set("categoryId", state.categoryId);
  if (state.relatedSystemId) p.set("relatedSystemId", state.relatedSystemId);
  if (state.currentStatus) p.set("currentStatus", state.currentStatus);
  if (state.sort !== "createdAt:desc") p.set("sort", state.sort);
  if (state.page !== 1) p.set("page", String(state.page));
  if (state.pageSize !== 10) p.set("pageSize", String(state.pageSize));
  const s = p.toString();
  return s ? `?${s}` : "";
}

function filtersActive(state: ListState): boolean {
  return Boolean(state.search || state.categoryId || state.relatedSystemId || state.currentStatus);
}

type LoadState =
  | { kind: "loading" }
  | { kind: "ready"; page: TicketListPage }
  | { kind: "invalid-query" }
  | { kind: "error" };

export default function MyTickets() {
  const { selected } = useRequester();
  const requesterId = selected!.id;
  const { search: locationSearch, navigate } = useRouter();

  const state = useMemo(() => readState(locationSearch), [locationSearch]);
  const [load, setLoad] = useState<LoadState>({ kind: "loading" });
  const [reloadToken, setReloadToken] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [systems, setSystems] = useState<RelatedSystem[]>([]);
  const [searchText, setSearchText] = useState(state.search);
  const wide = useMediaQuery(MD_AND_UP);

  // Toolbar reference data (FR-11 applies to these selects too).
  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchCategories(), fetchRelatedSystems()]).then(
      ([cats, syss]) => {
        if (cancelled) return;
        setCategories(cats);
        setSystems(syss);
      },
      () => {
        // The selects stay empty; the list itself still loads.
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  // The list request: one per address-bar state (and per Retry).
  useEffect(() => {
    let cancelled = false;
    setLoad({ kind: "loading" });
    fetchTickets(requesterId, {
      search: state.search,
      categoryId: state.categoryId,
      relatedSystemId: state.relatedSystemId,
      currentStatus: state.currentStatus,
      sort: state.sort,
      page: state.page,
      pageSize: state.pageSize,
    }).then(
      (page) => {
        if (!cancelled) setLoad({ kind: "ready", page });
      },
      (err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.code === "INVALID_QUERY_PARAM") setLoad({ kind: "invalid-query" });
        else setLoad({ kind: "error" });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [requesterId, state, reloadToken]);

  // Search is debounced 300 ms into the address (ui-spec 12.1) and resets page.
  useEffect(() => {
    if (searchText === state.search) return;
    const handle = window.setTimeout(() => {
      apply({ search: searchText.trim(), page: 1 });
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);

  function apply(patch: Partial<ListState>) {
    navigate(`/tickets${toSearch({ ...state, ...patch })}`, { replace: true });
  }

  function clearFilters() {
    setSearchText("");
    navigate("/tickets", { replace: true });
  }

  const active = filtersActive(state);
  const ready = load.kind === "ready" ? load.page : null;
  const first = ready && ready.meta.total > 0 ? (ready.meta.page - 1) * ready.meta.pageSize + 1 : 0;
  const last = ready ? Math.min(ready.meta.page * ready.meta.pageSize, ready.meta.total) : 0;

  return (
    <section aria-labelledby="my-tickets-title">
      <h1 id="my-tickets-title" className="tk-title">My Tickets</h1>

      {/* Toolbar - ui-spec 12.1; kept on every state so filters are never lost */}
      <div className="card tk-card tk-toolbar mb-3" role="search" aria-label="Search and filter tickets">
        <div className="row g-3">
          <div className="col-12 col-lg-4">
            <label htmlFor="list-search" className="form-label tk-label">Search</label>
            <input
              id="list-search"
              type="search"
              className="form-control"
              placeholder="Ticket Number or Ticket Summary"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>
          <div className="col-12 col-md-4 col-lg-2">
            <label htmlFor="list-category" className="form-label tk-label">Category</label>
            <select id="list-category" className="form-select" value={state.categoryId} onChange={(e) => apply({ categoryId: e.target.value, page: 1 })}>
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="col-12 col-md-4 col-lg-2">
            <label htmlFor="list-system" className="form-label tk-label">Related System</label>
            <select id="list-system" className="form-select" value={state.relatedSystemId} onChange={(e) => apply({ relatedSystemId: e.target.value, page: 1 })}>
              <option value="">All related systems</option>
              {systems.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="col-12 col-md-4 col-lg-2">
            <label htmlFor="list-status" className="form-label tk-label">Current Status</label>
            <select id="list-status" className="form-select" value={state.currentStatus} onChange={(e) => apply({ currentStatus: e.target.value, page: 1 })}>
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div className="col-12 col-md-6 col-lg-2">
            <label htmlFor="list-sort" className="form-label tk-label">Sort</label>
            <select id="list-sort" className="form-select" value={state.sort} onChange={(e) => apply({ sort: e.target.value, page: 1 })}>
              {SORT_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>
        {active && (
          <div className="mt-3">
            <button type="button" className="btn btn-secondary" onClick={clearFilters}>Clear filters</button>
          </div>
        )}
      </div>

      <div
        className="tk-list-region"
        role="region"
        aria-label="Ticket list"
        aria-busy={load.kind === "loading" ? "true" : undefined}
        aria-live="polite"
      >
        {load.kind === "loading" && <ListSkeleton wide={wide} />}

        {load.kind === "error" && (
          <div className="tk-panel tk-panel-danger" role="alert" aria-live="assertive">
            <p>{messageForCode("INTERNAL_ERROR")}</p>
            <button type="button" className="btn btn-secondary" onClick={() => setReloadToken((n) => n + 1)}>Retry</button>
          </div>
        )}

        {load.kind === "invalid-query" && (
          <div className="tk-panel tk-panel-danger" role="alert" aria-live="assertive">
            <p>{messageForCode("INVALID_QUERY_PARAM")}</p>
            <button type="button" className="btn btn-secondary" onClick={clearFilters}>Clear filters</button>
          </div>
        )}

        {ready && ready.data.length === 0 && !active && ready.meta.total === 0 && (
          <div className="card tk-card tk-empty text-center">
            <DocumentIcon />
            <h2 className="tk-section-title">No tickets yet</h2>
            <p>You have not created any tickets. Create your first one to get started.</p>
            <Link to="/tickets/new" className="btn btn-primary align-self-center">Create Ticket</Link>
          </div>
        )}

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
            {wide ? (
            <div className="card tk-card tk-table-card">
              <table className="table tk-table mb-0">
                <thead>
                  <tr>
                    <th scope="col">Ticket Number</th>
                    <th scope="col" className="tk-col-summary">Ticket Summary</th>
                    <th scope="col" className="d-none d-lg-table-cell">Category</th>
                    <th scope="col" className="d-none d-lg-table-cell">Requested Priority</th>
                    <th scope="col">Current Status</th>
                    <th scope="col">Last Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {ready.data.map((t) => (
                    <TicketRow key={t.id} ticket={t} onOpen={() => navigate(`/tickets/${t.id}`)} />
                  ))}
                </tbody>
              </table>
            </div>
            ) : (
            <ul className="list-unstyled tk-card-list">
              {ready.data.map((t) => (
                <li key={t.id}>
                  <Link to={`/tickets/${t.id}`} className="card tk-card tk-ticket-card" aria-label={`Open ${t.ticketNumber}`}>
                    <div className="d-flex justify-content-between align-items-start gap-2">
                      <span className="tk-ticket-card-number">{t.ticketNumber}</span>
                      <StatusBadge value={t.currentStatus} />
                    </div>
                    <p className="tk-ticket-card-summary">{t.summary}</p>
                    <div className="d-flex justify-content-between align-items-center gap-2">
                      <span>{t.category.name}</span>
                      <PriorityBadge value={t.requestedPriority} />
                    </div>
                    <div className="tk-muted">Last Updated {formatDisplayTimestamp(t.updatedAt)}</div>
                  </Link>
                </li>
              ))}
            </ul>
            )}

            <nav className="tk-pagination d-flex flex-wrap align-items-center justify-content-between gap-2 mt-3" aria-label="Pagination">
              <span aria-live="polite">{`Showing ${first} to ${last} of ${ready.meta.total} tickets`}</span>
              <div className="d-flex align-items-center gap-2">
                <label htmlFor="list-page-size" className="tk-label mb-0">Per page</label>
                <select id="list-page-size" className="form-select tk-page-size" value={state.pageSize} onChange={(e) => apply({ pageSize: Number(e.target.value), page: 1 })}>
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

function TicketRow({ ticket: t, onOpen }: { ticket: TicketListRow; onOpen: () => void }) {
  return (
    <tr
      className="tk-row"
      onClick={(e) => {
        // The row is the click target (12.2); the anchor inside handles keyboard
        // and modified clicks itself.
        if ((e.target as HTMLElement).closest("a")) return;
        onOpen();
      }}
    >
      <td>
        <Link to={`/tickets/${t.id}`} className="tk-row-link" aria-label={`Open ${t.ticketNumber}`}>
          {t.ticketNumber}
        </Link>
      </td>
      <td className="tk-col-summary">{t.summary}</td>
      <td className="d-none d-lg-table-cell">{t.category.name}</td>
      <td className="d-none d-lg-table-cell"><PriorityBadge value={t.requestedPriority} /></td>
      <td><StatusBadge value={t.currentStatus} /></td>
      <td className="tk-nowrap">{formatDisplayTimestamp(t.updatedAt)}</td>
    </tr>
  );
}

// 12.5: five skeleton rows at table widths, three skeleton cards on mobile.
function ListSkeleton({ wide }: { wide: boolean }) {
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
