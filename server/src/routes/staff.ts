import { Router, type Request, type Response } from "express";
import { getPrisma } from "../prisma.js";
import { sendError, sendInternalError } from "../lib/http-error.js";
import { authOf, staffOnly } from "../middleware/auth.js";
import { parseQueueQuery, queueWhere, queueOrderBy, type QueueQuery } from "../lib/list-query.js";
import type { RequestedPriority, TicketStatus, UserRole } from "@prisma/client";
import { MESSAGES, PRIORITIES, isPositiveInt, parsePathId } from "../lib/validation.js";
import { loadStaffTicketDto } from "../lib/ticket-dto.js";
import { sendTicketClosed, sendTicketNotFound } from "../lib/ticket-access.js";
import {
  CLEARS_RESOLUTION_FLAG,
  STATUS_LABELS,
  TERMINAL_STATUSES,
  TICKET_STATUSES,
  WORKED_STATUSES,
  isPermittedTransition,
  isTerminal,
} from "../lib/status-transitions.js";

export const staffRouter = Router();

// ---------------------------------------------------------------------------
// GET /api/staff/tickets — api-spec.md 8.1, the Ticket Queue. IT Staff and
// Administrator only (C-101); a Requester is refused 403 FORBIDDEN_ROLE
// before any query parameter is parsed (C-63, C-65, SEC-03). Not scoped to
// any Requester (BR-74) - the row shape is api-spec.md 10.4, no `requester`
// key.
// ---------------------------------------------------------------------------
staffRouter.get(
  "/api/staff/tickets",
  ...staffOnly,
  (req: Request, res: Response, next) => {
    const parsed = parseQueueQuery(req.query as Record<string, unknown>);
    if (!parsed.ok) {
      sendError(res, 400, "INVALID_QUERY_PARAM", "Some search or filter values are not valid.", parsed.fields);
      return;
    }
    res.locals.queueQuery = parsed.query;
    next();
  },
  async (_req: Request, res: Response) => {
    const prisma = getPrisma();
    const q = res.locals.queueQuery as QueueQuery;
    try {
      const where = queueWhere(authOf(res).user.id, q);
      const [total, rows] = await Promise.all([
        prisma.ticket.count({ where }),
        prisma.ticket.findMany({
          where,
          orderBy: queueOrderBy(q),
          skip: (q.page - 1) * q.pageSize,
          take: q.pageSize,
          select: {
            id: true,
            ticketNumber: true,
            summary: true,
            category: { select: { id: true, name: true } },
            requestedPriority: true,
            itPriority: true,
            currentStatus: true,
            owner: { select: { id: true, name: true, isActive: true } },
            requesterResolvedAt: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
      ]);
      res.status(200).json({
        data: rows,
        meta: { page: q.page, pageSize: q.pageSize, total, totalPages: Math.ceil(total / q.pageSize), sort: q.sort },
      });
    } catch {
      sendInternalError(res);
    }
  },
);

// ===========================================================================
// IT Staff Ticket Detail and the staff Ticket operations - api-spec.md 8.2 to
// 8.7 (#42). Every route here sits behind staffOnly, so a Requester is refused
// 403 FORBIDDEN_ROLE before the id is parsed or the Ticket loaded (C-63,
// C-65). Staff are not ownership-scoped: any active staff user may act on any
// Ticket (BR-96, C-93), so 404 on these routes means genuine absence.
//
// Within step 7 every write applies the same order: a Closed or Cancelled
// Ticket is 409 TICKET_CLOSED first (BR-108, C-109), then a malformed body is
// 400, then the operation's own refusals (409 or 422, C-100). Each write is one
// conditional UPDATE whose WHERE clause restates the rule it relies on, so a
// concurrent change cannot slip between the check and the write: two claims
// cannot both win, and an unassign and a move into a worked status cannot
// together leave a worked Ticket without an owner (C-75, C-104).
// ===========================================================================

const TICKET_OWNER_ROLES: readonly UserRole[] = ["IT_STAFF", "ADMINISTRATOR"];

function readBody(req: Request): Record<string, unknown> {
  return req.body && typeof req.body === "object" && !Array.isArray(req.body) ? req.body : {};
}

// Steps 4 and 5. Sends the refusal itself and returns null so the caller stops.
async function loadStaffTicket(req: Request, res: Response) {
  const id = parsePathId(req.params.id);
  if (id === null) {
    sendError(res, 400, "INVALID_QUERY_PARAM", "Ticket id must be a positive integer.", { id: "Ticket id must be a positive integer." });
    return null;
  }
  const ticket = await getPrisma().ticket.findUnique({ where: { id }, select: { id: true, ownerId: true, currentStatus: true } });
  if (!ticket) {
    sendTicketNotFound(res);
    return null;
  }
  return ticket;
}

// Every staff write answers with the whole staff DTO, so the screen never needs
// a second request to refresh (api-spec.md 10.5).
async function sendStaffTicket(res: Response, id: number): Promise<void> {
  const dto = await loadStaffTicketDto(getPrisma(), id);
  if (!dto) sendTicketNotFound(res);
  else res.status(200).json(dto);
}

// ---------------------------------------------------------------------------
// GET /api/staff/tickets/:id - api-spec.md 8.2. The staff DTO: the Requester's
// email, the owner's id, role and activation state, and the Internal Notes.
// ---------------------------------------------------------------------------
staffRouter.get("/api/staff/tickets/:id", ...staffOnly, async (req: Request, res: Response) => {
  try {
    const ticket = await loadStaffTicket(req, res);
    if (!ticket) return;
    await sendStaffTicket(res, ticket.id);
  } catch {
    sendInternalError(res);
  }
});

// ---------------------------------------------------------------------------
// POST /api/staff/tickets/:id/claim - api-spec.md 8.3. Assigns the caller only
// while the Ticket is unassigned, through one conditional update (BR-46,
// C-75). The loser of a race - and a caller who already owns it - gets 409
// ALREADY_OWNED naming the current owner. Claiming never changes status (C-102).
// ---------------------------------------------------------------------------
staffRouter.post("/api/staff/tickets/:id/claim", ...staffOnly, async (req: Request, res: Response) => {
  const prisma = getPrisma();
  try {
    const ticket = await loadStaffTicket(req, res);
    if (!ticket) return;
    if (isTerminal(ticket.currentStatus)) {
      sendTicketClosed(res);
      return;
    }
    const { count } = await prisma.ticket.updateMany({
      where: { id: ticket.id, ownerId: null, currentStatus: { notIn: [...TERMINAL_STATUSES] } },
      data: { ownerId: authOf(res).user.id },
    });
    if (count === 0) {
      const now = await prisma.ticket.findUnique({
        where: { id: ticket.id },
        select: { currentStatus: true, owner: { select: { name: true } } },
      });
      if (!now) sendTicketNotFound(res);
      else if (isTerminal(now.currentStatus)) sendTicketClosed(res);
      else {
        const who = now.owner?.name ?? "Another user";
        sendError(res, 409, "ALREADY_OWNED", `${who} claimed this ticket first. The ticket has been refreshed.`);
      }
      return;
    }
    await sendStaffTicket(res, ticket.id);
  } catch {
    sendInternalError(res);
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/staff/tickets/:id/owner  { ownerId: <id> | null } - api-spec.md
// 8.4. Assign, reassign and unassign. An absent ownerId is 400, never an
// unassign. The assignee must be an active IT Staff or Administrator user, or
// it is 422 ASSIGNEE_NOT_ELIGIBLE (BR-48). Unassigning a Ticket in a worked
// status is 409 OWNER_REQUIRED; reassigning it stays allowed (C-104).
// ---------------------------------------------------------------------------
staffRouter.patch("/api/staff/tickets/:id/owner", ...staffOnly, async (req: Request, res: Response) => {
  const prisma = getPrisma();
  try {
    const ticket = await loadStaffTicket(req, res);
    if (!ticket) return;
    if (isTerminal(ticket.currentStatus)) {
      sendTicketClosed(res);
      return;
    }
    const body = readBody(req);
    const ownerId = body.ownerId;
    if (!("ownerId" in body) || (ownerId !== null && !isPositiveInt(ownerId))) {
      sendError(res, 400, "VALIDATION_FAILED", "Some fields need attention.", { ownerId: MESSAGES.ownerId });
      return;
    }

    if (ownerId === null) {
      const { count } = await prisma.ticket.updateMany({
        where: { id: ticket.id, currentStatus: { notIn: [...WORKED_STATUSES, ...TERMINAL_STATUSES] } },
        data: { ownerId: null },
      });
      if (count === 0) {
        const now = await prisma.ticket.findUnique({ where: { id: ticket.id }, select: { currentStatus: true } });
        if (!now) sendTicketNotFound(res);
        else if (isTerminal(now.currentStatus)) sendTicketClosed(res);
        else {
          sendError(res, 409, "OWNER_REQUIRED", "A ticket being worked on must keep its Ticket Owner. Move it to Open first, then unassign.");
        }
        return;
      }
    } else {
      const assignee = await prisma.user.findUnique({ where: { id: ownerId }, select: { isActive: true, role: true } });
      if (!assignee || !assignee.isActive || !TICKET_OWNER_ROLES.includes(assignee.role)) {
        sendError(res, 422, "ASSIGNEE_NOT_ELIGIBLE", "That user cannot own a ticket. Choose an active IT Staff or Administrator user.");
        return;
      }
      const { count } = await prisma.ticket.updateMany({
        where: { id: ticket.id, currentStatus: { notIn: [...TERMINAL_STATUSES] } },
        data: { ownerId },
      });
      if (count === 0) {
        const now = await prisma.ticket.findUnique({ where: { id: ticket.id }, select: { id: true } });
        if (!now) sendTicketNotFound(res);
        else sendTicketClosed(res);
        return;
      }
    }
    await sendStaffTicket(res, ticket.id);
  } catch {
    sendInternalError(res);
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/staff/tickets/:id/it-priority  { itPriority } - api-spec.md 8.5.
// LOW, MEDIUM or HIGH; re-submitting the current value is 200 (a plain value,
// not a transition). Requested Priority is never touched (BR-51).
// ---------------------------------------------------------------------------
staffRouter.patch("/api/staff/tickets/:id/it-priority", ...staffOnly, async (req: Request, res: Response) => {
  const prisma = getPrisma();
  try {
    const ticket = await loadStaffTicket(req, res);
    if (!ticket) return;
    if (isTerminal(ticket.currentStatus)) {
      sendTicketClosed(res);
      return;
    }
    const itPriority = readBody(req).itPriority;
    if (!PRIORITIES.includes(itPriority as RequestedPriority)) {
      sendError(res, 400, "VALIDATION_FAILED", "Some fields need attention.", { itPriority: MESSAGES.itPriority });
      return;
    }
    const { count } = await prisma.ticket.updateMany({
      where: { id: ticket.id, currentStatus: { notIn: [...TERMINAL_STATUSES] } },
      data: { itPriority: itPriority as RequestedPriority },
    });
    if (count === 0) {
      sendTicketClosed(res);
      return;
    }
    await sendStaffTicket(res, ticket.id);
  } catch {
    sendInternalError(res);
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/staff/tickets/:id/status  { currentStatus } - api-spec.md 8.6,
// evaluated in its fixed order: out of set 400; same status 400 SAME_STATUS
// (C-77); outside the specification.md 5.1 matrix 409
// INVALID_STATUS_TRANSITION - which covers every move out of Closed and
// Cancelled, so a terminal Ticket keeps this code rather than TICKET_CLOSED
// (C-109); into a worked status with no owner 409 OWNER_REQUIRED (C-93). A move
// to Resolved, Closed or Cancelled clears the Requester's resolution flag
// (BR-61). The UI confirms Resolved, Closed and Cancelled; the API takes no
// confirmation flag, because a client-supplied one would prove nothing.
// ---------------------------------------------------------------------------
staffRouter.patch("/api/staff/tickets/:id/status", ...staffOnly, async (req: Request, res: Response) => {
  const prisma = getPrisma();
  try {
    const loaded = await loadStaffTicket(req, res);
    if (!loaded) return;
    let ticket: { id: number; ownerId: number | null; currentStatus: TicketStatus } = loaded;
    const target = readBody(req).currentStatus as TicketStatus;
    if (!TICKET_STATUSES.includes(target)) {
      sendError(res, 400, "VALIDATION_FAILED", "Some fields need attention.", { currentStatus: MESSAGES.currentStatus });
      return;
    }

    // The update is conditional on the status and owner just read. If another
    // request changed either in between, nothing is written and the rules are
    // evaluated again against the fresh row.
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const from: TicketStatus = ticket.currentStatus;
      if (target === from) {
        sendError(res, 400, "SAME_STATUS", "That ticket is already in that status.");
        return;
      }
      if (!isPermittedTransition(from, target)) {
        sendError(res, 409, "INVALID_STATUS_TRANSITION", `That status change is not allowed from ${STATUS_LABELS[from]}.`);
        return;
      }
      const needsOwner = WORKED_STATUSES.includes(target);
      if (needsOwner && ticket.ownerId === null) {
        sendError(res, 409, "OWNER_REQUIRED", "This ticket needs a Ticket Owner first. Claim it or assign it, then try again.");
        return;
      }
      const { count } = await prisma.ticket.updateMany({
        where: { id: ticket.id, currentStatus: from, ...(needsOwner ? { ownerId: { not: null } } : {}) },
        data: { currentStatus: target, ...(CLEARS_RESOLUTION_FLAG.includes(target) ? { requesterResolvedAt: null } : {}) },
      });
      if (count === 1) {
        await sendStaffTicket(res, ticket.id);
        return;
      }
      const now: typeof ticket | null = await prisma.ticket.findUnique({
        where: { id: ticket.id },
        select: { id: true, ownerId: true, currentStatus: true },
      });
      if (!now) {
        sendTicketNotFound(res);
        return;
      }
      ticket = now;
    }
    sendError(res, 409, "INVALID_STATUS_TRANSITION", `That status change is not allowed from ${STATUS_LABELS[ticket.currentStatus]}.`);
  } catch {
    sendInternalError(res);
  }
});

// ---------------------------------------------------------------------------
// GET /api/staff/assignable-users - api-spec.md 8.7, C-105. Active IT Staff
// and Administrator users as exactly { id, name, role }, ascending by name -
// never an email address, because IT Staff hold no user-administration
// permission (BR-104). Inactive users are absent: they cannot be assigned.
// ---------------------------------------------------------------------------
staffRouter.get("/api/staff/assignable-users", ...staffOnly, async (_req: Request, res: Response) => {
  try {
    const users = await getPrisma().user.findMany({
      where: { isActive: true, role: { in: [...TICKET_OWNER_ROLES] } },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      select: { id: true, name: true, role: true },
    });
    res.status(200).json(users.map((u) => ({ id: u.id, name: u.name, role: u.role })));
  } catch {
    sendInternalError(res);
  }
});
