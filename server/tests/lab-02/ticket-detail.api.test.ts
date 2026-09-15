import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import fs from "node:fs";
import path from "node:path";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { seedGraded } from "../../src/seed/graded-seed.js";
import { createTicketWithNumber } from "../../src/lib/ticket-repository.js";
import { UPLOAD_DIR } from "../../src/lib/uploads.js";

// Planned rows from tests.md section 2.2: API-13, API-26..API-29 (Issue #15).
// Two Requesters are created here and removed in afterAll, so nothing depends
// on the demo seed and parallel test files cannot collide.

const prisma = getPrisma();
const TAG = "[detail-test]";
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

let owner: { id: number };
let other: { id: number };
let ticketId: number;

beforeAll(async () => {
  await seedGraded(prisma);
  owner = await prisma.requesterUser.create({ data: { name: `${TAG} Owner`, email: `detail-owner-${Date.now()}@example.test` } });
  other = await prisma.requesterUser.create({ data: { name: `${TAG} Other`, email: `detail-other-${Date.now()}@example.test` } });
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
  await prisma.requesterUser.deleteMany({ where: { id: { in: [owner.id, other.id] } } });
});

describe("GET /api/tickets/:id", () => {
  it("API-13 refuses an unknown Requester before the Ticket is looked up (AC-65, C-45)", async () => {
    const res = await request(app).get("/api/tickets/999999?requesterId=999999");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("REQUESTER_NOT_FOUND");
  });

  it("API-26 answers a missing Ticket with 404 TICKET_NOT_FOUND (AC-40)", async () => {
    const res = await request(app).get(`/api/tickets/999999?requesterId=${owner.id}`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("TICKET_NOT_FOUND");
  });

  it("API-27 refuses another Requester's Ticket with 403 and no Ticket field (AC-03, BR-21)", async () => {
    const res = await request(app).get(`/api/tickets/${ticketId}?requesterId=${other.id}`);
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: { code: "TICKET_FORBIDDEN", message: expect.any(String) } });
    expect(JSON.stringify(res.body)).not.toMatch(/TKT-|summary|description/);
  });

  it("API-28 carries no comment, note, actions-taken or status-transition key, not even as null (AC-53)", async () => {
    const res = await request(app).get(`/api/tickets/${ticketId}?requesterId=${owner.id}`);
    expect(res.status).toBe(200);
    const keys = Object.keys(res.body);
    expect(keys.sort()).toEqual(
      ["id", "ticketNumber", "requesterId", "requester", "category", "relatedSystem", "summary", "description",
        "requestedPriority", "itPriority", "currentStatus", "createdAt", "updatedAt", "attachments"].sort(),
    );
    for (const forbidden of ["comments", "publicComments", "internalNotes", "notes", "actionsTaken", "transitions", "statusHistory", "storedFilename"]) {
      expect(JSON.stringify(res.body)).not.toContain(`"${forbidden}"`);
    }
  });
});

describe("GET /api/tickets/:id/attachments", () => {
  it("API-29 returns active and removed attachments, distinguished by isRemoved, reason on the removed one (AC-38)", async () => {
    const active = await request(app).post(`/api/tickets/${ticketId}/attachments?requesterId=${owner.id}`).attach("file", PNG, "keep.png");
    const removed = await request(app).post(`/api/tickets/${ticketId}/attachments?requesterId=${owner.id}`).attach("file", PNG, "drop.png");
    expect(active.status).toBe(201);
    expect(removed.status).toBe(201);
    const del = await request(app)
      .delete(`/api/attachments/${removed.body.id}?requesterId=${owner.id}`)
      .send({ removalReason: "Uploaded the wrong screenshot." });
    expect(del.status).toBe(200);

    const res = await request(app).get(`/api/tickets/${ticketId}/attachments?requesterId=${owner.id}`);
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
    const detail = await request(app).get(`/api/tickets/${ticketId}?requesterId=${owner.id}`);
    expect(detail.body.attachments.map((x: { id: number }) => x.id)).toEqual([active.body.id, removed.body.id]);
  });

  it("refuses another Requester with 403 TICKET_FORBIDDEN and an unknown Ticket with 404", async () => {
    const forbidden = await request(app).get(`/api/tickets/${ticketId}/attachments?requesterId=${other.id}`);
    expect(forbidden.status).toBe(403);
    expect(forbidden.body.error.code).toBe("TICKET_FORBIDDEN");
    const missing = await request(app).get(`/api/tickets/999999/attachments?requesterId=${owner.id}`);
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe("TICKET_NOT_FOUND");
  });
});
