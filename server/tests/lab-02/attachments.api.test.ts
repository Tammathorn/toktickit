import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import fs from "node:fs";
import path from "node:path";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { seedGraded } from "../../src/seed/graded-seed.js";
import { createTicketWithNumber } from "../../src/lib/ticket-repository.js";
import { UPLOAD_DIR, MAX_UPLOAD_BYTES } from "../../src/lib/uploads.js";

// Planned rows from tests.md section 2.2 that live in this file.
// Issue #13 lands the upload path: API-30, API-31, API-32 and API-43, plus the
// ownership and missing-file refusals api-spec.md 4.1 lists. Download, preview
// and soft removal (API-33..API-42) follow with Issue #15.

const prisma = getPrisma();
const TEST_TAG = "[api-test]";

// A 1x1 PNG. Type checks run on the declared type and extension (BR-42); the
// bytes only need to exist.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

let ownerId: number;
let otherId: number;
let inactiveId: number;
let ticketId: number;

function upload(id: number, requester: number | string | undefined) {
  const qs = requester === undefined ? "" : `?requesterId=${requester}`;
  return request(app).post(`/api/tickets/${id}/attachments${qs}`);
}

function filesOnDisk(): Set<string> {
  return new Set(fs.existsSync(UPLOAD_DIR) ? fs.readdirSync(UPLOAD_DIR) : []);
}

async function newTicket(requesterId: number) {
  const category = await prisma.category.findFirstOrThrow({ where: { isActive: true } });
  const system = await prisma.relatedSystem.findFirstOrThrow({ where: { isActive: true } });
  const ticket = await createTicketWithNumber(prisma, {
    requesterId,
    categoryId: category.id,
    relatedSystemId: system.id,
    summary: `${TEST_TAG} attachment host`,
    description: "Created by attachments.api.test.ts to receive uploads.",
    requestedPriority: "MEDIUM",
  });
  return ticket.id;
}

beforeAll(async () => {
  await seedGraded(prisma);
  const actives = await prisma.requesterUser.findMany({ where: { isActive: true }, orderBy: { id: "asc" }, take: 2 });
  ownerId = actives[0].id;
  otherId = actives[1].id;
  inactiveId = (await prisma.requesterUser.findFirstOrThrow({ where: { isActive: false } })).id;
  ticketId = await newTicket(ownerId);
});

afterAll(async () => {
  const tickets = await prisma.ticket.findMany({ where: { summary: { startsWith: TEST_TAG } }, select: { id: true } });
  const ids = tickets.map((t) => t.id);
  const rows = await prisma.attachment.findMany({ where: { ticketId: { in: ids } } });
  for (const row of rows) {
    const file = path.join(UPLOAD_DIR, row.storedFilename);
    if (fs.existsSync(file)) fs.unlinkSync(file);
  }
  await prisma.attachment.deleteMany({ where: { ticketId: { in: ids } } });
  await prisma.ticket.deleteMany({ where: { id: { in: ids } } });
});

describe("POST /api/tickets/:id/attachments", () => {
  it("stores a permitted file: 201, row written, file on disk under a generated name (AC-32, BR-53)", async () => {
    const before = filesOnDisk();
    const res = await upload(ticketId, ownerId).attach("file", PNG, "screenshot.png");

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      ticketId,
      originalFilename: "screenshot.png",
      mimeType: "image/png",
      sizeBytes: PNG.length,
      isRemoved: false,
      removedAt: null,
      removalReason: null,
    });
    expect(res.body.uploadedAt).toMatch(/Z$/);
    expect(res.body.storedFilename).toBeUndefined();

    const row = await prisma.attachment.findUniqueOrThrow({ where: { id: res.body.id } });
    expect(row.storedFilename).not.toContain("screenshot");
    const added = [...filesOnDisk()].filter((f) => !before.has(f));
    expect(added).toEqual([row.storedFilename]);
  });

  it("API-30 refuses an unsupported type with 415; no row and no file written (AC-24, BR-42)", async () => {
    const before = filesOnDisk();
    const rows = await prisma.attachment.count();
    const res = await upload(ticketId, ownerId).attach("file", Buffer.from("plain text"), "notes.txt");

    expect(res.status).toBe(415);
    expect(res.body.error.code).toBe("UNSUPPORTED_FILE_TYPE");
    expect(await prisma.attachment.count()).toBe(rows);
    expect(filesOnDisk()).toEqual(before);
  });

  it("API-31 refuses 5 MB + 1 byte with 413 and accepts exactly 5 MB (AC-25, BR-43)", async () => {
    const before = filesOnDisk();
    const tooBig = Buffer.alloc(MAX_UPLOAD_BYTES + 1, 1);
    const big = await upload(ticketId, ownerId).attach("file", tooBig, "big.pdf");
    expect(big.status).toBe(413);
    expect(big.body.error.code).toBe("FILE_TOO_LARGE");
    expect(filesOnDisk()).toEqual(before);

    const exact = Buffer.alloc(MAX_UPLOAD_BYTES, 1);
    const ok = await upload(ticketId, ownerId).attach("file", exact, "exact.pdf");
    expect(ok.status).toBe(201);
    expect(ok.body.sizeBytes).toBe(MAX_UPLOAD_BYTES);
  });

  it("API-32 accepts the fifth active attachment and refuses the sixth with 422 (AC-26, BR-44)", async () => {
    const fresh = await newTicket(ownerId);
    for (let i = 1; i <= 5; i++) {
      const res = await upload(fresh, ownerId).attach("file", PNG, `shot-${i}.png`);
      expect(res.status, `upload ${i}`).toBe(201);
    }
    const before = filesOnDisk();
    const sixth = await upload(fresh, ownerId).attach("file", PNG, "shot-6.png");
    expect(sixth.status).toBe(422);
    expect(sixth.body.error.code).toBe("ATTACHMENT_LIMIT_REACHED");
    // the written file is deleted before the 422 is returned (BR-41)
    expect(filesOnDisk()).toEqual(before);
    expect(await prisma.attachment.count({ where: { ticketId: fresh, isRemoved: false } })).toBe(5);
  });

  it("API-43 leaves the Ticket in place after a rejected upload (AC-28, BR-40)", async () => {
    const fresh = await newTicket(ownerId);
    const res = await upload(fresh, ownerId).attach("file", Buffer.from("nope"), "nope.exe");
    expect(res.status).toBe(415);
    const row = await prisma.ticket.findUnique({ where: { id: fresh } });
    expect(row).not.toBeNull();
    expect(row?.ticketNumber).toMatch(/^TKT-/);
  });

  it("refuses another Requester with 403, an unknown Ticket with 404, and bad callers per C-45", async () => {
    const other = await upload(ticketId, otherId).attach("file", PNG, "a.png");
    expect(other.status).toBe(403);
    expect(other.body.error.code).toBe("ATTACHMENT_FORBIDDEN");

    const missing = await upload(999999, ownerId).attach("file", PNG, "a.png");
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe("TICKET_NOT_FOUND");

    const inactive = await upload(ticketId, inactiveId).attach("file", PNG, "a.png");
    expect(inactive.status).toBe(403);
    expect(inactive.body.error.code).toBe("REQUESTER_INACTIVE");

    const unknownCaller = await upload(999999, 999999).attach("file", PNG, "a.png");
    expect(unknownCaller.status).toBe(404);
    expect(unknownCaller.body.error.code).toBe("REQUESTER_NOT_FOUND");

    const noCaller = await upload(ticketId, undefined).attach("file", PNG, "a.png");
    expect(noCaller.status).toBe(400);
    expect(noCaller.body.error.code).toBe("REQUESTER_REQUIRED");
  });

  it("refuses a request with no file part with 400", async () => {
    const res = await upload(ticketId, ownerId).field("note", "no file here");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });
});
