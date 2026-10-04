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

export function StatusBadge({ value }: { value: TicketStatus }) {
  return (
    <span className={`tk-badge tk-badge-square ${value === "NEW" ? "tk-status-new" : "tk-status-other"}`}>
      {titleCase(value)}
    </span>
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
