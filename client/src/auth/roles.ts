import type { UserRole } from "../api.js";

// ui-spec.md section 9.1 - what each role may reach, and where it lands.
// The shell's navigation and App's route guard both read this one table, so a
// destination the navigation never offers is also one the guard refuses
// (BR-36, FR-10). The guard is feedback; the server's 403 is the control
// (BR-40).

export type Destination = "myTickets" | "createTicket" | "ticketDetail" | "queue" | "users";

export const LANDING: Record<UserRole, string> = {
  REQUESTER: "/tickets",
  IT_STAFF: "/queue",
  ADMINISTRATOR: "/queue",
};

export const LANDING_LABEL: Record<UserRole, string> = {
  REQUESTER: "My Tickets",
  IT_STAFF: "the Ticket Queue",
  ADMINISTRATOR: "the Ticket Queue",
};

const ALLOWED: Record<Destination, readonly UserRole[]> = {
  myTickets: ["REQUESTER"],
  createTicket: ["REQUESTER"],
  ticketDetail: ["REQUESTER"],
  queue: ["IT_STAFF", "ADMINISTRATOR"],
  users: ["ADMINISTRATOR"],
};

export function mayReach(role: UserRole, destination: Destination): boolean {
  return ALLOWED[destination].includes(role);
}

export interface NavItem {
  to: string;
  label: string;
  matches: (path: string) => boolean;
}

export const NAV_ITEMS: Record<UserRole, NavItem[]> = {
  REQUESTER: [
    { to: "/tickets", label: "My Tickets", matches: (p) => p.startsWith("/tickets") && p !== "/tickets/new" },
    { to: "/tickets/new", label: "Create Ticket", matches: (p) => p === "/tickets/new" },
  ],
  IT_STAFF: [{ to: "/queue", label: "Ticket Queue", matches: (p) => p.startsWith("/queue") }],
  ADMINISTRATOR: [
    { to: "/queue", label: "Ticket Queue", matches: (p) => p.startsWith("/queue") },
    { to: "/users", label: "User Management", matches: (p) => p.startsWith("/users") },
  ],
};
