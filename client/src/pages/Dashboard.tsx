import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import {
  fetchRequesterDashboard,
  fetchStaffDashboard,
  type DashboardCard,
  type DashboardTicketItem,
  type PlannedActionItem,
  type RequesterDashboard,
  type StaffDashboard,
  type TicketStatus,
  type UserCountCard,
} from "../api.js";
import { useCurrentUser } from "../auth/AuthContext.js";
import { Link } from "../router.js";
import { formatDisplayTimestamp } from "../format.js";
import { INTERNAL_ERROR_MESSAGE } from "../validation.js";
import { PriorityBadge, ResolvedMarker, StatusBadge } from "../components/Badge.js";

// ===========================================================================
// Dashboard - ui-spec.md sections 6 and 7 (LS 8.1, 8.2; FR-18 to FR-20). One
// route, /dashboard, serving each role its own dashboard (C-180). Every number
// comes from the API, computed at request time (BR-52); the client never
// counts. Each card is one link to its drill-down, whose list total equals the
// card (BR-56). Load on open plus a manual Refresh; no polling (BR-58).
// ===========================================================================

type Load<T> = { kind: "loading" } | { kind: "ready"; data: T } | { kind: "error" };

const CARD_STATUS: Record<string, TicketStatus> = {
  statusNew: "NEW",
  statusOpen: "OPEN",
  statusInProgress: "IN_PROGRESS",
  statusWaitingForRequester: "WAITING_FOR_REQUESTER",
  statusReopened: "REOPENED",
  statusResolved: "RESOLVED",
  waitingForYou: "WAITING_FOR_REQUESTER",
};

// The accessible name says label, number and destination (ui-spec 6).
const DESTINATION: Record<string, string> = {
  unassigned: "the Ticket Queue filtered to unassigned tickets",
  mine: "the Ticket Queue filtered to your tickets",
  highItPriority: "the Ticket Queue filtered to High IT Priority",
  requesterSaysResolved: "the Ticket Queue filtered to tickets the Requester says are resolved",
  openTickets: "My Tickets filtered to open tickets",
  waitingForYou: "My Tickets filtered to tickets waiting for you",
  resolvedAwaitingClosure: "My Tickets filtered to resolved tickets",
  closed: "My Tickets filtered to closed tickets",
};

function destinationFor(card: DashboardCard): string {
  if (card.key === "myPlannedActions") return "Go to My planned actions on this page.";
  if (DESTINATION[card.key]) return `Open ${DESTINATION[card.key]}.`;
  return `Open the Ticket Queue filtered to ${card.label}.`;
}

function focusMyActions() {
  const heading = document.getElementById("my-actions-title");
  heading?.scrollIntoView?.({ block: "start" });
  heading?.focus();
}

function MetricCard({ card }: { card: DashboardCard }) {
  const status = CARD_STATUS[card.key];
  const body = (
    <>
      <span className="tk-metric-label">
        {card.label}
        {status && <> <StatusBadge value={status} /></>}
        {card.key === "requesterSaysResolved" && <> <ResolvedMarker /></>}
      </span>
      <span className="tk-metric-count">{card.count}</span>
      <span className="tk-muted tk-metric-more">View list <span aria-hidden="true">›</span></span>
    </>
  );
  const name = `${card.label}: ${card.count}. ${destinationFor(card)}`;
  if (card.drillDown.startsWith("/dashboard#")) {
    return (
      <a
        href={card.drillDown}
        className="tk-metric-card"
        aria-label={name}
        onClick={(e: MouseEvent<HTMLAnchorElement>) => {
          e.preventDefault();
          window.history.replaceState({}, "", "/dashboard#my-actions");
          focusMyActions();
        }}
      >
        {body}
      </a>
    );
  }
  return (
    <Link to={card.drillDown} className="tk-metric-card" aria-label={name}>
      {body}
    </Link>
  );
}

function UserCard({ card }: { card: UserCountCard }) {
  const label = card.label;
  return (
    <Link
      to={card.drillDown}
      className="tk-metric-card"
      aria-label={`${label}: ${card.count} accounts, ${card.activeCount} active. Open User Management filtered to ${label}.`}
    >
      <span className="tk-metric-label">{label}</span>
      <span className="tk-metric-count">{card.count}</span>
      <span className="tk-muted tk-metric-more">{`${card.activeCount} active`}</span>
    </Link>
  );
}

function EmptyLine({ text }: { text: string }) {
  return (
    <p className="tk-muted d-flex align-items-center gap-2 mb-0">
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
        <path d="M4 1.5h5.5L12.5 4.5v10h-8.5z" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
      </svg>
      {text}
    </p>
  );
}

function TicketList({
  title,
  items,
  viewAll,
  empty,
  linkBase,
  timeLabel,
  timeOf,
}: {
  title: string;
  items: DashboardTicketItem[];
  viewAll: string | null;
  empty: string;
  linkBase: "/queue" | "/tickets";
  timeLabel: string;
  timeOf: (i: DashboardTicketItem) => string | undefined;
}) {
  const headingId = `list-${title.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <section className="card tk-card mb-3" aria-labelledby={headingId}>
      <h2 id={headingId} className="tk-section-title">{title}</h2>
      {items.length === 0 ? (
        <EmptyLine text={empty} />
      ) : (
        <ol className="list-unstyled tk-dash-list mb-0">
          {items.map((i) => {
            const t = timeOf(i);
            return (
              <li key={i.id} className="tk-dash-row">
                <Link to={`${linkBase}/${i.id}`} className="fw-semibold">{i.ticketNumber}</Link>
                <span className="tk-dash-summary">{i.summary}</span>
                <span className="d-flex flex-wrap gap-1 align-items-center">
                  <StatusBadge value={i.currentStatus} />
                  <PriorityBadge value={i.itPriority} it />
                  {t && <span className="tk-muted small">{`${timeLabel} ${formatDisplayTimestamp(t)}`}</span>}
                </span>
              </li>
            );
          })}
        </ol>
      )}
      {viewAll && (
        <p className="mt-2 mb-0">
          <Link to={viewAll}>View all</Link>
        </p>
      )}
    </section>
  );
}

function PlannedPanel({ items }: { items: PlannedActionItem[] }) {
  return (
    <section id="my-actions" className="card tk-card mb-3" aria-labelledby="my-actions-title">
      <h2 id="my-actions-title" className="tk-section-title" tabIndex={-1}>My planned actions</h2>
      {items.length === 0 ? (
        <EmptyLine text="No planned actions are assigned to you." />
      ) : (
        <ol className="list-unstyled tk-dash-list mb-0">
          {items.map((a) => (
            <li key={a.id} className="tk-dash-row">
              <span className="tk-muted small">{formatDisplayTimestamp(a.actionAt)}</span>
              <span className="tk-dash-summary tk-clamp-2">{a.description}</span>
              <span className="d-flex flex-wrap gap-1 align-items-center">
                <Link to={`/queue/${a.ticket.id}`} className="fw-semibold">{a.ticket.ticketNumber}</Link>
                <StatusBadge value={a.ticket.currentStatus} />
              </span>
            </li>
          ))}
        </ol>
      )}
      <p className="tk-muted mt-2 mb-0">{`${items.length} planned action${items.length === 1 ? "" : "s"}`}</p>
    </section>
  );
}

function QuickActions({ items }: { items: { to: string; label: string; icon: "search" | "queue" | "plus" }[] }) {
  const icons = {
    search: <path d="M7 12A5 5 0 1 0 7 2a5 5 0 0 0 0 10ZM10.5 10.5 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />,
    queue: <path d="M2.5 4h11M2.5 8h11M2.5 12h7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />,
    plus: <path d="M8 2.5v11M2.5 8h11" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />,
  };
  return (
    <section className="card tk-card mb-3" aria-labelledby="quick-actions-title">
      <h2 id="quick-actions-title" className="tk-section-title">Quick Actions</h2>
      <div className="d-flex flex-wrap gap-2">
        {items.map((q) => (
          <Link key={q.to} to={q.to} className="btn tk-btn-tertiary tk-quick-action">
            <svg className="me-1" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">{icons[q.icon]}</svg>
            {q.label}
          </Link>
        ))}
      </div>
    </section>
  );
}

function Header({ generatedAt, busy, onRefresh }: { generatedAt?: string; busy: boolean; onRefresh: () => void }) {
  return (
    <div className="d-flex flex-wrap align-items-start justify-content-between gap-2 mb-3">
      <div>
        <h1 className="tk-title mb-0">Dashboard</h1>
        {/* ui-spec 14, STYLE-10: a Refresh announces the new time politely. */}
        <p className="tk-muted mb-0" aria-live="polite">{generatedAt ? `Updated ${formatDisplayTimestamp(generatedAt)} (Asia/Bangkok)` : ""}</p>
      </div>
      <button type="button" className="btn btn-secondary" onClick={onRefresh} disabled={busy} aria-busy={busy ? "true" : undefined}>
        {busy ? "Refreshing…" : "Refresh"}
      </button>
    </div>
  );
}

function Skeleton({ cards }: { cards: number }) {
  return (
    <div aria-busy="true" role="region" aria-label="Dashboard loading">
      <div className="tk-metric-grid mb-3">
        {Array.from({ length: cards }, (_, i) => (
          <div key={i} className="tk-metric-card tk-skeleton-row" />
        ))}
      </div>
      <div className="card tk-card tk-skeleton"><div className="tk-skeleton-row" /><div className="tk-skeleton-row" /></div>
    </div>
  );
}

function Failure({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="tk-panel tk-panel-danger" role="alert" aria-live="assertive">
      <p>{INTERNAL_ERROR_MESSAGE}</p>
      <button type="button" className="btn btn-secondary" onClick={onRetry}>Retry</button>
    </div>
  );
}

function useDashboard<T>(load: () => Promise<T>) {
  const [state, setState] = useState<Load<T>>({ kind: "loading" });
  const [busy, setBusy] = useState(true);
  const live = useRef(true);
  const run = useCallback(() => {
    setBusy(true);
    load().then(
      (data) => live.current && setState({ kind: "ready", data }),
      () => live.current && setState({ kind: "error" }),
    ).finally(() => live.current && setBusy(false));
  }, [load]);
  useEffect(() => {
    live.current = true;
    run();
    return () => {
      live.current = false;
    };
  }, [run]);
  return { state, busy, refresh: run };
}

function StaffView() {
  const { state, busy, refresh } = useDashboard<StaffDashboard>(fetchStaffDashboard);
  // Arriving at /dashboard#my-actions moves focus to the panel (ui-spec 6).
  useEffect(() => {
    if (state.kind === "ready" && window.location.hash === "#my-actions") focusMyActions();
  }, [state.kind]);
  return (
    <section aria-label="Dashboard">
      <Header generatedAt={state.kind === "ready" ? state.data.generatedAt : undefined} busy={busy} onRefresh={refresh} />
      {state.kind === "loading" && <Skeleton cards={11} />}
      {state.kind === "error" && <Failure onRetry={refresh} />}
      {state.kind === "ready" && (
        <>
          <div className="tk-metric-grid tk-metric-grid-staff mb-3" role="list" aria-label="Ticket metrics">
            {state.data.cards.map((c) => (
              <div role="listitem" key={c.key}><MetricCard card={c} /></div>
            ))}
          </div>
          {state.data.userCounts && (
            <section className="mb-3" aria-labelledby="user-accounts-title">
              <h2 id="user-accounts-title" className="tk-section-title">User accounts</h2>
              <div className="tk-metric-grid tk-metric-grid-users" role="list" aria-label="User accounts">
                {state.data.userCounts.map((c) => (
                  <div role="listitem" key={c.key}><UserCard card={c} /></div>
                ))}
              </div>
            </section>
          )}
          <div className="row g-3">
            <div className="col-12 col-lg-6">
              <PlannedPanel items={state.data.lists.myPlannedActions.items} />
              <QuickActions
                items={[
                  { to: "/queue", label: "Search Tickets", icon: "search" },
                  { to: "/queue?owner=me", label: "My Queue", icon: "queue" },
                ]}
              />
            </div>
            <div className="col-12 col-lg-6">
              <TicketList
                title="Recently updated"
                items={state.data.lists.recentlyUpdated.items}
                viewAll={state.data.lists.recentlyUpdated.viewAll}
                empty="No tickets were updated in the last 7 days."
                linkBase="/queue"
                timeLabel="Last updated"
                timeOf={(i) => i.lastActivityAt}
              />
              <TicketList
                title="Urgent"
                items={state.data.lists.urgent.items}
                viewAll={state.data.lists.urgent.viewAll}
                empty="No High IT Priority tickets are open."
                linkBase="/queue"
                timeLabel="Created"
                timeOf={(i) => i.createdAt}
              />
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function RequesterView() {
  const { state, busy, refresh } = useDashboard<RequesterDashboard>(fetchRequesterDashboard);
  return (
    <section aria-label="Dashboard">
      <Header generatedAt={state.kind === "ready" ? state.data.generatedAt : undefined} busy={busy} onRefresh={refresh} />
      {state.kind === "loading" && <Skeleton cards={4} />}
      {state.kind === "error" && <Failure onRetry={refresh} />}
      {state.kind === "ready" && (
        <>
          <div className="tk-metric-grid tk-metric-grid-requester mb-3" role="list" aria-label="Your ticket metrics">
            {state.data.cards.map((c) => (
              <div role="listitem" key={c.key}><MetricCard card={c} /></div>
            ))}
          </div>
          <div className="row g-3">
            <div className="col-12 col-lg-6">
              <TicketList
                title="Recently updated"
                items={state.data.lists.recentlyUpdated.items}
                viewAll={state.data.lists.recentlyUpdated.viewAll}
                empty="None of your tickets changed in the last 7 days."
                linkBase="/tickets"
                timeLabel="Last updated"
                timeOf={(i) => i.lastActivityAt}
              />
            </div>
            <div className="col-12 col-lg-6">
              <TicketList
                title="Recently resolved"
                items={state.data.lists.recentlyResolved.items}
                viewAll={null}
                empty="None of your tickets were resolved in the last 7 days."
                linkBase="/tickets"
                timeLabel="Resolved"
                timeOf={(i) => i.resolvedAt}
              />
              <QuickActions items={[{ to: "/tickets/new", label: "Create Ticket", icon: "plus" }]} />
            </div>
          </div>
        </>
      )}
    </section>
  );
}

export default function Dashboard() {
  const user = useCurrentUser();
  return user.role === "REQUESTER" ? <RequesterView /> : <StaffView />;
}
