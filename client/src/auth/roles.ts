import type { UserRole } from "../api.js";

// ui-spec.md section 9.1 - what each role may reach, and where it lands.
// The shell's navigation and App's route guard both read this one table, so a
// destination the navigation never offers is also one the guard refuses
// (BR-36, FR-10). The guard is feedback; the server's 403 is the control
// (BR-40).

export type Destination = "dashboard" | "myTickets" | "createTicket" | "ticketDetail" | "queue" | "staffTicketDetail" | "users";

// Lab 4 (C-144, ui-spec 2): every role lands on its Dashboard.
export const LANDING: Record<UserRole, string> = {
  REQUESTER: "/dashboard",
  IT_STAFF: "/dashboard",
  ADMINISTRATOR: "/dashboard",
};

export const LANDING_LABEL: Record<UserRole, string> = {
  REQUESTER: "Dashboard",
  IT_STAFF: "Dashboard",
  ADMINISTRATOR: "Dashboard",
};

const ALLOWED: Record<Destination, readonly UserRole[]> = {
  dashboard: ["REQUESTER", "IT_STAFF", "ADMINISTRATOR"],
  myTickets: ["REQUESTER"],
  createTicket: ["REQUESTER"],
  ticketDetail: ["REQUESTER"],
  queue: ["IT_STAFF", "ADMINISTRATOR"],
  staffTicketDetail: ["IT_STAFF", "ADMINISTRATOR"],
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
    { to: "/dashboard", label: "Dashboard", matches: (p) => p === "/dashboard" },
    { to: "/tickets", label: "My Tickets", matches: (p) => p.startsWith("/tickets") && p !== "/tickets/new" },
    { to: "/tickets/new", label: "Create Ticket", matches: (p) => p === "/tickets/new" },
  ],
  IT_STAFF: [
    { to: "/dashboard", label: "Dashboard", matches: (p) => p === "/dashboard" },
    { to: "/queue", label: "Ticket Queue", matches: (p) => p.startsWith("/queue") },
  ],
  ADMINISTRATOR: [
    { to: "/dashboard", label: "Dashboard", matches: (p) => p === "/dashboard" },
    { to: "/queue", label: "Ticket Queue", matches: (p) => p.startsWith("/queue") },
    { to: "/users", label: "User Management", matches: (p) => p.startsWith("/users") },
  ],
};
