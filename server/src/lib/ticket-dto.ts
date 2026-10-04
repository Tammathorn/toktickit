import type { Prisma, PrismaClient } from "@prisma/client";

// The two Ticket DTOs of api-spec.md section 10 - one for the Requester (10.2)
// and one for IT Staff and Administrator (10.5). Two DTOs rather than one
// shaped by the caller's role: a refactor of one cannot widen the other, and
// the Requester DTO has no key through which Internal Note data could ever
// travel (BR-70, FR-29). Every key is picked by name, so a column added later
// never reaches a response by accident. Timestamps are serialised as ISO 8601
// with a Z offset by JSON.stringify; the Asia/Bangkok rendering is the
// client's job.

const attachmentSelect = {
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
} satisfies Prisma.Ticket$attachmentsArgs;

// api-spec.md 10.7 - one row shape for both tables. The author carries id,
// name and role, never an email address (BR-100). Newest first (BR-67); the id
// breaks a tie between two entries written in the same millisecond.
export const entrySelect = {
  id: true,
  body: true,
  createdAt: true,
  author: { select: { id: true, name: true, role: true } },
} satisfies Prisma.PublicCommentSelect & Prisma.InternalNoteSelect;

export const newestFirst = [{ createdAt: "desc" }, { id: "desc" }] satisfies Prisma.PublicCommentOrderByWithRelationInput[];

type EntryRow = Prisma.PublicCommentGetPayload<{ select: typeof entrySelect }>;

export function toEntryDto(e: EntryRow) {
  return {
    id: e.id,
    body: e.body,
    author: { id: e.author.id, name: e.author.name, role: e.author.role },
    createdAt: e.createdAt,
  };
}

// ---------------------------------------------------------------------------
// 10.2 - the Requester Ticket DTO
// ---------------------------------------------------------------------------
export const ticketInclude = {
  requester: { select: { id: true, name: true } },
  // BR-100, C-95: the Requester sees who is handling their Ticket, by name
  // only - never the owner's email address.
  owner: { select: { name: true } },
  category: { select: { id: true, name: true } },
  relatedSystem: { select: { id: true, name: true } },
  attachments: attachmentSelect,
  publicComments: { orderBy: newestFirst, select: entrySelect },
} satisfies Prisma.TicketInclude;

export type TicketWithRelations = Prisma.TicketGetPayload<{ include: typeof ticketInclude }>;

export function toTicketDto(t: TicketWithRelations) {
  return {
    id: t.id,
    ticketNumber: t.ticketNumber,
    // No requesterId key (api-spec.md 10.2, C-64): the signed-in client knows
    // who it is. The column keeps its name (C-68); the contract does not.
    requester: { id: t.requester.id, name: t.requester.name },
    category: t.category,
    relatedSystem: t.relatedSystem,
    summary: t.summary,
    description: t.description,
    requestedPriority: t.requestedPriority,
    itPriority: t.itPriority,
    currentStatus: t.currentStatus,
    owner: t.owner ? { name: t.owner.name } : null,
    requesterResolvedAt: t.requesterResolvedAt,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    attachments: t.attachments,
    publicComments: t.publicComments.map(toEntryDto),
  };
}

export async function loadTicketDto(prisma: PrismaClient, id: number) {
  const row = await prisma.ticket.findUniqueOrThrow({ where: { id }, include: ticketInclude });
  return toTicketDto(row);
}

// ---------------------------------------------------------------------------
// 10.5 - the IT Staff Ticket DTO: the 10.2 shape with the Requester's email,
// the owner's id, role and activation state, and the Internal Notes.
// ---------------------------------------------------------------------------
export const staffTicketInclude = {
  requester: { select: { id: true, name: true, email: true } },
  owner: { select: { id: true, name: true, role: true, isActive: true } },
  category: { select: { id: true, name: true } },
  relatedSystem: { select: { id: true, name: true } },
  attachments: attachmentSelect,
  publicComments: { orderBy: newestFirst, select: entrySelect },
  internalNotes: { orderBy: newestFirst, select: entrySelect },
} satisfies Prisma.TicketInclude;

export type StaffTicketWithRelations = Prisma.TicketGetPayload<{ include: typeof staffTicketInclude }>;

export function toStaffTicketDto(t: StaffTicketWithRelations) {
  return {
    id: t.id,
    ticketNumber: t.ticketNumber,
    requester: { id: t.requester.id, name: t.requester.name, email: t.requester.email },
    category: t.category,
    relatedSystem: t.relatedSystem,
    summary: t.summary,
    description: t.description,
    requestedPriority: t.requestedPriority,
    itPriority: t.itPriority,
    currentStatus: t.currentStatus,
    // isActive false renders "(inactive)" until the Ticket is reassigned (BR-30).
    owner: t.owner ? { id: t.owner.id, name: t.owner.name, role: t.owner.role, isActive: t.owner.isActive } : null,
    requesterResolvedAt: t.requesterResolvedAt,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    attachments: t.attachments,
    publicComments: t.publicComments.map(toEntryDto),
    internalNotes: t.internalNotes.map(toEntryDto),
  };
}

// null when there is no such Ticket; staff are not ownership-scoped, so that
// is the only reason for a 404 on a staff route (api-spec.md 8.2).
export async function loadStaffTicketDto(prisma: PrismaClient, id: number) {
  const row = await prisma.ticket.findUnique({ where: { id }, include: staffTicketInclude });
  return row ? toStaffTicketDto(row) : null;
}
