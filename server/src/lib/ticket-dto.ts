import type { Prisma, PrismaClient } from "@prisma/client";
import { allowedTransitions } from "./status-transitions.js";
import { allowedOperations, gateReasons, type Tx } from "./workflow.js";

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
// Lab 4 - Actions Taken and status history (api-spec.md 6.1, 6.2).
// Display order actionAt desc, id desc (BR-22); history oldest first (BR-23).
// ---------------------------------------------------------------------------
const actionOrder = [{ actionAt: "desc" }, { id: "desc" }] satisfies Prisma.ActionTakenOrderByWithRelationInput[];
const historyOrder = [{ changedAt: "asc" }, { id: "asc" }] satisfies Prisma.TicketStatusChangeOrderByWithRelationInput[];

const actionCore = {
  id: true,
  status: true,
  actionAt: true,
  description: true,
  result: true,
  followUpRequired: true,
  followUpNote: true,
  attachmentNotes: true,
  createdAt: true,
  finishedAt: true,
} as const;

const requesterActionSelect = {
  ...actionCore,
  assignee: { select: { name: true } },
  creator: { select: { name: true } },
  performer: { select: { name: true } },
} satisfies Prisma.ActionTakenSelect;

const staffActionSelect = {
  ...actionCore,
  version: true,
  assignee: { select: { id: true, name: true, isActive: true } },
  creator: { select: { id: true, name: true, isActive: true } },
  performer: { select: { id: true, name: true, isActive: true } },
} satisfies Prisma.ActionTakenSelect;

type RequesterActionRow = Prisma.ActionTakenGetPayload<{ select: typeof requesterActionSelect }>;
type StaffActionRow = Prisma.ActionTakenGetPayload<{ select: typeof staffActionSelect }>;

function toRequesterAction(a: RequesterActionRow) {
  return {
    id: a.id,
    status: a.status,
    actionAt: a.actionAt,
    description: a.description,
    result: a.result,
    followUpRequired: a.followUpRequired,
    followUpNote: a.followUpNote,
    attachmentNotes: a.attachmentNotes,
    assignee: { name: a.assignee.name },
    createdBy: { name: a.creator.name },
    performedBy: a.performer ? { name: a.performer.name } : null,
    createdAt: a.createdAt,
    finishedAt: a.finishedAt,
  };
}

function toStaffAction(a: StaffActionRow, ticketStatus: Parameters<typeof allowedOperations>[1]) {
  return {
    id: a.id,
    status: a.status,
    actionAt: a.actionAt,
    description: a.description,
    result: a.result,
    followUpRequired: a.followUpRequired,
    followUpNote: a.followUpNote,
    attachmentNotes: a.attachmentNotes,
    assignee: a.assignee,
    createdBy: a.creator,
    performedBy: a.performer,
    createdAt: a.createdAt,
    finishedAt: a.finishedAt,
    version: a.version,
    allowedOperations: allowedOperations(a.status, ticketStatus),
  };
}

// C-179: true when the history holds the creation row (null -> NEW).
function historyComplete(rows: { fromStatus: unknown; toStatus: unknown }[]): boolean {
  return rows.some((r) => r.fromStatus === null && r.toStatus === "NEW");
}

// ---------------------------------------------------------------------------
// 10.2 - the Requester Ticket DTO
// ---------------------------------------------------------------------------
export const ticketInclude = {
  requester: { select: { id: true, name: true } },
  // BR-100, C-95: the Requester sees who is handling their Ticket, by name
  // and activation state only - never the owner's email address. isActive
  // feeds the ui-spec.md 14.1 "(inactive)" qualifier (C-114).
  owner: { select: { name: true, isActive: true } },
  category: { select: { id: true, name: true } },
  relatedSystem: { select: { id: true, name: true } },
  attachments: attachmentSelect,
  publicComments: { orderBy: newestFirst, select: entrySelect },
  // Lab 4: every action, names only (BR-20, C-123), and the status history.
  actions: { orderBy: actionOrder, select: requesterActionSelect },
  statusChanges: { orderBy: historyOrder, select: { id: true, fromStatus: true, toStatus: true, changedAt: true, changedBy: { select: { name: true } } } },
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
    owner: t.owner ? { name: t.owner.name, isActive: t.owner.isActive } : null,
    requesterResolvedAt: t.requesterResolvedAt,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    version: t.version,
    lastActivityAt: t.lastActivityAt,
    resolvedAt: t.resolvedAt,
    attachments: t.attachments,
    publicComments: t.publicComments.map(toEntryDto),
    actions: t.actions.map(toRequesterAction),
    statusHistory: t.statusChanges.map((h) => ({
      id: h.id,
      fromStatus: h.fromStatus,
      toStatus: h.toStatus,
      changedBy: { name: h.changedBy.name },
      changedAt: h.changedAt,
    })),
    historyComplete: historyComplete(t.statusChanges),
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
  actions: { orderBy: actionOrder, select: staffActionSelect },
  statusChanges: { orderBy: historyOrder, select: { id: true, fromStatus: true, toStatus: true, changedAt: true, changedBy: { select: { id: true, name: true } } } },
} satisfies Prisma.TicketInclude;

export type StaffTicketWithRelations = Prisma.TicketGetPayload<{ include: typeof staffTicketInclude }>;

export function toStaffTicketDto(t: StaffTicketWithRelations, reasons: readonly string[]) {
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
    version: t.version,
    lastActivityAt: t.lastActivityAt,
    resolvedAt: t.resolvedAt,
    attachments: t.attachments,
    publicComments: t.publicComments.map(toEntryDto),
    internalNotes: t.internalNotes.map(toEntryDto),
    actions: t.actions.map((a) => toStaffAction(a, t.currentStatus)),
    statusHistory: t.statusChanges.map((h) => ({
      id: h.id,
      fromStatus: h.fromStatus,
      toStatus: h.toStatus,
      changedBy: { id: h.changedBy.id, name: h.changedBy.name },
      changedAt: h.changedAt,
    })),
    historyComplete: historyComplete(t.statusChanges),
    // C-171: every move the matrix permits, Resolved included even when the
    // gate fails; the gate travels beside it so the screen can say why.
    allowedTransitions: allowedTransitions(t.currentStatus),
    resolutionGate: { met: reasons.length === 0, reasons: [...reasons] },
  };
}

// null when there is no such Ticket; staff are not ownership-scoped, so that
// is the only reason for a 404 on a staff route (api-spec.md 8.2).
export async function loadStaffTicketDto(prisma: PrismaClient, id: number) {
  const row = await prisma.ticket.findUnique({ where: { id }, include: staffTicketInclude });
  if (!row) return null;
  return toStaffTicketDto(row, await gateReasons(prisma as unknown as Tx, id));
}
