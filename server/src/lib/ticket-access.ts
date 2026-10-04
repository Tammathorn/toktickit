import type { Request, Response } from "express";
import type { TicketStatus } from "@prisma/client";
import { getPrisma } from "../prisma.js";
import { sendError } from "./http-error.js";
import { parsePathId } from "./validation.js";
import { authOf } from "../middleware/auth.js";

// Steps 4 to 6 of the C-63 check order for every route addressed by a Ticket
// id - parse the id, load the Ticket, apply ownership - shared so the rule is
// written once (api-spec.md 1.4). Ownership binds a Requester only: another
// Requester's Ticket answers the same 404 as a missing one (C-65). IT Staff
// and Administrator are not ownership-scoped (BR-96); a route they may not
// use was already refused by the role step.

export interface VisibleTicket {
  id: number;
  requesterId: number;
  ownerId: number | null;
  currentStatus: TicketStatus;
}

export function sendTicketNotFound(res: Response): void {
  sendError(res, 404, "TICKET_NOT_FOUND", "That ticket does not exist.");
}

// BR-108, C-109 - a Closed or Cancelled Ticket is read-only for every role. A
// status change keeps INVALID_STATUS_TRANSITION instead; every other write
// answers this. The text is ui-spec.md 6.2's.
export function sendTicketClosed(res: Response): void {
  sendError(res, 409, "TICKET_CLOSED", "This ticket is closed - create a new ticket if the problem returns.");
}

// Sends the refusal itself and returns null so the caller simply stops.
export async function loadVisibleTicket(req: Request, res: Response): Promise<VisibleTicket | null> {
  const id = parsePathId(req.params.id);
  if (id === null) {
    sendError(res, 400, "INVALID_QUERY_PARAM", "Ticket id must be a positive integer.", { id: "Ticket id must be a positive integer." });
    return null;
  }
  const ticket = await getPrisma().ticket.findUnique({
    where: { id },
    select: { id: true, requesterId: true, ownerId: true, currentStatus: true },
  });
  const { user } = authOf(res);
  if (!ticket || (user.role === "REQUESTER" && ticket.requesterId !== user.id)) {
    sendTicketNotFound(res);
    return null;
  }
  return ticket;
}
