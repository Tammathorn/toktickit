import type { TicketStatus } from "@prisma/client";

// specification.md section 5.1 as data - the one place the transition matrix
// lives. UNIT-12 asserts all 64 cells against it and API-64 walks them over
// HTTP. Every transition here is made by an IT Staff or Administrator user and
// by nobody else (BR-54); the Requester's "Problem Appears Resolved" flag is
// not a transition and appears nowhere here (BR-59).

const PERMITTED: Record<TicketStatus, readonly TicketStatus[]> = {
  NEW: ["OPEN", "IN_PROGRESS", "CANCELLED"],
  OPEN: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  IN_PROGRESS: ["OPEN", "WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  WAITING_FOR_REQUESTER: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
  RESOLVED: ["CLOSED", "REOPENED"],
  // C-98 - both terminal: nothing leaves either.
  CLOSED: [],
  REOPENED: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  CANCELLED: [],
};

export const TICKET_STATUSES: readonly TicketStatus[] = [
  "NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CLOSED", "REOPENED", "CANCELLED",
];

// The starred statuses of 5.1: a Ticket in one must have a Ticket Owner, so
// the move in needs one and the Ticket cannot be unassigned there (BR-97,
// C-93, C-104).
export const WORKED_STATUSES: readonly TicketStatus[] = ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED"];

// Read-only for every role (BR-108, C-109).
export const TERMINAL_STATUSES: readonly TicketStatus[] = ["CLOSED", "CANCELLED"];

// A move to one of these clears the Requester's resolution flag, and only
// these do (BR-61, C-76).
export const CLEARS_RESOLUTION_FLAG: readonly TicketStatus[] = ["RESOLVED", "CLOSED", "CANCELLED"];

// Where the Requester may say "Problem Appears Resolved" (BR-60, C-76).
export const RESOLUTION_FLAG_STATUSES: readonly TicketStatus[] = ["OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "REOPENED"];

// The display names the INVALID_STATUS_TRANSITION message uses (ui-spec.md 6.2).
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

// The diagonal is false here: a same-status move is not a transition, and the
// route refuses it 400 SAME_STATUS before consulting this (BR-56, C-77).
export function isPermittedTransition(from: TicketStatus, to: TicketStatus): boolean {
  return PERMITTED[from].includes(to);
}

export function isTerminal(status: TicketStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}
