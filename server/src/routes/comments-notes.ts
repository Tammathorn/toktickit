import { Router, type Request, type Response } from "express";
import { getPrisma } from "../prisma.js";
import { sendError, sendInternalError } from "../lib/http-error.js";
import { anyRole, authOf, staffOnly } from "../middleware/auth.js";
import { MESSAGES } from "../lib/validation.js";
import { trimmedWithin } from "../lib/text.js";
import { entrySelect, newestFirst, toEntryDto } from "../lib/ticket-dto.js";
import { loadVisibleTicket, sendTicketClosed } from "../lib/ticket-access.js";
import { isTerminal } from "../lib/status-transitions.js";
import { ACTION_MESSAGES, isUniqueViolation, isUuid, lockTicket, type Tx } from "../lib/workflow.js";

// Public Comments and Internal Notes - api-spec.md sections 6 and 7 (#42).
//
// Two tables, so a notes query cannot structurally leak into a comments
// response (BR-69, C-73). Both are append-only: this router registers a GET
// and a POST on each collection and nothing else - no PATCH, no DELETE, and no
// route addressing a single entry (BR-63, FR-51, API-87).
//
// Public Comments: the owning Requester, IT Staff and Administrator (BR-68);
// another Requester's Ticket is 404 (C-65). Internal Notes: IT Staff and
// Administrator only - a Requester is refused 403 by the role step, before the
// id is parsed or the Ticket loaded, so the answer is the same whether or not
// the Ticket exists and carries nothing about notes (BR-70, C-63, AC-04).
//
// On a POST the author and the time come from the session and the server's
// clock; any author or timestamp in the body is ignored (BR-65). The text is
// trimmed and must then be 1 to 2000 characters (BR-64). It is stored exactly
// as typed - escaping on render is the control, so nothing is sanitised here
// (BR-66). A Closed or Cancelled Ticket refuses the write 409 TICKET_CLOSED
// first, after ownership so a non-owner still gets 404, and ahead of field
// validation - a malformed body on a terminal Ticket is still 409, not 400
// (BR-108, C-109).

export const commentsNotesRouter = Router();

// Lab 4 - the optional replay key (BR-42, C-139). A malformed key is a body
// error; an absent one means no dedupe.
function readClientRequestId(req: Request): string | null {
  const v = req.body && typeof req.body === "object" ? (req.body as Record<string, unknown>).clientRequestId : undefined;
  return isUuid(v) ? v : null;
}

function malformedClientRequestId(req: Request): boolean {
  const v = req.body && typeof req.body === "object" ? (req.body as Record<string, unknown>).clientRequestId : undefined;
  return v !== undefined && v !== null && !isUuid(v);
}

// Step 7 of api-spec.md 2.1: this author already used this key -> 200 with the
// original row, before the Ticket state is consulted (C-165, C-166). Returns
// undefined when there is nothing to replay, so the caller carries on.
async function findReplay(table: "publicComment" | "internalNote", authorId: number, req: Request, res: Response): Promise<true | undefined> {
  const clientRequestId = readClientRequestId(req);
  if (!clientRequestId) return undefined;
  const where = { authorId_clientRequestId: { authorId, clientRequestId } };
  const row =
    table === "publicComment"
      ? await getPrisma().publicComment.findUnique({ where, select: entrySelect })
      : await getPrisma().internalNote.findUnique({ where, select: entrySelect });
  if (!row) return undefined;
  res.status(200).json(toEntryDto(row));
  return true;
}

const MAX_LENGTH = 2000;

// Audit of #66: the closed check above reads the Ticket before the write, so a
// close committed in between could still take an entry. The write therefore
// locks the Ticket row (BR-34) and re-checks; false means "closed meanwhile".
async function stillOpen(tx: Tx, ticketId: number): Promise<boolean> {
  await lockTicket(tx, ticketId);
  const now = await tx.ticket.findUniqueOrThrow({ where: { id: ticketId }, select: { currentStatus: true } });
  return !isTerminal(now.currentStatus);
}

function validEntryBody(req: Request): string | null {
  const raw = req.body && typeof req.body === "object" ? (req.body as Record<string, unknown>).body : undefined;
  return trimmedWithin(raw, MAX_LENGTH);
}

// ---------------------------------------------------------------------------
// GET and POST /api/tickets/:id/public-comments - api-spec.md 6.1, 6.2
// ---------------------------------------------------------------------------
commentsNotesRouter.get("/api/tickets/:id/public-comments", ...anyRole, async (req: Request, res: Response) => {
  try {
    const ticket = await loadVisibleTicket(req, res);
    if (!ticket) return;
    const rows = await getPrisma().publicComment.findMany({ where: { ticketId: ticket.id }, orderBy: newestFirst, select: entrySelect });
    res.status(200).json(rows.map(toEntryDto));
  } catch {
    sendInternalError(res);
  }
});

commentsNotesRouter.post("/api/tickets/:id/public-comments", ...anyRole, async (req: Request, res: Response) => {
  try {
    const ticket = await loadVisibleTicket(req, res);
    if (!ticket) return;
    const replay = await findReplay("publicComment", authOf(res).user.id, req, res);
    if (replay !== undefined) return;
    if (isTerminal(ticket.currentStatus)) {
      sendTicketClosed(res);
      return;
    }
    const body = validEntryBody(req);
    if (body === null) {
      sendError(res, 400, "VALIDATION_FAILED", "Some fields need attention.", { body: MESSAGES.commentBody });
      return;
    }
    if (malformedClientRequestId(req)) {
      sendError(res, 400, "VALIDATION_FAILED", "Some fields need attention.", { clientRequestId: ACTION_MESSAGES.clientRequestId });
      return;
    }
    const authorId = authOf(res).user.id;
    const clientRequestId = readClientRequestId(req);
    try {
      // Lab 4 (BR-46): a Public Comment moves the Ticket's activity time; the
      // version is untouched (BR-37).
      const row = await getPrisma().$transaction(async (tx) => {
        if (!(await stillOpen(tx, ticket.id))) return null;
        const created = await tx.publicComment.create({
          data: { ticketId: ticket.id, authorId, body, clientRequestId },
          select: entrySelect,
        });
        await tx.ticket.update({ where: { id: ticket.id }, data: { lastActivityAt: created.createdAt } });
        return created;
      });
      if (!row) {
        sendTicketClosed(res);
        return;
      }
      res.status(201).json(toEntryDto(row));
    } catch (error) {
      if (clientRequestId && isUniqueViolation(error) && (await findReplay("publicComment", authorId, req, res)) !== undefined) return;
      throw error;
    }
  } catch {
    sendInternalError(res);
  }
});

// ---------------------------------------------------------------------------
// GET and POST /api/tickets/:id/internal-notes - api-spec.md 7.1, 7.2
// ---------------------------------------------------------------------------
commentsNotesRouter.get("/api/tickets/:id/internal-notes", ...staffOnly, async (req: Request, res: Response) => {
  try {
    const ticket = await loadVisibleTicket(req, res);
    if (!ticket) return;
    const rows = await getPrisma().internalNote.findMany({ where: { ticketId: ticket.id }, orderBy: newestFirst, select: entrySelect });
    res.status(200).json(rows.map(toEntryDto));
  } catch {
    sendInternalError(res);
  }
});

commentsNotesRouter.post("/api/tickets/:id/internal-notes", ...staffOnly, async (req: Request, res: Response) => {
  try {
    const ticket = await loadVisibleTicket(req, res);
    if (!ticket) return;
    const replay = await findReplay("internalNote", authOf(res).user.id, req, res);
    if (replay !== undefined) return;
    if (isTerminal(ticket.currentStatus)) {
      sendTicketClosed(res);
      return;
    }
    const body = validEntryBody(req);
    if (body === null) {
      sendError(res, 400, "VALIDATION_FAILED", "Some fields need attention.", { body: MESSAGES.noteBody });
      return;
    }
    if (malformedClientRequestId(req)) {
      sendError(res, 400, "VALIDATION_FAILED", "Some fields need attention.", { clientRequestId: ACTION_MESSAGES.clientRequestId });
      return;
    }
    const authorId = authOf(res).user.id;
    const clientRequestId = readClientRequestId(req);
    try {
      // BR-47: an Internal Note never touches lastActivityAt or version; the
      // lock only orders it against a close.
      const row = await getPrisma().$transaction(async (tx) => {
        if (!(await stillOpen(tx, ticket.id))) return null;
        return tx.internalNote.create({
          data: { ticketId: ticket.id, authorId, body, clientRequestId },
          select: entrySelect,
        });
      });
      if (!row) {
        sendTicketClosed(res);
        return;
      }
      res.status(201).json(toEntryDto(row));
    } catch (error) {
      if (clientRequestId && isUniqueViolation(error) && (await findReplay("internalNote", authorId, req, res)) !== undefined) return;
      throw error;
    }
  } catch {
    sendInternalError(res);
  }
});
