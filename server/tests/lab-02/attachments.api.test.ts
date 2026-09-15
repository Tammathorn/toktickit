import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";
import fs from "node:fs";
import path from "node:path";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { seedGraded } from "../../src/seed/graded-seed.js";
import { createTicketWithNumber } from "../../src/lib/ticket-repository.js";
import { UPLOAD_DIR, MAX_UPLOAD_BYTES } from "../../src/lib/uploads.js";

// Planned rows from tests.md section 2.2 that live in this file.
// Issue #13 landed the upload path: API-30, API-31, API-32 and API-43, plus the
// ownership and missing-file refusals api-spec.md 4.1 lists. Issue #15 adds
// download, preview and soft removal: API-33..API-42, at the end of the file.

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

// ---------------------------------------------------------------------------
// Issue #15: download / preview (api-spec 4.3) and soft removal (4.4).
// API-33..API-42. Ownership is checked before removal state (C-13, C-20), so a
// non-owner never learns a file was removed.
// ---------------------------------------------------------------------------

function binaryParser(res: NodeJS.EventEmitter, callback: (err: Error | null, body: Buffer) => void) {
  const chunks: Buffer[] = [];
  res.on("data", (c: Buffer) => chunks.push(c));
  res.on("end", () => callback(null, Buffer.concat(chunks)));
}

function download(id: number, requester: number, disposition?: string) {
  const extra = disposition === undefined ? "" : `&disposition=${disposition}`;
  return request(app).get(`/api/attachments/${id}/download?requesterId=${requester}${extra}`).buffer(true).parse(binaryParser);
}

function errorCode(body: Buffer): string {
  return JSON.parse(body.toString()).error.code;
}

function remove(id: number, requester: number | undefined, body?: unknown) {
  const qs = requester === undefined ? "" : `?requesterId=${requester}`;
  const req = request(app).delete(`/api/attachments/${id}${qs}`);
  return body === undefined ? req : req.send(body as object);
}

describe("GET /api/attachments/:id/download and DELETE /api/attachments/:id", () => {
  let active: number;
  let removedId: number;
  let removedStoredFilename: string;

  beforeAll(async () => {
    const fresh = await newTicket(ownerId);
    const a = await upload(fresh, ownerId).attach("file", PNG, "photo.png");
    const r = await upload(fresh, ownerId).attach("file", PNG, "old.png");
    expect(a.status).toBe(201);
    expect(r.status).toBe(201);
    active = a.body.id;
    removedId = r.body.id;
    removedStoredFilename = (await prisma.attachment.findUniqueOrThrow({ where: { id: removedId } })).storedFilename;
  });

  it("API-35 downloads an active attachment: 200, Content-Disposition attachment, identical bytes (AC-30)", async () => {
    const res = await download(active, ownerId);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("image/png");
    expect(res.headers["content-length"]).toBe(String(PNG.length));
    expect(res.headers["content-disposition"]).toBe('attachment; filename="photo.png"');
    expect(Buffer.compare(res.body as Buffer, PNG)).toBe(0);
  });

  it("API-36 previews an active attachment inline with identical bytes (AC-31, BR-49)", async () => {
    const res = await download(active, ownerId, "inline");
    expect(res.status).toBe(200);
    expect(res.headers["content-disposition"]).toBe('inline; filename="photo.png"');
    expect(Buffer.compare(res.body as Buffer, PNG)).toBe(0);

    const bad = await download(active, ownerId, "sideways");
    expect(bad.status).toBe(400);
    expect(errorCode(bad.body as Buffer)).toBe("INVALID_QUERY_PARAM");
  });

  it("API-37 refuses a whitespace-only reason with 422 and a missing key with 400 (AC-35, BR-47)", async () => {
    const blank = await remove(removedId, ownerId, { removalReason: "   " });
    expect(blank.status).toBe(422);
    expect(blank.body.error.code).toBe("REMOVAL_REASON_REQUIRED");
    expect(blank.body.error.message).toBe("A removal reason is required.");

    const missing = await remove(removedId, ownerId, {});
    expect(missing.status).toBe(400);
    expect(missing.body.error.code).toBe("VALIDATION_FAILED");
    expect(missing.body.error.fields.removalReason).toBe("A removal reason is required.");

    const row = await prisma.attachment.findUniqueOrThrow({ where: { id: removedId } });
    expect(row.isRemoved).toBe(false);
  });

  it("API-38 soft removal keeps the row, sets isRemoved, removedAt and the trimmed reason, keeps the file (AC-34, BR-46)", async () => {
    const res = await remove(removedId, ownerId, { removalReason: "  Uploaded the wrong screenshot.  " });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: removedId,
      originalFilename: "old.png",
      isRemoved: true,
      removalReason: "Uploaded the wrong screenshot.",
    });
    expect(res.body.removedAt).toMatch(/Z$/);
    expect(res.body.storedFilename).toBeUndefined();

    const row = await prisma.attachment.findUniqueOrThrow({ where: { id: removedId } });
    expect(row.isRemoved).toBe(true);
    expect(row.removedAt).not.toBeNull();
    expect(row.removalReason).toBe("Uploaded the wrong screenshot.");
    expect(fs.existsSync(path.join(UPLOAD_DIR, removedStoredFilename))).toBe(true);

    const again = await remove(removedId, ownerId, { removalReason: "twice" });
    expect(again.status).toBe(410);
    expect(again.body.error.code).toBe("ATTACHMENT_REMOVED");
  });

  it("API-39 answers the owner's download or preview of a removed attachment with 410 (AC-36, BR-51)", async () => {
    for (const disposition of [undefined, "attachment", "inline"]) {
      const res = await download(removedId, ownerId, disposition);
      expect(res.status, String(disposition)).toBe(410);
      expect(errorCode(res.body as Buffer)).toBe("ATTACHMENT_REMOVED");
    }
  });

  it("API-40 answers a non-owner's download of a removed attachment with 403, never 410 (AC-37, C-20)", async () => {
    for (const disposition of [undefined, "inline", "sideways"]) {
      const res = await download(removedId, otherId, disposition);
      expect(res.status, String(disposition)).toBe(403);
      expect(errorCode(res.body as Buffer)).toBe("ATTACHMENT_FORBIDDEN");
    }
  });

  it("API-41 refuses another Requester's attachment on download and on removal with 403 (AC-39, BR-52)", async () => {
    const dl = await download(active, otherId);
    expect(dl.status).toBe(403);
    expect(errorCode(dl.body as Buffer)).toBe("ATTACHMENT_FORBIDDEN");

    const rm = await remove(active, otherId, { removalReason: "not mine" });
    expect(rm.status).toBe(403);
    expect(rm.body.error.code).toBe("ATTACHMENT_FORBIDDEN");
    expect((await prisma.attachment.findUniqueOrThrow({ where: { id: active } })).isRemoved).toBe(false);
  });

  it("API-42 answers an unknown attachment id with 404 on download and on removal (AC-64)", async () => {
    const dl = await download(999999, ownerId);
    expect(dl.status).toBe(404);
    expect(errorCode(dl.body as Buffer)).toBe("ATTACHMENT_NOT_FOUND");
    const rm = await remove(999999, ownerId, { removalReason: "gone" });
    expect(rm.status).toBe(404);
    expect(rm.body.error.code).toBe("ATTACHMENT_NOT_FOUND");
  });

  it("API-33 frees a slot on removal: five active, remove one, the next upload succeeds (AC-27, BR-44, C-18)", async () => {
    const fresh = await newTicket(ownerId);
    const ids: number[] = [];
    for (let i = 1; i <= 5; i++) {
      const res = await upload(fresh, ownerId).attach("file", PNG, `slot-${i}.png`);
      expect(res.status).toBe(201);
      ids.push(res.body.id);
    }
    const full = await upload(fresh, ownerId).attach("file", PNG, "slot-6.png");
    expect(full.status).toBe(422);

    const rm = await remove(ids[0], ownerId, { removalReason: "Making room." });
    expect(rm.status).toBe(200);
    const next = await upload(fresh, ownerId).attach("file", PNG, "slot-6.png");
    expect(next.status).toBe(201);
    expect(await prisma.attachment.count({ where: { ticketId: fresh, isRemoved: false } })).toBe(5);
    expect(await prisma.attachment.count({ where: { ticketId: fresh } })).toBe(6);
  });

  it("API-34 compensates a failed row insert: no row and no file left in UPLOAD_DIR (AC-29, BR-41)", async () => {
    const fresh = await newTicket(ownerId);
    const before = filesOnDisk();
    const rows = await prisma.attachment.count();
    const spy = vi.spyOn(prisma.attachment, "create").mockRejectedValueOnce(new Error("insert failed at /var/lib/postgresql"));
    const res = await upload(fresh, ownerId).attach("file", PNG, "doomed.png");
    spy.mockRestore();

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: { code: "INTERNAL_ERROR", message: expect.any(String) } });
    expect(await prisma.attachment.count()).toBe(rows);
    expect(filesOnDisk()).toEqual(before);
  });
});
