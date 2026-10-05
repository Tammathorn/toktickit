import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { getPrisma } from "../../src/prisma.js";
import { seedGraded } from "../../src/seed/graded-seed.js";
import { createTicketWithNumber } from "../../src/lib/ticket-repository.js";
import { UPLOAD_DIR } from "../../src/lib/uploads.js";
import { removeUsers, signedInUser, type Agent } from "../support/agents.js";

// Planned rows from tests.md section 2.2: API-26..API-29 (Issue #15).
//
// Lab 3 (#40), per docs/lab-03/tests.md sections 4.2 and 4.3: both Requesters
// are signed-in agents and nothing carries ?requesterId= (C-64); the two 403s
// become 404 (C-65); API-28's key set loses requesterId, which 10.2 removes
// from the DTO. API-28's publicComments inversion arrives with the comments
// themselves (#42). API-13 (REQUESTER_NOT_FOUND, a deleted code) retires
// against SEC-01, the route-inventory 401 an unresolvable caller now gets.
// Two Requesters are created here and removed in afterAll, so nothing depends
// on the demo seed and parallel test files cannot collide.

const prisma = getPrisma();
const TAG = "[detail-test]";
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

let owner: { id: number; agent: Agent };
let other: { id: number; agent: Agent };
let ticketId: number;

beforeAll(async () => {
  await seedGraded(prisma);
  owner = await signedInUser(prisma, "detail-owner", { name: `${TAG} Owner` });
  other = await signedInUser(prisma, "detail-other", { name: `${TAG} Other` });
  const category = await prisma.category.findFirstOrThrow({ where: { isActive: true } });
  const system = await prisma.relatedSystem.findFirstOrThrow({ where: { isActive: true } });
  const ticket = await createTicketWithNumber(prisma, {
    requesterId: owner.id,
    categoryId: category.id,
    relatedSystemId: system.id,
    summary: `${TAG} detail host`,
    description: "Created by ticket-detail.api.test.ts to carry one active and one removed attachment.",
    requestedPriority: "MEDIUM",
  });
  ticketId = ticket.id;
});

afterAll(async () => {
  const rows = await prisma.attachment.findMany({ where: { ticket: { requesterId: { in: [owner.id, other.id] } } } });
  for (const row of rows) {
    const file = path.join(UPLOAD_DIR, row.storedFilename);
    if (fs.existsSync(file)) fs.unlinkSync(file);
  }
  await prisma.attachment.deleteMany({ where: { id: { in: rows.map((r) => r.id) } } });
  await prisma.ticket.deleteMany({ where: { requesterId: { in: [owner.id, other.id] } } });
  await removeUsers(prisma, [owner.id, other.id]);
});

describe("GET /api/tickets/:id", () => {
  it("API-26 answers a missing Ticket with 404 TICKET_NOT_FOUND (AC-40)", async () => {
    const res = await owner.agent.get("/api/tickets/999999");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("TICKET_NOT_FOUND");
  });

  it("API-27 refuses another Requester's Ticket with 404 and no Ticket field (AC-38, C-65)", async () => {
    const res = await other.agent.get(`/api/tickets/${ticketId}`);
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { code: "TICKET_NOT_FOUND", message: expect.any(String) } });
    expect(JSON.stringify(res.body)).not.toMatch(/TKT-|summary|description/);
  });

  it("API-28 carries no comment, note, actions-taken or status-transition key, not even as null (AC-53)", async () => {
    const res = await owner.agent.get(`/api/tickets/${ticketId}`);
    expect(res.status).toBe(200);
    const keys = Object.keys(res.body);
    expect(keys.sort()).toEqual(
      ["id", "ticketNumber", "requester", "category", "relatedSystem", "summary", "description",
        "requestedPriority", "itPriority", "currentStatus", "createdAt", "updatedAt", "attachments"].sort(),
    );
    for (const forbidden of ["comments", "publicComments", "internalNotes", "notes", "actionsTaken", "transitions", "statusHistory", "storedFilename"]) {
      expect(JSON.stringify(res.body)).not.toContain(`"${forbidden}"`);
    }
  });
});

describe("GET /api/tickets/:id/attachments", () => {
  it("API-29 returns active and removed attachments, distinguished by isRemoved, reason on the removed one (AC-38)", async () => {
    const active = await owner.agent.post(`/api/tickets/${ticketId}/attachments`).attach("file", PNG, "keep.png");
    const removed = await owner.agent.post(`/api/tickets/${ticketId}/attachments`).attach("file", PNG, "drop.png");
    expect(active.status).toBe(201);
    expect(removed.status).toBe(201);
    const del = await owner.agent
      .delete(`/api/attachments/${removed.body.id}`)
      .send({ removalReason: "Uploaded the wrong screenshot." });
    expect(del.status).toBe(200);

    const res = await owner.agent.get(`/api/tickets/${ticketId}/attachments`);
    expect(res.status).toBe(200);
    expect(res.body.map((a: { id: number }) => a.id)).toEqual([active.body.id, removed.body.id]); // ascending id
    const [a, r] = res.body;
    expect(a).toMatchObject({ originalFilename: "keep.png", isRemoved: false, removedAt: null, removalReason: null });
    expect(r).toMatchObject({ originalFilename: "drop.png", isRemoved: true, removalReason: "Uploaded the wrong screenshot." });
    expect(r.removedAt).toMatch(/Z$/);
    for (const row of res.body) {
      expect(Object.keys(row).sort()).toEqual(
        ["id", "originalFilename", "mimeType", "sizeBytes", "uploadedAt", "isRemoved", "removedAt", "removalReason"].sort(),
      );
    }
    // the detail body carries the same two, in the same order
    const detail = await owner.agent.get(`/api/tickets/${ticketId}`);
    expect(detail.body.attachments.map((x: { id: number }) => x.id)).toEqual([active.body.id, removed.body.id]);
  });

  it("refuses another Requester with 404 TICKET_NOT_FOUND, identical to an unknown Ticket (C-65)", async () => {
    const forbidden = await other.agent.get(`/api/tickets/${ticketId}/attachments`);
    expect(forbidden.status).toBe(404);
    expect(forbidden.body.error.code).toBe("TICKET_NOT_FOUND");
    const missing = await owner.agent.get("/api/tickets/999999/attachments");
    expect(forbidden.text).toBe(missing.text);
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe("TICKET_NOT_FOUND");
  });
});
