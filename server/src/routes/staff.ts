import { Router, type Request, type Response } from "express";
import { getPrisma } from "../prisma.js";
import { sendError, sendGateNotMet, sendInternalError, sendStale } from "../lib/http-error.js";
import { gateReasons, lockTicket, recordStatusChange, ACTION_MESSAGES } from "../lib/workflow.js";
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

const VERSION_MESSAGE = ACTION_MESSAGES.version;
const INT4_MAX = 2147483647;

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
            lastActivityAt: true,
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
  // Lab 4: version is read in the same query, so the closed, stale and
  // matrix checks all judge one snapshot (C-138's order holds under a race).
  const ticket = await getPrisma().ticket.findUnique({ where: { id }, select: { id: true, ownerId: true, currentStatus: true, version: true } });
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
    // Lab 4: claim sends no version - it is already conditional (L3 C-75) -
    // but it moves the version and lastActivityAt (BR-38, BR-46).
    const { count } = await prisma.ticket.updateMany({
      where: { id: ticket.id, ownerId: null, currentStatus: { notIn: [...TERMINAL_STATUSES] } },
      data: { ownerId: authOf(res).user.id, version: { increment: 1 }, lastActivityAt: new Date() },
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

// Lab 4 helpers for the three versioned PATCHes (BR-36, C-138). A missing or
// non-integer version is a body error; the update is conditional on it, so a
// race lost after the check is also STALE_UPDATE, never a silent retry.
function readTicketVersion(body: Record<string, unknown>): number | null {
  const v = body.version;
  return typeof v === "number" && Number.isInteger(v) && v >= 0 ? v : null;
}

async function staleOrGone(res: Response, id: number): Promise<void> {
  const now = await getPrisma().ticket.findUnique({ where: { id }, select: { currentStatus: true } });
  if (!now) sendTicketNotFound(res);
  else if (isTerminal(now.currentStatus)) sendTicketClosed(res);
  else sendStale(res);
}

// ---------------------------------------------------------------------------
// PATCH /api/staff/tickets/:id/owner  { ownerId, version } - api-spec.md 5.11.
// Order: TICKET_CLOSED, body (ownerId and version), STALE_UPDATE, then
// OWNER_REQUIRED on an unassign in a worked status (C-104) and
// ASSIGNEE_NOT_ELIGIBLE (L3 BR-48).
// ---------------------------------------------------------------------------
staffRouter.patch("/api/staff/tickets/:id/owner", ...staffOnly, async (req: Request, res: Response) => {
  const prisma = getPrisma();
  try {
    const loaded = await loadStaffTicket(req, res);
    if (!loaded) return;
    if (isTerminal(loaded.currentStatus)) {
      sendTicketClosed(res);
      return;
    }
    const body = readBody(req);
    const ownerId = body.ownerId;
    const fields: Record<string, string> = {};
    // An id past int4 would reach Prisma and fail as a 500 (audit of #66).
    if (!("ownerId" in body) || (ownerId !== null && (!isPositiveInt(ownerId) || ownerId > INT4_MAX))) fields.ownerId = MESSAGES.ownerId;
    const version = readTicketVersion(body);
    if (version === null) fields.version = VERSION_MESSAGE;
    if (Object.keys(fields).length > 0) {
      sendError(res, 400, "VALIDATION_FAILED", "Some fields need attention.", fields);
      return;
    }
    const ticket = loaded;
    if (ticket.version !== version) {
      sendStale(res);
      return;
    }

    if (ownerId === null) {
      if (WORKED_STATUSES.includes(ticket.currentStatus)) {
        sendError(res, 409, "OWNER_REQUIRED", "A ticket being worked on must keep its Ticket Owner. Move it to Open first, then unassign.");
        return;
      }
      const { count } = await prisma.ticket.updateMany({
        where: { id: ticket.id, version: ticket.version, currentStatus: { notIn: [...WORKED_STATUSES, ...TERMINAL_STATUSES] } },
        data: { ownerId: null, version: { increment: 1 }, lastActivityAt: new Date() },
      });
      if (count === 0) {
        await staleOrGone(res, ticket.id);
        return;
      }
    } else {
      const assignee = await prisma.user.findUnique({ where: { id: ownerId as number }, select: { isActive: true, role: true } });
      if (!assignee || !assignee.isActive || !TICKET_OWNER_ROLES.includes(assignee.role)) {
        sendError(res, 422, "ASSIGNEE_NOT_ELIGIBLE", "That user cannot own a ticket. Choose an active IT Staff or Administrator user.");
        return;
      }
      const { count } = await prisma.ticket.updateMany({
        where: { id: ticket.id, version: ticket.version, currentStatus: { notIn: [...TERMINAL_STATUSES] } },
        data: { ownerId: ownerId as number, version: { increment: 1 }, lastActivityAt: new Date() },
      });
      if (count === 0) {
        await staleOrGone(res, ticket.id);
        return;
      }
    }
    await sendStaffTicket(res, ticket.id);
  } catch {
    sendInternalError(res);
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/staff/tickets/:id/it-priority  { itPriority, version } -
// api-spec.md 5.12. Re-sending the current value is 200 with no write
// (C-187). Requested Priority is never touched (L3 BR-51).
// ---------------------------------------------------------------------------
staffRouter.patch("/api/staff/tickets/:id/it-priority", ...staffOnly, async (req: Request, res: Response) => {
  const prisma = getPrisma();
  try {
    const loaded = await loadStaffTicket(req, res);
    if (!loaded) return;
    if (isTerminal(loaded.currentStatus)) {
      sendTicketClosed(res);
      return;
    }
    const body = readBody(req);
    const itPriority = body.itPriority;
    const fields: Record<string, string> = {};
    if (!PRIORITIES.includes(itPriority as RequestedPriority)) fields.itPriority = MESSAGES.itPriority;
    const version = readTicketVersion(body);
    if (version === null) fields.version = VERSION_MESSAGE;
    if (Object.keys(fields).length > 0) {
      sendError(res, 400, "VALIDATION_FAILED", "Some fields need attention.", fields);
      return;
    }
    const ticket = await prisma.ticket.findUniqueOrThrow({ where: { id: loaded.id }, select: { id: true, version: true, itPriority: true } });
    if (ticket.version !== version) {
      // Closed since the first read: TICKET_CLOSED precedes STALE_UPDATE (C-138).
      await staleOrGone(res, ticket.id);
      return;
    }
    if (ticket.itPriority === itPriority) {
      await sendStaffTicket(res, ticket.id);
      return;
    }
    const { count } = await prisma.ticket.updateMany({
      where: { id: ticket.id, version: ticket.version, currentStatus: { notIn: [...TERMINAL_STATUSES] } },
      data: { itPriority: itPriority as RequestedPriority, version: { increment: 1 }, lastActivityAt: new Date() },
    });
    if (count === 0) {
      await staleOrGone(res, ticket.id);
      return;
    }
    await sendStaffTicket(res, ticket.id);
  } catch {
    sendInternalError(res);
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/staff/tickets/:id/status  { currentStatus, version } -
// api-spec.md 2.2 and 5.13, BR-89's seven steps:
//   1 target out of set 400   2 SAME_STATUS 400   3 terminal 409 INVALID_STATUS_TRANSITION
//   4 version missing 400     5 STALE_UPDATE 409  6 outside the matrix 409
//   7 OWNER_REQUIRED, then the gate, then PLANNED_ACTIONS_OPEN on Cancelled.
// The write runs in one transaction that opens with the row lock (BR-34),
// re-evaluates step 7 under it, appends the history row (BR-50) and moves
// version, lastActivityAt and resolvedAt (BR-49). The Lab 3 three-attempt
// retry is gone: a lost race is STALE_UPDATE (C-138).
// ---------------------------------------------------------------------------
type StatusRefusal =
  | { kind: "terminal"; status: TicketStatus }
  | { kind: "stale" }
  | { kind: "owner" }
  | { kind: "gate"; reasons: string[] }
  | { kind: "planned" };

staffRouter.patch("/api/staff/tickets/:id/status", ...staffOnly, async (req: Request, res: Response) => {
  const prisma = getPrisma();
  try {
    const loaded = await loadStaffTicket(req, res);
    if (!loaded) return;
    const body = readBody(req);
    const target = body.currentStatus as TicketStatus;
    // Step 1.
    if (!TICKET_STATUSES.includes(target)) {
      sendError(res, 400, "VALIDATION_FAILED", "Some fields need attention.", { currentStatus: MESSAGES.currentStatus });
      return;
    }
    const from = loaded.currentStatus;
    // Step 2.
    if (target === from) {
      sendError(res, 400, "SAME_STATUS", "That ticket is already in that status.");
      return;
    }
    // Step 3 (L3 C-109, C-164).
    if (isTerminal(from)) {
      sendError(res, 409, "INVALID_STATUS_TRANSITION", `That status change is not allowed from ${STATUS_LABELS[from]}.`);
      return;
    }
    // Step 4.
    const version = readTicketVersion(body);
    if (version === null) {
      sendError(res, 400, "VALIDATION_FAILED", "Some fields need attention.", { version: VERSION_MESSAGE });
      return;
    }
    const ticket = loaded;
    // Step 5.
    if (ticket.version !== version) {
      sendStale(res);
      return;
    }
    // Step 6.
    if (!isPermittedTransition(from, target)) {
      sendError(res, 409, "INVALID_STATUS_TRANSITION", `That status change is not allowed from ${STATUS_LABELS[from]}.`);
      return;
    }

    const me = authOf(res).user.id;
    const refusal = await prisma.$transaction(async (tx): Promise<StatusRefusal | null> => {
      await lockTicket(tx, ticket.id);
      // Taken after the lock wait, so the change and its history row are
      // never stamped earlier than a write that committed first.
      const now = new Date();
      const fresh = await tx.ticket.findUniqueOrThrow({ where: { id: ticket.id }, select: { version: true, ownerId: true, currentStatus: true } });
      // Closed or cancelled meanwhile: step 3 answers, whatever the version.
      if (isTerminal(fresh.currentStatus)) return { kind: "terminal", status: fresh.currentStatus };
      if (fresh.version !== version || fresh.currentStatus !== from) return { kind: "stale" };
      // Step 7, under the lock.
      if (WORKED_STATUSES.includes(target) && fresh.ownerId === null) return { kind: "owner" };
      if (target === "RESOLVED") {
        const reasons = await gateReasons(tx, ticket.id);
        if (reasons.length > 0) return { kind: "gate", reasons };
      }
      if (target === "CANCELLED") {
        const planned = await tx.actionTaken.count({ where: { ticketId: ticket.id, status: "PLANNED" } });
        if (planned > 0) return { kind: "planned" };
      }
      await tx.ticket.update({
        where: { id: ticket.id },
        data: {
          currentStatus: target,
          version: { increment: 1 },
          lastActivityAt: now,
          ...(CLEARS_RESOLUTION_FLAG.includes(target) ? { requesterResolvedAt: null } : {}),
          // BR-49: set on Resolved, cleared on Reopened, kept on Closed.
          ...(target === "RESOLVED" ? { resolvedAt: now } : {}),
          ...(target === "REOPENED" ? { resolvedAt: null } : {}),
        },
      });
      await recordStatusChange(tx, ticket.id, from, target, me, now);
      return null;
    });

    if (refusal === null) {
      await sendStaffTicket(res, ticket.id);
      return;
    }
    if (refusal.kind === "terminal") {
      sendError(res, 409, "INVALID_STATUS_TRANSITION", `That status change is not allowed from ${STATUS_LABELS[refusal.status]}.`);
    } else if (refusal.kind === "stale") sendStale(res);
    else if (refusal.kind === "owner") {
      sendError(res, 409, "OWNER_REQUIRED", "This ticket needs a Ticket Owner first. Claim it or assign it, then try again.");
    } else if (refusal.kind === "gate") sendGateNotMet(res, refusal.reasons);
    else {
      sendError(res, 409, "PLANNED_ACTIONS_OPEN", "This ticket still has planned actions. Complete or cancel them before cancelling the ticket.");
    }
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
