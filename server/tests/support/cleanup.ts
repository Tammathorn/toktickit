import type { Prisma, PrismaClient } from "@prisma/client";

// A test file's own Tickets, removed in afterAll or after an inline check.
// Lab 4 gives every Ticket created through createTicketWithNumber a
// status-history row (C-167, C-188), and history and actions keep a RESTRICT
// key to their Ticket (append-only, BR-50), so those rows go first. Cleanup
// only: no assertion depends on it.
export async function deleteTickets(
  prisma: PrismaClient,
  where: Prisma.TicketWhereInput,
): Promise<void> {
  await prisma.ticketStatusChange.deleteMany({ where: { ticket: where } });
  await prisma.actionTaken.deleteMany({ where: { ticket: where } });
  await prisma.ticket.deleteMany({ where });
}
