import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { hashPassword } from "../../src/lib/password.js";
import { createTicketWithNumber } from "../../src/lib/ticket-repository.js";
import { deleteTickets } from "../support/cleanup.js";
import { routesOf } from "../support/routes.js";
import { TEST_PASSWORD, removeUsers, signIn, signedInUser, type Agent } from "../support/agents.js";

// Lab 4 authorization - tests.md section 2.4, the rows C-184 places in this
// file. Issue #64 adds the four action routes: SEC-10 (their Anon, MustChange
// and bold-403 cells), SEC-11 (no route edits or deletes a finished record)
// and SEC-12 (no secret in any action-route response). The dashboard rows join
// SEC-10 and SEC-12 with Issues #67 and #68; SEC-09, the route-versus-matrix
// test, lands in #68 when the last Lab 4 route exists (C-184).
//
// Every user, Ticket and action here is created by this file and removed in
// afterAll through deleteTickets (Issue #63).

const prisma = getPrisma();
const TAG = "[lab4-authz-test]";
const MISSING_ID = 99999999;
const HOUR = 60 * 60 * 1000;

type Call = (agent: request.Agent | ReturnType<typeof request>, id: number) => request.Test;

// specification.md 5.2, the Lab 4 action rows: Anon 401, MustChange 403, and
// a bold Requester 403 raised before any load. Each call carries a well-formed
// body so the only thing a refusal can be about is who is calling.
const ACTION_ROWS: { route: string; call: Call }[] = [
  {
    route: "POST /api/tickets/:id/actions",
    call: (a, id) => a.post(`/api/tickets/${id}/actions`).send({ status: "PLANNED", actionAt: new Date(Date.now() + HOUR).toISOString(), description: "Matrix probe." }),
  },
  { route: "PATCH /api/actions/:id", call: (a, id) => a.patch(`/api/actions/${id}`).send({ version: 0, description: "Matrix probe." }) },
  { route: "POST /api/actions/:id/complete", call: (a, id) => a.post(`/api/actions/${id}/complete`).send({ version: 0, result: "Matrix probe.", followUpRequired: false }) },
  { route: "POST /api/actions/:id/cancel", call: (a, id) => a.post(`/api/actions/${id}/cancel`).send({ version: 0, result: "Matrix probe." }) },
];

type Person = { id: number; email: string; name: string; agent: Agent };
let staff: Person;
let requester: Person;
let mustChange: Agent;
const userIds: number[] = [];

async function ticket() {
  const category = await prisma.category.findFirstOrThrow({ where: { isActive: true } });
  const system = await prisma.relatedSystem.findFirstOrThrow({ where: { isActive: true } });
  return createTicketWithNumber(prisma, {
    requesterId: requester.id,
    categoryId: category.id,
    relatedSystemId: system.id,
    summary: `${TAG} fixture`,
    description: "Fixture row for lab-04 authorization.api.test.ts.",
    requestedPriority: "MEDIUM",
    createdAt: new Date(Date.now() - 2 * HOUR),
    currentStatus: "OPEN",
  });
}

beforeAll(async () => {
  staff = await signedInUser(prisma, "lab4-authz-staff", { role: "IT_STAFF", name: `${TAG} Staff` });
  requester = await signedInUser(prisma, "lab4-authz-req", { name: `${TAG} Requester` });
  const gated = await prisma.user.create({
    data: {
      name: `${TAG} Must Change`,
      email: `lab4-authz-gated-${Date.now()}@example.test`,
      role: "IT_STAFF",
      passwordHash: hashPassword(TEST_PASSWORD),
      mustChangePassword: true,
    },
  });
  mustChange = await signIn(gated.email);
  userIds.push(staff.id, requester.id, gated.id);
});

afterAll(async () => {
  await deleteTickets(prisma, { requesterId: { in: userIds } });
  await removeUsers(prisma, userIds);
});

describe("SEC-10 the specification.md 5.2 cells of the four action routes", () => {
  for (const { route, call } of ACTION_ROWS) {
    it(`SEC-10 ${route}: anonymous -> 401 AUTH_REQUIRED, MustChange -> 403 PASSWORD_CHANGE_REQUIRED, Requester -> 403 FORBIDDEN_ROLE on a missing id with no action content (AC-101, L3 C-61)`, async () => {
      const anon = await call(request(app), MISSING_ID);
      expect(anon.status, anon.text).toBe(401);
      expect(anon.body.error.code).toBe("AUTH_REQUIRED");

      const gated = await call(mustChange, MISSING_ID);
      expect(gated.status, gated.text).toBe(403);
      expect(gated.body.error.code).toBe("PASSWORD_CHANGE_REQUIRED");

      // The bold 403, answered for an id that does not exist: the role step
      // runs before any load, so the body is the bare envelope.
      const refused = await call(requester.agent, MISSING_ID);
      expect(refused.status, refused.text).toBe(403);
      expect(refused.body).toEqual({ error: { code: "FORBIDDEN_ROLE", message: refused.body.error.message } });

      // The same request from IT Staff reaches the load step: the route exists.
      const reached = await call(staff.agent, MISSING_ID);
      expect(reached.status, reached.text).toBe(404);
      expect(["TICKET_NOT_FOUND", "ACTION_NOT_FOUND"]).toContain(reached.body.error.code);
    });
  }
});

describe("SEC-11 append-only records (AC-24, BR-15, BR-50, C-151)", () => {
  it("SEC-11 no PUT, PATCH or DELETE addresses a Public Comment, Internal Note or status-history row; no DELETE or PUT on /api/actions/:id; the one action edit route is PATCH /api/actions/:id", () => {
    const { routes, unwalked } = routesOf(app);
    expect(unwalked).toEqual([]);
    const writes = routes.filter((r) => ["PUT", "PATCH", "DELETE"].includes(r.method));
    const appendOnly = writes.filter((r) => /comment|note|history|status-change/i.test(r.path));
    expect(appendOnly).toEqual([]);
    const actionWrites = writes.filter((r) => r.path.startsWith("/api/actions"));
    expect(actionWrites).toEqual([{ method: "PATCH", path: "/api/actions/:id" }]);
    // The four action routes are registered at all (api-spec.md 3).
    const registered = routes.map((r) => `${r.method} ${r.path}`);
    for (const { route } of ACTION_ROWS) expect(registered).toContain(route);
  });
});

describe("SEC-12 no secret in any action-route response (CLAUDE.md security rules, L3 BR-88)", () => {
  it("SEC-12 every success and error body from the four action routes carries no password, passwordHash, scrypt$ string or session token", async () => {
    const t = await ticket();
    const token = (staff.agent as unknown as { jar: { getCookie: (n: string, a: unknown) => { value: string } | undefined } }).jar
      .getCookie("tt_session", { domain: "127.0.0.1", path: "/", secure: false, script: false });
    const bodies: string[] = [];
    const record = (res: request.Response) => {
      bodies.push(res.text);
      return res;
    };
    const created = record(await staff.agent.post(`/api/tickets/${t.id}/actions`).send({
      status: "PLANNED", actionAt: new Date(Date.now() - 60_000).toISOString(), description: "Secret scan.",
    }));
    expect(created.status, created.text).toBe(201);
    const [first] = await prisma.actionTaken.findMany({ where: { ticketId: t.id } });
    record(await staff.agent.patch(`/api/actions/${first.id}`).send({ version: 0, description: "Secret scan, edited." }));
    record(await staff.agent.post(`/api/actions/${first.id}/complete`).send({ version: 1, result: "Done.", followUpRequired: false }));
    const second = record(await staff.agent.post(`/api/tickets/${t.id}/actions`).send({
      status: "PLANNED", actionAt: new Date(Date.now() + HOUR).toISOString(), description: "Secret scan two.",
    }));
    const secondId = second.body.actions.find((a: { description: string }) => a.description === "Secret scan two.").id;
    record(await staff.agent.post(`/api/actions/${secondId}/cancel`).send({ version: 0, result: "No." }));
    // Errors: validation, stale, finished, missing, Requester, anonymous.
    record(await staff.agent.post(`/api/tickets/${t.id}/actions`).send({ status: "PLANNED" }));
    record(await staff.agent.patch(`/api/actions/${first.id}`).send({ version: 0, description: "Stale." }));
    record(await staff.agent.patch(`/api/actions/${first.id}`).send({ version: 2, description: "Finished." }));
    record(await staff.agent.post(`/api/actions/${MISSING_ID}/cancel`).send({ version: 0, result: "x" }));
    record(await requester.agent.post(`/api/tickets/${t.id}/actions`).send({}));
    record(await request(app).patch(`/api/actions/${first.id}`).send({ version: 0, description: "x" }));
    expect(bodies).toHaveLength(11);
    expect(token?.value, "the session token was found in the cookie jar").toBeTruthy();
    for (const text of bodies) {
      expect(text).not.toMatch(/password/i);
      expect(text).not.toContain("scrypt$");
      expect(text).not.toContain(token!.value);
    }
  });
});
