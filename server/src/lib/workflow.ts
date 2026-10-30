import type { ActionStatus, Prisma, TicketStatus } from "@prisma/client";
import { trimmed, trimmedWithin } from "./text.js";

// Lab 4 workflow rules shared by the action routes, the staff Ticket routes
// and the DTOs: the resolution gate (BR-29 to BR-32), the row lock (BR-34),
// status history (BR-50), and the Actions Taken field rules (BR-04 to BR-07,
// BR-90). Messages are ui-spec.md sections 3 and 4, character for character.

export type Tx = Prisma.TransactionClient;

export const ACTION_MESSAGES = {
  status: "Choose Planned or Completed.",
  actionAtRequired: "Action Date/Time is required.",
  actionAtBeforeTicket: "Action Date/Time cannot be before the ticket was created.",
  actionAtFuture: "Enter the time the work was done. It cannot be in the future.",
  description: "Description is required and must be 2000 characters or fewer.",
  result: "Result is required and must be 2000 characters or fewer.",
  reason: "Reason is required and must be 2000 characters or fewer.",
  followUpNoteRequired: "Follow-up Note is required when follow-up is needed, and must be 1000 characters or fewer.",
  followUpNoteNotAllowed: "Remove the Follow-up Note, or tick Follow-Up Required?.",
  followUpRequired: "Follow-Up Required? must be true or false.",
  attachmentNotes: "Attachment Notes must be 500 characters or fewer.",
  assigneeId: "Choose an active IT Staff or Administrator user.",
  version: "Refresh the page and try again.",
  clientRequestId: "clientRequestId must be a UUID.",
  notAccepted: (name: string) => `${name} is not accepted here.`,
  nothingToChange: "Change at least one field before saving.",
} as const;

export const ACTION_TEXT_MAX = 2000;
export const FOLLOW_UP_NOTE_MAX = 1000;
export const ATTACHMENT_NOTES_MAX = 500;
// BR-07, C-168: a completed action may be recorded up to five minutes ahead of
// the server clock, which absorbs skew between a laptop and the server.
export const FUTURE_ALLOWANCE_MS = 5 * 60 * 1000;

// BR-24, C-122: the Ticket statuses that accept an action write.
export const ACTION_WRITABLE: readonly TicketStatus[] = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "REOPENED"];

// C-167: the gate reasons, in their fixed order.
export const GATE_REASONS = ["NO_COMPLETED_ACTION", "PLANNED_ACTIONS_OPEN", "FOLLOW_UP_REQUIRED", "NO_ACTION_SINCE_REOPEN"] as const;
export type GateReason = (typeof GATE_REASONS)[number];

// BR-90, C-175: identity and server-set fields are ignored, never refused, so a
// client can never assert who it is (L3 C-64, BR-03).
const IGNORED_FIELDS = new Set([
  "createdById",
  "createdAt",
  "performedById",
  "finishedAt",
  "requesterId",
  "authorId",
  "ownerId",
  "changedById",
]);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

export function readBody(body: unknown): Record<string, unknown> {
  return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
}

// C-175 - the fields each action operation accepts, api-spec.md 3.1 to 3.4.
// result and the follow-up pair belong to completed work only.
export type ActionOperation = "plannedCreate" | "completedCreate" | "edit" | "complete" | "cancel";

export const ACCEPTED_FIELDS: Readonly<Record<ActionOperation, readonly string[]>> = {
  plannedCreate: ["status", "actionAt", "description", "assigneeId", "attachmentNotes", "clientRequestId"],
  completedCreate: ["status", "actionAt", "description", "assigneeId", "attachmentNotes", "result", "followUpRequired", "followUpNote", "clientRequestId"],
  edit: ["version", "description", "actionAt", "assigneeId", "attachmentNotes"],
  complete: ["version", "result", "followUpRequired", "followUpNote", "actionAt"],
  cancel: ["version", "result"],
};

// A body key is accepted, silently ignored (server-set and identity fields,
// and `version` on create - BR-03), or refused 400 naming it.
export function classifyField(op: ActionOperation, key: string): "accepted" | "ignored" | "refused" {
  if (ACCEPTED_FIELDS[op].includes(key)) return "accepted";
  if (IGNORED_FIELDS.has(key)) return "ignored";
  if (key === "version" && (op === "plannedCreate" || op === "completedCreate")) return "ignored";
  return "refused";
}

// Every refused key becomes a field error.
export function refuseUnaccepted(body: Record<string, unknown>, op: ActionOperation, fields: Record<string, string>): void {
  for (const key of Object.keys(body)) {
    if (classifyField(op, key) === "refused") fields[key] = ACTION_MESSAGES.notAccepted(key);
  }
}

export function readVersion(body: Record<string, unknown>, fields: Record<string, string>): number | null {
  const v = body.version;
  if (typeof v === "number" && Number.isInteger(v) && v >= 0) return v;
  fields.version = ACTION_MESSAGES.version;
  return null;
}

// BR-04: description and result use the Public Comment validator itself (L3
// C-74), not a copy of it.
export const textField = trimmedWithin;

// BR-07: ISO 8601 with an explicit offset (Z or ±hh:mm). A value without one
// is ambiguous and is refused.
const ISO_WITH_OFFSET = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/;

export function parseActionAt(value: unknown): Date | null {
  if (typeof value !== "string" || !ISO_WITH_OFFSET.test(value)) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  // V8 rolls an impossible date over (2026-02-31 becomes 3 March); refuse it.
  const [y, m, day] = value.slice(0, 10).split("-").map(Number);
  const calendar = new Date(Date.UTC(y, m - 1, day));
  if (calendar.getUTCFullYear() !== y || calendar.getUTCMonth() !== m - 1 || calendar.getUTCDate() !== day) return null;
  return d;
}

// Checks an actionAt against the Ticket's creation and, for completed work,
// the server clock. Returns the message, or null when it is acceptable.
export function actionAtProblem(at: Date, ticketCreatedAt: Date, completed: boolean, now: Date): string | null {
  if (at.getTime() < ticketCreatedAt.getTime()) return ACTION_MESSAGES.actionAtBeforeTicket;
  if (completed && at.getTime() > now.getTime() + FUTURE_ALLOWANCE_MS) return ACTION_MESSAGES.actionAtFuture;
  return null;
}

// BR-05: the follow-up pair. Writes into `fields` and returns the values.
export function readFollowUp(
  body: Record<string, unknown>,
  fields: Record<string, string>,
): { followUpRequired: boolean; followUpNote: string | null } {
  const raw = body.followUpRequired;
  let followUpRequired = false;
  if (raw !== undefined) {
    if (typeof raw !== "boolean") fields.followUpRequired = ACTION_MESSAGES.followUpRequired;
    else followUpRequired = raw;
  }
  let followUpNote: string | null = null;
  if (followUpRequired) {
    followUpNote = textField(body.followUpNote, FOLLOW_UP_NOTE_MAX);
    if (followUpNote === null) fields.followUpNote = ACTION_MESSAGES.followUpNoteRequired;
  } else if (body.followUpNote !== undefined && body.followUpNote !== null) {
    fields.followUpNote = ACTION_MESSAGES.followUpNoteNotAllowed;
  }
  return { followUpRequired, followUpNote };
}

export function readAttachmentNotes(value: unknown, fields: Record<string, string>): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string" || trimmed(value).length > ATTACHMENT_NOTES_MAX) {
    fields.attachmentNotes = ACTION_MESSAGES.attachmentNotes;
    return undefined;
  }
  const t = trimmed(value);
  return t.length === 0 ? null : t;
}

// ---------------------------------------------------------------------------
// BR-34 - the row lock. Every action write and every Ticket status change opens
// its transaction by locking the Ticket row. Postgres holds the lock until the
// transaction ends, so writes on one Ticket serialize and a gate count cannot
// be overtaken by a planned-action insert. It is a SELECT ... FOR UPDATE, not
// an UPDATE: a write that is then refused (the gate, a stale version) must
// leave no trace, so lastActivityAt is set by touchTicket on success only.
// ---------------------------------------------------------------------------
export async function lockTicket(tx: Tx, ticketId: number): Promise<void> {
  await tx.$queryRaw`SELECT "id" FROM "Ticket" WHERE "id" = ${ticketId} FOR UPDATE`;
}

// BR-46 - a successful action write moves the Ticket's activity time, never
// its version (BR-37).
export async function touchTicket(tx: Tx, ticketId: number, now: Date): Promise<void> {
  await tx.ticket.update({ where: { id: ticketId }, data: { lastActivityAt: now } });
}

// ---------------------------------------------------------------------------
// BR-29 to BR-31 - the resolution gate, evaluated against the current rows.
// Owner absence is not a reason (BR-28); the caller checks OWNER_REQUIRED
// first. Every applicable reason is returned, in the C-167 order.
// ---------------------------------------------------------------------------
export async function gateReasons(db: Tx, ticketId: number): Promise<GateReason[]> {
  // Sequential, not Promise.all: inside an interactive transaction the
  // queries share one connection.
  const completed = await db.actionTaken.count({ where: { ticketId, status: "COMPLETED" } });
  const planned = await db.actionTaken.count({ where: { ticketId, status: "PLANNED" } });
  // BR-30, C-137: "latest" is by when the work was recorded as finished.
  const latestCompleted = await db.actionTaken.findFirst({
    where: { ticketId, status: "COMPLETED" },
    orderBy: [{ finishedAt: "desc" }, { id: "desc" }],
    select: { followUpRequired: true },
  });
  const latestReopen = await db.ticketStatusChange.findFirst({
    where: { ticketId, toStatus: "REOPENED" },
    orderBy: [{ changedAt: "desc" }, { id: "desc" }],
    select: { changedAt: true },
  });
  const reasons: GateReason[] = [];
  if (completed === 0) reasons.push("NO_COMPLETED_ACTION");
  if (planned > 0) reasons.push("PLANNED_ACTIONS_OPEN");
  if (latestCompleted?.followUpRequired) reasons.push("FOLLOW_UP_REQUIRED");
  if (latestReopen) {
    // BR-31, C-186: only a COMPLETED action finished after the latest move
    // into REOPENED counts; a cancelled one does not.
    const since = await db.actionTaken.count({
      where: { ticketId, status: "COMPLETED", finishedAt: { gt: latestReopen.changedAt } },
    });
    if (since === 0) reasons.push("NO_ACTION_SINCE_REOPEN");
  }
  return reasons;
}

// BR-50, C-167 - one append-only history row per status change, written in the
// same transaction as the change. fromStatus is null only on creation.
export async function recordStatusChange(
  tx: Tx,
  ticketId: number,
  fromStatus: TicketStatus | null,
  toStatus: TicketStatus,
  changedById: number,
  changedAt: Date,
): Promise<void> {
  await tx.ticketStatusChange.create({ data: { ticketId, fromStatus, toStatus, changedById, changedAt } });
}

// C-174 - what a staff user may do to an action right now (FR-09).
export function allowedOperations(status: ActionStatus, ticketStatus: TicketStatus): ("EDIT" | "COMPLETE" | "CANCEL")[] {
  return status === "PLANNED" && ACTION_WRITABLE.includes(ticketStatus) ? ["EDIT", "COMPLETE", "CANCEL"] : [];
}

// Prisma's unique-constraint violation, raised by a concurrent replay (BR-43).
export function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: unknown }).code === "P2002";
}
