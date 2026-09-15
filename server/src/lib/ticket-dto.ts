import type { Prisma, PrismaClient } from "@prisma/client";

// The Ticket as api-spec.md returns it: the 201 body of 3.1 and the 200 body of
// 3.3 share this shape, with attachments in ascending id order. Timestamps are
// serialised as ISO 8601 with a Z offset by JSON.stringify on the Date values;
// the BR-10 Asia/Bangkok rendering is the client's job.

export const ticketInclude = {
  requester: { select: { id: true, name: true } },
  category: { select: { id: true, name: true } },
  relatedSystem: { select: { id: true, name: true } },
  attachments: {
    orderBy: { id: "asc" },
    select: {
      id: true,
      originalFilename: true,
      mimeType: true,
      sizeBytes: true,
      uploadedAt: true,
      isRemoved: true,
      removedAt: true,
      removalReason: true,
    },
  },
} satisfies Prisma.TicketInclude;

export type TicketWithRelations = Prisma.TicketGetPayload<{ include: typeof ticketInclude }>;

export function toTicketDto(t: TicketWithRelations) {
  return {
    id: t.id,
    ticketNumber: t.ticketNumber,
    requesterId: t.requesterId,
    requester: t.requester,
    category: t.category,
    relatedSystem: t.relatedSystem,
    summary: t.summary,
    description: t.description,
    requestedPriority: t.requestedPriority,
    itPriority: t.itPriority,
    currentStatus: t.currentStatus,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    attachments: t.attachments,
  };
}

export async function loadTicketDto(prisma: PrismaClient, id: number) {
  const row = await prisma.ticket.findUniqueOrThrow({ where: { id }, include: ticketInclude });
  return toTicketDto(row);
}
