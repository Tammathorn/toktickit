import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Prisma, TicketStatus } from "@prisma/client";
import { getPrisma } from "../../src/prisma.js";
import { deleteTickets } from "../support/cleanup.js";
import { createTicketWithNumber, type NewTicket } from "../../src/lib/ticket-repository.js";
import { removeUsers, signIn, signedInUser, type Agent } from "../support/agents.js";

// Lab 4 Actions Taken - tests.md sections 2.1, 2.2 and 2.4 (Issue #64):
// UNIT-01..UNIT-04, API-01..API-48, SEC-01..SEC-04 and SEC-14, against the four
// action routes of api-spec.md section 3 and the action arrays both Ticket
// DTOs carry (section 6).
//
// "Nothing changes" (tests.md 2.2) means the Ticket's action rows, version,
// lastActivityAt and status are re-read and equal the before values - so every
// refusal below also proves a refused write leaves lastActivityAt alone. Each
// successful write asserts that lastActivityAt moved and the Ticket's version
// did not (BR-46, BR-37); WF-40..WF-43 restate that per path in
// ticket-workflow.api.test.ts with Issue #66.
//
// Every user, Ticket and action here is created by this file and removed in
// afterAll through deleteTickets (Issue #63), which removes a Ticket's actions
// and history rows first.

const prisma = getPrisma();
const TAG = "[actions-test]";
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const MISSING_ID = 99999999;
const WORKFLOW = "../../src/lib/workflow.js";

const WRITABLE: TicketStatus[] = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "REOPENED"];
const ALL_STATUSES: TicketStatus[] = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CLOSED", "REOPENED", "CANCELLED"];

// ui-spec.md section 3, character for character.
const MSG = {
  status: "Choose Planned or Completed.",
  actionAtBeforeTicket: "Action Date/Time cannot be before the ticket was created.",
  actionAtFuture: "Enter the time the work was done. It cannot be in the future.",
  description: "Description is required and must be 2000 characters or fewer.",
  result: "Result is required and must be 2000 characters or fewer.",
  reason: "Reason is required and must be 2000 characters or fewer.",
  followUpNoteRequired: "Follow-up Note is required when follow-up is needed, and must be 1000 characters or fewer.",
  followUpNoteNotAllowed: "Remove the Follow-up Note, or tick Follow-Up Required?.",
  attachmentNotes: "Attachment Notes must be 500 characters or fewer.",
  clientRequestId: "clientRequestId must be a UUID.",
  notAccepted: (name: string) => `${name} is not accepted here.`,
};

// api-spec.md 6.2: the Lab 3 staff DTO keys (L3 api 10.5) plus the Lab 4 ones.
const STAFF_DTO_KEYS = [
  "id", "ticketNumber", "requester", "category", "relatedSystem", "summary", "description", "requestedPriority",
  "itPriority", "currentStatus", "owner", "requesterResolvedAt", "createdAt", "updatedAt", "attachments",
  "publicComments", "internalNotes",
  "version", "lastActivityAt", "resolvedAt", "actions", "statusHistory", "historyComplete", "allowedTransitions", "resolutionGate",
].sort();
const STAFF_ACTION_KEYS = [
  "id", "status", "actionAt", "description", "result", "followUpRequired", "followUpNote", "attachmentNotes",
  "assignee", "createdBy", "performedBy", "createdAt", "finishedAt", "version", "allowedOperations",
].sort();
const REQUESTER_ACTION_KEYS = [
  "id", "status", "actionAt", "description", "result", "followUpRequired", "followUpNote", "attachmentNotes",
  "assignee", "createdBy", "performedBy", "createdAt", "finishedAt",
].sort();

type Person = { id: number; name: string; email: string; agent: Agent };
let staffA: Person;
let staffB: Person;
let staffC: Person;
let admin: Person;
let reqA: Person;
let reqB: Person;
let inactiveStaff: Person;
const userIds: number[] = [];

// A time as ISO 8601 with the +07:00 offset the client sends (BR-07).
const bkk = (d: Date) => new Date(d.getTime() + 7 * HOUR).toISOString().replace("Z", "+07:00");
const fromNow = (ms: number) => new Date(Date.now() + ms);
const uuid = () => crypto.randomUUID();

async function ticket(overrides: Partial<NewTicket> = {}) {
  const category = await prisma.category.findFirstOrThrow({ where: { isActive: true } });
  const system = await prisma.relatedSystem.findFirstOrThrow({ where: { isActive: true } });
  return createTicketWithNumber(prisma, {
    requesterId: reqA.id,
    categoryId: category.id,
    relatedSystemId: system.id,
    summary: `${TAG} fixture`,
    description: "Fixture row for actions-taken.api.test.ts.",
    requestedPriority: "MEDIUM",
    // Two hours old, so lastActivityAt (= createdAt) visibly moves on a write
    // and a completed actionAt of "now" is after the Ticket.
    createdAt: fromNow(-2 * HOUR),
    currentStatus: "OPEN",
    ...overrides,
  });
}

// A fixture action written through Prisma (tests.md 1.2).
function action(ticketId: number, data: Partial<Prisma.ActionTakenUncheckedCreateInput> = {}) {
  return prisma.actionTaken.create({
    data: {
      ticketId,
      status: "PLANNED",
      actionAt: fromNow(HOUR),
      description: `${TAG} planned work`,
      assigneeId: staffA.id,
      createdById: staffA.id,
      ...data,
    },
  });
}

function completedAction(ticketId: number, data: Partial<Prisma.ActionTakenUncheckedCreateInput> = {}) {
  const at = fromNow(-HOUR);
  return action(ticketId, { status: "COMPLETED", actionAt: at, result: "Done.", performedById: staffA.id, finishedAt: at, ...data });
}

const plannedBody = (extra: Record<string, unknown> = {}) => ({
  status: "PLANNED",
  actionAt: bkk(fromNow(HOUR)),
  description: "Replace the laptop battery.",
  ...extra,
});
const completedBody = (extra: Record<string, unknown> = {}) => ({
  status: "COMPLETED",
  actionAt: bkk(fromNow(-30 * MINUTE)),
  description: "Ran the battery diagnostic.",
  result: "Battery health 41%.",
  followUpRequired: false,
  ...extra,
});

const create = (as: Agent, ticketId: number | string, body: object) => as.post(`/api/tickets/${ticketId}/actions`).send(body);
const edit = (as: Agent, id: number | string, body: object) => as.patch(`/api/actions/${id}`).send(body);
const complete = (as: Agent, id: number | string, body: object) => as.post(`/api/actions/${id}/complete`).send(body);
const cancel = (as: Agent, id: number | string, body: object) => as.post(`/api/actions/${id}/cancel`).send(body);

const ticketRow = (id: number) => prisma.ticket.findUniqueOrThrow({ where: { id } });
const actionRow = (id: number) => prisma.actionTaken.findUniqueOrThrow({ where: { id } });
const actionsOf = (ticketId: number) => prisma.actionTaken.findMany({ where: { ticketId }, orderBy: { id: "asc" } });

// The tests.md 2.2 "nothing changes" state.
async function snapshot(ticketId: number) {
  const t = await prisma.ticket.findUniqueOrThrow({
    where: { id: ticketId },
    select: { version: true, lastActivityAt: true, currentStatus: true },
  });
  return JSON.parse(JSON.stringify({ ticket: t, actions: await actionsOf(ticketId) }));
}

function expectFieldError(res: { status: number; body: any }, field: string, message?: string) {
  expect(res.status, JSON.stringify(res.body)).toBe(400);
  expect(res.body.error.code).toBe("VALIDATION_FAILED");
  expect(Object.keys(res.body.error.fields ?? {})).toContain(field);
  if (message !== undefined) expect(res.body.error.fields[field]).toBe(message);
}

function expectCode(res: { status: number; body: any }, status: number, code: string) {
  expect(res.status, JSON.stringify(res.body)).toBe(status);
  expect(res.body.error?.code).toBe(code);
}

// Asserts a successful action write moved the Ticket's activity time and left
// its version and status alone (BR-46, BR-37, BR-16).
async function expectActivityMoved(ticketId: number, before: { version: number; lastActivityAt: Date; currentStatus: TicketStatus }) {
  const after = await ticketRow(ticketId);
  expect(after.lastActivityAt.getTime()).toBeGreaterThan(before.lastActivityAt.getTime());
  expect(Date.now() - after.lastActivityAt.getTime()).toBeLessThan(5000);
  expect(after.version).toBe(before.version);
  expect(after.currentStatus).toBe(before.currentStatus);
}

beforeAll(async () => {
  staffA = await signedInUser(prisma, "actions-staffa", { role: "IT_STAFF", name: `${TAG} Staff A` });
  staffB = await signedInUser(prisma, "actions-staffb", { role: "IT_STAFF", name: `${TAG} Staff B` });
  staffC = await signedInUser(prisma, "actions-staffc", { role: "IT_STAFF", name: `${TAG} Staff C` });
  admin = await signedInUser(prisma, "actions-admin", { role: "ADMINISTRATOR", name: `${TAG} Admin` });
  reqA = await signedInUser(prisma, "actions-reqa", { name: `${TAG} Requester A` });
  reqB = await signedInUser(prisma, "actions-reqb", { name: `${TAG} Requester B` });
  inactiveStaff = await signedInUser(prisma, "actions-inactive", { role: "IT_STAFF", name: `${TAG} Retired Staff` });
  await prisma.user.update({ where: { id: inactiveStaff.id }, data: { isActive: false } });
  userIds.push(staffA.id, staffB.id, staffC.id, admin.id, reqA.id, reqB.id, inactiveStaff.id);
});

afterAll(async () => {
  await deleteTickets(prisma, { requesterId: { in: userIds } });
  await removeUsers(prisma, userIds);
});

// ===========================================================================
// 2.1 Unit
// ===========================================================================
describe("action field rules as functions (UNIT)", () => {
  it("UNIT-01 description/result: whitespace-only and 2001 fail, 1 and 2000 pass, after trim, with the L3 C-74 validator itself; follow-up note and attachment notes bounds (BR-04..BR-06)", async () => {
    const wf = await import(WORKFLOW);
    const text = await import("../../src/lib/text.js");
    // BR-04: "using the Public Comment validator" - the same function object.
    expect(typeof (text as Record<string, unknown>).trimmedWithin).toBe("function");
    expect(wf.textField).toBe((text as Record<string, unknown>).trimmedWithin);
    expect(wf.textField("   \n\t ", 2000)).toBeNull();
    expect(wf.textField("x".repeat(2001), 2000)).toBeNull();
    expect(wf.textField("x", 2000)).toBe("x");
    expect(wf.textField("x".repeat(2000), 2000)).toBe("x".repeat(2000));
    expect(wf.textField(`  ${"y".repeat(2000)}  `, 2000)).toBe("y".repeat(2000));

    const followUp = (body: Record<string, unknown>) => {
      const fields: Record<string, string> = {};
      const value = wf.readFollowUp(body, fields);
      return { value, fields };
    };
    expect(followUp({ followUpRequired: true }).fields.followUpNote).toBe(MSG.followUpNoteRequired);
    expect(followUp({ followUpRequired: true, followUpNote: "   " }).fields.followUpNote).toBe(MSG.followUpNoteRequired);
    expect(followUp({ followUpRequired: true, followUpNote: "n".repeat(1001) }).fields.followUpNote).toBe(MSG.followUpNoteRequired);
    expect(followUp({ followUpRequired: true, followUpNote: "n".repeat(1000) })).toEqual({
      value: { followUpRequired: true, followUpNote: "n".repeat(1000) },
      fields: {},
    });
    expect(followUp({ followUpRequired: true, followUpNote: "n" }).fields).toEqual({});
    expect(followUp({ followUpRequired: false, followUpNote: "n" }).fields.followUpNote).toBe(MSG.followUpNoteNotAllowed);
    expect(followUp({ followUpRequired: false })).toEqual({ value: { followUpRequired: false, followUpNote: null }, fields: {} });

    const notes = (value: unknown) => {
      const fields: Record<string, string> = {};
      return { value: wf.readAttachmentNotes(value, fields), fields };
    };
    expect(notes("a".repeat(500))).toEqual({ value: "a".repeat(500), fields: {} });
    expect(notes("a".repeat(501)).fields.attachmentNotes).toBe(MSG.attachmentNotes);
  });

  it("UNIT-02 actionAt: no offset fails, +07:00 and Z parse, before createdAt fails, completed now + 5 min passes and 1 ms later fails (BR-07, now injected)", async () => {
    const wf = await import(WORKFLOW);
    expect(wf.parseActionAt("2026-10-16T10:00")).toBeNull();
    expect(wf.parseActionAt("2026-10-16T10:00:00")).toBeNull();
    expect(wf.parseActionAt("not a date")).toBeNull();
    expect(wf.parseActionAt("2026-02-31T10:00:00+07:00")).toBeNull();
    const plus7 = wf.parseActionAt("2026-10-16T10:00:00+07:00");
    const zulu = wf.parseActionAt("2026-10-16T03:00:00Z");
    expect(plus7).toBeInstanceOf(Date);
    expect(plus7.getTime()).toBe(zulu.getTime());

    const now = new Date("2026-10-16T03:00:00.000Z");
    const created = new Date("2026-10-15T00:00:00.000Z");
    expect(wf.actionAtProblem(new Date(created.getTime() - 1), created, false, now)).toBe(MSG.actionAtBeforeTicket);
    expect(wf.actionAtProblem(created, created, false, now)).toBeNull();
    expect(wf.actionAtProblem(new Date(now.getTime() + 5 * MINUTE), created, true, now)).toBeNull();
    expect(wf.actionAtProblem(new Date(now.getTime() + 5 * MINUTE + 1), created, true, now)).toBe(MSG.actionAtFuture);
    // A planned action may be in the future.
    expect(wf.actionAtProblem(new Date(now.getTime() + 24 * HOUR), created, false, now)).toBeNull();
  });

  it("UNIT-03 each operation accepts exactly its api-spec 3.1-3.4 fields; server-set and identity fields are ignored; anything else is refused (BR-90, C-175)", async () => {
    const wf = await import(WORKFLOW);
    const expected: Record<string, string[]> = {
      plannedCreate: ["status", "actionAt", "description", "assigneeId", "attachmentNotes", "clientRequestId"],
      completedCreate: ["status", "actionAt", "description", "assigneeId", "attachmentNotes", "result", "followUpRequired", "followUpNote", "clientRequestId"],
      edit: ["version", "description", "actionAt", "assigneeId", "attachmentNotes"],
      complete: ["version", "result", "followUpRequired", "followUpNote", "actionAt"],
      cancel: ["version", "result"],
    };
    expect(Object.keys(wf.ACCEPTED_FIELDS).sort()).toEqual(Object.keys(expected).sort());
    for (const [op, names] of Object.entries(expected)) {
      expect([...wf.ACCEPTED_FIELDS[op]].sort(), op).toEqual([...names].sort());
      for (const name of names) expect(wf.classifyField(op, name), `${op} ${name}`).toBe("accepted");
      for (const name of ["createdById", "createdAt", "performedById", "finishedAt", "requesterId", "authorId"]) {
        expect(wf.classifyField(op, name), `${op} ${name}`).toBe("ignored");
      }
      for (const name of ["priority", "foo", "currentStatus", "id", "ticketId"]) expect(wf.classifyField(op, name), `${op} ${name}`).toBe("refused");
    }
    // version is server-set on create only (BR-03).
    expect(wf.classifyField("plannedCreate", "version")).toBe("ignored");
    expect(wf.classifyField("completedCreate", "version")).toBe("ignored");
    // Known fields an operation does not accept.
    expect(wf.classifyField("plannedCreate", "result")).toBe("refused");
    expect(wf.classifyField("plannedCreate", "followUpRequired")).toBe("refused");
    expect(wf.classifyField("edit", "result")).toBe("refused");
    expect(wf.classifyField("edit", "status")).toBe("refused");
    expect(wf.classifyField("complete", "assigneeId")).toBe("refused");
    expect(wf.classifyField("cancel", "assigneeId")).toBe("refused");
    expect(wf.classifyField("cancel", "followUpRequired")).toBe("refused");
  });

  it("UNIT-04 allowedOperations(actionStatus, ticketStatus) over 3 x 8: EDIT, COMPLETE, CANCEL only for PLANNED on the five writable statuses (FR-09, C-174, BR-24)", async () => {
    const wf = await import(WORKFLOW);
    for (const actionStatus of ["PLANNED", "COMPLETED", "CANCELLED"]) {
      for (const ticketStatus of ALL_STATUSES) {
        const want = actionStatus === "PLANNED" && WRITABLE.includes(ticketStatus) ? ["EDIT", "COMPLETE", "CANCEL"] : [];
        expect(wf.allowedOperations(actionStatus, ticketStatus), `${actionStatus} on ${ticketStatus}`).toEqual(want);
      }
    }
  });
});

// ===========================================================================
// 2.2 API - create
// ===========================================================================
describe("POST /api/tickets/:id/actions", () => {
  it("API-01 IT Staff A creates a PLANNED action assigned to IT Staff B -> 201 staff DTO, one row, version 0, no performer; lastActivityAt moves, Ticket version unchanged (AC-01)", async () => {
    const t = await ticket();
    const before = await ticketRow(t.id);
    const res = await create(staffA.agent, t.id, plannedBody({ assigneeId: staffB.id }));
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    expect(res.body.id).toBe(t.id);
    const rows = await actionsOf(t.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      ticketId: t.id, createdById: staffA.id, assigneeId: staffB.id, status: "PLANNED", version: 0, performedById: null, finishedAt: null,
    });
    expect(res.body.actions.map((a: { id: number }) => a.id)).toEqual([rows[0].id]);
    await expectActivityMoved(t.id, before);
  });

  it("API-02 IT Staff C creates an action already COMPLETED -> performedById C, finishedAt = createdAt, actionAt as submitted (AC-22, C-160)", async () => {
    const t = await ticket();
    const at = fromNow(-40 * MINUTE);
    const res = await create(staffC.agent, t.id, completedBody({ actionAt: bkk(at) }));
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    const [row] = await actionsOf(t.id);
    expect(row.status).toBe("COMPLETED");
    expect(row.performedById).toBe(staffC.id);
    expect(row.finishedAt?.getTime()).toBe(row.createdAt.getTime());
    expect(row.actionAt.getTime()).toBe(at.getTime());
  });

  it("API-03 IT Staff B creates an action on a Ticket owned by IT Staff A -> 201, createdById B, the owner is still A (AC-04)", async () => {
    const t = await ticket({ ownerId: staffA.id, currentStatus: "IN_PROGRESS" });
    const res = await create(staffB.agent, t.id, plannedBody());
    expect(res.status).toBe(201);
    const [row] = await actionsOf(t.id);
    expect(row.createdById).toBe(staffB.id);
    expect((await ticketRow(t.id)).ownerId).toBe(staffA.id);
  });

  it("API-04 createdById, createdAt, performedById, finishedAt and version in the body are ignored: the row holds the session user, server times, version 0, no 400 (AC-05, BR-03)", async () => {
    const t = await ticket();
    const longAgo = "2020-01-01T00:00:00Z";
    const res = await create(staffA.agent, t.id, plannedBody({
      createdById: staffB.id, createdAt: longAgo, performedById: staffB.id, finishedAt: longAgo, version: 7,
    }));
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    const [row] = await actionsOf(t.id);
    expect(row.createdById).toBe(staffA.id);
    expect(Date.now() - row.createdAt.getTime()).toBeLessThan(5000);
    expect(row.performedById).toBeNull();
    expect(row.finishedAt).toBeNull();
    expect(row.version).toBe(0);
  });

  it("API-05 requesterId and createdById in the body are ignored; the action is created by the session user (AC-141, L3 C-64)", async () => {
    const t = await ticket();
    const res = await create(staffB.agent, t.id, plannedBody({ requesterId: reqB.id, createdById: staffA.id }));
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    const [row] = await actionsOf(t.id);
    expect(row.createdById).toBe(staffB.id);
    expect((await ticketRow(t.id)).requesterId).toBe(reqA.id);
  });

  it("API-06 a create with no assigneeId assigns the caller (AC-29, BR-18)", async () => {
    const t = await ticket();
    const res = await create(admin.agent, t.id, plannedBody());
    expect(res.status).toBe(201);
    expect((await actionsOf(t.id))[0].assigneeId).toBe(admin.id);
  });

  it("API-07 a Requester named as assignee, on create and on edit -> 422 ASSIGNEE_NOT_ELIGIBLE, nothing changes (AC-27)", async () => {
    const t = await ticket();
    const planned = await action(t.id);
    const before = await snapshot(t.id);
    expectCode(await create(staffA.agent, t.id, plannedBody({ assigneeId: reqB.id })), 422, "ASSIGNEE_NOT_ELIGIBLE");
    expectCode(await edit(staffA.agent, planned.id, { version: 0, assigneeId: reqB.id }), 422, "ASSIGNEE_NOT_ELIGIBLE");
    expect(await snapshot(t.id)).toEqual(before);
  });

  it("API-08 an inactive IT Staff user and an unknown id as assignee, on create and on an edit that changes the assignee -> 422 each, nothing changes (AC-28, C-177)", async () => {
    const t = await ticket();
    const planned = await action(t.id);
    const before = await snapshot(t.id);
    for (const assigneeId of [inactiveStaff.id, MISSING_ID, 2147483648]) {
      expectCode(await create(staffA.agent, t.id, plannedBody({ assigneeId })), 422, "ASSIGNEE_NOT_ELIGIBLE");
      expectCode(await edit(staffA.agent, planned.id, { version: 0, assigneeId }), 422, "ASSIGNEE_NOT_ELIGIBLE");
    }
    expect(await snapshot(t.id)).toEqual(before);
  });

  it("API-09 description whitespace-only and 2001 characters -> 400 at description, nothing saved; 2000 accepted (AC-06, BR-04)", async () => {
    const t = await ticket();
    const before = await snapshot(t.id);
    for (const description of ["   \n  ", "d".repeat(2001)]) {
      expectFieldError(await create(staffA.agent, t.id, plannedBody({ description })), "description", MSG.description);
    }
    expect(await snapshot(t.id)).toEqual(before);
    expect((await create(staffA.agent, t.id, plannedBody({ description: "d".repeat(2000) }))).status).toBe(201);
  });

  it("API-10 result missing and 2001 characters, on a completed create and on complete -> 400 at result, nothing saved, the action stays PLANNED (BR-04, BR-11)", async () => {
    const t = await ticket();
    const planned = await action(t.id);
    const before = await snapshot(t.id);
    expectFieldError(await create(staffA.agent, t.id, completedBody({ result: undefined })), "result", MSG.result);
    expectFieldError(await create(staffA.agent, t.id, completedBody({ result: "r".repeat(2001) })), "result", MSG.result);
    expectFieldError(await complete(staffA.agent, planned.id, { version: 0, followUpRequired: false }), "result", MSG.result);
    expectFieldError(await complete(staffA.agent, planned.id, { version: 0, followUpRequired: false, result: "r".repeat(2001) }), "result", MSG.result);
    expect(await snapshot(t.id)).toEqual(before);
    expect((await actionRow(planned.id)).status).toBe("PLANNED");
  });

  it("API-11 followUpRequired true with no followUpNote, and with 1001 characters -> 400 at followUpNote, nothing saved (AC-07, BR-05)", async () => {
    const t = await ticket();
    const before = await snapshot(t.id);
    expectFieldError(await create(staffA.agent, t.id, completedBody({ followUpRequired: true })), "followUpNote", MSG.followUpNoteRequired);
    expectFieldError(
      await create(staffA.agent, t.id, completedBody({ followUpRequired: true, followUpNote: "n".repeat(1001) })),
      "followUpNote",
      MSG.followUpNoteRequired,
    );
    expect(await snapshot(t.id)).toEqual(before);
  });

  it("API-12 followUpNote sent with followUpRequired false -> 400 at followUpNote, nothing saved (AC-08, BR-05)", async () => {
    const t = await ticket();
    const before = await snapshot(t.id);
    expectFieldError(
      await create(staffA.agent, t.id, completedBody({ followUpRequired: false, followUpNote: "Order a battery." })),
      "followUpNote",
      MSG.followUpNoteNotAllowed,
    );
    expect(await snapshot(t.id)).toEqual(before);
  });

  it("API-13 attachmentNotes of 501 characters -> 400 at attachmentNotes; 500 accepted (AC-10, BR-06)", async () => {
    const t = await ticket();
    const before = await snapshot(t.id);
    expectFieldError(await create(staffA.agent, t.id, plannedBody({ attachmentNotes: "a".repeat(501) })), "attachmentNotes", MSG.attachmentNotes);
    expect(await snapshot(t.id)).toEqual(before);
    expect((await create(staffA.agent, t.id, plannedBody({ attachmentNotes: "a".repeat(500) }))).status).toBe(201);
  });

  it("API-14 actionAt 1 minute before the Ticket's createdAt -> 400 at actionAt, 'cannot be before the ticket was created' (AC-11, BR-07)", async () => {
    const t = await ticket();
    const res = await create(staffA.agent, t.id, plannedBody({ actionAt: bkk(new Date(t.createdAt.getTime() - MINUTE)) }));
    expectFieldError(res, "actionAt", MSG.actionAtBeforeTicket);
    expect(await actionsOf(t.id)).toHaveLength(0);
  });

  it("API-15 a COMPLETED create with actionAt now + 10 min -> 400 at actionAt; a PLANNED create for tomorrow -> 201 (AC-12, BR-07)", async () => {
    const t = await ticket();
    expectFieldError(await create(staffA.agent, t.id, completedBody({ actionAt: bkk(fromNow(10 * MINUTE)) })), "actionAt", MSG.actionAtFuture);
    expect(await actionsOf(t.id)).toHaveLength(0);
    expect((await create(staffA.agent, t.id, plannedBody({ actionAt: bkk(fromNow(24 * HOUR)) }))).status).toBe(201);
  });

  it("API-16 actionAt 2026-10-16T10:00 with no offset -> 400 at actionAt (AC-13, BR-07)", async () => {
    const t = await ticket({ createdAt: new Date("2026-01-01T00:00:00Z") });
    expectFieldError(await create(staffA.agent, t.id, plannedBody({ actionAt: "2026-10-16T10:00" })), "actionAt");
    expect(await actionsOf(t.id)).toHaveLength(0);
  });

  it("API-17 status CANCELLED, and status absent -> 400 at status, nothing saved (AC-17, BR-09)", async () => {
    const t = await ticket();
    const before = await snapshot(t.id);
    expectFieldError(await create(staffA.agent, t.id, plannedBody({ status: "CANCELLED", result: undefined })), "status", MSG.status);
    expectFieldError(await create(staffA.agent, t.id, plannedBody({ status: undefined })), "status", MSG.status);
    expect(await snapshot(t.id)).toEqual(before);
  });

  it("API-18 create on a Ticket in each of NEW, OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER and REOPENED -> 201 on each (AC-39, BR-24)", async () => {
    for (const status of WRITABLE) {
      const t = await ticket({ currentStatus: status, ownerId: staffA.id });
      const res = await create(staffA.agent, t.id, plannedBody());
      expect(res.status, status).toBe(201);
      expect(res.body.currentStatus).toBe(status);
    }
  });
});

// ===========================================================================
// 2.2 API - edit, complete, cancel
// ===========================================================================
describe("PATCH /api/actions/:id, POST /api/actions/:id/complete and /cancel", () => {
  it("API-19 an edit of description, actionAt, assignee and attachment notes with the current version -> 200, stored, action version + 1; Ticket version unchanged, lastActivityAt moves (AC-18, BR-10, BR-37)", async () => {
    const t = await ticket();
    const planned = await action(t.id);
    const before = await ticketRow(t.id);
    const at = fromNow(3 * HOUR);
    const res = await edit(staffB.agent, planned.id, {
      version: 0, description: "Replace the battery and recalibrate.", actionAt: bkk(at), assigneeId: staffC.id, attachmentNotes: "Label photo.",
    });
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    const row = await actionRow(planned.id);
    expect(row).toMatchObject({ description: "Replace the battery and recalibrate.", assigneeId: staffC.id, attachmentNotes: "Label photo.", version: 1, status: "PLANNED" });
    expect(row.actionAt.getTime()).toBe(at.getTime());
    await expectActivityMoved(t.id, before);
  });

  it("API-20 IT Staff C completes a planned action with a result -> 200, COMPLETED, performedById C, finishedAt within 2 s of now, version + 1; lastActivityAt moves, Ticket version unchanged (AC-19, BR-11)", async () => {
    const t = await ticket();
    const planned = await action(t.id, { actionAt: fromNow(-10 * MINUTE) });
    const before = await ticketRow(t.id);
    const res = await complete(staffC.agent, planned.id, { version: 0, result: "Battery replaced.", followUpRequired: false });
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    const row = await actionRow(planned.id);
    expect(row).toMatchObject({ status: "COMPLETED", performedById: staffC.id, result: "Battery replaced.", version: 1 });
    expect(Math.abs(Date.now() - (row.finishedAt as Date).getTime())).toBeLessThan(2000);
    await expectActivityMoved(t.id, before);
  });

  it("API-21 complete sending actionAt now + 10 min -> 400 at actionAt; the action stays PLANNED (AC-131, C-168)", async () => {
    const t = await ticket();
    const planned = await action(t.id, { actionAt: fromNow(-10 * MINUTE) });
    const before = await snapshot(t.id);
    const res = await complete(staffA.agent, planned.id, { version: 0, result: "Done.", followUpRequired: false, actionAt: bkk(fromNow(10 * MINUTE)) });
    expectFieldError(res, "actionAt", MSG.actionAtFuture);
    expect(await snapshot(t.id)).toEqual(before);
  });

  it("API-22 complete without actionAt on an action stored for tomorrow -> 400 at actionAt with the 'in the future' text; then complete sending a past actionAt -> 200 (AC-132, C-168)", async () => {
    const t = await ticket();
    const planned = await action(t.id, { actionAt: fromNow(24 * HOUR) });
    const first = await complete(staffA.agent, planned.id, { version: 0, result: "Done.", followUpRequired: false });
    expectFieldError(first, "actionAt", MSG.actionAtFuture);
    expect((await actionRow(planned.id)).status).toBe("PLANNED");
    const past = fromNow(-5 * MINUTE);
    const second = await complete(staffA.agent, planned.id, { version: 0, result: "Done.", followUpRequired: false, actionAt: bkk(past) });
    expect(second.status, JSON.stringify(second.body)).toBe(200);
    const row = await actionRow(planned.id);
    expect(row.status).toBe("COMPLETED");
    expect(row.actionAt.getTime()).toBe(past.getTime());
  });

  it("API-23 cancel with no result -> 400 at result (the reason); the action stays PLANNED (AC-20, BR-12)", async () => {
    const t = await ticket();
    const planned = await action(t.id);
    const before = await snapshot(t.id);
    expectFieldError(await cancel(staffA.agent, planned.id, { version: 0 }), "result", MSG.reason);
    expect(await snapshot(t.id)).toEqual(before);
  });

  it("API-24 IT Staff C cancels with a reason -> 200, CANCELLED, the reason in result, performedById C, finishedAt set; lastActivityAt moves, Ticket version unchanged (AC-21, BR-12)", async () => {
    const t = await ticket();
    const planned = await action(t.id);
    const before = await ticketRow(t.id);
    const res = await cancel(staffC.agent, planned.id, { version: 0, result: "Requester bought a new laptop." });
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    const row = await actionRow(planned.id);
    expect(row).toMatchObject({ status: "CANCELLED", result: "Requester bought a new laptop.", performedById: staffC.id, version: 1 });
    expect(row.finishedAt).not.toBeNull();
    await expectActivityMoved(t.id, before);
  });

  it("API-25 edit, complete and cancel on a COMPLETED and on a CANCELLED action, current version -> 409 ACTION_NOT_PLANNED each, the action unchanged (AC-23, BR-14, C-162)", async () => {
    const t = await ticket();
    const done = await completedAction(t.id, { version: 1 });
    const dropped = await action(t.id, { status: "CANCELLED", result: "No longer needed.", performedById: staffA.id, finishedAt: fromNow(-MINUTE), version: 1 });
    const before = await snapshot(t.id);
    for (const a of [done, dropped]) {
      expectCode(await edit(staffA.agent, a.id, { version: 1, description: "Changed." }), 409, "ACTION_NOT_PLANNED");
      expectCode(await complete(staffA.agent, a.id, { version: 1, result: "Again.", followUpRequired: false }), 409, "ACTION_NOT_PLANNED");
      expectCode(await cancel(staffA.agent, a.id, { version: 1, result: "Again." }), 409, "ACTION_NOT_PLANNED");
    }
    expect(await snapshot(t.id)).toEqual(before);
  });

  it("API-26 IT Staff B, neither owner nor assignee, completes an action assigned to IT Staff A -> 200 (AC-26, BR-19)", async () => {
    const t = await ticket({ ownerId: admin.id, currentStatus: "IN_PROGRESS" });
    const planned = await action(t.id, { assigneeId: staffA.id, actionAt: fromNow(-MINUTE) });
    const res = await complete(staffB.agent, planned.id, { version: 0, result: "Done by B.", followUpRequired: false });
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect((await actionRow(planned.id)).performedById).toBe(staffB.id);
  });

  it("API-27 two planned actions whose assignee is deactivated afterwards: another staff user completes one and cancels the other -> both 200 (AC-30, C-132)", async () => {
    const leaver = await signedInUser(prisma, "actions-leaver", { role: "IT_STAFF", name: `${TAG} Leaver` });
    userIds.push(leaver.id);
    const t = await ticket();
    const one = await create(staffA.agent, t.id, plannedBody({ assigneeId: leaver.id, actionAt: bkk(fromNow(-MINUTE)) }));
    const two = await create(staffA.agent, t.id, plannedBody({ assigneeId: leaver.id }));
    expect([one.status, two.status]).toEqual([201, 201]);
    await prisma.user.update({ where: { id: leaver.id }, data: { isActive: false } });
    const [a1, a2] = await actionsOf(t.id);
    expect((await complete(staffB.agent, a1.id, { version: 0, result: "Done.", followUpRequired: false })).status).toBe(200);
    expect((await cancel(staffB.agent, a2.id, { version: 0, result: "Not needed." })).status).toBe(200);
  });

  it("API-28 an edit changing only the description and re-sending the stored, since-deactivated assigneeId -> 200; the description changes, the assignee is kept (AC-145, C-177)", async () => {
    const t = await ticket();
    const planned = await action(t.id, { assigneeId: inactiveStaff.id });
    const res = await edit(staffA.agent, planned.id, { version: 0, description: "New description.", assigneeId: inactiveStaff.id });
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(await actionRow(planned.id)).toMatchObject({ description: "New description.", assigneeId: inactiveStaff.id, version: 1 });
  });

  it("API-29 an edit of a COMPLETED action naming an inactive assignee, current version -> 409 ACTION_NOT_PLANNED, not 422 (AC-144, C-176)", async () => {
    const t = await ticket();
    const done = await completedAction(t.id, { version: 1 });
    const before = await snapshot(t.id);
    expectCode(await edit(staffA.agent, done.id, { version: 1, assigneeId: inactiveStaff.id }), 409, "ACTION_NOT_PLANNED");
    expect(await snapshot(t.id)).toEqual(before);
  });

  it("API-30 STALE_UPDATE on an action edit: an old version on a PLANNED action, and on a COMPLETED one -> 409 STALE_UPDATE, not ACTION_NOT_PLANNED; nothing changes (AC-121, AC-55, BR-40)", async () => {
    const t = await ticket();
    const planned = await action(t.id, { version: 2 });
    const done = await completedAction(t.id, { version: 3 });
    const before = await snapshot(t.id);
    const stale = await edit(staffA.agent, planned.id, { version: 1, description: "From an old screen." });
    expectCode(stale, 409, "STALE_UPDATE");
    expect(Object.keys(stale.body.error).sort()).toEqual(["code", "message"]);
    expectCode(await edit(staffA.agent, done.id, { version: 2, description: "From an old screen." }), 409, "STALE_UPDATE");
    expectCode(await complete(staffA.agent, planned.id, { version: 1, result: "Done.", followUpRequired: false, actionAt: bkk(fromNow(-MINUTE)) }), 409, "STALE_UPDATE");
    expectCode(await cancel(staffA.agent, planned.id, { version: 1, result: "No." }), 409, "STALE_UPDATE");
    // The stored actionAt (an hour ahead) is not part of the request: a stale
    // complete without actionAt is told to refresh, not given a 400.
    expectCode(await complete(staffA.agent, planned.id, { version: 1, result: "Done.", followUpRequired: false }), 409, "STALE_UPDATE");
    expect(await snapshot(t.id)).toEqual(before);
  });

  it("API-31 a known field the operation does not accept - result on an edit, result on a planned create, assigneeId on complete -> 400 '<name> is not accepted here.', nothing changes (AC-139, C-175)", async () => {
    const t = await ticket();
    const planned = await action(t.id, { actionAt: fromNow(-MINUTE) });
    const before = await snapshot(t.id);
    expectFieldError(await edit(staffA.agent, planned.id, { version: 0, description: "x", result: "r" }), "result", MSG.notAccepted("result"));
    expectFieldError(await create(staffA.agent, t.id, plannedBody({ result: "r" })), "result", MSG.notAccepted("result"));
    expectFieldError(
      await complete(staffA.agent, planned.id, { version: 0, result: "r", followUpRequired: false, assigneeId: staffB.id }),
      "assigneeId",
      MSG.notAccepted("assigneeId"),
    );
    expect(await snapshot(t.id)).toEqual(before);
  });

  it("API-32 an undefined field (priority) on create and on edit -> 400 naming priority, nothing created or changed (AC-140, C-175)", async () => {
    const t = await ticket();
    const planned = await action(t.id);
    const before = await snapshot(t.id);
    expectFieldError(await create(staffA.agent, t.id, plannedBody({ priority: "HIGH" })), "priority", MSG.notAccepted("priority"));
    expectFieldError(await edit(staffA.agent, planned.id, { version: 0, description: "x", priority: "HIGH" }), "priority", MSG.notAccepted("priority"));
    expect(await snapshot(t.id)).toEqual(before);
  });

  it("API-33 an edit carrying only version -> 400 VALIDATION_FAILED (AC-142, BR-90)", async () => {
    const t = await ticket();
    const planned = await action(t.id);
    const before = await snapshot(t.id);
    const res = await edit(staffA.agent, planned.id, { version: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
    expect(await snapshot(t.id)).toEqual(before);
  });

  it("API-34 an edit re-sending every stored value unchanged -> 200 with no write: action version and the Ticket's lastActivityAt unchanged (AC-143, C-175)", async () => {
    const t = await ticket();
    const planned = await action(t.id, { attachmentNotes: "Label photo." });
    const before = await snapshot(t.id);
    const res = await edit(staffA.agent, planned.id, {
      version: 0,
      description: planned.description,
      actionAt: planned.actionAt.toISOString(),
      assigneeId: planned.assigneeId,
      attachmentNotes: planned.attachmentNotes,
    });
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(await snapshot(t.id)).toEqual(before);
  });
});

// ===========================================================================
// 2.2 API - Ticket state and check order
// ===========================================================================
describe("Ticket state and the check order (BR-24, BR-40, C-159)", () => {
  async function fourWrites(ticketId: number) {
    const planned = await action(ticketId, { actionAt: fromNow(-MINUTE) });
    const before = await snapshot(ticketId);
    const responses = [
      await create(staffA.agent, ticketId, plannedBody()),
      await edit(staffA.agent, planned.id, { version: 0, description: "Changed." }),
      await complete(staffA.agent, planned.id, { version: 0, result: "Done.", followUpRequired: false }),
      await cancel(staffA.agent, planned.id, { version: 0, result: "No." }),
    ];
    return { before, responses };
  }

  it("API-35 create, edit, complete and cancel on a RESOLVED Ticket -> 409 TICKET_RESOLVED each, nothing changes (AC-37, C-122)", async () => {
    const t = await ticket({ currentStatus: "RESOLVED", ownerId: staffA.id });
    const { before, responses } = await fourWrites(t.id);
    for (const res of responses) expectCode(res, 409, "TICKET_RESOLVED");
    expect(await snapshot(t.id)).toEqual(before);
  });

  it("API-36 the four writes on a CLOSED and on a CANCELLED Ticket -> 409 TICKET_CLOSED each, nothing changes (AC-38, L3 C-109)", async () => {
    for (const status of ["CLOSED", "CANCELLED"] as const) {
      const t = await ticket({ currentStatus: status });
      const { before, responses } = await fourWrites(t.id);
      for (const res of responses) expectCode(res, 409, "TICKET_CLOSED");
      expect(await snapshot(t.id)).toEqual(before);
    }
  });

  it("API-37 a create on a RESOLVED Ticket with an empty description -> 409 TICKET_RESOLVED, not 400 (AC-62, C-159)", async () => {
    const t = await ticket({ currentStatus: "RESOLVED", ownerId: staffA.id });
    expectCode(await create(staffA.agent, t.id, plannedBody({ description: "" })), 409, "TICKET_RESOLVED");
    expect(await actionsOf(t.id)).toHaveLength(0);
  });

  it("API-38 a missing action id on edit, complete and cancel -> 404 ACTION_NOT_FOUND x 3; create on a missing Ticket -> 404 TICKET_NOT_FOUND; abc as :id -> 400 INVALID_QUERY_PARAM (AC-148, C-172)", async () => {
    expectCode(await edit(staffA.agent, MISSING_ID, { version: 0, description: "x" }), 404, "ACTION_NOT_FOUND");
    expectCode(await complete(staffA.agent, MISSING_ID, { version: 0, result: "x", followUpRequired: false }), 404, "ACTION_NOT_FOUND");
    expectCode(await cancel(staffA.agent, MISSING_ID, { version: 0, result: "x" }), 404, "ACTION_NOT_FOUND");
    expectCode(await create(staffA.agent, MISSING_ID, plannedBody()), 404, "TICKET_NOT_FOUND");
    expectCode(await create(staffA.agent, "abc", plannedBody()), 400, "INVALID_QUERY_PARAM");
    expectCode(await edit(staffA.agent, "abc", { version: 0, description: "x" }), 400, "INVALID_QUERY_PARAM");
    expectCode(await complete(staffA.agent, "abc", { version: 0, result: "x", followUpRequired: false }), 400, "INVALID_QUERY_PARAM");
    expectCode(await cancel(staffA.agent, "abc", { version: 0, result: "x" }), 400, "INVALID_QUERY_PARAM");
  });

  it("API-41 creating and completing an action on an IN_PROGRESS Ticket leaves it IN_PROGRESS with its version unchanged (AC-25, BR-16)", async () => {
    const t = await ticket({ currentStatus: "IN_PROGRESS", ownerId: staffA.id });
    const created = await create(staffA.agent, t.id, plannedBody({ actionAt: bkk(fromNow(-MINUTE)) }));
    expect(created.status).toBe(201);
    const [row] = await actionsOf(t.id);
    expect((await complete(staffA.agent, row.id, { version: 0, result: "Done.", followUpRequired: false })).status).toBe(200);
    const after = await ticketRow(t.id);
    expect(after.currentStatus).toBe("IN_PROGRESS");
    expect(after.version).toBe(t.version);
  });
});

// ===========================================================================
// 2.2 API - response shapes and the Requester's read access
// ===========================================================================
describe("the action arrays in both Ticket DTOs", () => {
  it("API-39 the body of each of the four writes is exactly the api-spec 6.2 staff Ticket DTO, with the written action reflected (AC-118, C-136)", async () => {
    const t = await ticket();
    const created = await create(staffA.agent, t.id, plannedBody({ actionAt: bkk(fromNow(-MINUTE)) }));
    expect(created.status).toBe(201);
    const [row] = await actionsOf(t.id);
    const second = await action(t.id);
    const edited = await edit(staffA.agent, row.id, { version: 0, description: "Edited." });
    const completed = await complete(staffA.agent, row.id, { version: 1, result: "Done.", followUpRequired: false });
    const cancelled = await cancel(staffA.agent, second.id, { version: 0, result: "No." });
    const expectations: [typeof created, number, Record<string, unknown>][] = [
      [created, row.id, { status: "PLANNED" }],
      [edited, row.id, { description: "Edited.", version: 1 }],
      [completed, row.id, { status: "COMPLETED", result: "Done.", version: 2 }],
      [cancelled, second.id, { status: "CANCELLED", result: "No.", version: 1 }],
    ];
    for (const [res, id, fields] of expectations) {
      expect(Object.keys(res.body).sort()).toEqual(STAFF_DTO_KEYS);
      const a = res.body.actions.find((x: { id: number }) => x.id === id);
      expect(a).toBeDefined();
      expect(Object.keys(a).sort()).toEqual(STAFF_ACTION_KEYS);
      expect(a).toMatchObject(fields);
      expect(Object.keys(a.createdBy).sort()).toEqual(["id", "isActive", "name"]);
    }
  });

  it("API-40 two actions with the same actionAt come back in the same order twice, higher id first, on the staff and the Requester DTO (AC-35, BR-22)", async () => {
    const t = await ticket();
    const at = fromNow(-30 * MINUTE);
    const first = await completedAction(t.id, { actionAt: at });
    const second = await completedAction(t.id, { actionAt: at });
    const later = await action(t.id, { actionAt: fromNow(HOUR) });
    const expected = [later.id, second.id, first.id];
    for (let i = 0; i < 2; i += 1) {
      const staff = await staffA.agent.get(`/api/staff/tickets/${t.id}`);
      const own = await reqA.agent.get(`/api/tickets/${t.id}`);
      expect(staff.body.actions.map((a: { id: number }) => a.id)).toEqual(expected);
      expect(own.body.actions.map((a: { id: number }) => a.id)).toEqual(expected);
    }
  });

  it("API-42 a Requester reads their own Ticket with actions by three staff: every action and field, people as { name } only, no email key, no @ anywhere, no version on an action (AC-31, BR-20, C-123)", async () => {
    const t = await ticket();
    await completedAction(t.id, { createdById: staffA.id, assigneeId: staffA.id, performedById: staffA.id, followUpRequired: true, followUpNote: "Order a battery." });
    await action(t.id, { createdById: staffB.id, assigneeId: staffC.id, attachmentNotes: "Photo 2." });
    await action(t.id, { status: "CANCELLED", createdById: staffC.id, assigneeId: staffB.id, performedById: staffC.id, result: "Not needed.", finishedAt: fromNow(-MINUTE) });
    const res = await reqA.agent.get(`/api/tickets/${t.id}`);
    expect(res.status).toBe(200);
    expect(res.body.actions).toHaveLength(3);
    for (const a of res.body.actions) {
      expect(Object.keys(a).sort()).toEqual(REQUESTER_ACTION_KEYS);
      expect(Object.keys(a.assignee)).toEqual(["name"]);
      expect(Object.keys(a.createdBy)).toEqual(["name"]);
      if (a.performedBy !== null) expect(Object.keys(a.performedBy)).toEqual(["name"]);
    }
    const names = res.body.actions.flatMap((a: any) => [a.assignee.name, a.createdBy.name, a.performedBy?.name]);
    expect(names).toEqual(expect.arrayContaining([staffA.name, staffB.name, staffC.name]));
    const scan = (value: unknown, where: string): void => {
      if (Array.isArray(value)) value.forEach((v, i) => scan(v, `${where}[${i}]`));
      else if (value && typeof value === "object") {
        for (const [k, v] of Object.entries(value)) {
          expect(k.toLowerCase(), where).not.toContain("email");
          scan(v, `${where}.${k}`);
        }
      } else if (typeof value === "string") expect(value, where).not.toContain("@");
    };
    scan(res.body, "body");
  });

  it("API-43 a Requester reading another Requester's Ticket that has actions -> 404 TICKET_NOT_FOUND, byte-identical to a missing Ticket, no action data (AC-32, L3 C-65)", async () => {
    const t = await ticket();
    await completedAction(t.id, { description: `${TAG} secret work` });
    const other = await reqB.agent.get(`/api/tickets/${t.id}`);
    const missing = await reqB.agent.get(`/api/tickets/${MISSING_ID}`);
    expectCode(other, 404, "TICKET_NOT_FOUND");
    expect(other.text).toBe(missing.text);
    expect(other.text).not.toContain("secret work");
  });

  it("API-44 allowedOperations in the staff DTO: EDIT, COMPLETE, CANCEL on a planned action of an OPEN Ticket; [] on finished actions and on a planned action of a RESOLVED Ticket (FR-09, C-174)", async () => {
    const open = await ticket();
    const planned = await action(open.id);
    const done = await completedAction(open.id);
    const dropped = await action(open.id, { status: "CANCELLED", result: "No.", performedById: staffA.id, finishedAt: fromNow(-MINUTE) });
    const res = await staffA.agent.get(`/api/staff/tickets/${open.id}`);
    const ops = (id: number) => res.body.actions.find((a: { id: number }) => a.id === id)?.allowedOperations;
    expect(ops(planned.id)).toEqual(["EDIT", "COMPLETE", "CANCEL"]);
    expect(ops(done.id)).toEqual([]);
    expect(ops(dropped.id)).toEqual([]);

    const resolved = await ticket({ currentStatus: "RESOLVED", ownerId: staffA.id });
    const stuck = await action(resolved.id);
    const r = await staffA.agent.get(`/api/staff/tickets/${resolved.id}`);
    expect(r.body.actions.find((a: { id: number }) => a.id === stuck.id)?.allowedOperations).toEqual([]);
  });
});

// ===========================================================================
// 2.2 API - replay (clientRequestId)
// ===========================================================================
describe("clientRequestId replay on create (BR-42, BR-43, C-139, C-165, C-166)", () => {
  it("API-45 the same author replaying a create with key K -> 200 with the staff Ticket DTO, the same key set as the first 201; one row for K (AC-126, C-165)", async () => {
    const t = await ticket();
    const key = uuid();
    const first = await create(staffA.agent, t.id, plannedBody({ clientRequestId: key }));
    const replay = await create(staffA.agent, t.id, plannedBody({ clientRequestId: key }));
    expect(first.status).toBe(201);
    expect(replay.status).toBe(200);
    expect(Object.keys(replay.body).sort()).toEqual(Object.keys(first.body).sort());
    const rows = await prisma.actionTaken.findMany({ where: { createdById: staffA.id, clientRequestId: key } });
    expect(rows).toHaveLength(1);
    expect(replay.body.actions.map((a: { id: number }) => a.id)).toContain(rows[0].id);
  });

  it("API-46 five concurrent creates by one author with the same K (the P2002 path) -> exactly one row; every response 200 or 201 carrying that row; none 500 (AC-64, C-139)", async () => {
    const t = await ticket();
    const key = uuid();
    const agents = await Promise.all(Array.from({ length: 5 }, () => signIn(staffA.email)));
    // Hold the Ticket's row lock while the five requests arrive: each passes
    // the replay lookup (no row yet) and then waits on the lock, so after the
    // first insert the other four can only be answered by the P2002 path.
    let pending: Promise<Awaited<ReturnType<typeof create>>[]> | undefined;
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Ticket" WHERE "id" = ${t.id} FOR UPDATE`;
      pending = Promise.all(agents.map((ag) => create(ag, t.id, plannedBody({ clientRequestId: key })).then((r) => r)));
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }, { timeout: 15_000 });
    const responses = await (pending as NonNullable<typeof pending>);
    const rows = await prisma.actionTaken.findMany({ where: { createdById: staffA.id, clientRequestId: key } });
    expect(rows).toHaveLength(1);
    expect(await actionsOf(t.id)).toHaveLength(1);
    for (const res of responses) {
      expect([200, 201], JSON.stringify(res.body)).toContain(res.status);
      expect(res.body.actions.map((a: { id: number }) => a.id)).toEqual([rows[0].id]);
    }
    expect(responses.filter((r) => r.status === 201)).toHaveLength(1);
    expect(responses.filter((r) => r.status === 200)).toHaveLength(4);
  });

  it("API-47 a replay of K after the Ticket has moved to CLOSED -> 200 with the original action, not TICKET_CLOSED; no new row (C-166)", async () => {
    const t = await ticket();
    const key = uuid();
    expect((await create(staffA.agent, t.id, plannedBody({ clientRequestId: key }))).status).toBe(201);
    await prisma.ticket.update({ where: { id: t.id }, data: { currentStatus: "CLOSED" } });
    const replay = await create(staffA.agent, t.id, plannedBody({ clientRequestId: key }));
    expect(replay.status, JSON.stringify(replay.body)).toBe(200);
    const rows = await actionsOf(t.id);
    expect(rows).toHaveLength(1);
    expect(replay.body.actions.map((a: { id: number }) => a.id)).toEqual([rows[0].id]);
    // A different author reusing K is not a replay: the Ticket is closed.
    expectCode(await create(staffB.agent, t.id, plannedBody({ clientRequestId: key })), 409, "TICKET_CLOSED");
  });

  it("API-48 clientRequestId not-a-uuid -> 400 at clientRequestId, nothing created (BR-42)", async () => {
    const t = await ticket();
    expectFieldError(await create(staffA.agent, t.id, plannedBody({ clientRequestId: "not-a-uuid" })), "clientRequestId", MSG.clientRequestId);
    expect(await actionsOf(t.id)).toHaveLength(0);
  });
});

// ===========================================================================
// 2.4 Authorization in this file
// ===========================================================================
describe("Requester and foreign-Origin refusals on the action writes", () => {
  const onlyEnvelope = (body: any) => {
    expect(Object.keys(body)).toEqual(["error"]);
    expect(Object.keys(body.error).sort()).toEqual(["code", "message"]);
  };

  it("SEC-01 Requester POST /api/tickets/:id/actions on their own Ticket and on a missing id -> 403 FORBIDDEN_ROLE, byte-identical, no action created, no action content (AC-03, BR-17)", async () => {
    const t = await ticket();
    const own = await create(reqA.agent, t.id, plannedBody({ description: `${TAG} requester attempt` }));
    const missing = await create(reqA.agent, MISSING_ID, plannedBody({ description: `${TAG} requester attempt` }));
    expectCode(own, 403, "FORBIDDEN_ROLE");
    expect(own.text).toBe(missing.text);
    onlyEnvelope(own.body);
    expect(own.text).not.toContain("requester attempt");
    expect(await actionsOf(t.id)).toHaveLength(0);
  });

  it("SEC-02 Requester PATCH /api/actions/:id on an existing and a missing action -> 403, byte-identical; the action unchanged (AC-148, BR-17)", async () => {
    const t = await ticket();
    const planned = await action(t.id);
    const before = await snapshot(t.id);
    const existing = await edit(reqA.agent, planned.id, { version: 0, description: "Requester edit." });
    const missing = await edit(reqA.agent, MISSING_ID, { version: 0, description: "Requester edit." });
    expectCode(existing, 403, "FORBIDDEN_ROLE");
    expect(existing.text).toBe(missing.text);
    onlyEnvelope(existing.body);
    expect(await snapshot(t.id)).toEqual(before);
  });

  it("SEC-03 Requester POST /api/actions/:id/complete, existing and missing -> 403, byte-identical; still PLANNED; no action content (BR-17)", async () => {
    const t = await ticket();
    const planned = await action(t.id);
    const existing = await complete(reqA.agent, planned.id, { version: 0, result: "Done.", followUpRequired: false });
    const missing = await complete(reqA.agent, MISSING_ID, { version: 0, result: "Done.", followUpRequired: false });
    expectCode(existing, 403, "FORBIDDEN_ROLE");
    expect(existing.text).toBe(missing.text);
    onlyEnvelope(existing.body);
    expect(existing.text).not.toContain("planned work");
    expect((await actionRow(planned.id)).status).toBe("PLANNED");
  });

  it("SEC-04 Requester POST /api/actions/:id/cancel, existing and missing -> 403, byte-identical; still PLANNED; no action content (BR-17)", async () => {
    const t = await ticket();
    const planned = await action(t.id);
    const existing = await cancel(reqA.agent, planned.id, { version: 0, result: "No." });
    const missing = await cancel(reqA.agent, MISSING_ID, { version: 0, result: "No." });
    expectCode(existing, 403, "FORBIDDEN_ROLE");
    expect(existing.text).toBe(missing.text);
    onlyEnvelope(existing.body);
    expect(existing.text).not.toContain("planned work");
    expect((await actionRow(planned.id)).status).toBe("PLANNED");
  });

  it("SEC-14 the four action writes with a foreign Origin -> 403 ORIGIN_NOT_ALLOWED each, nothing written; the same create without it -> 201 (L3 C-58)", async () => {
    const t = await ticket();
    const planned = await action(t.id, { actionAt: fromNow(-MINUTE) });
    const before = await snapshot(t.id);
    const evil = "http://evil.example";
    const responses = [
      await staffA.agent.post(`/api/tickets/${t.id}/actions`).set("Origin", evil).send(plannedBody()),
      await staffA.agent.patch(`/api/actions/${planned.id}`).set("Origin", evil).send({ version: 0, description: "Forged." }),
      await staffA.agent.post(`/api/actions/${planned.id}/complete`).set("Origin", evil).send({ version: 0, result: "Forged.", followUpRequired: false }),
      await staffA.agent.post(`/api/actions/${planned.id}/cancel`).set("Origin", evil).send({ version: 0, result: "Forged." }),
    ];
    for (const res of responses) expectCode(res, 403, "ORIGIN_NOT_ALLOWED");
    expect(await snapshot(t.id)).toEqual(before);
    // The refusal is the Origin's: the route itself accepts the request.
    expect((await create(staffA.agent, t.id, plannedBody())).status).toBe(201);
  });
});
