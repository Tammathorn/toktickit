import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import type { Prisma, TicketStatus } from "@prisma/client";
import { getPrisma } from "../../src/prisma.js";
import { seedGraded } from "../../src/seed/graded-seed.js";
import { createTicketWithNumber, type NewTicket } from "../../src/lib/ticket-repository.js";
import { UPLOAD_DIR } from "../../src/lib/uploads.js";
import { removeUsers, signedInUser, type Agent } from "../support/agents.js";

// Planned rows from tests.md section 2.5 (Issue #42): UNIT-12, API-49..API-62,
// API-64, API-66..API-75, API-116, API-119 and API-120 - IT Staff Ticket
// Detail, claim / assign / unassign, IT Priority, the section 5.1 status
// matrix, the Requester resolution flag, the assignable-users list, and the
// C-109 write-lock on terminal Tickets.
//
// Every user, Ticket, Attachment, Public Comment and Internal Note here is
// created by this file and removed in afterAll; the seeded accounts and
// Tickets are never touched.

const prisma = getPrisma();
const TAG = "[staff-detail-test]";
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

const STATUSES = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CLOSED", "REOPENED", "CANCELLED"] as const;
const WORKED: TicketStatus[] = ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED"];
const TERMINAL: TicketStatus[] = ["CLOSED", "CANCELLED"];

// specification.md section 5.1, transcribed cell by cell. Columns follow
// STATUSES. Y permitted, - refused 409, = the diagonal (400, BR-56).
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
const cell = (from: TicketStatus, to: TicketStatus) => MATRIX[from].split(" ")[STATUSES.indexOf(to)];

type Person = { id: number; name: string; email: string; agent: Agent };
let staffX: Person;
let staffY: Person;
let admin: Person;
let reqA: Person;
let reqB: Person;
let inactiveStaff: Person;
const userIds: number[] = [];

async function ticket(overrides: Partial<NewTicket> = {}) {
  const category = await prisma.category.findFirstOrThrow({ where: { isActive: true } });
  const system = await prisma.relatedSystem.findFirstOrThrow({ where: { isActive: true } });
  return createTicketWithNumber(prisma, {
    requesterId: reqA.id,
    categoryId: category.id,
    relatedSystemId: system.id,
    summary: `${TAG} fixture`,
    description: "Fixture row for staff-ticket-detail.api.test.ts.",
    requestedPriority: "MEDIUM",
    ...overrides,
  });
}

const setTicket = (id: number, data: Prisma.TicketUncheckedUpdateInput) => prisma.ticket.update({ where: { id }, data });
const row = (id: number) => prisma.ticket.findUniqueOrThrow({ where: { id } });
const detail = (as: Agent, id: number | string) => as.get(`/api/staff/tickets/${id}`);
const claim = (as: Agent, id: number) => as.post(`/api/staff/tickets/${id}/claim`);
const setOwner = (as: Agent, id: number, body: object) => as.patch(`/api/staff/tickets/${id}/owner`).send(body);
const setPriority = (as: Agent, id: number, itPriority: unknown) => as.patch(`/api/staff/tickets/${id}/it-priority`).send({ itPriority });
const setStatus = (as: Agent, id: number, currentStatus: unknown) => as.patch(`/api/staff/tickets/${id}/status`).send({ currentStatus });
const unassignedIds = async (as: Agent, ticketNumber: string) => {
  const res = await as.get(`/api/staff/tickets?owner=unassigned&search=${encodeURIComponent(ticketNumber)}`);
  expect(res.status).toBe(200);
  return res.body.data.map((r: { id: number }) => r.id);
};

beforeAll(async () => {
  await seedGraded(prisma);
  staffX = await signedInUser(prisma, "detail-staffx", { role: "IT_STAFF", name: `${TAG} Staff X` });
  staffY = await signedInUser(prisma, "detail-staffy", { role: "IT_STAFF", name: `${TAG} Staff Y` });
  admin = await signedInUser(prisma, "detail-admin", { role: "ADMINISTRATOR", name: `${TAG} Admin` });
  reqA = await signedInUser(prisma, "detail-reqa", { name: `${TAG} Requester A` });
  reqB = await signedInUser(prisma, "detail-reqb", { name: `${TAG} Requester B` });
  inactiveStaff = await signedInUser(prisma, "detail-inactive", { role: "IT_STAFF", name: `${TAG} Retired Staff` });
  await prisma.user.update({ where: { id: inactiveStaff.id }, data: { isActive: false } });
  userIds.push(staffX.id, staffY.id, admin.id, reqA.id, reqB.id, inactiveStaff.id);
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
  await prisma.ticket.deleteMany({ where: mine });
  await removeUsers(prisma, userIds);
});

// ---------------------------------------------------------------------------
// UNIT-12 - the transition matrix as data
// ---------------------------------------------------------------------------
describe("the status transition matrix", () => {
  it("UNIT-12 every one of the 64 cells of specification.md 5.1 matches the transition function (BR-55)", async () => {
    const { isPermittedTransition } = await import("../../src/lib/status-transitions.js");
    const wrong: string[] = [];
    for (const from of STATUSES) {
      for (const to of STATUSES) {
        if (isPermittedTransition(from, to) !== (cell(from, to) === "Y")) wrong.push(`${from} -> ${to}`);
      }
    }
    expect(wrong).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// GET /api/staff/tickets/:id - api-spec.md 8.2 and 10.5
// ---------------------------------------------------------------------------
describe("GET /api/staff/tickets/:id", () => {
  it("API-49 the staff DTO carries requester with email, owner, publicComments and internalNotes (FR-43)", async () => {
    const t = await ticket({ ownerId: staffX.id, currentStatus: "IN_PROGRESS", requesterResolvedAt: new Date() });
    await prisma.publicComment.create({ data: { ticketId: t.id, authorId: reqA.id, body: "The screen is still blank." } });
    await prisma.internalNote.create({ data: { ticketId: t.id, authorId: staffX.id, body: "Likely the GPU driver." } });
    await reqA.agent.post(`/api/tickets/${t.id}/attachments`).attach("file", PNG, "screen.png");

    const res = await detail(staffY.agent, t.id);
    expect(res.status).toBe(200);
    expect(Object.keys(res.body).sort()).toEqual(
      ["id", "ticketNumber", "requester", "category", "relatedSystem", "summary", "description", "requestedPriority",
        "itPriority", "currentStatus", "owner", "requesterResolvedAt", "createdAt", "updatedAt", "attachments",
        "publicComments", "internalNotes"].sort(),
    );
    expect(res.body.requester).toEqual({ id: reqA.id, name: reqA.name, email: reqA.email });
    expect(res.body.owner).toEqual({ id: staffX.id, name: staffX.name, role: "IT_STAFF", isActive: true });
    expect(res.body.requesterResolvedAt).toMatch(/Z$/);
    expect(res.body.publicComments.map((c: { body: string }) => c.body)).toEqual(["The screen is still blank."]);
    expect(res.body.internalNotes.map((n: { body: string }) => n.body)).toEqual(["Likely the GPU driver."]);
    expect(res.body.attachments).toHaveLength(1);
    expect(res.body.attachments[0].originalFilename).toBe("screen.png");
    expect(res.text).not.toMatch(/passwordHash|storedFilename|tokenHash/);

    // An owner who has since been deactivated stays, marked inactive (BR-30, FR-46).
    const kept = await ticket({ ownerId: inactiveStaff.id, currentStatus: "OPEN" });
    const inactive = await detail(staffX.agent, kept.id);
    expect(inactive.body.owner).toEqual({ id: inactiveStaff.id, name: inactiveStaff.name, role: "IT_STAFF", isActive: false });
  });

  it("a missing Ticket is 404 TICKET_NOT_FOUND and a malformed id 400 INVALID_QUERY_PARAM, to a staff caller (api-spec.md 8.2, C-113)", async () => {
    const missing = await detail(staffX.agent, 999999);
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe("TICKET_NOT_FOUND");
    for (const bad of ["abc", "0"]) {
      const res = await detail(staffX.agent, bad);
      expect(res.status, bad).toBe(400);
      expect(res.body.error.code).toBe("INVALID_QUERY_PARAM");
      expect(Object.keys(res.body.error.fields)).toEqual(["id"]);
    }
  });
});

// ---------------------------------------------------------------------------
// Claim - api-spec.md 8.3
// ---------------------------------------------------------------------------
describe("POST /api/staff/tickets/:id/claim", () => {
  it("API-50 claiming an unassigned Ticket makes the caller its owner (AC-70, BR-46)", async () => {
    const t = await ticket({ currentStatus: "OPEN" });
    const res = await claim(staffX.agent, t.id);
    expect(res.status).toBe(200);
    expect(res.body.owner).toEqual({ id: staffX.id, name: staffX.name, role: "IT_STAFF", isActive: true });
    expect((await row(t.id)).ownerId).toBe(staffX.id);
  });

  it("API-51 claiming a Ticket already owned -> 409 ALREADY_OWNED naming the owner; the owner does not change (AC-71, BR-46)", async () => {
    const t = await ticket({ ownerId: staffX.id, currentStatus: "OPEN" });
    const res = await claim(staffY.agent, t.id);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("ALREADY_OWNED");
    expect(res.body.error.message).toContain(staffX.name);
    expect((await row(t.id)).ownerId).toBe(staffX.id);
    // The owner claiming again is the same refusal (api-spec.md 8.3).
    expect((await claim(staffX.agent, t.id)).status).toBe(409);
  });

  it("API-52 two simultaneous claims: exactly one 200, the other 409, and the Ticket has exactly one owner (BR-46, C-75)", async () => {
    for (let round = 0; round < 5; round += 1) {
      const t = await ticket({ currentStatus: "NEW" });
      const [x, y] = await Promise.all([claim(staffX.agent, t.id), claim(staffY.agent, t.id)]);
      expect([x.status, y.status].sort()).toEqual([200, 409]);
      const winner = x.status === 200 ? staffX : staffY;
      const loser = x.status === 200 ? y : x;
      expect(loser.body.error.code).toBe("ALREADY_OWNED");
      expect(loser.body.error.message).toContain(winner.name);
      expect((await row(t.id)).ownerId).toBe(winner.id);
    }
  });

  it("API-53 claiming does not change status: a NEW Ticket claimed stays NEW (C-102)", async () => {
    const t = await ticket();
    const res = await claim(staffX.agent, t.id);
    expect(res.status).toBe(200);
    expect(res.body.currentStatus).toBe("NEW");
    expect((await row(t.id)).currentStatus).toBe("NEW");
  });
});

// ---------------------------------------------------------------------------
// Assign, reassign, unassign - api-spec.md 8.4
// ---------------------------------------------------------------------------
describe("PATCH /api/staff/tickets/:id/owner", () => {
  it("API-54 assigning to an active IT Staff user and to an active Administrator both succeed (AC-72, BR-47, C-66)", async () => {
    const t = await ticket({ currentStatus: "OPEN" });
    const toStaff = await setOwner(staffX.agent, t.id, { ownerId: staffY.id });
    expect(toStaff.status).toBe(200);
    expect(toStaff.body.owner).toEqual({ id: staffY.id, name: staffY.name, role: "IT_STAFF", isActive: true });
    const toAdmin = await setOwner(staffX.agent, t.id, { ownerId: admin.id });
    expect(toAdmin.status).toBe(200);
    expect(toAdmin.body.owner).toEqual({ id: admin.id, name: admin.name, role: "ADMINISTRATOR", isActive: true });
    expect((await row(t.id)).ownerId).toBe(admin.id);
  });

  it("API-55 a Requester, an inactive user and an unknown id each -> 422 ASSIGNEE_NOT_ELIGIBLE; the owner does not change (AC-73, BR-48)", async () => {
    const t = await ticket({ ownerId: staffX.id, currentStatus: "OPEN" });
    for (const [who, ownerId] of [["Requester", reqB.id], ["inactive", inactiveStaff.id], ["unknown", 999999]] as const) {
      const res = await setOwner(staffY.agent, t.id, { ownerId });
      expect(res.status, who).toBe(422);
      expect(res.body.error.code).toBe("ASSIGNEE_NOT_ELIGIBLE");
      expect((await row(t.id)).ownerId).toBe(staffX.id);
    }
  });

  it("API-56 a Ticket in NEW or OPEN unassigns with 200 and appears under the unassigned filter (AC-74, BR-47)", async () => {
    for (const status of ["NEW", "OPEN"] as const) {
      const t = await ticket({ ownerId: staffX.id, currentStatus: status });
      expect(await unassignedIds(staffX.agent, t.ticketNumber!)).toEqual([]);
      const res = await setOwner(staffX.agent, t.id, { ownerId: null });
      expect(res.status, status).toBe(200);
      expect(res.body.owner).toBeNull();
      expect(await unassignedIds(staffX.agent, t.ticketNumber!)).toEqual([t.id]);
    }
  });

  it("API-57 ownerId null on a Ticket in IN_PROGRESS, WAITING_FOR_REQUESTER and RESOLVED each -> 409 OWNER_REQUIRED; owner and status unchanged (AC-111, BR-97, C-104)", async () => {
    for (const status of WORKED) {
      const t = await ticket({ ownerId: staffX.id, currentStatus: status });
      const res = await setOwner(staffX.agent, t.id, { ownerId: null });
      expect(res.status, status).toBe(409);
      expect(res.body.error.code).toBe("OWNER_REQUIRED");
      expect(await row(t.id)).toMatchObject({ ownerId: staffX.id, currentStatus: status });
    }
  });

  it("API-58 reassigning a Ticket being worked on to another eligible user succeeds (AC-111, C-104)", async () => {
    for (const status of WORKED) {
      const t = await ticket({ ownerId: staffX.id, currentStatus: status });
      const res = await setOwner(staffX.agent, t.id, { ownerId: staffY.id });
      expect(res.status, status).toBe(200);
      expect(await row(t.id)).toMatchObject({ ownerId: staffY.id, currentStatus: status });
    }
  });

  it("API-59 the release path: IN_PROGRESS moved to OPEN then unassigned, both succeed, and it appears under unassigned (AC-117, BR-97)", async () => {
    const t = await ticket({ ownerId: staffX.id, currentStatus: "IN_PROGRESS" });
    expect((await setStatus(staffX.agent, t.id, "OPEN")).status).toBe(200);
    expect((await setOwner(staffX.agent, t.id, { ownerId: null })).status).toBe(200);
    expect(await row(t.id)).toMatchObject({ ownerId: null, currentStatus: "OPEN" });
    expect(await unassignedIds(staffX.agent, t.ticketNumber!)).toEqual([t.id]);
  });

  it("API-60 an absent ownerId is not an unassign: an empty body -> 400 and the owner is unchanged (api-spec.md 8.4)", async () => {
    const t = await ticket({ ownerId: staffX.id, currentStatus: "OPEN" });
    for (const body of [{}, { ownerId: "abc" }, { ownerId: 0 }, { ownerId: 1.5 }]) {
      const res = await setOwner(staffX.agent, t.id, body);
      expect(res.status, JSON.stringify(body)).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_FAILED");
      expect(res.body.error.fields.ownerId).toBe("Choose an active IT Staff or Administrator user.");
    }
    expect((await row(t.id)).ownerId).toBe(staffX.id);
  });
});

// ---------------------------------------------------------------------------
// IT Priority - api-spec.md 8.5
// ---------------------------------------------------------------------------
describe("PATCH /api/staff/tickets/:id/it-priority", () => {
  it("API-61 each of LOW, MEDIUM and HIGH is stored and returned; an out-of-set value is 400 (AC-76, FR-47)", async () => {
    const t = await ticket({ requestedPriority: "LOW" });
    for (const value of ["HIGH", "MEDIUM", "LOW", "LOW"] as const) {
      const res = await setPriority(staffX.agent, t.id, value);
      expect(res.status, value).toBe(200);
      expect(res.body.itPriority).toBe(value);
      expect((await row(t.id)).itPriority).toBe(value);
    }
    for (const bad of [undefined, null, "URGENT", "high"]) {
      const res = await setPriority(staffX.agent, t.id, bad);
      expect(res.status, String(bad)).toBe(400);
      expect(res.body.error.fields.itPriority).toBe("IT Priority must be Low, Medium or High.");
    }
    // Requested Priority is never touched (BR-51).
    expect((await row(t.id)).requestedPriority).toBe("LOW");
  });
});

// ---------------------------------------------------------------------------
// Status - api-spec.md 8.6, specification.md 5.1
// ---------------------------------------------------------------------------
describe("PATCH /api/staff/tickets/:id/status", () => {
  it("API-62 an unassigned Ticket moved to IN_PROGRESS, WAITING_FOR_REQUESTER or RESOLVED -> 409 OWNER_REQUIRED, status unchanged; after a claim each succeeds (AC-109, BR-97, C-93)", async () => {
    for (const target of WORKED) {
      const t = await ticket({ currentStatus: "OPEN" });
      const refused = await setStatus(staffX.agent, t.id, target);
      expect(refused.status, target).toBe(409);
      expect(refused.body.error.code).toBe("OWNER_REQUIRED");
      expect((await row(t.id)).currentStatus).toBe("OPEN");
      expect((await claim(staffY.agent, t.id)).status).toBe(200);
      const moved = await setStatus(staffX.agent, t.id, target);
      expect(moved.status, `${target} after claim`).toBe(200);
      expect(moved.body.currentStatus).toBe(target);
    }
  });

  it("API-64 all 64 cells of section 5.1 over HTTP on an owned Ticket: Y succeeds, - is 409 INVALID_STATUS_TRANSITION with the status unchanged (AC-77, BR-55)", async () => {
    const t = await ticket({ ownerId: staffX.id });
    const wrong: string[] = [];
    for (const from of STATUSES) {
      for (const to of STATUSES) {
        await setTicket(t.id, { currentStatus: from, ownerId: staffX.id });
        const res = await setStatus(staffX.agent, t.id, to);
        const after = (await row(t.id)).currentStatus;
        const c = cell(from, to);
        const ok =
          c === "Y" ? res.status === 200 && after === to
          : c === "=" ? res.status === 400 && after === from
          : res.status === 409 && res.body.error.code === "INVALID_STATUS_TRANSITION" && after === from;
        if (!ok) wrong.push(`${from} -> ${to}: ${res.status} ${res.body?.error?.code ?? ""}, now ${after}`);
      }
    }
    expect(wrong).toEqual([]);
  });

  it("API-66 each of the eight statuses targeting itself -> 400 SAME_STATUS, not 409 and not a silent 200 (AC-78, BR-56, C-77)", async () => {
    const t = await ticket({ ownerId: staffX.id });
    for (const status of STATUSES) {
      await setTicket(t.id, { currentStatus: status });
      const before = await row(t.id);
      const res = await setStatus(staffX.agent, t.id, status);
      expect(res.status, status).toBe(400);
      expect(res.body.error.code).toBe("SAME_STATUS");
      expect((await row(t.id)).updatedAt).toEqual(before.updatedAt);
    }
  });

  it("API-67 from CLOSED and from CANCELLED each of the seven other targets -> 409, status unchanged (AC-81, BR-58, C-98)", async () => {
    const t = await ticket({ ownerId: staffX.id });
    for (const from of TERMINAL) {
      for (const to of STATUSES.filter((s) => s !== from)) {
        await setTicket(t.id, { currentStatus: from });
        const res = await setStatus(staffX.agent, t.id, to);
        expect(res.status, `${from} -> ${to}`).toBe(409);
        expect(res.body.error.code).toBe("INVALID_STATUS_TRANSITION");
        expect((await row(t.id)).currentStatus).toBe(from);
      }
    }
  });

  it("API-68 RESOLVED -> REOPENED succeeds; REOPENED requested from every other status -> 409 (AC-112, BR-98, C-98)", async () => {
    const t = await ticket({ ownerId: staffX.id, currentStatus: "RESOLVED" });
    const ok = await setStatus(staffX.agent, t.id, "REOPENED");
    expect(ok.status).toBe(200);
    expect(ok.body.currentStatus).toBe("REOPENED");
    for (const from of STATUSES.filter((s) => s !== "RESOLVED" && s !== "REOPENED")) {
      await setTicket(t.id, { currentStatus: from });
      const res = await setStatus(staffX.agent, t.id, "REOPENED");
      expect(res.status, from).toBe(409);
      expect(res.body.error.code).toBe("INVALID_STATUS_TRANSITION");
    }
  });

  it("API-69 an unassigned CLOSED Ticket asked for IN_PROGRESS -> INVALID_STATUS_TRANSITION, not OWNER_REQUIRED (api-spec.md 8.6)", async () => {
    const t = await ticket({ currentStatus: "CLOSED" });
    const res = await setStatus(staffX.agent, t.id, "IN_PROGRESS");
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("INVALID_STATUS_TRANSITION");
  });

  it("API-70 moving to Resolved, Closed and Cancelled each clears requesterResolvedAt, and no Public Comment is created (AC-59, BR-61, C-76)", async () => {
    for (const [from, to] of [["IN_PROGRESS", "RESOLVED"], ["RESOLVED", "CLOSED"], ["OPEN", "CANCELLED"]] as const) {
      const t = await ticket({ ownerId: staffX.id, currentStatus: from, requesterResolvedAt: new Date() });
      const res = await setStatus(staffX.agent, t.id, to);
      expect(res.status, `${from} -> ${to}`).toBe(200);
      expect(res.body.requesterResolvedAt).toBeNull();
      expect((await row(t.id)).requesterResolvedAt).toBeNull();
      expect(await prisma.publicComment.count({ where: { ticketId: t.id } })).toBe(0);
    }
  });

  it("API-71 a move to IN_PROGRESS or WAITING_FOR_REQUESTER leaves requesterResolvedAt set (BR-61)", async () => {
    for (const [from, to] of [["OPEN", "IN_PROGRESS"], ["IN_PROGRESS", "WAITING_FOR_REQUESTER"]] as const) {
      const flagged = new Date("2026-09-01T03:00:00.000Z");
      const t = await ticket({ ownerId: staffX.id, currentStatus: from, requesterResolvedAt: flagged });
      const res = await setStatus(staffX.agent, t.id, to);
      expect(res.status, `${from} -> ${to}`).toBe(200);
      expect(res.body.requesterResolvedAt).toBe(flagged.toISOString());
    }
  });

  it("an out-of-set or absent currentStatus -> 400 VALIDATION_FAILED (api-spec.md 8.6 step 1)", async () => {
    const t = await ticket({ ownerId: staffX.id });
    for (const bad of [undefined, "DONE", "open", 3]) {
      const res = await setStatus(staffX.agent, t.id, bad);
      expect(res.status, String(bad)).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_FAILED");
      expect(res.body.error.fields.currentStatus).toBe("That is not a valid status.");
    }
  });
});

// ---------------------------------------------------------------------------
// Shared work - BR-96, C-93
// ---------------------------------------------------------------------------
describe("the queue is shared work", () => {
  it("API-72 a staff user who does not own the Ticket sets IT Priority, comments, writes a note and makes a permitted status change (AC-110, BR-96, C-93)", async () => {
    const t = await ticket({ ownerId: staffX.id, currentStatus: "IN_PROGRESS" });
    expect((await setPriority(staffY.agent, t.id, "HIGH")).status).toBe(200);
    expect((await staffY.agent.post(`/api/tickets/${t.id}/public-comments`).send({ body: "Looking at this too." })).status).toBe(201);
    expect((await staffY.agent.post(`/api/tickets/${t.id}/internal-notes`).send({ body: "Checked the logs." })).status).toBe(201);
    expect((await setStatus(staffY.agent, t.id, "WAITING_FOR_REQUESTER")).status).toBe(200);
    expect(await row(t.id)).toMatchObject({ ownerId: staffX.id, itPriority: "HIGH", currentStatus: "WAITING_FOR_REQUESTER" });
  });
});

// ---------------------------------------------------------------------------
// The Requester's "Problem Appears Resolved" indication - api-spec.md 4.4
// ---------------------------------------------------------------------------
describe("POST /api/tickets/:id/requester-resolved", () => {
  it("API-73 the owning Requester in Open, In Progress, Waiting for Requester and Reopened succeeds, Current Status unchanged (AC-55, BR-59, BR-60)", async () => {
    for (const status of ["OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "REOPENED"] as const) {
      const t = await ticket({ ownerId: staffX.id, currentStatus: status });
      const before = Date.now();
      const res = await reqA.agent.post(`/api/tickets/${t.id}/requester-resolved`).send({ requesterResolvedAt: "2000-01-01T00:00:00.000Z" });
      expect(res.status, status).toBe(200);
      expect(res.body.currentStatus).toBe(status);
      const stored = await row(t.id);
      expect(stored.currentStatus).toBe(status);
      expect(stored.requesterResolvedAt!.getTime()).toBeGreaterThanOrEqual(before - 1000);
      expect(res.body.requesterResolvedAt).toBe(stored.requesterResolvedAt!.toISOString());
      // The Requester DTO, never the staff one (api-spec.md 10.2).
      expect(res.body).not.toHaveProperty("internalNotes");
      expect(res.body.owner).toEqual({ name: staffX.name });
      // No automatic Public Comment (BR-61).
      expect(await prisma.publicComment.count({ where: { ticketId: t.id } })).toBe(0);
    }
  });

  it("API-74 New, Resolved, Closed and Cancelled each -> 409 RESOLUTION_NOT_PERMITTED_IN_STATUS (AC-56, BR-60)", async () => {
    for (const status of ["NEW", "RESOLVED", "CLOSED", "CANCELLED"] as const) {
      const t = await ticket({ ownerId: status === "NEW" ? undefined : staffX.id, currentStatus: status });
      const res = await reqA.agent.post(`/api/tickets/${t.id}/requester-resolved`);
      expect(res.status, status).toBe(409);
      expect(res.body.error.code).toBe("RESOLUTION_NOT_PERMITTED_IN_STATUS");
      expect((await row(t.id)).requesterResolvedAt).toBeNull();
    }
  });

  it("API-75 a Requester who does not own the Ticket -> 404, identical to a missing Ticket (AC-57, BR-42)", async () => {
    const t = await ticket({ currentStatus: "OPEN" });
    const res = await reqB.agent.post(`/api/tickets/${t.id}/requester-resolved`);
    const missing = await reqB.agent.post("/api/tickets/999999/requester-resolved");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("TICKET_NOT_FOUND");
    expect(res.text).toBe(missing.text);
    expect((await row(t.id)).requesterResolvedAt).toBeNull();
    // Even on a terminal Ticket the non-owner learns nothing (C-109).
    await setTicket(t.id, { currentStatus: "CLOSED" });
    expect((await reqB.agent.post(`/api/tickets/${t.id}/requester-resolved`)).status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// Assignable users - api-spec.md 8.7
// ---------------------------------------------------------------------------
describe("GET /api/staff/assignable-users", () => {
  it("API-116 returns active IT Staff and Administrator users only, each exactly { id, name, role }, never an email (BR-104, C-105)", async () => {
    const res = await staffX.agent.get("/api/staff/assignable-users");
    expect(res.status).toBe(200);
    for (const u of res.body) {
      expect(Object.keys(u).sort()).toEqual(["id", "name", "role"]);
      expect(["IT_STAFF", "ADMINISTRATOR"]).toContain(u.role);
    }
    const ids = res.body.map((u: { id: number }) => u.id);
    expect(ids).toEqual(expect.arrayContaining([staffX.id, staffY.id, admin.id]));
    expect(ids).not.toContain(reqA.id);
    expect(ids).not.toContain(inactiveStaff.id);
    expect(res.text).not.toContain("@");
    // Ascending by name, in the database's own collation.
    const expected = await prisma.user.findMany({
      where: { isActive: true, role: { in: ["IT_STAFF", "ADMINISTRATOR"] } },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      select: { id: true },
    });
    expect(ids).toEqual(expected.map((u) => u.id));
  });
});

// ---------------------------------------------------------------------------
// Terminal Tickets are read-only for every role - BR-108, C-109
// ---------------------------------------------------------------------------
describe("Closed and Cancelled Tickets refuse writes", () => {
  it("API-119 claim, an owner change and an IT Priority change each -> 409 TICKET_CLOSED with nothing changed; a status change still answers INVALID_STATUS_TRANSITION (AC-118, BR-108, C-109)", async () => {
    for (const status of TERMINAL) {
      const unowned = await ticket({ currentStatus: status });
      const claimed = await claim(staffX.agent, unowned.id);
      expect(claimed.status, `${status} claim`).toBe(409);
      expect(claimed.body.error.code).toBe("TICKET_CLOSED");

      const owned = await ticket({ ownerId: staffX.id, currentStatus: status, itPriority: "LOW" });
      const before = await row(owned.id);
      for (const [name, res] of [
        ["reassign", await setOwner(staffX.agent, owned.id, { ownerId: staffY.id })],
        ["unassign", await setOwner(staffX.agent, owned.id, { ownerId: null })],
        ["it-priority", await setPriority(staffX.agent, owned.id, "HIGH")],
      ] as const) {
        expect(res.status, `${status} ${name}`).toBe(409);
        expect(res.body.error.code).toBe("TICKET_CLOSED");
      }
      const statusChange = await setStatus(staffX.agent, owned.id, "OPEN");
      expect(statusChange.status).toBe(409);
      expect(statusChange.body.error.code).toBe("INVALID_STATUS_TRANSITION");
      expect(await row(owned.id)).toEqual(before);
      expect((await row(unowned.id)).ownerId).toBeNull();
    }
  });

  it("API-120 an upload and a soft removal each -> 409 TICKET_CLOSED, no row created, no file written, no row modified; metadata and download still 200 (AC-118, BR-108, C-109)", async () => {
    for (const status of TERMINAL) {
      const t = await ticket({ currentStatus: "OPEN" });
      const up = await reqA.agent.post(`/api/tickets/${t.id}/attachments`).attach("file", PNG, "before-closure.png");
      expect(up.status).toBe(201);
      await setTicket(t.id, { currentStatus: status });

      const filesBefore = fs.readdirSync(UPLOAD_DIR).length;
      const rowsBefore = await prisma.attachment.findMany({ where: { ticketId: t.id }, orderBy: { id: "asc" } });
      const upload = await reqA.agent.post(`/api/tickets/${t.id}/attachments`).attach("file", PNG, "after-closure.png");
      expect(upload.status, `${status} upload`).toBe(409);
      expect(upload.body.error.code).toBe("TICKET_CLOSED");
      const removal = await reqA.agent.delete(`/api/attachments/${up.body.id}`).send({ removalReason: "Too late." });
      expect(removal.status, `${status} removal`).toBe(409);
      expect(removal.body.error.code).toBe("TICKET_CLOSED");
      expect(fs.readdirSync(UPLOAD_DIR).length).toBe(filesBefore);
      expect(await prisma.attachment.findMany({ where: { ticketId: t.id }, orderBy: { id: "asc" } })).toEqual(rowsBefore);

      for (const caller of [reqA, staffX]) {
        expect((await caller.agent.get(`/api/tickets/${t.id}/attachments`)).status).toBe(200);
        expect((await caller.agent.get(`/api/attachments/${up.body.id}/download`)).status).toBe(200);
      }
      // A non-owning Requester still gets 404, not 409 - the lock reveals nothing.
      expect((await reqB.agent.delete(`/api/attachments/${up.body.id}`).send({ removalReason: "x" })).status).toBe(404);
      expect((await reqB.agent.post(`/api/tickets/${t.id}/attachments`).attach("file", PNG, "x.png")).status).toBe(404);
    }
  });

  it("API-121 refusal order ownership -> TICKET_CLOSED -> body 400 -> the operation's own 409/422: a malformed body on a Closed or Cancelled Ticket -> 409 TICKET_CLOSED, nothing changed (C-109, api-spec.md 1.4)", async () => {
    for (const status of TERMINAL) {
      const t = await ticket({ currentStatus: "OPEN" });
      const up = await reqA.agent.post(`/api/tickets/${t.id}/attachments`).attach("file", PNG, "order.png");
      expect(up.status).toBe(201);
      await setTicket(t.id, { ownerId: staffX.id, currentStatus: status, itPriority: "LOW" });
      const before = await row(t.id);
      const attachmentBefore = await prisma.attachment.findUniqueOrThrow({ where: { id: up.body.id } });

      // TICKET_CLOSED precedes body validation (400) ...
      for (const [name, res] of [
        ["owner, empty body", await setOwner(staffX.agent, t.id, {})],
        ["owner, ownerId abc", await setOwner(staffX.agent, t.id, { ownerId: "abc" })],
        ["it-priority, out of set", await setPriority(staffX.agent, t.id, "URGENT")],
        ["it-priority, absent", await staffX.agent.patch(`/api/staff/tickets/${t.id}/it-priority`).send({})],
        ["removal, no reason key", await reqA.agent.delete(`/api/attachments/${up.body.id}`).send({})],
        ["removal, reason not a string", await reqA.agent.delete(`/api/attachments/${up.body.id}`).send({ removalReason: 42 })],
        ["upload, no file part", await reqA.agent.post(`/api/tickets/${t.id}/attachments`).field("note", "no file")],
        // ... and the operation's own refusals (422).
        ["owner, a Requester as assignee", await setOwner(staffX.agent, t.id, { ownerId: reqA.id })],
        ["removal, whitespace reason", await reqA.agent.delete(`/api/attachments/${up.body.id}`).send({ removalReason: "   " })],
      ] as const) {
        expect(res.status, `${status} ${name}`).toBe(409);
        expect(res.body.error.code, `${status} ${name}`).toBe("TICKET_CLOSED");
      }

      // Ownership precedes TICKET_CLOSED: a non-owning Requester gets 404 for a malformed body too.
      const outsider = await reqB.agent.delete(`/api/attachments/${up.body.id}`).send({});
      expect(outsider.status).toBe(404);
      expect(outsider.body.error.code).toBe("ATTACHMENT_NOT_FOUND");

      // The status route has no TICKET_CLOSED step (C-109): a malformed target is 400,
      // and a well-formed one is the operation's own 409 INVALID_STATUS_TRANSITION.
      const badStatus = await setStatus(staffX.agent, t.id, "DONE");
      expect(badStatus.status).toBe(400);
      expect(badStatus.body.error.code).toBe("VALIDATION_FAILED");

      expect(await row(t.id)).toEqual(before);
      expect(await prisma.attachment.findUniqueOrThrow({ where: { id: up.body.id } })).toEqual(attachmentBefore);
    }

    // On an open Ticket the same malformed bodies are still 400.
    const open = await ticket({ ownerId: staffX.id, currentStatus: "OPEN" });
    expect((await setOwner(staffX.agent, open.id, {})).status).toBe(400);
    expect((await setPriority(staffX.agent, open.id, "URGENT")).status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// A malformed path :id - C-113
// ---------------------------------------------------------------------------
describe("a malformed path id", () => {
  it("API-123 every #42 route and every route addressed by a Ticket or Attachment id answers abc, 0, -1 and 1.5 with 400 INVALID_QUERY_PARAM naming id (C-113)", async () => {
    const staffCalls: [string, (id: string) => Promise<{ status: number; body: { error?: { code: string; fields?: object } } }>][] = [
      ["GET staff detail", (id) => staffX.agent.get(`/api/staff/tickets/${id}`)],
      ["POST claim", (id) => staffX.agent.post(`/api/staff/tickets/${id}/claim`)],
      ["PATCH owner", (id) => staffX.agent.patch(`/api/staff/tickets/${id}/owner`).send({ ownerId: staffY.id })],
      ["PATCH it-priority", (id) => staffX.agent.patch(`/api/staff/tickets/${id}/it-priority`).send({ itPriority: "HIGH" })],
      ["PATCH status", (id) => staffX.agent.patch(`/api/staff/tickets/${id}/status`).send({ currentStatus: "OPEN" })],
      ["GET public-comments (staff)", (id) => staffX.agent.get(`/api/tickets/${id}/public-comments`)],
      ["POST public-comments (staff)", (id) => staffX.agent.post(`/api/tickets/${id}/public-comments`).send({ body: "x" })],
      ["GET internal-notes", (id) => staffX.agent.get(`/api/tickets/${id}/internal-notes`)],
      ["POST internal-notes", (id) => staffX.agent.post(`/api/tickets/${id}/internal-notes`).send({ body: "x" })],
      ["GET attachments (staff)", (id) => staffX.agent.get(`/api/tickets/${id}/attachments`)],
      ["GET download (staff)", (id) => staffX.agent.get(`/api/attachments/${id}/download`)],
      ["GET ticket (Requester)", (id) => reqA.agent.get(`/api/tickets/${id}`)],
      ["POST requester-resolved", (id) => reqA.agent.post(`/api/tickets/${id}/requester-resolved`)],
      ["POST public-comments (Requester)", (id) => reqA.agent.post(`/api/tickets/${id}/public-comments`).send({ body: "x" })],
      ["GET attachments (Requester)", (id) => reqA.agent.get(`/api/tickets/${id}/attachments`)],
      ["POST attachments", (id) => reqA.agent.post(`/api/tickets/${id}/attachments`).attach("file", PNG, "x.png")],
      ["DELETE attachment", (id) => reqA.agent.delete(`/api/attachments/${id}`).send({ removalReason: "x" })],
    ];
    for (const [name, call] of staffCalls) {
      for (const bad of ["abc", "0", "-1", "1.5"]) {
        const res = await call(bad);
        expect(res.status, `${name} ${bad}`).toBe(400);
        expect(res.body.error?.code, `${name} ${bad}`).toBe("INVALID_QUERY_PARAM");
        expect(Object.keys(res.body.error?.fields ?? {}), `${name} ${bad}`).toEqual(["id"]);
      }
    }
  });
});
