import type * as api from "../../src/api.js";

// Lab 4 adapts the Lab 2-3 fixtures (tests.md 4.1): the Ticket DTOs gained
// version, lastActivityAt, resolvedAt, actions, statusHistory and
// historyComplete (api-spec.md 6.1), and the staff DTO allowedTransitions and
// resolutionGate (6.2). These are the values a Lab 3-era Ticket carries: no
// actions, no history, and the gate met so nothing about Lab 3's assertions
// changes. The matrix below stands in for the server in these mocked tests
// only - the screen itself holds no copy of it (ui-spec 9.1).

export const MATRIX: Record<api.TicketStatus, api.TicketStatus[]> = {
  NEW: ["OPEN", "IN_PROGRESS", "CANCELLED"],
  OPEN: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  IN_PROGRESS: ["OPEN", "WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  WAITING_FOR_REQUESTER: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
  RESOLVED: ["CLOSED", "REOPENED"],
  CLOSED: [],
  REOPENED: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  CANCELLED: [],
};

export function lab4Fields(updatedAt: string) {
  return {
    version: 0,
    lastActivityAt: updatedAt,
    resolvedAt: null,
    actions: [],
    statusHistory: [],
    historyComplete: false,
  };
}

// Completes a staff fixture after its overrides, so allowedTransitions follows
// whatever currentStatus the test chose, unless the test set it itself.
export function withStaffLab4<T extends Omit<api.StaffTicket, "allowedTransitions" | "resolutionGate"> & Partial<api.StaffTicket>>(t: T): api.StaffTicket {
  return {
    ...t,
    allowedTransitions: t.allowedTransitions ?? MATRIX[t.currentStatus],
    resolutionGate: t.resolutionGate ?? { met: true, reasons: [] },
  } as api.StaffTicket;
}
