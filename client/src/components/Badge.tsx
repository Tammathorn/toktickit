import type { RequestedPriority, TicketStatus, UserRole } from "../api.js";

// One badge component for Requested Priority, IT Priority and Current Status
// (ui-spec.md section 8). Every badge carries its value as title-case text;
// priority badges are pills, status badges square-cornered, so the families
// differ in shape as well as colour (FR-48, AC-58).

export function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function PriorityBadge({ value, it = false }: { value: RequestedPriority; it?: boolean }) {
  return (
    <span className={`tk-badge tk-badge-pill tk-priority-${value.toLowerCase()}`}>
      {it ? `IT ${titleCase(value)}` : titleCase(value)}
    </span>
  );
}

// ui-spec.md 8.2 - all eight values, each its own treatment (BR-52, C-70).
// Display text is the exact label the table names, not a generic title-case
// of the enum: "Waiting for Requester" keeps "for" lowercase.
export const STATUS_LABELS: Record<TicketStatus, string> = {
  NEW: "New",
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  WAITING_FOR_REQUESTER: "Waiting for Requester",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
  REOPENED: "Reopened",
  CANCELLED: "Cancelled",
};
const STATUS_CLASSES: Record<TicketStatus, string> = {
  NEW: "tk-status-new",
  OPEN: "tk-status-open",
  IN_PROGRESS: "tk-status-in-progress",
  WAITING_FOR_REQUESTER: "tk-status-waiting",
  RESOLVED: "tk-status-resolved",
  CLOSED: "tk-status-closed",
  REOPENED: "tk-status-reopened",
  CANCELLED: "tk-status-cancelled",
};

export function StatusBadge({ value }: { value: TicketStatus }) {
  return <span className={`tk-badge tk-badge-square ${STATUS_CLASSES[value]}`}>{STATUS_LABELS[value]}</span>;
}

// ui-spec.md 8.5 - the resolution marker. Never styled as a status badge and
// never placed in the status column (BR-59, C-76): it is a flag, not a status.
export function ResolvedMarker() {
  return (
    <span className="tk-badge tk-badge-square tk-resolved-marker">
      <CheckOutlineIcon />
      Requester says resolved
    </span>
  );
}

function CheckOutlineIcon() {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.75">
      <circle cx="8" cy="8" r="6.25" />
      <path d="M5.25 8.25 7 10l3.75-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ui-spec.md section 8.4 - the fourth family. Square-cornered like a status,
// but outlined with no fill, so it is told apart from a status by shape as well
// as colour. Glossary spellings only: never "Admin" or "ITStaff" (C-92).
const ROLE_LABELS: Record<UserRole, string> = {
  REQUESTER: "Requester",
  IT_STAFF: "IT Staff",
  ADMINISTRATOR: "Administrator",
};

export function RoleBadge({ value }: { value: UserRole }) {
  return (
    <span className={`tk-badge tk-badge-square tk-badge-role tk-role-${value.toLowerCase().replace("_", "-")}`}>
      {ROLE_LABELS[value]}
    </span>
  );
}
