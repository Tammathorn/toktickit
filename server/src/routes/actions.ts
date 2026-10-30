import { Router, type Request, type Response } from "express";
import type { ActionStatus, UserRole } from "@prisma/client";
import { getPrisma } from "../prisma.js";
import { sendError, sendInternalError, sendStale } from "../lib/http-error.js";
import { authOf, staffOnly } from "../middleware/auth.js";
import { parsePathId } from "../lib/validation.js";
import { loadStaffTicketDto } from "../lib/ticket-dto.js";
import { sendTicketClosed, sendTicketNotFound } from "../lib/ticket-access.js";
import { isTerminal } from "../lib/status-transitions.js";
import {
  ACTION_MESSAGES,
  ACTION_TEXT_MAX,
  actionAtProblem,
  isUniqueViolation,
  isUuid,
  lockTicket,
  touchTicket,
  parseActionAt,
  readAttachmentNotes,
  readBody,
  readFollowUp,
  readVersion,
  refuseUnaccepted,
  textField,
} from "../lib/workflow.js";

// ===========================================================================
// Lab 4 - Actions Taken (api-spec.md section 3). IT Staff and Administrator
// only: staffOnly refuses a Requester 403 FORBIDDEN_ROLE before the Ticket or
// the action is loaded (BR-17). Any active staff user may write on any Ticket;
// the assignee is a label, not a permission (BR-19). Each route follows the
// api-spec.md 2.1 order exactly, and every write returns the full IT Staff
// Ticket DTO (C-136). None changes the Ticket's version (BR-37) or status
// (BR-16); each sets the Ticket's lastActivityAt through the row lock (BR-34,
// BR-46).
// ===========================================================================

export const actionsRouter = Router();

const OWNER_ROLES: readonly UserRole[] = ["IT_STAFF", "ADMINISTRATOR"];
const INT4_MAX = 2147483647;

function sendActionNotFound(res: Response): void {
  sendError(res, 404, "ACTION_NOT_FOUND", "That item does not exist.");
}

function sendTicketResolved(res: Response): void {
  sendError(res, 409, "TICKET_RESOLVED", "This ticket is resolved. Reopen it first to record more work.");
}

function sendNotPlanned(res: Response): void {
  sendError(res, 409, "ACTION_NOT_PLANNED", "This action is already finished and cannot be changed. Record a new action instead.");
}

function sendFields(res: Response, fields: Record<string, string>): void {
  sendError(res, 400, "VALIDATION_FAILED", "Some fields need attention.", fields);
}

function sendAssigneeNotEligible(res: Response): void {
  sendError(res, 422, "ASSIGNEE_NOT_ELIGIBLE", "That user cannot be assigned. Choose an active IT Staff or Administrator user.");
}

async function isEligibleAssignee(id: number): Promise<boolean> {
  // An id beyond the int4 column cannot name a user; asking Prisma would be a
  // database error (500), so it is simply unknown (422, BR-18).
  if (id > INT4_MAX) return false;
  const u = await getPrisma().user.findUnique({ where: { id }, select: { isActive: true, role: true } });
  return !!u && u.isActive && OWNER_ROLES.includes(u.role);
}

async function respondWithTicket(res: Response, ticketId: number, status: number): Promise<void> {
  const dto = await loadStaffTicketDto(getPrisma(), ticketId);
  if (!dto) sendTicketNotFound(res);
  else res.status(status).json(dto);
}

// Step 8 for an action write (BR-24, C-159). Returns true when it refused.
function refuseTicketState(res: Response, status: string): boolean {
  if (isTerminal(status as never)) {
    sendTicketClosed(res);
    return true;
  }
  if (status === "RESOLVED") {
    sendTicketResolved(res);
    return true;
  }
  return false;
}

// Steps 4 and 5 for /api/actions/:id: the action, then its Ticket.
async function loadAction(req: Request, res: Response) {
  const id = parsePathId(req.params.id);
  if (id === null) {
    sendError(res, 400, "INVALID_QUERY_PARAM", "Action id must be a positive integer.", { id: "Action id must be a positive integer." });
    return null;
  }
  const action = await getPrisma().actionTaken.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      version: true,
      actionAt: true,
      description: true,
      assigneeId: true,
      attachmentNotes: true,
      ticket: { select: { id: true, currentStatus: true, createdAt: true } },
    },
  });
  if (!action) {
    sendActionNotFound(res);
    return null;
  }
  return action;
}

// ---------------------------------------------------------------------------
// POST /api/tickets/:id/actions - api-spec.md 3.1.
// ---------------------------------------------------------------------------

actionsRouter.post("/api/tickets/:id/actions", ...staffOnly, async (req: Request, res: Response) => {
  const prisma = getPrisma();
  const me = authOf(res).user;
  try {
    // Steps 4-5.
    const ticketId = parsePathId(req.params.id);
    if (ticketId === null) {
      sendError(res, 400, "INVALID_QUERY_PARAM", "Ticket id must be a positive integer.", { id: "Ticket id must be a positive integer." });
      return;
    }
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId }, select: { id: true, currentStatus: true, createdAt: true } });
    if (!ticket) {
      sendTicketNotFound(res);
      return;
    }
    const body = readBody(req.body);

    // Step 7 - replay lookup, before the Ticket state (C-165, C-166).
    if (isUuid(body.clientRequestId)) {
      const original = await prisma.actionTaken.findUnique({
        where: { createdById_clientRequestId: { createdById: me.id, clientRequestId: body.clientRequestId } },
        select: { ticketId: true },
      });
      if (original) {
        await respondWithTicket(res, original.ticketId, 200);
        return;
      }
    }

    // Step 8.
    if (refuseTicketState(res, ticket.currentStatus)) return;

    // Step 9 - body validation.
    const fields: Record<string, string> = {};
    const now = new Date();
    const status = body.status;
    if (status !== "PLANNED" && status !== "COMPLETED") fields.status = ACTION_MESSAGES.status;
    const completed = status === "COMPLETED";
    // C-175: result and the follow-up pair belong to completed work only.
    refuseUnaccepted(body, completed ? "completedCreate" : "plannedCreate", fields);

    const actionAt = parseActionAt(body.actionAt);
    if (actionAt === null) fields.actionAt = ACTION_MESSAGES.actionAtRequired;
    else {
      const problem = actionAtProblem(actionAt, ticket.createdAt, completed, now);
      if (problem) fields.actionAt = problem;
    }
    const description = textField(body.description, ACTION_TEXT_MAX);
    if (description === null) fields.description = ACTION_MESSAGES.description;
    const attachmentNotes = readAttachmentNotes(body.attachmentNotes, fields);

    let assigneeId = me.id;
    if (body.assigneeId !== undefined) {
      if (typeof body.assigneeId === "number" && Number.isInteger(body.assigneeId) && body.assigneeId > 0) assigneeId = body.assigneeId;
      else fields.assigneeId = ACTION_MESSAGES.assigneeId;
    }
    let result: string | null = null;
    let followUp = { followUpRequired: false, followUpNote: null as string | null };
    if (completed) {
      result = textField(body.result, ACTION_TEXT_MAX);
      if (result === null && !fields.result) fields.result = ACTION_MESSAGES.result;
      followUp = readFollowUp(body, fields);
    }
    if (body.clientRequestId !== undefined && !isUuid(body.clientRequestId)) fields.clientRequestId = ACTION_MESSAGES.clientRequestId;
    if (Object.keys(fields).length > 0) {
      sendFields(res, fields);
      return;
    }

    // Step 11 - the assignee (BR-18).
    if (assigneeId !== me.id && !(await isEligibleAssignee(assigneeId))) {
      sendAssigneeNotEligible(res);
      return;
    }

    const clientRequestId = isUuid(body.clientRequestId) ? body.clientRequestId : null;
    try {
      const outcome = await prisma.$transaction(async (tx) => {
        await lockTicket(tx, ticket.id);
        // Re-read under the lock: the Ticket may have moved since step 8.
        const fresh = await tx.ticket.findUniqueOrThrow({ where: { id: ticket.id }, select: { currentStatus: true } });
        if (isTerminal(fresh.currentStatus) || fresh.currentStatus === "RESOLVED") return fresh.currentStatus;
        // Stored times are read under the lock, so a write that waited on it
        // can never record a time earlier than the write it waited for (a
        // reopen's changedAt, another write's lastActivityAt; BR-31, BR-46).
        const at = new Date();
        await tx.actionTaken.create({
          data: {
            ticketId: ticket.id,
            status: status as ActionStatus,
            actionAt: actionAt as Date,
            description: description as string,
            result,
            followUpRequired: followUp.followUpRequired,
            followUpNote: followUp.followUpNote,
            attachmentNotes: attachmentNotes ?? null,
            assigneeId,
            createdById: me.id,
            createdAt: at,
            // BR-13, C-160: a created-completed action is finished at createdAt.
            performedById: completed ? me.id : null,
            finishedAt: completed ? at : null,
            clientRequestId,
          },
        });
        await touchTicket(tx, ticket.id, at);
        return null;
      });
      if (outcome !== null) {
        refuseTicketState(res, outcome);
        return;
      }
    } catch (error) {
      // BR-43, AC-64: a concurrent replay that loses the unique race answers
      // 200 with the original, never 500.
      if (clientRequestId && isUniqueViolation(error)) {
        const original = await prisma.actionTaken.findUnique({
          where: { createdById_clientRequestId: { createdById: me.id, clientRequestId } },
          select: { ticketId: true },
        });
        if (!original) throw error;
        await respondWithTicket(res, original.ticketId, 200);
        return;
      }
      throw error;
    }
    await respondWithTicket(res, ticket.id, 201);
  } catch {
    sendInternalError(res);
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/actions/:id - api-spec.md 3.2. Edit a PLANNED action.
// ---------------------------------------------------------------------------
actionsRouter.patch("/api/actions/:id", ...staffOnly, async (req: Request, res: Response) => {
  const prisma = getPrisma();
  try {
    const action = await loadAction(req, res);
    if (!action) return;
    if (refuseTicketState(res, action.ticket.currentStatus)) return;

    const body = readBody(req.body);
    const fields: Record<string, string> = {};
    refuseUnaccepted(body, "edit", fields);
    const version = readVersion(body, fields);
    const data: { description?: string; actionAt?: Date; assigneeId?: number; attachmentNotes?: string | null } = {};
    let editable = 0;
    if (body.description !== undefined) {
      editable += 1;
      const d = textField(body.description, ACTION_TEXT_MAX);
      if (d === null) fields.description = ACTION_MESSAGES.description;
      else data.description = d;
    }
    if (body.actionAt !== undefined) {
      editable += 1;
      const at = parseActionAt(body.actionAt);
      if (at === null) fields.actionAt = ACTION_MESSAGES.actionAtRequired;
      else {
        const problem = actionAtProblem(at, action.ticket.createdAt, false, new Date());
        if (problem) fields.actionAt = problem;
        else data.actionAt = at;
      }
    }
    if (body.assigneeId !== undefined) {
      editable += 1;
      if (typeof body.assigneeId === "number" && Number.isInteger(body.assigneeId) && body.assigneeId > 0) data.assigneeId = body.assigneeId;
      else fields.assigneeId = ACTION_MESSAGES.assigneeId;
    }
    if (body.attachmentNotes !== undefined) {
      editable += 1;
      const n = readAttachmentNotes(body.attachmentNotes, fields);
      if (n !== undefined) data.attachmentNotes = n;
    }
    if (editable === 0 && !fields.version) fields.version = ACTION_MESSAGES.nothingToChange;
    if (Object.keys(fields).length > 0) {
      sendFields(res, fields);
      return;
    }

    // Step 10, then step 11 in C-176's order.
    if (version !== action.version) {
      sendStale(res);
      return;
    }
    if (action.status !== "PLANNED") {
      sendNotPlanned(res);
      return;
    }
    // C-177: eligibility only when the assignee actually changes.
    if (data.assigneeId !== undefined && data.assigneeId !== action.assigneeId && !(await isEligibleAssignee(data.assigneeId))) {
      sendAssigneeNotEligible(res);
      return;
    }

    // C-175: a save whose values all equal the stored ones writes nothing.
    const unchanged =
      (data.description === undefined || data.description === action.description) &&
      (data.actionAt === undefined || data.actionAt.getTime() === action.actionAt.getTime()) &&
      (data.assigneeId === undefined || data.assigneeId === action.assigneeId) &&
      (data.attachmentNotes === undefined || data.attachmentNotes === action.attachmentNotes);
    if (unchanged) {
      await respondWithTicket(res, action.ticket.id, 200);
      return;
    }

    const outcome = await prisma.$transaction(async (tx) => {
      await lockTicket(tx, action.ticket.id);
      const fresh = await tx.ticket.findUniqueOrThrow({ where: { id: action.ticket.id }, select: { currentStatus: true } });
      if (isTerminal(fresh.currentStatus) || fresh.currentStatus === "RESOLVED") return fresh.currentStatus;
      const { count } = await tx.actionTaken.updateMany({
        where: { id: action.id, version: action.version, status: "PLANNED" },
        data: { ...data, version: { increment: 1 } },
      });
      if (count !== 1) return "STALE";
      // The activity time is read under the lock (BR-46).
      await touchTicket(tx, action.ticket.id, new Date());
      return null;
    });
    if (outcome === "STALE") {
      sendStale(res);
      return;
    }
    if (outcome !== null) {
      refuseTicketState(res, outcome);
      return;
    }
    await respondWithTicket(res, action.ticket.id, 200);
  } catch {
    sendInternalError(res);
  }
});

// ---------------------------------------------------------------------------
// POST /api/actions/:id/complete and /cancel - api-spec.md 3.3, 3.4. The
// caller becomes performedById and finishedAt is the server clock (BR-11 to
// BR-13). A deactivated assignee does not block either (BR-19).
// ---------------------------------------------------------------------------
function finishRoute(kind: "complete" | "cancel") {
  return async (req: Request, res: Response) => {
    const prisma = getPrisma();
    const me = authOf(res).user;
    try {
      const action = await loadAction(req, res);
      if (!action) return;
      if (refuseTicketState(res, action.ticket.currentStatus)) return;

      const body = readBody(req.body);
      const fields: Record<string, string> = {};
      const now = new Date();
      refuseUnaccepted(body, kind, fields);
      const version = readVersion(body, fields);
      const result = textField(body.result, ACTION_TEXT_MAX);
      if (result === null) fields.result = kind === "complete" ? ACTION_MESSAGES.result : ACTION_MESSAGES.reason;
      let followUp = { followUpRequired: false, followUpNote: null as string | null };
      let actionAt = action.actionAt;
      if (kind === "complete") {
        if (typeof body.followUpRequired !== "boolean") fields.followUpRequired = ACTION_MESSAGES.followUpRequired;
        followUp = readFollowUp(body, fields);
        if (body.actionAt !== undefined) {
          const at = parseActionAt(body.actionAt);
          if (at === null) fields.actionAt = ACTION_MESSAGES.actionAtRequired;
          else actionAt = at;
        }
        // C-168: a sent actionAt is body validation (step 9).
        if (body.actionAt !== undefined && !fields.actionAt) {
          const problem = actionAtProblem(actionAt, action.ticket.createdAt, true, now);
          if (problem) fields.actionAt = problem;
        }
      }
      if (Object.keys(fields).length > 0) {
        sendFields(res, fields);
        return;
      }
      if (version !== action.version) {
        sendStale(res);
        return;
      }
      if (action.status !== "PLANNED") {
        sendNotPlanned(res);
        return;
      }
      // C-168: with no actionAt sent, the stored one must not be in the future.
      // It is not part of the request, so it is checked after the stale and
      // ACTION_NOT_PLANNED refusals (api-spec 2.1 steps 10-11): an old screen
      // is told to refresh first, and a finished action never answers 400.
      if (kind === "complete" && body.actionAt === undefined) {
        const problem = actionAtProblem(actionAt, action.ticket.createdAt, true, now);
        if (problem) {
          sendFields(res, { actionAt: problem });
          return;
        }
      }

      const outcome = await prisma.$transaction(async (tx) => {
        await lockTicket(tx, action.ticket.id);
        const fresh = await tx.ticket.findUniqueOrThrow({ where: { id: action.ticket.id }, select: { currentStatus: true } });
        if (isTerminal(fresh.currentStatus) || fresh.currentStatus === "RESOLVED") return fresh.currentStatus;
        // finishedAt and the activity time are read under the lock (BR-30,
        // BR-31, BR-46).
        const at = new Date();
        const { count } = await tx.actionTaken.updateMany({
          where: { id: action.id, version: action.version, status: "PLANNED" },
          data: {
            status: kind === "complete" ? "COMPLETED" : "CANCELLED",
            result,
            followUpRequired: followUp.followUpRequired,
            followUpNote: followUp.followUpNote,
            actionAt,
            performedById: me.id,
            finishedAt: at,
            version: { increment: 1 },
          },
        });
        if (count !== 1) return "STALE";
        await touchTicket(tx, action.ticket.id, at);
        return null;
      });
      if (outcome === "STALE") {
        sendStale(res);
        return;
      }
      if (outcome !== null) {
        refuseTicketState(res, outcome);
        return;
      }
      await respondWithTicket(res, action.ticket.id, 200);
    } catch {
      sendInternalError(res);
    }
  };
}

actionsRouter.post("/api/actions/:id/complete", ...staffOnly, finishRoute("complete"));
actionsRouter.post("/api/actions/:id/cancel", ...staffOnly, finishRoute("cancel"));
