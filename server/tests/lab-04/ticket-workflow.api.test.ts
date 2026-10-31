import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import type { Prisma, TicketStatus } from "@prisma/client";
import { getPrisma } from "../../src/prisma.js";
import { deleteTickets } from "../support/cleanup.js";
import { createTicketWithNumber, type NewTicket } from "../../src/lib/ticket-repository.js";
import { UPLOAD_DIR } from "../../src/lib/uploads.js";
import { removeUsers, signIn, signedInUser, type Agent } from "../support/agents.js";

// Lab 4 Ticket workflow - tests.md sections 2.1 (UNIT-05..UNIT-07) and 2.5
// (WF-01..WF-64), Issue #66: the resolution gate (C-137, C-186), the status
// route's seven-step order (BR-89, C-164), stale updates (C-138, C-187), the
// activity time per write path (C-140), resolvedAt and status history (BR-49,
// BR-50), and replays on Public Comments and Internal Notes (C-139).
//
// "Nothing changes" on a refusal means the Ticket's status and version are
// re-read and equal the before values (tests.md 2.5 preamble).
//
// Every user, Ticket, action, Attachment, comment and note here is created by
// this file and removed in afterAll; Tickets go through deleteTickets (Issue
// #63), which removes their actions and history rows first.

const prisma = getPrisma();
const TAG = "[workflow-test]";
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);
const WORKFLOW = "../../src/lib/workflow.js";
const TRANSITIONS = "../../src/lib/status-transitions.js";

const STATUSES: TicketStatus[] = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CLOSED", "REOPENED", "CANCELLED"];
const GATE_ORDER = ["NO_COMPLETED_ACTION", "PLANNED_ACTIONS_OPEN", "FOLLOW_UP_REQUIRED", "NO_ACTION_SINCE_REOPEN"];

// specification.md section 5.1, transcribed cell by cell - the same matrix L3
// UNIT-12 (lab-03/staff-ticket-detail.api.test.ts) asserts. Columns follow
// STATUSES. Y permitted, - refused, = the diagonal.
const MATRIX: Record<TicketStatus, string> = {
  NEW:                   "= Y Y - - - - Y",
  OPEN:                  "- = Y Y Y - - Y",
  IN_PROGRESS:           "- Y = Y Y - - Y",
  WAITING_FOR_REQUESTER: "- - Y = Y - - Y",
  RESOLVED:              "- - - - = Y Y -",
  CLOSED:                "- - - - - = - -",
  REOPENED:              "- - Y Y Y - = Y",
  CANCELLED:             "- - - - - - - =",
};
const yTargets = (from: TicketStatus) => STATUSES.filter((to, i) => MATRIX[from].split(" ")[i] === "Y");

type Person = { id: number; name: string; email: string; agent: Agent };
let staffA: Person;
let staffB: Person;
let reqA: Person;
let reqB: Person;
const userIds: number[] = [];

const fromNow = (ms: number) => new Date(Date.now() + ms);
const bkk = (d: Date) => new Date(d.getTime() + 7 * HOUR).toISOString().replace("Z", "+07:00");
const uuid = () => crypto.randomUUID();

// A fixture Ticket two hours old, so lastActivityAt (= createdAt) visibly
// moves on a write. Owned by staffA unless the overrides say otherwise.
async function ticket(overrides: Partial<NewTicket> = {}) {
  const category = await prisma.category.findFirstOrThrow({ where: { isActive: true } });
  const system = await prisma.relatedSystem.findFirstOrThrow({ where: { isActive: true } });
  return createTicketWithNumber(prisma, {
    requesterId: reqA.id,
    categoryId: category.id,
    relatedSystemId: system.id,
    summary: `${TAG} fixture`,
    description: "Fixture row for ticket-workflow.api.test.ts.",
    requestedPriority: "MEDIUM",
    createdAt: fromNow(-2 * HOUR),
    currentStatus: "OPEN",
    ownerId: staffA.id,
    ...overrides,
  });
}

// A legacy Ticket: every pre-migration row has no history (C-179, C-188). The
// repository always writes the creation row, so it is removed here.
async function legacyTicket(overrides: Partial<NewTicket> = {}) {
  const t = await ticket(overrides);
  await prisma.ticketStatusChange.deleteMany({ where: { ticketId: t.id } });
  return t;
}

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

function history(ticketId: number, fromStatus: TicketStatus | null, toStatus: TicketStatus, changedAt: Date) {
  return prisma.ticketStatusChange.create({ data: { ticketId, fromStatus, toStatus, changedById: staffA.id, changedAt } });
}

const row = (id: number) => prisma.ticket.findUniqueOrThrow({ where: { id } });
const versionOf = async (id: number) => (await row(id)).version;
const historyOf = (ticketId: number) => prisma.ticketStatusChange.findMany({ where: { ticketId }, orderBy: [{ changedAt: "asc" }, { id: "asc" }] });

// The status PATCH. "current" reads the Ticket's version first, as a client
// holding a fresh screen would; OMIT sends no version key. (A sentinel, not
// undefined: an undefined argument would take the "current" default.)
const OMIT = Symbol("omit");
async function move(as: Agent, id: number, currentStatus: unknown, version: unknown = "current") {
  const body: Record<string, unknown> = {};
  if (currentStatus !== undefined) body.currentStatus = currentStatus;
  if (version === "current") body.version = await versionOf(id);
  else if (version !== OMIT) body.version = version;
  return as.patch(`/api/staff/tickets/${id}/status`).send(body);
}
const setOwner = (as: Agent, id: number, body: object) => as.patch(`/api/staff/tickets/${id}/owner`).send(body);
const setPriority = (as: Agent, id: number, body: object) => as.patch(`/api/staff/tickets/${id}/it-priority`).send(body);
const staffDetail = (id: number) => staffA.agent.get(`/api/staff/tickets/${id}`);
const comment = (as: Agent, id: number, body: object) => as.post(`/api/tickets/${id}/public-comments`).send(body);
const note = (as: Agent, id: number, body: object) => as.post(`/api/tickets/${id}/internal-notes`).send(body);

function expectCode(res: { status: number; body: any }, status: number, code: string) {
  expect(res.status, JSON.stringify(res.body)).toBe(status);
  expect(res.body.error?.code).toBe(code);
}

function expectReasons(res: { status: number; body: any }, reasons: string[]) {
  expectCode(res, 409, "RESOLUTION_GATE_NOT_MET");
  expect(res.body.error.reasons).toEqual(reasons);
}

// A refusal leaves the Ticket's status and version as they were.
async function expectUnchanged(id: number, before: { currentStatus: TicketStatus; version: number }) {
  const after = await row(id);
  expect(after.currentStatus).toBe(before.currentStatus);
  expect(after.version).toBe(before.version);
}

beforeAll(async () => {
  staffA = await signedInUser(prisma, "wf-staffa", { role: "IT_STAFF", name: `${TAG} Staff A` });
  staffB = await signedInUser(prisma, "wf-staffb", { role: "IT_STAFF", name: `${TAG} Staff B` });
  reqA = await signedInUser(prisma, "wf-reqa", { name: `${TAG} Requester A` });
  reqB = await signedInUser(prisma, "wf-reqb", { name: `${TAG} Requester B` });
  userIds.push(staffA.id, staffB.id, reqA.id, reqB.id);
});

afterAll(async () => {
  const mine = { requesterId: { in: userIds } };
  const attachments = await prisma.attachment.findMany({ where: { ticket: mine } });
  for (const a of attachments) {
    const file = path.join(UPLOAD_DIR, a.storedFilename);
    if (fs.existsSync(file)) fs.unlinkSync(file);
  }
  await prisma.attachment.deleteMany({ where: { ticket: mine } });
  const written = { OR: [{ ticket: mine }, { authorId: { in: userIds } }] };
  await prisma.publicComment.deleteMany({ where: written });
  await prisma.internalNote.deleteMany({ where: written });
  await deleteTickets(prisma, mine);
  await removeUsers(prisma, userIds);
});

// ===========================================================================
// 2.1 Unit
// ===========================================================================
describe("the gate and the matrix as functions (UNIT)", () => {
  it("UNIT-05 gate reasons as a pure function over all 16 combinations: every reason that applies, in the fixed order; NO_COMPLETED_ACTION and FOLLOW_UP_REQUIRED never together (BR-29, C-167)", async () => {
    const wf = await import(WORKFLOW);
    expect(typeof wf.gateReasonsFrom).toBe("function");
    expect([...wf.GATE_REASONS]).toEqual(GATE_ORDER);
    const seen = new Set<string>();
    for (let mask = 0; mask < 16; mask += 1) {
      const facts = {
        anyCompleted: (mask & 1) !== 0,
        anyPlanned: (mask & 2) !== 0,
        latestCompletedFollowUp: (mask & 4) !== 0,
        reopenedWithNoCompletedSince: (mask & 8) !== 0,
      };
      const got: string[] = wf.gateReasonsFrom(facts);
      const expected = [
        !facts.anyCompleted && "NO_COMPLETED_ACTION",
        facts.anyPlanned && "PLANNED_ACTIONS_OPEN",
        // A follow-up flag means nothing without a completed action to carry it.
        facts.anyCompleted && facts.latestCompletedFollowUp && "FOLLOW_UP_REQUIRED",
        facts.reopenedWithNoCompletedSince && "NO_ACTION_SINCE_REOPEN",
      ].filter(Boolean);
      expect(got, JSON.stringify(facts)).toEqual(expected);
      expect(got.includes("NO_COMPLETED_ACTION") && got.includes("FOLLOW_UP_REQUIRED")).toBe(false);
      // Always a subsequence of the fixed order.
      expect(got).toEqual(GATE_ORDER.filter((r) => got.includes(r)));
      seen.add(got.join(","));
    }
    expect(wf.gateReasonsFrom({ anyCompleted: true, anyPlanned: false, latestCompletedFollowUp: false, reopenedWithNoCompletedSince: false })).toEqual([]);
    // All four can never co-occur; both possible triples do.
    expect(seen.has(GATE_ORDER.join(","))).toBe(false);
    expect(seen.has("NO_COMPLETED_ACTION,PLANNED_ACTIONS_OPEN,NO_ACTION_SINCE_REOPEN")).toBe(true);
    expect(seen.has("PLANNED_ACTIONS_OPEN,FOLLOW_UP_REQUIRED,NO_ACTION_SINCE_REOPEN")).toBe(true);
  });

  it("UNIT-06 the latest completed action is chosen by finishedAt desc, id desc: a later actionAt on an earlier-finished action does not win; a finishedAt tie goes to the higher id (BR-30)", async () => {
    const { gateReasons } = await import(WORKFLOW);
    const db = prisma as unknown as Prisma.TransactionClient;

    // Follow-up action finished LATER but done earlier (actionAt) -> it is the latest.
    const a = await ticket({ currentStatus: "IN_PROGRESS" });
    await completedAction(a.id, { actionAt: fromNow(-50 * MINUTE), finishedAt: fromNow(-50 * MINUTE), followUpRequired: false });
    await completedAction(a.id, { actionAt: fromNow(-90 * MINUTE), finishedAt: fromNow(-10 * MINUTE), followUpRequired: true, followUpNote: "Check again." });
    expect(await gateReasons(db, a.id)).toEqual(["FOLLOW_UP_REQUIRED"]);

    // The reverse: no-follow-up finished later with an earlier actionAt wins.
    const b = await ticket({ currentStatus: "IN_PROGRESS" });
    await completedAction(b.id, { actionAt: fromNow(-20 * MINUTE), finishedAt: fromNow(-60 * MINUTE), followUpRequired: true, followUpNote: "Check again." });
    await completedAction(b.id, { actionAt: fromNow(-100 * MINUTE), finishedAt: fromNow(-10 * MINUTE), followUpRequired: false });
    expect(await gateReasons(db, b.id)).toEqual([]);

    // A tie on finishedAt goes to the higher id, in both directions.
    const tie = fromNow(-30 * MINUTE);
    const c = await ticket({ currentStatus: "IN_PROGRESS" });
    await completedAction(c.id, { finishedAt: tie, followUpRequired: false });
    await completedAction(c.id, { finishedAt: tie, followUpRequired: true, followUpNote: "Check again." });
    expect(await gateReasons(db, c.id)).toEqual(["FOLLOW_UP_REQUIRED"]);
    const d = await ticket({ currentStatus: "IN_PROGRESS" });
    await completedAction(d.id, { finishedAt: tie, followUpRequired: true, followUpNote: "Check again." });
    await completedAction(d.id, { finishedAt: tie, followUpRequired: false });
    expect(await gateReasons(db, d.id)).toEqual([]);
  });

  it("UNIT-07 allowedTransitions(status) equals the section 5.1 Y targets for all eight statuses; [] for CLOSED and CANCELLED (BR-27, C-125)", async () => {
    const st = await import(TRANSITIONS);
    expect(typeof st.allowedTransitions).toBe("function");
    for (const from of STATUSES) expect(st.allowedTransitions(from), from).toEqual(yTargets(from));
    expect(st.allowedTransitions("CLOSED")).toEqual([]);
    expect(st.allowedTransitions("CANCELLED")).toEqual([]);
  });
});

// ===========================================================================
// 2.5 Workflow - the resolution gate and the cancel rule
// ===========================================================================
describe("the resolution gate and the cancel rule (C-137, C-124)", () => {
  it("WF-01 an unowned OPEN Ticket with no completed action -> RESOLVED is 409 OWNER_REQUIRED, not the gate code, and carries no reasons key", async () => {
    const t = await ticket({ ownerId: undefined });
    const res = await move(staffA.agent, t.id, "RESOLVED");
    expectCode(res, 409, "OWNER_REQUIRED");
    expect("reasons" in res.body.error).toBe(false);
    await expectUnchanged(t.id, t);
  });

  it("WF-02 a client bypassing the UI PATCHes RESOLVED on a Ticket with no actions at all -> 409 RESOLUTION_GATE_NOT_MET, reasons exactly [NO_COMPLETED_ACTION]", async () => {
    const t = await ticket();
    expectReasons(await move(staffA.agent, t.id, "RESOLVED"), ["NO_COMPLETED_ACTION"]);
    await expectUnchanged(t.id, t);
  });

  it("WF-03 a completed action without follow-up plus a PLANNED one -> reasons exactly [PLANNED_ACTIONS_OPEN]", async () => {
    const t = await ticket();
    await completedAction(t.id);
    await action(t.id);
    expectReasons(await move(staffA.agent, t.id, "RESOLVED"), ["PLANNED_ACTIONS_OPEN"]);
    await expectUnchanged(t.id, t);
  });

  it("WF-04 the latest completed action has follow-up required -> reasons exactly [FOLLOW_UP_REQUIRED]", async () => {
    const t = await ticket();
    await completedAction(t.id, { followUpRequired: true, followUpNote: "Replace the cable next week." });
    expectReasons(await move(staffA.agent, t.id, "RESOLVED"), ["FOLLOW_UP_REQUIRED"]);
    await expectUnchanged(t.id, t);
  });

  it("WF-05 resolved, reopened, no action finished since -> reasons exactly [NO_ACTION_SINCE_REOPEN]; after a new completed action, 200", async () => {
    const t = await ticket({ currentStatus: "IN_PROGRESS" });
    await completedAction(t.id);
    expect((await move(staffA.agent, t.id, "RESOLVED")).status).toBe(200);
    expect((await move(staffA.agent, t.id, "REOPENED")).status).toBe(200);
    const before = await row(t.id);
    expectReasons(await move(staffA.agent, t.id, "RESOLVED"), ["NO_ACTION_SINCE_REOPEN"]);
    await expectUnchanged(t.id, before);
    const created = await staffA.agent.post(`/api/tickets/${t.id}/actions`).send({
      status: "COMPLETED", actionAt: bkk(fromNow(-5 * MINUTE)), description: "Re-seated the cable.", result: "Works now.", followUpRequired: false,
    });
    expect(created.status, JSON.stringify(created.body)).toBe(201);
    const ok = await move(staffA.agent, t.id, "RESOLVED");
    expect(ok.status, JSON.stringify(ok.body)).toBe(200);
    expect(ok.body.currentStatus).toBe("RESOLVED");
  });

  it("WF-06 two combined: no completed action and a PLANNED one -> reasons exactly [NO_COMPLETED_ACTION, PLANNED_ACTIONS_OPEN]", async () => {
    const t = await ticket();
    await action(t.id);
    expectReasons(await move(staffA.agent, t.id, "RESOLVED"), ["NO_COMPLETED_ACTION", "PLANNED_ACTIONS_OPEN"]);
    await expectUnchanged(t.id, t);
  });

  it("WF-07 the fixed order with three reasons, both possible triples", async () => {
    // (a) A reopened legacy Ticket with only a planned action.
    const a = await legacyTicket({ currentStatus: "RESOLVED" });
    await action(a.id);
    expect((await move(staffA.agent, a.id, "REOPENED")).status).toBe(200);
    const beforeA = await row(a.id);
    expectReasons(await move(staffA.agent, a.id, "RESOLVED"), ["NO_COMPLETED_ACTION", "PLANNED_ACTIONS_OPEN", "NO_ACTION_SINCE_REOPEN"]);
    await expectUnchanged(a.id, beforeA);

    // (b) A reopened Ticket whose latest completed action, finished before the
    // reopen, has follow-up, plus a planned one.
    const b = await ticket({ currentStatus: "REOPENED" });
    await completedAction(b.id, { finishedAt: fromNow(-HOUR), followUpRequired: true, followUpNote: "Check again." });
    await history(b.id, "RESOLVED", "REOPENED", fromNow(-30 * MINUTE));
    await action(b.id);
    expectReasons(await move(staffA.agent, b.id, "RESOLVED"), ["PLANNED_ACTIONS_OPEN", "FOLLOW_UP_REQUIRED", "NO_ACTION_SINCE_REOPEN"]);
    await expectUnchanged(b.id, b);
  });

  it("WF-08 a follow-up action finished first, then a no-follow-up action finished later with an earlier actionAt -> FOLLOW_UP_REQUIRED is not a reason; 200 (BR-30, C-160)", async () => {
    const t = await ticket({ currentStatus: "IN_PROGRESS" });
    await completedAction(t.id, { actionAt: fromNow(-90 * MINUTE), finishedAt: fromNow(-80 * MINUTE), followUpRequired: true, followUpNote: "Check again." });
    await completedAction(t.id, { actionAt: fromNow(-110 * MINUTE), finishedAt: fromNow(-10 * MINUTE), followUpRequired: false });
    const res = await move(staffA.agent, t.id, "RESOLVED");
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(res.body.currentStatus).toBe("RESOLVED");
  });

  it("WF-09 a reopened Ticket whose only post-reopen action is CANCELLED (it has a finishedAt) -> still NO_ACTION_SINCE_REOPEN: a cancelled action does not count (C-186)", async () => {
    const t = await ticket({ currentStatus: "REOPENED" });
    await completedAction(t.id, { finishedAt: fromNow(-HOUR) });
    await history(t.id, "RESOLVED", "REOPENED", fromNow(-30 * MINUTE));
    await action(t.id, { status: "CANCELLED", result: "Not needed after all.", finishedAt: fromNow(-10 * MINUTE), performedById: staffA.id });
    expectReasons(await move(staffA.agent, t.id, "RESOLVED"), ["NO_ACTION_SINCE_REOPEN"]);
    await expectUnchanged(t.id, t);
  });

  it("WF-10 an owned Ticket meeting the gate -> RESOLVED: 200, resolvedAt set, Requester flag cleared, one history row, version + 1", async () => {
    const t = await ticket({ currentStatus: "IN_PROGRESS", requesterResolvedAt: fromNow(-MINUTE) });
    await completedAction(t.id);
    const historyBefore = (await historyOf(t.id)).length;
    const startedAt = Date.now();
    const res = await move(staffA.agent, t.id, "RESOLVED", t.version);
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    const after = await row(t.id);
    expect(after.currentStatus).toBe("RESOLVED");
    expect(after.resolvedAt).not.toBeNull();
    expect(after.resolvedAt!.getTime()).toBeGreaterThanOrEqual(startedAt - 1000);
    expect(after.requesterResolvedAt).toBeNull();
    expect(after.version).toBe(t.version + 1);
    const rows = await historyOf(t.id);
    expect(rows).toHaveLength(historyBefore + 1);
    expect(rows.at(-1)).toMatchObject({ fromStatus: "IN_PROGRESS", toStatus: "RESOLVED", changedById: staffA.id });
  });

  it("WF-11 the staff DTO of a Ticket failing the gate: resolutionGate.met false with the refusal's reasons; allowedTransitions still lists RESOLVED (C-171)", async () => {
    const t = await ticket();
    await action(t.id);
    const refusal = await move(staffA.agent, t.id, "RESOLVED");
    expectCode(refusal, 409, "RESOLUTION_GATE_NOT_MET");
    const dto = await staffDetail(t.id);
    expect(dto.status).toBe(200);
    expect(dto.body.resolutionGate).toEqual({ met: false, reasons: refusal.body.error.reasons });
    expect(dto.body.allowedTransitions).toContain("RESOLVED");
  });

  it("WF-12 a legacy RESOLVED Ticket with no actions -> CLOSED is 200: never re-validated (BR-32)", async () => {
    const t = await legacyTicket({ currentStatus: "RESOLVED" });
    const res = await move(staffA.agent, t.id, "CLOSED");
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect((await row(t.id)).currentStatus).toBe("CLOSED");
  });

  it("WF-13 -> CANCELLED with a PLANNED action is 409 PLANNED_ACTIONS_OPEN and nothing changes; after that action is cancelled, 200 (BR-33, C-124)", async () => {
    const t = await ticket();
    const planned = await action(t.id);
    expectCode(await move(staffA.agent, t.id, "CANCELLED"), 409, "PLANNED_ACTIONS_OPEN");
    await expectUnchanged(t.id, t);
    const cancelled = await staffA.agent.post(`/api/actions/${planned.id}/cancel`).send({ version: planned.version, result: "Not needed." });
    expect(cancelled.status, JSON.stringify(cancelled.body)).toBe(200);
    const res = await move(staffA.agent, t.id, "CANCELLED");
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect((await row(t.id)).currentStatus).toBe("CANCELLED");
  });

  it("WF-14 allowedTransitions over HTTP for a Ticket in each of the eight statuses equals that status's section 5.1 Y targets; [] on CLOSED and CANCELLED", async () => {
    for (const status of STATUSES) {
      const t = await ticket({ currentStatus: status });
      const res = await staffDetail(t.id);
      expect(res.status).toBe(200);
      expect(res.body.allowedTransitions, status).toEqual(yTargets(status));
    }
  });
});

// ===========================================================================
// The status route's seven-step order (BR-89, C-164): each request also
// violates every later step, so the test proves the step wins.
// ===========================================================================
describe("the status route's seven-step order (BR-89)", () => {
  it("WF-15 step 1: target DONE, and target absent, on a CLOSED Ticket with no version -> 400 VALIDATION_FAILED naming currentStatus, not version", async () => {
    const t = await ticket({ currentStatus: "CLOSED" });
    for (const target of ["DONE", undefined]) {
      const res = await move(staffA.agent, t.id, target, OMIT);
      expectCode(res, 400, "VALIDATION_FAILED");
      expect(Object.keys(res.body.error.fields)).toEqual(["currentStatus"]);
    }
    await expectUnchanged(t.id, t);
  });

  it("WF-16 step 2: target equal to the current status with a stale version, on OPEN, CLOSED and CANCELLED -> 400 SAME_STATUS each (L3 C-77)", async () => {
    for (const status of ["OPEN", "CLOSED", "CANCELLED"] as TicketStatus[]) {
      const t = await ticket({ currentStatus: status });
      expectCode(await move(staffA.agent, t.id, status, t.version + 7), 400, "SAME_STATUS");
      await expectUnchanged(t.id, t);
    }
  });

  it("WF-17 step 3: CLOSED and CANCELLED -> OPEN with version missing and stale -> 409 INVALID_STATUS_TRANSITION, not 400 and not STALE_UPDATE", async () => {
    for (const status of ["CLOSED", "CANCELLED"] as TicketStatus[]) {
      const t = await ticket({ currentStatus: status });
      expectCode(await move(staffA.agent, t.id, "OPEN", OMIT), 409, "INVALID_STATUS_TRANSITION");
      expectCode(await move(staffA.agent, t.id, "OPEN", t.version + 7), 409, "INVALID_STATUS_TRANSITION");
      await expectUnchanged(t.id, t);
    }
  });

  it("WF-18 step 4: a non-terminal Ticket, a permitted target, version missing, \"3\" and 1.5 -> 400 VALIDATION_FAILED with fields.version", async () => {
    const t = await ticket();
    for (const version of [OMIT, "3", 1.5]) {
      const res = await move(staffA.agent, t.id, "IN_PROGRESS", version);
      expectCode(res, 400, "VALIDATION_FAILED");
      expect(res.body.error.fields).toHaveProperty("version");
    }
    await expectUnchanged(t.id, t);
  });

  it("WF-19 step 5: a non-terminal Ticket, a stale version, a target the matrix forbids -> 409 STALE_UPDATE, not INVALID_STATUS_TRANSITION", async () => {
    const t = await ticket({ ownerId: undefined });
    expectCode(await move(staffA.agent, t.id, "NEW", t.version + 1), 409, "STALE_UPDATE");
    await expectUnchanged(t.id, t);
  });

  it("WF-20 step 6: the current version, a forbidden target, on an unowned Ticket failing the gate -> 409 INVALID_STATUS_TRANSITION", async () => {
    const t = await ticket({ currentStatus: "NEW", ownerId: undefined });
    expectCode(await move(staffA.agent, t.id, "RESOLVED", t.version), 409, "INVALID_STATUS_TRANSITION");
    await expectUnchanged(t.id, t);
  });

  it("WF-21 step 7 with the current version: unowned -> RESOLVED failing the gate is OWNER_REQUIRED; owned -> RESOLVED failing it is RESOLUTION_GATE_NOT_MET; -> CANCELLED with a planned action is PLANNED_ACTIONS_OPEN", async () => {
    const unowned = await ticket({ ownerId: undefined });
    await action(unowned.id);
    expectCode(await move(staffA.agent, unowned.id, "RESOLVED", unowned.version), 409, "OWNER_REQUIRED");
    await expectUnchanged(unowned.id, unowned);

    const owned = await ticket();
    await action(owned.id);
    expectReasons(await move(staffA.agent, owned.id, "RESOLVED", owned.version), ["NO_COMPLETED_ACTION", "PLANNED_ACTIONS_OPEN"]);
    await expectUnchanged(owned.id, owned);

    expectCode(await move(staffA.agent, owned.id, "CANCELLED", owned.version), 409, "PLANNED_ACTIONS_OPEN");
    await expectUnchanged(owned.id, owned);
  });
});

// ===========================================================================
// Stale updates (C-138)
// ===========================================================================
describe("stale updates (C-138)", () => {
  it("WF-22 an owner PATCH without version -> 400 fields.version; the owner unchanged", async () => {
    const t = await ticket();
    const res = await setOwner(staffA.agent, t.id, { ownerId: staffB.id });
    expectCode(res, 400, "VALIDATION_FAILED");
    expect(res.body.error.fields).toHaveProperty("version");
    expect((await row(t.id)).ownerId).toBe(staffA.id);
    await expectUnchanged(t.id, t);
  });

  it("WF-23 an IT Priority PATCH without version -> 400 fields.version; the priority unchanged", async () => {
    const t = await ticket();
    const res = await setPriority(staffA.agent, t.id, { itPriority: "HIGH" });
    expectCode(res, 400, "VALIDATION_FAILED");
    expect(res.body.error.fields).toHaveProperty("version");
    expect((await row(t.id)).itPriority).toBe("MEDIUM");
    await expectUnchanged(t.id, t);
  });

  it("WF-24 a status PATCH with the version read before another user's change -> 409 STALE_UPDATE; nothing changes", async () => {
    const t = await ticket();
    const read = t.version;
    expect((await move(staffB.agent, t.id, "IN_PROGRESS", read)).status).toBe(200);
    const before = await row(t.id);
    expectCode(await move(staffA.agent, t.id, "WAITING_FOR_REQUESTER", read), 409, "STALE_UPDATE");
    await expectUnchanged(t.id, before);
  });

  it("WF-25 an owner PATCH with an old version -> 409 STALE_UPDATE; nothing changes", async () => {
    const t = await ticket();
    expect((await setPriority(staffB.agent, t.id, { itPriority: "HIGH", version: t.version })).status).toBe(200);
    const before = await row(t.id);
    expectCode(await setOwner(staffA.agent, t.id, { ownerId: staffB.id, version: t.version }), 409, "STALE_UPDATE");
    await expectUnchanged(t.id, before);
    expect((await row(t.id)).ownerId).toBe(staffA.id);
  });

  it("WF-26 an IT Priority PATCH with an old version -> 409 STALE_UPDATE; nothing changes", async () => {
    const t = await ticket();
    expect((await setOwner(staffB.agent, t.id, { ownerId: staffB.id, version: t.version })).status).toBe(200);
    const before = await row(t.id);
    expectCode(await setPriority(staffA.agent, t.id, { itPriority: "LOW", version: t.version }), 409, "STALE_UPDATE");
    await expectUnchanged(t.id, before);
    expect((await row(t.id)).itPriority).toBe(before.itPriority);
  });

  it("WF-27 edit, complete and cancel with an action version older than another user's edit -> each 409 STALE_UPDATE; the action unchanged", async () => {
    const t = await ticket();
    const planned = await action(t.id);
    const edited = await staffB.agent.patch(`/api/actions/${planned.id}`).send({ version: planned.version, description: "Staff B's description." });
    expect(edited.status, JSON.stringify(edited.body)).toBe(200);
    const fresh = await prisma.actionTaken.findUniqueOrThrow({ where: { id: planned.id } });
    expectCode(await staffA.agent.patch(`/api/actions/${planned.id}`).send({ version: planned.version, description: "Stale edit." }), 409, "STALE_UPDATE");
    expectCode(await staffA.agent.post(`/api/actions/${planned.id}/complete`).send({ version: planned.version, result: "Done.", followUpRequired: false }), 409, "STALE_UPDATE");
    expectCode(await staffA.agent.post(`/api/actions/${planned.id}/cancel`).send({ version: planned.version, result: "Not needed." }), 409, "STALE_UPDATE");
    expect(await prisma.actionTaken.findUniqueOrThrow({ where: { id: planned.id } })).toEqual(fresh);
  });

  it("WF-28 the STALE_UPDATE body is exactly { error: { code, message } }: no fields, no reasons (C-173)", async () => {
    const t = await ticket();
    const res = await move(staffA.agent, t.id, "IN_PROGRESS", t.version + 1);
    expectCode(res, 409, "STALE_UPDATE");
    expect(Object.keys(res.body)).toEqual(["error"]);
    expect(Object.keys(res.body.error).sort()).toEqual(["code", "message"]);
  });

  it("WF-29 race on status: two agents read version v, then send OPEN -> IN_PROGRESS and OPEN -> WAITING_FOR_REQUESTER concurrently -> exactly one 200, the other 409 STALE_UPDATE; version v + 1; one new history row", async () => {
    const t = await ticket();
    const v = t.version;
    const historyBefore = (await historyOf(t.id)).length;
    const [a, b] = await Promise.all([
      move(staffA.agent, t.id, "IN_PROGRESS", v),
      move(staffB.agent, t.id, "WAITING_FOR_REQUESTER", v),
    ]);
    const statuses = [a.status, b.status].sort();
    expect(statuses, JSON.stringify([a.body, b.body])).toEqual([200, 409]);
    const loser = a.status === 409 ? a : b;
    expect(loser.body.error.code).toBe("STALE_UPDATE");
    const after = await row(t.id);
    expect(after.version).toBe(v + 1);
    expect(after.currentStatus).toBe(a.status === 200 ? "IN_PROGRESS" : "WAITING_FOR_REQUESTER");
    expect(await historyOf(t.id)).toHaveLength(historyBefore + 1);
  });

  it("WF-30 race on owner: two concurrent owner PATCHes with v, to different users -> one 200, one STALE_UPDATE; the owner is the winner's choice; version v + 1", async () => {
    const t = await ticket({ ownerId: undefined });
    const v = t.version;
    const [a, b] = await Promise.all([
      setOwner(staffA.agent, t.id, { ownerId: staffA.id, version: v }),
      setOwner(staffB.agent, t.id, { ownerId: staffB.id, version: v }),
    ]);
    expect([a.status, b.status].sort(), JSON.stringify([a.body, b.body])).toEqual([200, 409]);
    const loser = a.status === 409 ? a : b;
    expect(loser.body.error.code).toBe("STALE_UPDATE");
    const after = await row(t.id);
    expect(after.ownerId).toBe(a.status === 200 ? staffA.id : staffB.id);
    expect(after.version).toBe(v + 1);
  });

  it("WF-31 race on an action edit: two concurrent edits with action version v -> one 200, one STALE_UPDATE; the description is the winner's; action version v + 1", async () => {
    const t = await ticket();
    const planned = await action(t.id);
    const v = planned.version;
    const [a, b] = await Promise.all([
      staffA.agent.patch(`/api/actions/${planned.id}`).send({ version: v, description: "Edit by A." }),
      staffB.agent.patch(`/api/actions/${planned.id}`).send({ version: v, description: "Edit by B." }),
    ]);
    expect([a.status, b.status].sort(), JSON.stringify([a.body, b.body])).toEqual([200, 409]);
    expect((a.status === 409 ? a : b).body.error.code).toBe("STALE_UPDATE");
    const after = await prisma.actionTaken.findUniqueOrThrow({ where: { id: planned.id } });
    expect(after.description).toBe(a.status === 200 ? "Edit by A." : "Edit by B.");
    expect(after.version).toBe(v + 1);
  });

  it("WF-32 a planned-action create and -> RESOLVED sent concurrently on a gate-met Ticket, 20 runs: no run ends RESOLVED with a PLANNED action (BR-34)", async () => {
    const outcomes: string[] = [];
    for (let run = 0; run < 20; run += 1) {
      const t = await ticket({ currentStatus: "IN_PROGRESS" });
      await completedAction(t.id);
      const [created, resolved] = await Promise.all([
        staffB.agent.post(`/api/tickets/${t.id}/actions`).send({ status: "PLANNED", actionAt: bkk(fromNow(HOUR)), description: `Run ${run}.` }),
        move(staffA.agent, t.id, "RESOLVED", t.version),
      ]);
      const after = await row(t.id);
      const planned = await prisma.actionTaken.count({ where: { ticketId: t.id, status: "PLANNED" } });
      expect(after.currentStatus === "RESOLVED" && planned > 0, `run ${run}`).toBe(false);
      if (resolved.status === 200) {
        expectCode(created, 409, "TICKET_RESOLVED");
        outcomes.push("resolved first");
      } else {
        expect(created.status, JSON.stringify(created.body)).toBe(201);
        expectReasons(resolved, ["PLANNED_ACTIONS_OPEN"]);
        outcomes.push("created first");
      }
    }
    expect(outcomes).toHaveLength(20);
  }, 120_000);

  it("WF-33 an action edit with a 2001-character description and a stale version -> 400 VALIDATION_FAILED: body before stale (BR-40)", async () => {
    const t = await ticket();
    const planned = await action(t.id);
    const res = await staffA.agent.patch(`/api/actions/${planned.id}`).send({ version: planned.version + 3, description: "d".repeat(2001) });
    expectCode(res, 400, "VALIDATION_FAILED");
    expect(res.body.error.fields).toHaveProperty("description");
  });

  it("WF-34 owner PATCH order: CLOSED with no version -> 409 TICKET_CLOSED (not 400); a stale version with a Requester as owner -> 409 STALE_UPDATE (not 422)", async () => {
    const closed = await ticket({ currentStatus: "CLOSED" });
    expectCode(await setOwner(staffA.agent, closed.id, { ownerId: staffB.id }), 409, "TICKET_CLOSED");
    const open = await ticket();
    expectCode(await setOwner(staffA.agent, open.id, { ownerId: reqA.id, version: open.version + 1 }), 409, "STALE_UPDATE");
    await expectUnchanged(open.id, open);
  });

  // Found by the #66 audit: an ownerId past int4 reached Prisma and became a 500.
  it("WF-34 (audit) an owner PATCH with an ownerId beyond int4 is 400 at fields.ownerId, never 500; nothing changes", async () => {
    const t = await ticket();
    const res = await setOwner(staffA.agent, t.id, { ownerId: 1e10, version: t.version });
    expectCode(res, 400, "VALIDATION_FAILED");
    expect(res.body.error.fields).toHaveProperty("ownerId");
    await expectUnchanged(t.id, t);
  });
});

// ===========================================================================
// Activity time and version per write path (BR-46, BR-37) - one test per
// path, each reading lastActivityAt and version before and after.
// ===========================================================================
describe("lastActivityAt and version per write path (C-140, C-138)", () => {
  async function snapshot(id: number) {
    const r = await row(id);
    return { lastActivityAt: r.lastActivityAt.getTime(), version: r.version };
  }
  async function expectMoved(id: number, before: { lastActivityAt: number; version: number }, versionDelta: 0 | 1) {
    const after = await snapshot(id);
    expect(after.lastActivityAt).toBeGreaterThan(before.lastActivityAt);
    expect(after.version).toBe(before.version + versionDelta);
  }

  it("WF-35 Ticket create: lastActivityAt = the create time within 2 s; version 0", async () => {
    const category = await prisma.category.findFirstOrThrow({ where: { isActive: true } });
    const system = await prisma.relatedSystem.findFirstOrThrow({ where: { isActive: true } });
    const startedAt = Date.now();
    const res = await reqA.agent.post("/api/tickets").send({
      categoryId: category.id, relatedSystemId: system.id, summary: `${TAG} created over HTTP`, description: "WF-35: created over HTTP for the activity-time check.", requestedPriority: "LOW",
    });
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    const r = await row(res.body.id);
    expect(Math.abs(r.lastActivityAt.getTime() - r.createdAt.getTime())).toBeLessThanOrEqual(2000);
    expect(Math.abs(r.lastActivityAt.getTime() - startedAt)).toBeLessThanOrEqual(2000);
    expect(r.version).toBe(0);
  });

  it("WF-36 a status change advances lastActivityAt; version + 1", async () => {
    const t = await ticket();
    const before = await snapshot(t.id);
    expect((await move(staffA.agent, t.id, "IN_PROGRESS")).status).toBe(200);
    await expectMoved(t.id, before, 1);
  });

  it("WF-37 an owner change advances lastActivityAt; version + 1", async () => {
    const t = await ticket();
    const before = await snapshot(t.id);
    expect((await setOwner(staffA.agent, t.id, { ownerId: staffB.id, version: t.version })).status).toBe(200);
    await expectMoved(t.id, before, 1);
  });

  it("WF-38 an IT Priority change to a new value advances lastActivityAt, version + 1; re-sending the current value is 200 with version and lastActivityAt unchanged (C-187)", async () => {
    const t = await ticket();
    const before = await snapshot(t.id);
    expect((await setPriority(staffA.agent, t.id, { itPriority: "HIGH", version: t.version })).status).toBe(200);
    await expectMoved(t.id, before, 1);
    const mid = await snapshot(t.id);
    const same = await setPriority(staffA.agent, t.id, { itPriority: "HIGH", version: mid.version });
    expect(same.status, JSON.stringify(same.body)).toBe(200);
    expect(await snapshot(t.id)).toEqual(mid);
  });

  it("WF-39 claim with no body is 200, advances lastActivityAt; version + 1 (BR-38)", async () => {
    const t = await ticket({ ownerId: undefined });
    const before = await snapshot(t.id);
    const res = await staffA.agent.post(`/api/staff/tickets/${t.id}/claim`);
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    await expectMoved(t.id, before, 1);
  });

  it("WF-40 an action create advances lastActivityAt; the Ticket version unchanged", async () => {
    const t = await ticket();
    const before = await snapshot(t.id);
    const res = await staffA.agent.post(`/api/tickets/${t.id}/actions`).send({ status: "PLANNED", actionAt: bkk(fromNow(HOUR)), description: "WF-40." });
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    await expectMoved(t.id, before, 0);
  });

  it("WF-41 an action edit advances lastActivityAt; the Ticket version unchanged", async () => {
    const t = await ticket();
    const planned = await action(t.id);
    const before = await snapshot(t.id);
    const res = await staffA.agent.patch(`/api/actions/${planned.id}`).send({ version: planned.version, description: "WF-41 edited." });
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    await expectMoved(t.id, before, 0);
  });

  it("WF-42 an action complete advances lastActivityAt; the Ticket version unchanged", async () => {
    const t = await ticket();
    const planned = await action(t.id, { actionAt: fromNow(-HOUR) });
    const before = await snapshot(t.id);
    const res = await staffA.agent.post(`/api/actions/${planned.id}/complete`).send({ version: planned.version, result: "Done.", followUpRequired: false });
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    await expectMoved(t.id, before, 0);
  });

  it("WF-43 an action cancel advances lastActivityAt; the Ticket version unchanged", async () => {
    const t = await ticket();
    const planned = await action(t.id);
    const before = await snapshot(t.id);
    const res = await staffA.agent.post(`/api/actions/${planned.id}/cancel`).send({ version: planned.version, result: "Not needed." });
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    await expectMoved(t.id, before, 0);
  });

  it("WF-44 a Public Comment advances lastActivityAt; version unchanged", async () => {
    const t = await ticket();
    const before = await snapshot(t.id);
    expect((await comment(reqA.agent, t.id, { body: "WF-44 comment." })).status).toBe(201);
    await expectMoved(t.id, before, 0);
  });

  it("WF-45 an Attachment upload advances lastActivityAt; version unchanged", async () => {
    const t = await ticket();
    const before = await snapshot(t.id);
    const res = await reqA.agent.post(`/api/tickets/${t.id}/attachments`).attach("file", PNG, "wf-45.png");
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    await expectMoved(t.id, before, 0);
  });

  it("WF-46 an Attachment soft removal advances lastActivityAt; version unchanged", async () => {
    const t = await ticket();
    const up = await reqA.agent.post(`/api/tickets/${t.id}/attachments`).attach("file", PNG, "wf-46.png");
    expect(up.status).toBe(201);
    const before = await snapshot(t.id);
    const res = await reqA.agent.delete(`/api/attachments/${up.body.id}`).send({ removalReason: "Wrong screenshot." });
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    await expectMoved(t.id, before, 0);
  });

  it("WF-47 the Requester's \"Problem Appears Resolved\" with no version sent is 200, advances lastActivityAt; version + 1 (BR-38)", async () => {
    const t = await ticket();
    const before = await snapshot(t.id);
    const res = await reqA.agent.post(`/api/tickets/${t.id}/requester-resolved`);
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    await expectMoved(t.id, before, 1);
  });

  it("WF-48 an Internal Note leaves lastActivityAt and version both unchanged; the Requester's My Tickets row shows the same lastActivityAt as before (BR-47)", async () => {
    const t = await ticket({ requesterId: reqB.id });
    const listRow = async () => {
      const res = await reqB.agent.get("/api/tickets");
      expect(res.status).toBe(200);
      return res.body.data.find((r: { id: number }) => r.id === t.id);
    };
    const before = await snapshot(t.id);
    const rowBefore = await listRow();
    expect(rowBefore.lastActivityAt).toBe(new Date(before.lastActivityAt).toISOString());
    expect((await note(staffA.agent, t.id, { body: "WF-48 private note." })).status).toBe(201);
    expect(await snapshot(t.id)).toEqual(before);
    expect((await listRow()).lastActivityAt).toBe(rowBefore.lastActivityAt);
  });

  it("WF-49 the flag set a second time: 200; requesterResolvedAt overwritten; version and lastActivityAt move again (C-178)", async () => {
    const t = await ticket();
    expect((await reqA.agent.post(`/api/tickets/${t.id}/requester-resolved`)).status).toBe(200);
    const first = await row(t.id);
    const before = { lastActivityAt: first.lastActivityAt.getTime(), version: first.version };
    await new Promise((r) => setTimeout(r, 5));
    const res = await reqA.agent.post(`/api/tickets/${t.id}/requester-resolved`);
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    const second = await row(t.id);
    expect(second.requesterResolvedAt!.getTime()).toBeGreaterThan(first.requesterResolvedAt!.getTime());
    await expectMoved(t.id, before, 1);
  });
});

// ===========================================================================
// Resolution time and status history (BR-49, BR-50)
// ===========================================================================
describe("resolvedAt and status history (BR-49, BR-50)", () => {
  it("WF-50 RESOLVED -> CLOSED keeps resolvedAt unchanged", async () => {
    const resolvedAt = fromNow(-30 * MINUTE);
    const t = await ticket({ currentStatus: "RESOLVED" });
    await prisma.ticket.update({ where: { id: t.id }, data: { resolvedAt } });
    expect((await move(staffA.agent, t.id, "CLOSED")).status).toBe(200);
    const after = await row(t.id);
    expect(after.currentStatus).toBe("CLOSED");
    expect(after.resolvedAt?.getTime()).toBe(resolvedAt.getTime());
  });

  it("WF-51 RESOLVED -> REOPENED sets resolvedAt to NULL", async () => {
    const t = await ticket({ currentStatus: "RESOLVED" });
    await prisma.ticket.update({ where: { id: t.id }, data: { resolvedAt: fromNow(-30 * MINUTE) } });
    expect((await move(staffA.agent, t.id, "REOPENED")).status).toBe(200);
    const after = await row(t.id);
    expect(after.currentStatus).toBe("REOPENED");
    expect(after.resolvedAt).toBeNull();
  });

  it("WF-52 a Requester creates a Ticket: one history row, fromStatus null -> NEW; historyComplete true on both DTOs (C-167, C-179)", async () => {
    const category = await prisma.category.findFirstOrThrow({ where: { isActive: true } });
    const system = await prisma.relatedSystem.findFirstOrThrow({ where: { isActive: true } });
    const res = await reqA.agent.post("/api/tickets").send({
      categoryId: category.id, relatedSystemId: system.id, summary: `${TAG} WF-52`, description: "WF-52: created over HTTP for the history-row check.", requestedPriority: "LOW",
    });
    expect(res.status).toBe(201);
    const rows = await historyOf(res.body.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ fromStatus: null, toStatus: "NEW", changedById: reqA.id });
    expect(res.body.historyComplete).toBe(true);
    expect((await reqA.agent.get(`/api/tickets/${res.body.id}`)).body.historyComplete).toBe(true);
    expect((await staffDetail(res.body.id)).body.historyComplete).toBe(true);
  });

  it("WF-53 a legacy Ticket with no history row: historyComplete false and statusHistory [] on both DTOs (C-179)", async () => {
    const t = await legacyTicket();
    for (const res of [await reqA.agent.get(`/api/tickets/${t.id}`), await staffDetail(t.id)]) {
      expect(res.status).toBe(200);
      expect(res.body.historyComplete).toBe(false);
      expect(res.body.statusHistory).toEqual([]);
    }
  });

  it("WF-54 three moves: both DTOs list the creation row and the three changes, changedAt then id ascending; Requester rows carry changedBy { name } only", async () => {
    const t = await ticket({ currentStatus: "NEW" });
    for (const step of ["OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER"]) {
      const res = await move(staffA.agent, t.id, step);
      expect(res.status, `${step} ${JSON.stringify(res.body)}`).toBe(200);
    }
    const expected = [[null, "NEW"], ["NEW", "OPEN"], ["OPEN", "IN_PROGRESS"], ["IN_PROGRESS", "WAITING_FOR_REQUESTER"]];
    const requesterDto = (await reqA.agent.get(`/api/tickets/${t.id}`)).body;
    const staffDto = (await staffDetail(t.id)).body;
    for (const dto of [requesterDto, staffDto]) {
      expect(dto.statusHistory.map((h: any) => [h.fromStatus, h.toStatus])).toEqual(expected);
      const keys = dto.statusHistory.map((h: any) => `${new Date(h.changedAt).getTime()}.${String(h.id).padStart(12, "0")}`);
      expect(keys).toEqual([...keys].sort());
    }
    for (const h of requesterDto.statusHistory) expect(Object.keys(h.changedBy)).toEqual(["name"]);
    expect(staffDto.statusHistory[1].changedBy).toEqual({ id: staffA.id, name: staffA.name });
  });

  it("WF-55 a status change whose transaction fails (a temporary trigger raising on INSERT INTO TicketStatusChange) -> 500 INTERNAL_ERROR with no stack or SQL; status, version, lastActivityAt and history unchanged", async () => {
    const t = await ticket();
    const before = await row(t.id);
    const historyBefore = await historyOf(t.id);
    await prisma.$executeRawUnsafe(`CREATE OR REPLACE FUNCTION wf55_refuse_history() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'wf55 forced failure'; END $$ LANGUAGE plpgsql`);
    await prisma.$executeRawUnsafe(`CREATE TRIGGER wf55_refuse_history BEFORE INSERT ON "TicketStatusChange" FOR EACH ROW EXECUTE FUNCTION wf55_refuse_history()`);
    let res;
    try {
      res = await move(staffA.agent, t.id, "IN_PROGRESS", before.version);
    } finally {
      await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS wf55_refuse_history ON "TicketStatusChange"`);
      await prisma.$executeRawUnsafe(`DROP FUNCTION IF EXISTS wf55_refuse_history()`);
    }
    expectCode(res, 500, "INTERNAL_ERROR");
    expect(Object.keys(res.body.error).sort()).toEqual(["code", "message"]);
    expect(JSON.stringify(res.body)).not.toMatch(/wf55|TicketStatusChange|INSERT|\bat\s+\S+\.(ts|js)/);
    const after = await row(t.id);
    expect(after.currentStatus).toBe(before.currentStatus);
    expect(after.version).toBe(before.version);
    expect(after.lastActivityAt.getTime()).toBe(before.lastActivityAt.getTime());
    expect(await historyOf(t.id)).toEqual(historyBefore);
  });
});

// ===========================================================================
// Duplicate submission on Public Comments and Internal Notes (C-139, C-158)
// ===========================================================================
describe("replays on Public Comments and Internal Notes (C-139)", () => {
  it("WF-56 a Public Comment posted twice by one author with key K: the second is 200 with the original comment; one row", async () => {
    const t = await ticket();
    const K = uuid();
    const first = await comment(reqA.agent, t.id, { body: "WF-56 once.", clientRequestId: K });
    expect(first.status).toBe(201);
    const second = await comment(reqA.agent, t.id, { body: "WF-56 once.", clientRequestId: K });
    expect(second.status, JSON.stringify(second.body)).toBe(200);
    expect(second.body).toEqual(first.body);
    expect(await prisma.publicComment.count({ where: { ticketId: t.id } })).toBe(1);
  });

  it("WF-57 an Internal Note replayed with K and a different body: 200 with the original note; no new row; the body is not compared (C-166)", async () => {
    const t = await ticket();
    const K = uuid();
    const first = await note(staffA.agent, t.id, { body: "WF-57 original.", clientRequestId: K });
    expect(first.status).toBe(201);
    const second = await note(staffA.agent, t.id, { body: "WF-57 different.", clientRequestId: K });
    expect(second.status, JSON.stringify(second.body)).toBe(200);
    expect(second.body).toEqual(first.body);
    expect(await prisma.internalNote.count({ where: { ticketId: t.id } })).toBe(1);
  });

  it("WF-58 five concurrent Public Comments with one K (the P2002 path): one row; every response 200 or 201 with it; none 500", async () => {
    const t = await ticket();
    const K = uuid();
    const agents = await Promise.all(Array.from({ length: 5 }, () => signIn(reqA.email)));
    const responses = await Promise.all(agents.map((ag) => comment(ag, t.id, { body: "WF-58.", clientRequestId: K })));
    const rows = await prisma.publicComment.findMany({ where: { ticketId: t.id } });
    expect(rows).toHaveLength(1);
    for (const r of responses) {
      expect([200, 201], JSON.stringify(r.body)).toContain(r.status);
      expect(r.body.id).toBe(rows[0].id);
    }
  });

  it("WF-59 five concurrent Internal Notes with one K (the P2002 path): one row; none 500", async () => {
    const t = await ticket();
    const K = uuid();
    const agents = await Promise.all(Array.from({ length: 5 }, () => signIn(staffA.email)));
    const responses = await Promise.all(agents.map((ag) => note(ag, t.id, { body: "WF-59.", clientRequestId: K })));
    const rows = await prisma.internalNote.findMany({ where: { ticketId: t.id } });
    expect(rows).toHaveLength(1);
    for (const r of responses) {
      expect([200, 201], JSON.stringify(r.body)).toContain(r.status);
      expect(r.body.id).toBe(rows[0].id);
    }
  });

  it("WF-60 a Public Comment replayed after the Ticket moved to CLOSED: 200 with the original, not TICKET_CLOSED", async () => {
    const t = await ticket();
    const K = uuid();
    const first = await comment(reqA.agent, t.id, { body: "WF-60.", clientRequestId: K });
    expect(first.status).toBe(201);
    await prisma.ticket.update({ where: { id: t.id }, data: { currentStatus: "CLOSED" } });
    const replay = await comment(reqA.agent, t.id, { body: "WF-60.", clientRequestId: K });
    expect(replay.status, JSON.stringify(replay.body)).toBe(200);
    expect(replay.body).toEqual(first.body);
    // Without the key the closed Ticket still refuses (L3 C-109).
    expectCode(await comment(reqA.agent, t.id, { body: "WF-60 new." }), 409, "TICKET_CLOSED");
  });

  it("WF-61 an Internal Note replayed after the Ticket moved to CLOSED: 200 with the original, not TICKET_CLOSED", async () => {
    const t = await ticket();
    const K = uuid();
    const first = await note(staffA.agent, t.id, { body: "WF-61.", clientRequestId: K });
    expect(first.status).toBe(201);
    await prisma.ticket.update({ where: { id: t.id }, data: { currentStatus: "CLOSED" } });
    const replay = await note(staffA.agent, t.id, { body: "WF-61.", clientRequestId: K });
    expect(replay.status, JSON.stringify(replay.body)).toBe(200);
    expect(replay.body).toEqual(first.body);
    expectCode(await note(staffA.agent, t.id, { body: "WF-61 new." }), 409, "TICKET_CLOSED");
  });

  it("WF-62 two identical Internal Notes with no clientRequestId make two rows", async () => {
    const t = await ticket();
    expect((await note(staffA.agent, t.id, { body: "WF-62 same." })).status).toBe(201);
    expect((await note(staffA.agent, t.id, { body: "WF-62 same." })).status).toBe(201);
    expect(await prisma.internalNote.count({ where: { ticketId: t.id } })).toBe(2);
  });

  it("WF-63 two staff authors using the same K on notes, and the Requester and a staff user using it on comments, each get their own row", async () => {
    const t = await ticket();
    const K = uuid();
    const n1 = await note(staffA.agent, t.id, { body: "WF-63 A.", clientRequestId: K });
    const n2 = await note(staffB.agent, t.id, { body: "WF-63 B.", clientRequestId: K });
    expect([n1.status, n2.status]).toEqual([201, 201]);
    expect(n1.body.id).not.toBe(n2.body.id);
    const c1 = await comment(reqA.agent, t.id, { body: "WF-63 requester.", clientRequestId: K });
    const c2 = await comment(staffA.agent, t.id, { body: "WF-63 staff.", clientRequestId: K });
    expect([c1.status, c2.status]).toEqual([201, 201]);
    expect(c1.body.id).not.toBe(c2.body.id);
    expect(await prisma.internalNote.count({ where: { ticketId: t.id } })).toBe(2);
    expect(await prisma.publicComment.count({ where: { ticketId: t.id } })).toBe(2);
  });

  it("WF-64 POST /api/tickets twice by one Requester with the same clientRequestId: 201 both times, two Tickets - the field is ignored (C-158)", async () => {
    const category = await prisma.category.findFirstOrThrow({ where: { isActive: true } });
    const system = await prisma.relatedSystem.findFirstOrThrow({ where: { isActive: true } });
    const body = { categoryId: category.id, relatedSystemId: system.id, summary: `${TAG} WF-64`, description: "WF-64: created twice with one clientRequestId.", requestedPriority: "LOW", clientRequestId: uuid() };
    const a = await reqA.agent.post("/api/tickets").send(body);
    const b = await reqA.agent.post("/api/tickets").send(body);
    expect([a.status, b.status]).toEqual([201, 201]);
    expect(a.body.id).not.toBe(b.body.id);
  });
});
