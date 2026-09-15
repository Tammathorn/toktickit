import type { RequestedPriority, TicketStatus } from "../api.js";

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
