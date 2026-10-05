import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Express } from "express";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { seedGraded } from "../../src/seed/graded-seed.js";
import { createTicketWithNumber } from "../../src/lib/ticket-repository.js";
import { UPLOAD_DIR } from "../../src/lib/uploads.js";
import { removeUsers, signedInUser, type Agent } from "../support/agents.js";

// Lab 3 security and authorization - tests.md section 2.3, the rows Issue #40
// owns: SEC-01, SEC-02, SEC-08..SEC-10, SEC-14, SEC-15, SEC-19..SEC-22,
// SEC-24 and SEC-25.
//
// The rest arrive with the routes they test: SEC-03 (the queue) in #41;
// SEC-04..SEC-07, SEC-13, SEC-16..SEC-18, SEC-26 and SEC-27 (notes, staff
// operations, the resolution flag, comments, assignable users) in #42; SEC-11
// and SEC-23 (whose success path is GET /api/users) in #43.
//
// Every user, Ticket and Attachment here is created by this file and removed in
// afterAll; the seeded accounts are never signed in as.

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
});

afterAll(async () => {
  const ids = [a.id, b.id, staff.id, admin.id];
  const rows = await prisma.attachment.findMany({ where: { ticket: { requesterId: { in: ids } } } });
  for (const row of rows) {
    const file = path.join(UPLOAD_DIR, row.storedFilename);
    if (fs.existsSync(file)) fs.unlinkSync(file);
  }
  await prisma.attachment.deleteMany({ where: { id: { in: rows.map((r) => r.id) } } });
  await prisma.ticket.deleteMany({ where: { requesterId: { in: ids } } });
  await removeUsers(prisma, ids);
});

// ---------------------------------------------------------------------------
// The route inventory - the test CLAUDE.md names (SEC-01)
// ---------------------------------------------------------------------------

type Route = { method: string; path: string };

type Layer = {
  route?: { path: string; methods: Record<string, boolean> };
  name?: string;
  regexp?: { fast_slash?: boolean };
  handle?: { stack?: Layer[]; _router?: { stack: Layer[] } };
};

// Every route registered on the app, found by walking Express's own router
// rather than from a list somebody has to remember to update. It descends into
// routers and mounted sub-apps. A router, sub-app or handler mounted under a
// path prefix is reported as `unwalked` rather than skipped, so the day one is
// added this test fails until the walker is taught the prefix - it can never
// pass by not seeing a route.
function routesOf(express: Express): { routes: Route[]; unwalked: string[] } {
  const routes: Route[] = [];
  const unwalked: string[] = [];
  const walk = (stack: Layer[]) => {
    for (const layer of stack) {
      if (layer.route) {
        for (const method of Object.keys(layer.route.methods)) {
          // router.all() registers "_all": probe it as a GET.
          routes.push({ method: method === "_all" ? "GET" : method.toUpperCase(), path: layer.route.path });
        }
        continue;
      }
      const nested = layer.handle?.stack ?? layer.handle?._router?.stack;
      if (!layer.regexp?.fast_slash) unwalked.push(`${layer.name ?? "handler"} mounted under a path prefix`);
      else if (nested) walk(nested);
    }
  };
  walk((express as unknown as { _router: { stack: Layer[] } })._router.stack);
  return { routes, unwalked };
}

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
