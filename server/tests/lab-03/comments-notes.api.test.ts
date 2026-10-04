import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { TicketStatus } from "@prisma/client";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { seedGraded } from "../../src/seed/graded-seed.js";
import { createTicketWithNumber } from "../../src/lib/ticket-repository.js";
import { removeUsers, signedInUser, type Agent } from "../support/agents.js";
import { routesOf } from "../support/routes.js";

// Planned rows from tests.md section 2.6 (Issue #42): API-76, API-77,
// API-79..API-89 and API-118 - Public Comments and Internal Notes, two tables,
// append-only, trimmed, 1 to 2000 characters, author and time from the server,
// and the C-109 lock on Closed and Cancelled Tickets.
//
// The Requester-facing 403s on the notes endpoints (SEC-04..SEC-07) live in
// authorization.api.test.ts with the rest of the security level.
//
// Every user, Ticket, Public Comment and Internal Note here is created by this
// file and removed in afterAll.

const prisma = getPrisma();
const TAG = "[comments-notes-test]";
const COMMENT_MESSAGE = "A comment cannot be empty and must be 2000 characters or fewer.";
const NOTE_MESSAGE = "A note cannot be empty and must be 2000 characters or fewer.";

type Person = { id: number; name: string; email: string; agent: Agent };
let staff: Person;
let admin: Person;
let reqA: Person;
let reqB: Person;
const userIds: number[] = [];

async function ticket(currentStatus: TicketStatus = "OPEN") {
  const category = await prisma.category.findFirstOrThrow({ where: { isActive: true } });
  const system = await prisma.relatedSystem.findFirstOrThrow({ where: { isActive: true } });
  return createTicketWithNumber(prisma, {
    requesterId: reqA.id,
    categoryId: category.id,
    relatedSystemId: system.id,
    summary: `${TAG} fixture`,
    description: "Fixture row for comments-notes.api.test.ts.",
    requestedPriority: "MEDIUM",
    currentStatus,
  });
}

// The two collections, so every rule shared by both is asserted on both.
const KINDS = [
  { kind: "comment", path: "public-comments", table: "publicComment", message: COMMENT_MESSAGE },
  { kind: "note", path: "internal-notes", table: "internalNote", message: NOTE_MESSAGE },
] as const;
const count = (table: "publicComment" | "internalNote", ticketId: number) =>
  table === "publicComment" ? prisma.publicComment.count({ where: { ticketId } }) : prisma.internalNote.count({ where: { ticketId } });

beforeAll(async () => {
  await seedGraded(prisma);
  staff = await signedInUser(prisma, "cn-staff", { role: "IT_STAFF", name: `${TAG} Staff` });
  admin = await signedInUser(prisma, "cn-admin", { role: "ADMINISTRATOR", name: `${TAG} Admin` });
  reqA = await signedInUser(prisma, "cn-reqa", { name: `${TAG} Requester A` });
  reqB = await signedInUser(prisma, "cn-reqb", { name: `${TAG} Requester B` });
  userIds.push(staff.id, admin.id, reqA.id, reqB.id);
});

afterAll(async () => {
  const written = { OR: [{ ticket: { requesterId: { in: userIds } } }, { authorId: { in: userIds } }] };
  await prisma.publicComment.deleteMany({ where: written });
  await prisma.internalNote.deleteMany({ where: written });
  await prisma.ticket.deleteMany({ where: { requesterId: { in: userIds } } });
  await removeUsers(prisma, userIds);
});

// ---------------------------------------------------------------------------
// Author and time come from the server
// ---------------------------------------------------------------------------
describe("authorship", () => {
  it("API-76 the owning Requester posts a comment: 201, author is the signed-in user, createdAt server-set, first in the list (AC-48, BR-65, FR-28)", async () => {
    const t = await ticket();
    await prisma.publicComment.create({ data: { ticketId: t.id, authorId: staff.id, body: "An earlier staff reply.", createdAt: new Date("2026-09-01T00:00:00Z") } });
    const before = Date.now();
    const res = await reqA.agent.post(`/api/tickets/${t.id}/public-comments`).send({ body: "It happened again this morning." });
    expect(res.status).toBe(201);
    expect(res.body.author).toEqual({ id: reqA.id, name: reqA.name, role: "REQUESTER" });
    expect(Date.parse(res.body.createdAt)).toBeGreaterThanOrEqual(before - 1000);
    expect(res.body.createdAt).toMatch(/Z$/);
    const list = await reqA.agent.get(`/api/tickets/${t.id}/public-comments`);
    expect(list.status).toBe(200);
    expect(list.body[0].id).toBe(res.body.id);
    // The same array is embedded in the Requester DTO (api-spec.md 6.1).
    const dto = await reqA.agent.get(`/api/tickets/${t.id}`);
    expect(dto.body.publicComments).toEqual(list.body);
  });

  it("API-77 a body carrying authorId, author and createdAt is stored with the session's user and the server's clock (BR-65, FR-52)", async () => {
    const t = await ticket();
    for (const { kind, path, table } of KINDS) {
      const before = Date.now();
      const res = await staff.agent.post(`/api/tickets/${t.id}/${path}`).send({
        body: `A ${kind} with forged metadata.`,
        authorId: admin.id,
        author: { id: admin.id, name: "Someone Else", role: "ADMINISTRATOR" },
        createdAt: "2000-01-01T00:00:00.000Z",
      });
      expect(res.status, kind).toBe(201);
      expect(res.body.author).toEqual({ id: staff.id, name: staff.name, role: "IT_STAFF" });
      const stored =
        table === "publicComment"
          ? await prisma.publicComment.findUniqueOrThrow({ where: { id: res.body.id } })
          : await prisma.internalNote.findUniqueOrThrow({ where: { id: res.body.id } });
      expect(stored.authorId).toBe(staff.id);
      expect(stored.createdAt.getTime()).toBeGreaterThanOrEqual(before - 1000);
    }
  });
});

// ---------------------------------------------------------------------------
// Content rules - BR-64, BR-66
// ---------------------------------------------------------------------------
describe("content", () => {
  it("API-79 1 and 2000 characters succeed; empty, whitespace-only and 2001 are refused with no row created - on comments and on notes (AC-49, AC-50, BR-64)", async () => {
    const t = await ticket();
    for (const { kind, path, table, message } of KINDS) {
      for (const ok of ["x", "y".repeat(2000)]) {
        const res = await staff.agent.post(`/api/tickets/${t.id}/${path}`).send({ body: ok });
        expect(res.status, `${kind} ${ok.length}`).toBe(201);
        expect(res.body.body).toBe(ok);
      }
      const before = await count(table, t.id);
      for (const bad of ["", "   \n\t  ", "z".repeat(2001), undefined, 42]) {
        const res = await staff.agent.post(`/api/tickets/${t.id}/${path}`).send({ body: bad });
        expect(res.status, `${kind} ${JSON.stringify(bad)?.slice(0, 12)}`).toBe(400);
        expect(res.body.error).toEqual({ code: "VALIDATION_FAILED", message: expect.any(String), fields: { body: message } });
      }
      expect(await count(table, t.id)).toBe(before);
    }
  });

  it("API-80 a 2000-character body padded with spaces is accepted and stored trimmed (BR-64)", async () => {
    const t = await ticket();
    const core = "w".repeat(2000);
    for (const { path } of KINDS) {
      const res = await staff.agent.post(`/api/tickets/${t.id}/${path}`).send({ body: `   ${core}  \n ` });
      expect(res.status).toBe(201);
      expect(res.body.body).toBe(core);
    }
  });

  it("API-81 a body containing markup is stored and returned verbatim, unescaped and unaltered (AC-51)", async () => {
    const t = await ticket();
    const markup = `<script>alert("x")</script><b>bold</b> & <img src=x onerror=alert(1)> 'quoted'`;
    for (const { path, table } of KINDS) {
      const res = await staff.agent.post(`/api/tickets/${t.id}/${path}`).send({ body: markup });
      expect(res.status).toBe(201);
      expect(res.body.body).toBe(markup);
      const stored =
        table === "publicComment"
          ? await prisma.publicComment.findUniqueOrThrow({ where: { id: res.body.id } })
          : await prisma.internalNote.findUniqueOrThrow({ where: { id: res.body.id } });
      expect(stored.body).toBe(markup);
    }
  });

  it("API-82 a multi-line body round-trips with its newlines intact (AC-52, BR-66)", async () => {
    const t = await ticket();
    const lines = "Step one: restart.\nStep two: sign in.\n\n  Step four, indented.";
    for (const { path } of KINDS) {
      const created = await staff.agent.post(`/api/tickets/${t.id}/${path}`).send({ body: lines });
      expect(created.body.body).toBe(lines);
      const list = await staff.agent.get(`/api/tickets/${t.id}/${path}`);
      expect(list.body[0].body).toBe(lines);
    }
  });
});

// ---------------------------------------------------------------------------
// Lists, audiences and the two tables
// ---------------------------------------------------------------------------
describe("lists and audiences", () => {
  it("API-83 three entries posted in order come back newest first - comments and notes (BR-67)", async () => {
    const t = await ticket();
    for (const { path } of KINDS) {
      const ids: number[] = [];
      for (const n of ["first", "second", "third"]) {
        ids.push((await staff.agent.post(`/api/tickets/${t.id}/${path}`).send({ body: n })).body.id);
      }
      const list = await staff.agent.get(`/api/tickets/${t.id}/${path}`);
      expect(list.body.map((r: { id: number }) => r.id)).toEqual([...ids].reverse());
      expect(list.body.map((r: { body: string }) => r.body)).toEqual(["third", "second", "first"]);
    }
  });

  it("API-84 the owning Requester, IT Staff and Administrator each list and post Public Comments (BR-68, BR-04)", async () => {
    const t = await ticket();
    for (const [who, caller] of [["Requester", reqA], ["IT Staff", staff], ["Administrator", admin]] as const) {
      const post = await caller.agent.post(`/api/tickets/${t.id}/public-comments`).send({ body: `From the ${who}.` });
      expect(post.status, who).toBe(201);
      const list = await caller.agent.get(`/api/tickets/${t.id}/public-comments`);
      expect(list.status, who).toBe(200);
      expect(list.body[0].body).toBe(`From the ${who}.`);
    }
  });

  it("API-85 IT Staff and Administrator each list and create Internal Notes with a server-set author and creation time (AC-53, FR-55)", async () => {
    const t = await ticket();
    for (const [role, caller] of [["IT_STAFF", staff], ["ADMINISTRATOR", admin]] as const) {
      const before = Date.now();
      const post = await caller.agent.post(`/api/tickets/${t.id}/internal-notes`).send({ body: `A ${role} note.` });
      expect(post.status, role).toBe(201);
      expect(post.body.author).toEqual({ id: caller.id, name: caller.name, role });
      expect(Date.parse(post.body.createdAt)).toBeGreaterThanOrEqual(before - 1000);
      const list = await caller.agent.get(`/api/tickets/${t.id}/internal-notes`);
      expect(list.status, role).toBe(200);
      expect(list.body[0].id).toBe(post.body.id);
    }
  });

  it("API-86 a note and a comment with identical bodies: each endpoint returns only its own (BR-69, C-73)", async () => {
    const t = await ticket();
    const body = "Same words in two places.";
    const comment = await staff.agent.post(`/api/tickets/${t.id}/public-comments`).send({ body });
    const note = await staff.agent.post(`/api/tickets/${t.id}/internal-notes`).send({ body });
    const comments = await staff.agent.get(`/api/tickets/${t.id}/public-comments`);
    const notes = await staff.agent.get(`/api/tickets/${t.id}/internal-notes`);
    expect(comments.body.map((r: { id: number }) => r.id)).toEqual([comment.body.id]);
    expect(notes.body.map((r: { id: number }) => r.id)).toEqual([note.body.id]);
    // The Requester's own view of the Ticket carries the comment and not the note.
    const requesterView = await reqA.agent.get(`/api/tickets/${t.id}`);
    expect(requesterView.body.publicComments.map((r: { id: number }) => r.id)).toEqual([comment.body.id]);
    const staffView = await staff.agent.get(`/api/staff/tickets/${t.id}`);
    expect(staffView.body.publicComments.map((r: { id: number }) => r.id)).toEqual([comment.body.id]);
    expect(staffView.body.internalNotes.map((r: { id: number }) => r.id)).toEqual([note.body.id]);
  });

  it("API-87 no PATCH, PUT or DELETE route exists on either collection or on any single comment or note - from the router inventory (BR-63, FR-51)", () => {
    const { routes, unwalked } = routesOf(app);
    expect(unwalked).toEqual([]);
    const touching = routes.filter((r) => /public-comments|internal-notes|comments|notes/.test(r.path));
    expect(touching.map((r) => `${r.method} ${r.path}`).sort()).toEqual([
      "GET /api/tickets/:id/internal-notes",
      "GET /api/tickets/:id/public-comments",
      "POST /api/tickets/:id/internal-notes",
      "POST /api/tickets/:id/public-comments",
    ]);
  });

  it("API-88 a Requester listing or posting a comment on another Requester's Ticket -> 404, no row created (BR-42)", async () => {
    const t = await ticket();
    const list = await reqB.agent.get(`/api/tickets/${t.id}/public-comments`);
    const missing = await reqB.agent.get("/api/tickets/999999/public-comments");
    expect(list.status).toBe(404);
    expect(list.body.error.code).toBe("TICKET_NOT_FOUND");
    expect(list.text).toBe(missing.text);
    const post = await reqB.agent.post(`/api/tickets/${t.id}/public-comments`).send({ body: "Not my ticket." });
    expect(post.status).toBe(404);
    expect(post.body.error.code).toBe("TICKET_NOT_FOUND");
    expect(await count("publicComment", t.id)).toBe(0);
  });

  it("API-89 comment and note rows carry id, body, author { id, name, role } and createdAt - and no author email (api-spec.md 10.7)", async () => {
    const t = await ticket();
    await reqA.agent.post(`/api/tickets/${t.id}/public-comments`).send({ body: "From the Requester." });
    await staff.agent.post(`/api/tickets/${t.id}/public-comments`).send({ body: "From IT." });
    await staff.agent.post(`/api/tickets/${t.id}/internal-notes`).send({ body: "Private." });
    for (const [caller, path] of [[reqA, "public-comments"], [staff, "public-comments"], [staff, "internal-notes"]] as const) {
      const res = await caller.agent.get(`/api/tickets/${t.id}/${path}`);
      expect(res.body.length).toBeGreaterThan(0);
      for (const r of res.body) {
        expect(Object.keys(r).sort()).toEqual(["author", "body", "createdAt", "id"]);
        expect(Object.keys(r.author).sort()).toEqual(["id", "name", "role"]);
      }
      expect(res.text).not.toContain("@");
    }
  });
});

// ---------------------------------------------------------------------------
// Terminal Tickets - BR-108, C-109
// ---------------------------------------------------------------------------
describe("Closed and Cancelled Tickets", () => {
  it("API-118 posting a comment or a note -> 409 TICKET_CLOSED with no row; listing stays 200; a non-owning Requester still gets 404 (AC-118, BR-108, C-109)", async () => {
    for (const status of ["CLOSED", "CANCELLED"] as const) {
      const t = await ticket(status);
      for (const caller of [reqA, staff]) {
        const res = await caller.agent.post(`/api/tickets/${t.id}/public-comments`).send({ body: "After closure." });
        expect(res.status, `${status} comment`).toBe(409);
        expect(res.body.error.code).toBe("TICKET_CLOSED");
      }
      const note = await staff.agent.post(`/api/tickets/${t.id}/internal-notes`).send({ body: "After closure." });
      expect(note.status, `${status} note`).toBe(409);
      expect(note.body.error.code).toBe("TICKET_CLOSED");
      expect(await count("publicComment", t.id)).toBe(0);
      expect(await count("internalNote", t.id)).toBe(0);

      expect((await reqA.agent.get(`/api/tickets/${t.id}/public-comments`)).status).toBe(200);
      expect((await staff.agent.get(`/api/tickets/${t.id}/public-comments`)).status).toBe(200);
      expect((await staff.agent.get(`/api/tickets/${t.id}/internal-notes`)).status).toBe(200);

      const outsider = await reqB.agent.post(`/api/tickets/${t.id}/public-comments`).send({ body: "x" });
      expect(outsider.status).toBe(404);
      expect(outsider.body.error.code).toBe("TICKET_NOT_FOUND");
    }
    // RESOLVED is not terminal and stays open to comments (C-109).
    const resolved = await ticket("RESOLVED");
    expect((await reqA.agent.post(`/api/tickets/${resolved.id}/public-comments`).send({ body: "Still broken." })).status).toBe(201);
  });
});
