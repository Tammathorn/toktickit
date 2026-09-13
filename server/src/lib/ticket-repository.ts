import type { PrismaClient, RequestedPriority, Ticket } from "@prisma/client";
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
  /** Demo and test data only; production rows take the database default. */
  createdAt?: Date;
};

export async function createTicketWithNumber(
  prisma: PrismaClient,
  input: NewTicket,
): Promise<Ticket> {
  return prisma.$transaction(async (tx) => {
    const created = await tx.ticket.create({ data: input });
    return tx.ticket.update({
      where: { id: created.id },
      data: { ticketNumber: formatTicketNumber(created.id, created.createdAt) },
    });
  });
}
