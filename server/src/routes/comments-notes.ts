import { Router, type Request, type Response } from "express";
import { getPrisma } from "../prisma.js";
import { sendError, sendInternalError } from "../lib/http-error.js";
import { anyRole, authOf, staffOnly } from "../middleware/auth.js";
import { MESSAGES } from "../lib/validation.js";
import { trimmed } from "../lib/text.js";
import { entrySelect, newestFirst, toEntryDto } from "../lib/ticket-dto.js";
import { loadVisibleTicket, sendTicketClosed } from "../lib/ticket-access.js";
import { isTerminal } from "../lib/status-transitions.js";

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

const MAX_LENGTH = 2000;

function validEntryBody(req: Request): string | null {
  const raw = req.body && typeof req.body === "object" ? (req.body as Record<string, unknown>).body : undefined;
  if (typeof raw !== "string") return null;
  const text = trimmed(raw);
  return text.length >= 1 && text.length <= MAX_LENGTH ? text : null;
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
    if (isTerminal(ticket.currentStatus)) {
      sendTicketClosed(res);
      return;
    }
    const body = validEntryBody(req);
    if (body === null) {
      sendError(res, 400, "VALIDATION_FAILED", "Some fields need attention.", { body: MESSAGES.commentBody });
      return;
    }
    const row = await getPrisma().publicComment.create({
      data: { ticketId: ticket.id, authorId: authOf(res).user.id, body },
      select: entrySelect,
    });
    res.status(201).json(toEntryDto(row));
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
    if (isTerminal(ticket.currentStatus)) {
      sendTicketClosed(res);
      return;
    }
    const body = validEntryBody(req);
    if (body === null) {
      sendError(res, 400, "VALIDATION_FAILED", "Some fields need attention.", { body: MESSAGES.noteBody });
      return;
    }
    const row = await getPrisma().internalNote.create({
      data: { ticketId: ticket.id, authorId: authOf(res).user.id, body },
      select: entrySelect,
    });
    res.status(201).json(toEntryDto(row));
  } catch {
    sendInternalError(res);
  }
});
