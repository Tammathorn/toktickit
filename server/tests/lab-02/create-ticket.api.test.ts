import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { seedGraded } from "../../src/seed/graded-seed.js";
import { TICKET_NUMBER_PATTERN } from "../../src/lib/ticket-number.js";
import { MESSAGES } from "../../src/lib/validation.js";
import { removeUsers, signedInUser, type Agent } from "../support/agents.js";

// Planned rows from tests.md section 2.2 that live in this file:
// API-01..API-10 and API-14 (Create Ticket, Issue #13) and API-44 (Lab 1
// regression). Every Ticket created here carries the TEST_TAG in its summary
// so afterAll can remove exactly those rows.
//
// Lab 3 (#40), per docs/lab-03/tests.md section 4.2: requests go through a
// signed-in agent and the body no longer carries requesterId (C-64). Two rows
// retire against the replacements tests.md section 4.3 names:
//   API-11 (GET /api/requesters, a deleted route)   -> API-95, users-admin.api.test.ts
//   API-12 (REQUESTER_INACTIVE, a deleted code)      -> API-08, lab-03/auth.api.test.ts

const prisma = getPrisma();
const TEST_TAG = "[api-test]";

let requesterId: number;
let requester: Agent;
let categoryId: number;
let relatedSystemId: number;

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    categoryId,
    relatedSystemId,
    summary: `${TEST_TAG} Laptop battery drains quickly`,
    description: "The battery drops from full to twenty percent within an hour of light use.",
    requestedPriority: "MEDIUM",
    ...overrides,
  };
}

function post(body: unknown) {
  return requester.post("/api/tickets").send(body as object);
}

beforeAll(async () => {
  await seedGraded(prisma);
  const signedIn = await signedInUser(prisma, "create-test");
  requesterId = signedIn.id;
  requester = signedIn.agent;
  categoryId = (await prisma.category.findFirstOrThrow({ where: { isActive: true } })).id;
  relatedSystemId = (await prisma.relatedSystem.findFirstOrThrow({ where: { isActive: true } })).id;
});

afterAll(async () => {
  await prisma.ticket.deleteMany({ where: { summary: { startsWith: TEST_TAG } } });
  await prisma.ticket.deleteMany({ where: { requesterId } });
  await removeUsers(prisma, [requesterId]);
});

describe("POST /api/tickets", () => {
  it("API-01 creates a Ticket: 201, one row saved, body carries the Ticket Number (AC-01)", async () => {
    // Counted by this test's own summary: other test files create Tickets in
    // parallel workers, so a global count is not stable.
    const summary = `${TEST_TAG} API-01 ${Date.now()}`;
    const before = await prisma.ticket.count({ where: { summary } });
    const res = await post(validBody({ summary }));

    expect(res.status).toBe(201);
    expect(res.body.ticketNumber).toMatch(TICKET_NUMBER_PATTERN);
    expect(await prisma.ticket.count({ where: { summary } })).toBe(before + 1);

    // api-spec.md 4.1 / 10.2 response shape. Lab 3: the Requester is the
    // signed-in user, and requesterId is no longer a key of the DTO.
    expect(res.body).not.toHaveProperty("requesterId");
    expect(res.body).toMatchObject({
      requester: { id: requesterId, name: expect.any(String) },
      category: { id: categoryId, name: expect.any(String) },
      relatedSystem: { id: relatedSystemId, name: expect.any(String) },
      summary,
      requestedPriority: "MEDIUM",
      attachments: [],
    });
    expect(res.body.createdAt).toMatch(/Z$/);
    expect(new Date(res.body.updatedAt).getTime()).toBeGreaterThan(new Date(res.body.createdAt).getTime());
  });

  it("API-02 gives two creations different numbers, both matching the pattern (AC-15)", async () => {
    const a = await post(validBody());
    const b = await post(validBody());
    expect(a.status).toBe(201);
    expect(b.status).toBe(201);
    expect(a.body.ticketNumber).toMatch(TICKET_NUMBER_PATTERN);
    expect(b.body.ticketNumber).toMatch(TICKET_NUMBER_PATTERN);
    expect(a.body.ticketNumber).not.toBe(b.body.ticketNumber);
  });

  // C-71 inverts this assertion: itPriority is no longer null but starts as a
  // copy of Requested Priority, for a new Ticket exactly as for the Tickets the
  // Lab 3 migration backfilled (AC-45).
  it("API-03 applies the defaults: currentStatus NEW, itPriority copied from Requested Priority (AC-16, AC-45)", async () => {
    const body = validBody();
    const res = await post(body);
    expect(res.status).toBe(201);
    expect(res.body.currentStatus).toBe("NEW");
    expect(res.body.itPriority).toBe(body.requestedPriority);
  });

  it("API-04 rejects a 4-character and a 121-character Ticket Summary with the BR-31 message (AC-18)", async () => {
    for (const summary of ["abcd", "x".repeat(121)]) {
      const res = await post(validBody({ summary }));
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_FAILED");
      expect(res.body.error.fields.summary).toBe(MESSAGES.summary);
    }
  });

  it("API-05 accepts a 5-character and a 120-character Ticket Summary (AC-19)", async () => {
    const five = `${TEST_TAG}`.slice(0, 5); // "[api-" is 5 chars
    const oneTwenty = `${TEST_TAG} ` + "y".repeat(120 - TEST_TAG.length - 1);
    expect(five).toHaveLength(5);
    expect(oneTwenty).toHaveLength(120);
    // the 5-char row cannot carry the tag; remove it explicitly
    const a = await post(validBody({ summary: five }));
    const b = await post(validBody({ summary: oneTwenty }));
    expect(a.status).toBe(201);
    expect(b.status).toBe(201);
    await prisma.ticket.delete({ where: { id: a.body.id } });
  });

  it("API-06 enforces the Description boundaries: 19 and 5001 fail, 20 and 5000 pass (BR-32)", async () => {
    for (const len of [19, 5001]) {
      const res = await post(validBody({ description: "d".repeat(len) }));
      expect(res.status).toBe(400);
      expect(res.body.error.fields.description).toBe(MESSAGES.description);
    }
    for (const len of [20, 5000]) {
      const res = await post(validBody({ description: "d".repeat(len) }));
      expect(res.status).toBe(201);
    }
  });

  it("API-07 stores a padded Ticket Summary trimmed (AC-20, BR-30)", async () => {
    const res = await post(validBody({ summary: `   ${TEST_TAG} padded summary   `, description: "   " + "p".repeat(30) + "   " }));
    expect(res.status).toBe(201);
    expect(res.body.summary).toBe(`${TEST_TAG} padded summary`);
    const row = await prisma.ticket.findUniqueOrThrow({ where: { id: res.body.id } });
    expect(row.summary).toBe(`${TEST_TAG} padded summary`);
    expect(row.description).toBe("p".repeat(30));
  });

  it("API-08 validates independently of the client: missing Category and bad priority give one fields entry each (AC-67)", async () => {
    const body = validBody({ requestedPriority: "URGENT" });
    delete (body as Record<string, unknown>).categoryId;
    const res = await post(body);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
    expect(Object.keys(res.body.error.fields).sort()).toEqual(["categoryId", "requestedPriority"]);
    expect(res.body.error.fields.categoryId).toBe(MESSAGES.categoryRequired);
    expect(res.body.error.fields.requestedPriority).toBe(MESSAGES.requestedPriorityInvalid);
  });

  it("API-09 emits exactly the ui-spec.md catalogue string for each BR-31..BR-34 violation (AC-23)", async () => {
    const inactiveCategory = await prisma.category.findFirst({ where: { isActive: false } });
    const cases: Array<[Record<string, unknown>, string, string]> = [
      [{ summary: "" }, "summary", "Ticket Summary is required and must be between 5 and 120 characters."],
      [{ description: "" }, "description", "Description is required and must be between 20 and 5000 characters."],
      [{ categoryId: null }, "categoryId", "Category is required."],
      [{ relatedSystemId: null }, "relatedSystemId", "Related System is required."],
      [{ requestedPriority: null }, "requestedPriority", "Requested Priority is required."],
      [{ categoryId: 999999 }, "categoryId", "Select an active Category from the list."],
      [{ relatedSystemId: 999999 }, "relatedSystemId", "Select an active Related System from the list."],
      [{ requestedPriority: "medium" }, "requestedPriority", "Requested Priority must be Low, Medium or High."],
    ];
    if (inactiveCategory) {
      cases.push([{ categoryId: inactiveCategory.id }, "categoryId", "Select an active Category from the list."]);
    }
    for (const [override, field, message] of cases) {
      const res = await post(validBody(override));
      expect(res.status, JSON.stringify(override)).toBe(400);
      expect(res.body.error.fields[field], JSON.stringify(override)).toBe(message);
    }
  });

  it("rejects system-generated fields if supplied (api-spec 3.1)", async () => {
    const res = await post(validBody({ ticketNumber: "TKT-2026-000001", currentStatus: "CLOSED" }));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
    expect(Object.keys(res.body.error.fields).sort()).toEqual(["currentStatus", "ticketNumber"]);
    expect(res.body.error.fields.ticketNumber).toBe(MESSAGES.systemGenerated("ticketNumber"));
    expect(res.body.error.fields.ticketNumber).toBe("ticketNumber is system generated and cannot be supplied.");
  });

  it("API-14 reports an unexpected failure safely as 500 INTERNAL_ERROR (AC-66, BR-38)", async () => {
    const spy = vi
      .spyOn(prisma, "$transaction")
      .mockRejectedValueOnce(new Error('connection lost at /var/lib/postgresql: SELECT * FROM "Ticket"'));
    const res = await post(validBody());
    spy.mockRestore();

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: { code: "INTERNAL_ERROR", message: expect.any(String) } });
    const text = JSON.stringify(res.body);
    expect(text).not.toMatch(/SELECT|postgresql|\/var\/|at .*\.ts|stack/i);
  });
});

describe("Reference data", () => {
  it("API-10 filters inactive rows and keeps {id, name} in id order (AC-14, BR-56)", async () => {
    const cat = await prisma.category.create({ data: { name: `${TEST_TAG} inactive category`, isActive: false } });
    const sys = await prisma.relatedSystem.create({ data: { name: `${TEST_TAG} inactive system`, isActive: false } });
    try {
      const categories = await request(app).get("/api/categories");
      const systems = await request(app).get("/api/related-systems");
      expect(categories.status).toBe(200);
      expect(systems.status).toBe(200);
      for (const body of [categories.body, systems.body]) {
        for (const row of body) expect(Object.keys(row).sort()).toEqual(["id", "name"]);
        const ids = body.map((r: { id: number }) => r.id);
        expect(ids).toEqual([...ids].sort((a, b) => a - b));
      }
      expect(categories.body.map((r: { id: number }) => r.id)).not.toContain(cat.id);
      expect(systems.body.map((r: { id: number }) => r.id)).not.toContain(sys.id);
      expect(systems.body.length).toBeGreaterThanOrEqual(6);
    } finally {
      await prisma.category.delete({ where: { id: cat.id } });
      await prisma.relatedSystem.delete({ where: { id: sys.id } });
    }
  });

  it("API-44 keeps the Lab 1 contract intact (C-05)", async () => {
    const health = await request(app).get("/api/health");
    expect(health.status).toBe(200);
    expect(health.body).toEqual({ status: "ok", service: "TokTickIT API" });

    const categories = await request(app).get("/api/categories");
    expect(categories.status).toBe(200);
    expect(categories.body.slice(0, 4)).toEqual([
      { id: 1, name: "Account and Access" },
      { id: 2, name: "Hardware" },
      { id: 3, name: "Software" },
      { id: 4, name: "Network" },
    ]);
  });
});
