import type { PrismaClient, RequestedPriority, Ticket, TicketStatus } from "@prisma/client";
import { formatTicketNumber } from "./ticket-number.js";

// C-49 — the Ticket Number's six digits are the row's own autoincrement id,
// which does not exist until the insert completes. Create and update therefore
// run inside ONE transaction: no caller and no query ever observes a Ticket
// without its number, which is what lets BR-01 and AC-15 be stated without
// qualification.
//
// There is no sequence table and no collision retry: the id the digits come
// from is already unique, so a collision is not reachable.

export type NewTicket = {
  requesterId: number;
  categoryId: number;
  relatedSystemId: number;
  summary: string;
  description: string;
  requestedPriority: RequestedPriority;
  /** Demo, seed and test data only; production rows take the database default. */
  createdAt?: Date;
  /** Seed data only. IT Priority otherwise copies Requested Priority (C-71). */
  itPriority?: RequestedPriority;
  /** Seed data only; a created Ticket is NEW (BR-02) and unassigned. */
  currentStatus?: TicketStatus;
  ownerId?: number;
  requesterResolvedAt?: Date;
};

export async function createTicketWithNumber(
  prisma: PrismaClient,
  input: NewTicket,
): Promise<Ticket> {
  return prisma.$transaction(async (tx) => {
    // C-71 — IT Priority starts as a copy of Requested Priority, for a new
    // Ticket exactly as for the Tickets the migration backfilled.
    const created = await tx.ticket.create({
      data: { ...input, itPriority: input.itPriority ?? input.requestedPriority },
    });
    return tx.ticket.update({
      where: { id: created.id },
      data: { ticketNumber: formatTicketNumber(created.id, created.createdAt) },
    });
  });
}
