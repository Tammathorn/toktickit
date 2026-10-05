import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { seedGraded } from "../../src/seed/graded-seed.js";
import { createTicketWithNumber } from "../../src/lib/ticket-repository.js";
import { UPLOAD_DIR } from "../../src/lib/uploads.js";
import { removeUsers, signedInUser, type Agent } from "../support/agents.js";
import { routesOf } from "../support/routes.js";

// Lab 3 security and authorization - tests.md section 2.3, the rows Issue #40
// owns: SEC-01, SEC-02, SEC-08..SEC-10, SEC-14, SEC-15, SEC-19..SEC-22,
// SEC-24 and SEC-25. SEC-03 (the queue) arrives here with its route in #41.
//
// #42 adds SEC-04..SEC-07, SEC-13, SEC-16..SEC-18, SEC-26 and SEC-27 with
// the routes they test (notes, staff operations, the resolution flag,
// comments, assignable users). SEC-11 and SEC-23 (whose success path is
// GET /api/users) arrive in #43.
//
// Every user, Ticket, Attachment, Public Comment and Internal Note here is
// created by this file and removed in afterAll; the seeded accounts are never
// signed in as.

const prisma = getPrisma();
const TAG = "[authz-test]";
const SERVER_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const REPO_DIR = path.resolve(SERVER_DIR, "..");
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

// C-62, C-87: the four public routes. Every other route needs a session.
const PUBLIC_ROUTES = new Set([
  "GET /api/health",
  "GET /api/categories",
  "GET /api/related-systems",
  "POST /api/auth/login",
]);

type Person = { id: number; agent: Agent };
let a: Person;
let b: Person;
let staff: Person;
let admin: Person;
let ticketA: { id: number; ticketNumber: string; summary: string };
let ticketB: { id: number };
let activeAttachment: number;
let removedAttachment: number;
// A note on Requester A's own Ticket, whose text must never reach A (SEC-04).
const SECRET_NOTE = `${TAG} INTERNAL-ONLY: the vendor contract lapses next week`;

async function newTicket(requesterId: number, summary: string) {
  const category = await prisma.category.findFirstOrThrow({ where: { isActive: true } });
  const system = await prisma.relatedSystem.findFirstOrThrow({ where: { isActive: true } });
  const t = await createTicketWithNumber(prisma, {
    requesterId,
    categoryId: category.id,
    relatedSystemId: system.id,
    summary: `${TAG} ${summary}`,
    description: "Created by authorization.api.test.ts to be refused to the wrong caller.",
    requestedPriority: "MEDIUM",
  });
  return { id: t.id, ticketNumber: t.ticketNumber!, summary: t.summary };
}

const ticketBody = async () => ({
  categoryId: (await prisma.category.findFirstOrThrow({ where: { isActive: true } })).id,
  relatedSystemId: (await prisma.relatedSystem.findFirstOrThrow({ where: { isActive: true } })).id,
  summary: `${TAG} created through the API`,
  description: "A Ticket body that would be valid for a Requester.",
  requestedPriority: "LOW",
});

beforeAll(async () => {
  await seedGraded(prisma);
  a = await signedInUser(prisma, "authz-a");
  b = await signedInUser(prisma, "authz-b");
  staff = await signedInUser(prisma, "authz-staff", { role: "IT_STAFF" });
  admin = await signedInUser(prisma, "authz-admin", { role: "ADMINISTRATOR" });
  ticketA = await newTicket(a.id, "Requester A's Ticket with a secret summary");
  ticketB = await newTicket(b.id, "Requester B's Ticket");

  const up1 = await a.agent.post(`/api/tickets/${ticketA.id}/attachments`).attach("file", PNG, "active.png");
  const up2 = await a.agent.post(`/api/tickets/${ticketA.id}/attachments`).attach("file", PNG, "removed.png");
  activeAttachment = up1.body.id;
  removedAttachment = up2.body.id;
  await a.agent.delete(`/api/attachments/${removedAttachment}`).send({ removalReason: "Removed for SEC-10." });
  await prisma.internalNote.create({ data: { ticketId: ticketA.id, authorId: staff.id, body: SECRET_NOTE } });
});

afterAll(async () => {
  const ids = [a.id, b.id, staff.id, admin.id];
  const rows = await prisma.attachment.findMany({ where: { ticket: { requesterId: { in: ids } } } });
  for (const row of rows) {
    const file = path.join(UPLOAD_DIR, row.storedFilename);
    if (fs.existsSync(file)) fs.unlinkSync(file);
  }
  await prisma.attachment.deleteMany({ where: { id: { in: rows.map((r) => r.id) } } });
  const mine = { OR: [{ ticket: { requesterId: { in: ids } } }, { authorId: { in: ids } }] };
  await prisma.publicComment.deleteMany({ where: mine });
  await prisma.internalNote.deleteMany({ where: mine });
  await prisma.ticket.deleteMany({ where: { requesterId: { in: ids } } });
  await removeUsers(prisma, ids);
});

// ---------------------------------------------------------------------------
// The route inventory - the test CLAUDE.md names (SEC-01)
// ---------------------------------------------------------------------------

describe("the route inventory", () => {
  it("SEC-01 every registered route outside the four public ones answers 401 with no session (AC-43, FR-20)", async () => {
    const { routes, unwalked } = routesOf(app);
    expect(unwalked, "mounts the walker cannot probe").toEqual([]);
    // A sanity floor, so a walk that finds nothing cannot pass vacuously.
    expect(routes.length).toBeGreaterThanOrEqual(14);
    const unprotected: string[] = [];
    for (const { method, path: routePath } of routes) {
      const key = `${method} ${routePath}`;
      if (PUBLIC_ROUTES.has(key)) continue;
      const url = routePath.replace(/:[A-Za-z]+/g, "1");
      const res = await (request(app) as unknown as Record<string, (u: string) => request.Test>)[method.toLowerCase()](url);
      if (res.status !== 401 || res.body?.error?.code !== "AUTH_REQUIRED") unprotected.push(`${key} -> ${res.status}`);
    }
    expect(unprotected, "routes that answered without a session").toEqual([]);
  });

  it("an anonymous write with an unparseable body is 401, not 400: the session is checked before the body (C-63, BR-86)", async () => {
    const res = await request(app).post("/api/tickets").set("Content-Type", "application/json").send('{"summary": "broken');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("AUTH_REQUIRED");
  });

  it("SEC-02 health, categories and related systems answer 200 with no session in their Lab 1 shapes; login is reachable (AC-44, C-62)", async () => {
    const health = await request(app).get("/api/health");
    expect(health.status).toBe(200);
    expect(health.body).toEqual({ status: "ok", service: "TokTickIT API" });
    for (const route of ["/api/categories", "/api/related-systems"]) {
      const res = await request(app).get(route);
      expect(res.status, route).toBe(200);
      for (const row of res.body) expect(Object.keys(row).sort()).toEqual(["id", "name"]);
    }
    const login = await request(app).post("/api/auth/login").send({});
    expect(login.status).toBe(400);
    expect(login.body.error.code).toBe("VALIDATION_FAILED");
  });
});

// ---------------------------------------------------------------------------
// Ownership: another Requester's resource is 404, never 403 (C-65)
// ---------------------------------------------------------------------------
describe("Requester ownership", () => {
  it("SEC-08 Requester B GET Requester A's ticket -> 404, no ticket data, identical to a missing ticket (AC-38, C-65)", async () => {
    const res = await b.agent.get(`/api/tickets/${ticketA.id}`);
    const missing = await b.agent.get("/api/tickets/999999");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { code: "TICKET_NOT_FOUND", message: expect.any(String) } });
    expect(res.text).toBe(missing.text);
    expect(res.text).not.toContain(ticketA.ticketNumber);
    expect(res.text).not.toContain("secret summary");
  });

  it("SEC-09 Requester B on A's attachment: metadata, download and soft removal each 404, nothing removed (AC-39, BR-42)", async () => {
    const meta = await b.agent.get(`/api/tickets/${ticketA.id}/attachments`);
    expect(meta.status).toBe(404);
    expect(meta.body.error.code).toBe("TICKET_NOT_FOUND");
    const download = await b.agent.get(`/api/attachments/${activeAttachment}/download`);
    expect(download.status).toBe(404);
    expect(download.body.error.code).toBe("ATTACHMENT_NOT_FOUND");
    const removal = await b.agent.delete(`/api/attachments/${activeAttachment}`).send({ removalReason: "not mine" });
    expect(removal.status).toBe(404);
    expect(removal.body.error.code).toBe("ATTACHMENT_NOT_FOUND");
    expect((await prisma.attachment.findUniqueOrThrow({ where: { id: activeAttachment } })).isRemoved).toBe(false);
  });

  it("SEC-10 a removed attachment: the non-owner gets 404, never 410, so removal state does not leak; the owner gets 410 (BR-44, AC-40)", async () => {
    const nonOwner = await b.agent.get(`/api/attachments/${removedAttachment}/download`);
    expect(nonOwner.status).toBe(404);
    expect(nonOwner.body.error.code).toBe("ATTACHMENT_NOT_FOUND");
    const owner = await a.agent.get(`/api/attachments/${removedAttachment}/download`);
    expect(owner.status).toBe(410);
    expect(owner.body.error.code).toBe("ATTACHMENT_REMOVED");
  });
});

// ---------------------------------------------------------------------------
// Roles: 403 before the resource is loaded (C-63, C-101, C-103)
// ---------------------------------------------------------------------------
describe("role restrictions", () => {
  it("SEC-14 IT Staff and Administrator -> 403 FORBIDDEN_ROLE on create, list and read of the Requester routes, before any load or parse (C-101)", async () => {
    const body = await ticketBody();
    for (const [who, caller] of [["IT Staff", staff], ["Administrator", admin]] as const) {
      const create = await caller.agent.post("/api/tickets").send(body);
      expect(create.status, `${who} POST`).toBe(403);
      expect(create.body.error.code).toBe("FORBIDDEN_ROLE");
      const list = await caller.agent.get("/api/tickets");
      expect(list.status, `${who} GET list`).toBe(403);
      expect(list.body.error.code).toBe("FORBIDDEN_ROLE");

      const real = await caller.agent.get(`/api/tickets/${ticketA.id}`);
      const missing = await caller.agent.get("/api/tickets/999999");
      const malformed = await caller.agent.get("/api/tickets/abc");
      expect(real.status, `${who} GET one`).toBe(403);
      expect(real.body.error.code).toBe("FORBIDDEN_ROLE");
      expect(missing.text).toBe(real.text);
      expect(malformed.text).toBe(real.text);
    }
    expect(await prisma.ticket.count({ where: { requesterId: { in: [staff.id, admin.id] } } })).toBe(0);
  });

  it("SEC-15 IT Staff and Administrator read attachments (200, removed 410) but get 403 on upload and soft removal (C-103)", async () => {
    for (const [who, caller] of [["IT Staff", staff], ["Administrator", admin]] as const) {
      const meta = await caller.agent.get(`/api/tickets/${ticketA.id}/attachments`);
      expect(meta.status, `${who} metadata`).toBe(200);
      expect(meta.body.map((r: { id: number }) => r.id)).toEqual([activeAttachment, removedAttachment]);
      const download = await caller.agent.get(`/api/attachments/${activeAttachment}/download`);
      expect(download.status, `${who} download`).toBe(200);
      expect((await caller.agent.get(`/api/attachments/${removedAttachment}/download`)).status).toBe(410);

      const upload = await caller.agent.post(`/api/tickets/${ticketA.id}/attachments`).attach("file", PNG, "staff.png");
      expect(upload.status, `${who} upload`).toBe(403);
      expect(upload.body.error.code).toBe("FORBIDDEN_ROLE");
      const removal = await caller.agent.delete(`/api/attachments/${activeAttachment}`).send({ removalReason: "staff" });
      expect(removal.status, `${who} removal`).toBe(403);
      expect(removal.body.error.code).toBe("FORBIDDEN_ROLE");
    }
    expect(await prisma.attachment.count({ where: { ticketId: ticketA.id } })).toBe(2);
    expect((await prisma.attachment.findUniqueOrThrow({ where: { id: activeAttachment } })).isRemoved).toBe(false);
  });

  it("SEC-03 Requester GET /api/staff/tickets -> 403, no ticket data (AC-36, BR-74)", async () => {
    const res = await a.agent.get("/api/staff/tickets");
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: { code: "FORBIDDEN_ROLE", message: expect.any(String) } });
    expect(res.body.data).toBeUndefined();
    expect(res.body.meta).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain(ticketA.ticketNumber);
  });
});

// ---------------------------------------------------------------------------
// #42 - Internal Notes, staff ticket operations, the resolution flag and the
// assignable-users list. Every bold 403 of specification.md 5.2 is raised by
// the role step, before the Ticket is loaded or the id parsed (C-63, C-65).
// ---------------------------------------------------------------------------
const STATUSES = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CLOSED", "REOPENED", "CANCELLED"] as const;

describe("Internal Notes are staff-only (BR-70)", () => {
  it("SEC-04 Requester GET /api/tickets/:id/internal-notes -> 403, no note content (AC-04, BR-70)", async () => {
    const res = await a.agent.get(`/api/tickets/${ticketA.id}/internal-notes`);
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: { code: "FORBIDDEN_ROLE", message: expect.any(String) } });
    expect(res.text).not.toContain("INTERNAL-ONLY");
    expect(res.text).not.toMatch(/count|total|notes/i);
    // The note is really there: a staff caller reads it.
    const staffView = await staff.agent.get(`/api/tickets/${ticketA.id}/internal-notes`);
    expect(staffView.status).toBe(200);
    expect(staffView.text).toContain("INTERNAL-ONLY");
  });

  it("SEC-05 Requester internal-notes on a nonexistent ticket -> 403, byte-identical to an existing one (AC-37, C-63, C-65)", async () => {
    const real = await a.agent.get(`/api/tickets/${ticketA.id}/internal-notes`);
    const missing = await a.agent.get("/api/tickets/999999/internal-notes");
    expect(missing.status).toBe(403);
    expect(missing.text).toBe(real.text);
    const realPost = await a.agent.post(`/api/tickets/${ticketA.id}/internal-notes`).send({ body: "x" });
    const missingPost = await a.agent.post("/api/tickets/999999/internal-notes").send({ body: "x" });
    expect(missingPost.status).toBe(403);
    expect(missingPost.text).toBe(realPost.text);
  });

  it("SEC-06 Requester internal-notes with a malformed id -> 403, not 400 (AC-37, C-63)", async () => {
    const real = await a.agent.get(`/api/tickets/${ticketA.id}/internal-notes`);
    const malformed = await a.agent.get("/api/tickets/abc/internal-notes");
    expect(malformed.status).toBe(403);
    expect(malformed.text).toBe(real.text);
  });

  it("SEC-07 Requester POST /api/tickets/:id/internal-notes -> 403, no InternalNote row created (BR-70, FR-29)", async () => {
    const before = await prisma.internalNote.count();
    const res = await a.agent.post(`/api/tickets/${ticketA.id}/internal-notes`).send({ body: `${TAG} a Requester trying to write a note` });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN_ROLE");
    expect(await prisma.internalNote.count()).toBe(before);
  });

  it("SEC-26 the Requester DTO carries publicComments and no key of any name carrying note data (AC-47, FR-29, BR-70)", async () => {
    const res = await a.agent.get(`/api/tickets/${ticketA.id}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.publicComments)).toBe(true);
    expect(Object.keys(res.body).sort()).toEqual(
      ["id", "ticketNumber", "requester", "category", "relatedSystem", "summary", "description", "requestedPriority",
        "itPriority", "currentStatus", "owner", "requesterResolvedAt", "createdAt", "updatedAt", "attachments",
        "publicComments"].sort(),
    );
    // Over every key at every depth, not a guessed name.
    const keys: string[] = [];
    const collect = (value: unknown) => {
      if (Array.isArray(value)) value.forEach(collect);
      else if (value && typeof value === "object") {
        for (const [k, v] of Object.entries(value)) {
          keys.push(k);
          collect(v);
        }
      }
    };
    collect(res.body);
    expect(keys.filter((k) => /note|internal/i.test(k))).toEqual([]);
    expect(res.text).not.toContain("INTERNAL-ONLY");
  });
});

describe("staff ticket operations are refused to a Requester (C-63, C-65)", () => {
  it("SEC-17 Requester PATCH /api/staff/tickets/:id/status -> 403 for all eight targets, including Resolved and Closed; status unchanged (AC-79, BR-05, BR-54)", async () => {
    for (const target of STATUSES) {
      const res = await a.agent.patch(`/api/staff/tickets/${ticketA.id}/status`).send({ currentStatus: target });
      expect(res.status, target).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN_ROLE");
    }
    expect((await prisma.ticket.findUniqueOrThrow({ where: { id: ticketA.id } })).currentStatus).toBe("NEW");
  });

  it("SEC-18 Requester PATCH /api/staff/tickets/:id/it-priority -> 403, stored value unchanged (AC-76, BR-50)", async () => {
    const before = (await prisma.ticket.findUniqueOrThrow({ where: { id: ticketA.id } })).itPriority;
    const res = await a.agent.patch(`/api/staff/tickets/${ticketA.id}/it-priority`).send({ itPriority: before === "HIGH" ? "LOW" : "HIGH" });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN_ROLE");
    expect((await prisma.ticket.findUniqueOrThrow({ where: { id: ticketA.id } })).itPriority).toBe(before);
  });

  it("Requester -> every staff ticket route -> one byte-identical 403 for an existing, a missing and a malformed id, nothing changed (C-63, C-65)", async () => {
    const routes: [string, (id: string) => request.Test][] = [
      ["GET detail", (id) => a.agent.get(`/api/staff/tickets/${id}`)],
      ["POST claim", (id) => a.agent.post(`/api/staff/tickets/${id}/claim`)],
      ["PATCH owner", (id) => a.agent.patch(`/api/staff/tickets/${id}/owner`).send({ ownerId: staff.id })],
      ["PATCH it-priority", (id) => a.agent.patch(`/api/staff/tickets/${id}/it-priority`).send({ itPriority: "HIGH" })],
      ["PATCH status", (id) => a.agent.patch(`/api/staff/tickets/${id}/status`).send({ currentStatus: "OPEN" })],
      ["GET notes", (id) => a.agent.get(`/api/tickets/${id}/internal-notes`)],
      ["POST notes", (id) => a.agent.post(`/api/tickets/${id}/internal-notes`).send({ body: "x" })],
    ];
    const before = await prisma.ticket.findUniqueOrThrow({ where: { id: ticketA.id } });
    for (const [name, call] of routes) {
      const real = await call(String(ticketA.id));
      expect(real.status, name).toBe(403);
      expect(real.body).toEqual({ error: { code: "FORBIDDEN_ROLE", message: expect.any(String) } });
      expect((await call("999999")).text, `${name} missing`).toBe(real.text);
      expect((await call("abc")).text, `${name} malformed`).toBe(real.text);
    }
    const after = await prisma.ticket.findUniqueOrThrow({ where: { id: ticketA.id } });
    expect(after).toEqual(before);
  });

  it("SEC-27 Requester GET /api/staff/assignable-users -> 403, no user data; IT Staff and Administrator 200 (BR-104, C-105)", async () => {
    const res = await a.agent.get("/api/staff/assignable-users");
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: { code: "FORBIDDEN_ROLE", message: expect.any(String) } });
    expect(res.text).not.toMatch(/"name"|"id"/);
    for (const caller of [staff, admin]) {
      const ok = await caller.agent.get("/api/staff/assignable-users");
      expect(ok.status).toBe(200);
      expect(Array.isArray(ok.body)).toBe(true);
    }
  });

  it("SEC-16 IT Staff and Administrator POST /api/tickets/:id/requester-resolved -> 403, flag not set (AC-58, BR-60)", async () => {
    await prisma.ticket.update({ where: { id: ticketB.id }, data: { currentStatus: "OPEN" } });
    for (const caller of [staff, admin]) {
      const res = await caller.agent.post(`/api/tickets/${ticketB.id}/requester-resolved`);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN_ROLE");
    }
    expect((await prisma.ticket.findUniqueOrThrow({ where: { id: ticketB.id } })).requesterResolvedAt).toBeNull();
  });

  it("SEC-13 an Administrator succeeds on all eight staff permissions: queue, detail, claim, owner, IT Priority, status, comment, note (BR-39, C-66)", async () => {
    const t = await newTicket(a.id, "the Administrator works this one");
    const results: [string, number, number][] = [];
    const record = (name: string, expected: number, res: { status: number }) => results.push([name, expected, res.status]);
    record("queue", 200, await admin.agent.get("/api/staff/tickets"));
    record("detail", 200, await admin.agent.get(`/api/staff/tickets/${t.id}`));
    record("claim", 200, await admin.agent.post(`/api/staff/tickets/${t.id}/claim`));
    record("owner", 200, await admin.agent.patch(`/api/staff/tickets/${t.id}/owner`).send({ ownerId: staff.id }));
    record("it-priority", 200, await admin.agent.patch(`/api/staff/tickets/${t.id}/it-priority`).send({ itPriority: "HIGH" }));
    record("status", 200, await admin.agent.patch(`/api/staff/tickets/${t.id}/status`).send({ currentStatus: "OPEN" }));
    record("comment", 201, await admin.agent.post(`/api/tickets/${t.id}/public-comments`).send({ body: "An Administrator reply." }));
    record("note", 201, await admin.agent.post(`/api/tickets/${t.id}/internal-notes`).send({ body: "An Administrator note." }));
    expect(results.filter(([, expected, got]) => expected !== got)).toEqual([]);
    const after = await prisma.ticket.findUniqueOrThrow({ where: { id: t.id } });
    expect(after).toMatchObject({ ownerId: staff.id, itPriority: "HIGH", currentStatus: "OPEN" });
  });
});

// ---------------------------------------------------------------------------
// Identity comes only from the session (C-64, BR-31)
// ---------------------------------------------------------------------------
describe("a client-supplied requesterId is ignored", () => {
  it("SEC-19 POST /api/tickets carrying B's requesterId is saved against the signed-in A (AC-41, AC-03)", async () => {
    const res = await a.agent.post("/api/tickets").send({ ...(await ticketBody()), requesterId: b.id });
    expect(res.status).toBe(201);
    expect(res.body.requester.id).toBe(a.id);
    expect((await prisma.ticket.findUniqueOrThrow({ where: { id: res.body.id } })).requesterId).toBe(a.id);
  });

  it("SEC-20 GET /api/tickets?requesterId=<B> returns only A's Tickets (AC-42, BR-43)", async () => {
    const res = await a.agent.get(`/api/tickets?requesterId=${b.id}&pageSize=50`);
    expect(res.status).toBe(200);
    const ids = res.body.data.map((r: { id: number }) => r.id);
    expect(ids).toContain(ticketA.id);
    expect(ids).not.toContain(ticketB.id);
    const mine = await prisma.ticket.count({ where: { requesterId: a.id } });
    expect(res.body.meta.total).toBe(mine);
  });

  it("SEC-21 GET /api/tickets/<B's>?requesterId=<B> is still 404 to A (AC-03, BR-31)", async () => {
    const res = await a.agent.get(`/api/tickets/${ticketB.id}?requesterId=${b.id}`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("TICKET_NOT_FOUND");
  });

  it("SEC-22 no handler reads requesterId from a query or a body, and lib/requester.ts is gone (AC-103, C-64)", () => {
    expect(fs.existsSync(path.join(SERVER_DIR, "src", "lib", "requester.ts"))).toBe(false);
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.ts$/.test(entry.name)) {
          const text = fs.readFileSync(full, "utf8");
          // A read of the identifier, or the removed route registered as a
          // string - not a comment that records its removal.
          const reads =
            /(query|body)(\?)?\.requesterId|\[["']requesterId["']\]/.test(text) ||
            /\{[^}]*\brequesterId\b[^}]*\}\s*=\s*req\.(query|body)/.test(text);
          if (reads || /["'`]\/api\/requesters["'`]/.test(text)) offenders.push(path.relative(SERVER_DIR, full));
        }
      }
    };
    walk(path.join(SERVER_DIR, "src"));
    expect(offenders).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Safe failure and the dependency rule
// ---------------------------------------------------------------------------
describe("failures and dependencies", () => {
  it("SEC-24 a forced failure -> 500 INTERNAL_ERROR with no stack trace, SQL, path or database text (AC-105, BR-89)", async () => {
    const spy = vi
      .spyOn(prisma.ticket, "count")
      .mockRejectedValueOnce(new Error('relation "Ticket" does not exist at /var/lib/postgresql/data: SELECT count(*) FROM "Ticket"'));
    const res = await a.agent.get("/api/tickets");
    spy.mockRestore();
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: { code: "INTERNAL_ERROR", message: expect.any(String) } });
    expect(res.text).not.toMatch(/SELECT|postgresql|relation|\/var\/|at .*\.(ts|js):\d+|stack/i);
  });

  it("SEC-25 no package.json or source file carries passport, jsonwebtoken, bcrypt, bcryptjs, argon2 or express-session (AC-104)", () => {
    const banned = /["'](passport[\w-]*|jsonwebtoken|bcrypt|bcryptjs|argon2|express-session)["']/;
    const offenders: string[] = [];
    for (const manifest of ["package.json", "server/package.json", "client/package.json"]) {
      const json = JSON.parse(fs.readFileSync(path.join(REPO_DIR, manifest), "utf8"));
      for (const dep of Object.keys({ ...json.dependencies, ...json.devDependencies })) {
        if (banned.test(`"${dep}"`)) offenders.push(`${manifest}: ${dep}`);
      }
    }
    // Whole-text, so a multi-line import is caught by its `from` clause.
    const importsBanned = /(from|require\()\s*["'](passport[\w-]*|jsonwebtoken|bcrypt|bcryptjs|argon2|express-session)["']/;
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.(ts|tsx)$/.test(entry.name) && importsBanned.test(fs.readFileSync(full, "utf8"))) {
          offenders.push(path.relative(REPO_DIR, full));
        }
      }
    };
    walk(path.join(REPO_DIR, "server", "src"));
    walk(path.join(REPO_DIR, "client", "src"));
    expect(offenders).toEqual([]);
  });
});
