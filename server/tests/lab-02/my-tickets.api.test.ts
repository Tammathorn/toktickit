import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { seedGraded } from "../../src/seed/graded-seed.js";
import { createTicketWithNumber } from "../../src/lib/ticket-repository.js";

// Planned rows from tests.md section 2.2: API-15..API-25 (Issue #14).
//
// The fixture uses two Requesters created here and deleted in afterAll, so
// the demo seed's rows (which belong to the first three active Requesters)
// never influence counts or ordering, and parallel test files never collide.

const prisma = getPrisma();
const TAG = "[list-test]";

let owner: { id: number };
let other: { id: number };
let categories: { id: number; name: string }[];
let systems: { id: number; name: string }[];

// 13 owner rows -> two pages at pageSize 10 (BR-27); one row for the other
// Requester, whose summary would match every owner search if scoping failed.
const OWNER_ROWS = 13;
const created: { id: number; ticketNumber: string; summary: string }[] = [];

function list(query: Record<string, string | number | undefined>) {
  const qs = Object.entries(query)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join("&");
  return request(app).get(`/api/tickets?${qs}`);
}

beforeAll(async () => {
  await seedGraded(prisma);
  owner = await prisma.requesterUser.create({
    data: { name: `${TAG} Owner`, email: `list-owner-${Date.now()}@example.test` },
  });
  other = await prisma.requesterUser.create({
    data: { name: `${TAG} Other`, email: `list-other-${Date.now()}@example.test` },
  });
  categories = await prisma.category.findMany({ where: { isActive: true }, orderBy: { id: "asc" } });
  systems = await prisma.relatedSystem.findMany({ where: { isActive: true }, orderBy: { id: "asc" } });

  const base = Date.parse("2026-03-01T00:00:00Z");
  for (let i = 0; i < OWNER_ROWS; i++) {
    const t = await createTicketWithNumber(prisma, {
      requesterId: owner.id,
      categoryId: categories[i % categories.length].id,
      relatedSystemId: systems[i % systems.length].id,
      summary: `${TAG} ${i === 4 ? "Printer jams on every duplex job" : `Row ${String(i).padStart(2, "0")} laptop item`}`,
      description: `Description of list-test row ${i}; the word PRINTER appears here only for row ${i}.`,
      requestedPriority: "MEDIUM",
      // rows 1 and 2 share a timestamp so the id tiebreak (BR-26) is observable
      createdAt: new Date(base + (i === 2 ? 1 : i) * 60 * 60 * 1000),
    });
    created.push({ id: t.id, ticketNumber: t.ticketNumber!, summary: t.summary });
  }
  await createTicketWithNumber(prisma, {
    requesterId: other.id,
    categoryId: categories[0].id,
    relatedSystemId: systems[0].id,
    summary: `${TAG} Other requester laptop item`,
    description: "Belongs to the other Requester and must never appear in the owner's list.",
    requestedPriority: "LOW",
  });
});

afterAll(async () => {
  await prisma.ticket.deleteMany({ where: { requesterId: { in: [owner.id, other.id] } } });
  await prisma.requesterUser.deleteMany({ where: { id: { in: [owner.id, other.id] } } });
});

describe("GET /api/tickets", () => {
  it("API-15 scopes the list to the owner: no other Requester's Ticket appears (AC-03, BR-22)", async () => {
    const res = await list({ requesterId: owner.id, pageSize: 50 });
    expect(res.status).toBe(200);
    expect(res.body.meta.total).toBe(OWNER_ROWS);
    const ids = res.body.data.map((r: { id: number }) => r.id);
    expect(new Set(ids)).toEqual(new Set(created.map((c) => c.id)));

    const otherList = await list({ requesterId: other.id, pageSize: 50 });
    expect(otherList.body.meta.total).toBe(1);
    expect(otherList.body.data[0].summary).toBe(`${TAG} Other requester laptop item`);
  });

  it("returns the C-27 envelope and list-row shape, description omitted", async () => {
    const res = await list({ requesterId: owner.id });
    expect(res.status).toBe(200);
    expect(res.body.meta).toEqual({ page: 1, pageSize: 10, total: OWNER_ROWS, totalPages: 2, sort: "createdAt:desc" });
    expect(Object.keys(res.body.data[0]).sort()).toEqual(
      ["category", "createdAt", "currentStatus", "id", "itPriority", "relatedSystem", "requestedPriority", "summary", "ticketNumber", "updatedAt"].sort(),
    );
  });

  it("API-16 searches Ticket Summary case-insensitively by substring (AC-41, BR-23)", async () => {
    const res = await list({ requesterId: owner.id, search: "pRiNtEr JaMs" });
    expect(res.status).toBe(200);
    expect(res.body.data.map((r: { summary: string }) => r.summary)).toEqual([`${TAG} Printer jams on every duplex job`]);
  });

  it("API-17 searches Ticket Number by exact and by prefix, never Description (AC-42, BR-23)", async () => {
    const target = created[7];
    const exact = await list({ requesterId: owner.id, search: target.ticketNumber });
    expect(exact.body.data.map((r: { id: number }) => r.id)).toEqual([target.id]);

    const prefix = await list({ requesterId: owner.id, search: "TKT-", pageSize: 50 });
    expect(prefix.body.meta.total).toBe(OWNER_ROWS);

    // "PRINTER" appears in every Description but in only one Summary
    const description = await list({ requesterId: owner.id, search: "printer" });
    expect(description.body.meta.total).toBe(1);
  });

  it("API-18 filters by Category (AC-43, BR-24)", async () => {
    const cat = categories[1];
    const res = await list({ requesterId: owner.id, categoryId: cat.id, pageSize: 50 });
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    for (const row of res.body.data) expect(row.category.id).toBe(cat.id);
    expect(res.body.meta.total).toBe(created.filter((_, i) => i % categories.length === 1).length);
  });

  it("API-19 filters by Related System and by currentStatus (BR-24)", async () => {
    const sys = systems[2];
    const bySystem = await list({ requesterId: owner.id, relatedSystemId: sys.id, pageSize: 50 });
    expect(bySystem.status).toBe(200);
    for (const row of bySystem.body.data) expect(row.relatedSystem.id).toBe(sys.id);
    expect(bySystem.body.meta.total).toBe(created.filter((_, i) => i % systems.length === 2).length);

    const byStatus = await list({ requesterId: owner.id, currentStatus: "NEW", pageSize: 50 });
    expect(byStatus.body.meta.total).toBe(OWNER_ROWS);
    const none = await list({ requesterId: owner.id, currentStatus: "CLOSED" });
    expect(none.status).toBe(200);
    expect(none.body.data).toEqual([]);
    expect(none.body.meta.total).toBe(0);
  });

  it("API-20 returns page 2 as the correct slice with correct metadata (AC-44, BR-27)", async () => {
    const all = await list({ requesterId: owner.id, pageSize: 50 });
    const page2 = await list({ requesterId: owner.id, page: 2 });
    expect(page2.status).toBe(200);
    expect(page2.body.meta).toEqual({ page: 2, pageSize: 10, total: OWNER_ROWS, totalPages: 2, sort: "createdAt:desc" });
    expect(page2.body.data.map((r: { id: number }) => r.id)).toEqual(
      all.body.data.slice(10, 20).map((r: { id: number }) => r.id),
    );
    expect(page2.body.data).toHaveLength(OWNER_ROWS - 10);
  });

  it("API-21 answers a page beyond the last with data: [] and correct meta, status 200 (AC-45, BR-29)", async () => {
    const res = await list({ requesterId: owner.id, page: 9 });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.meta).toEqual({ page: 9, pageSize: 10, total: OWNER_ROWS, totalPages: 2, sort: "createdAt:desc" });
  });

  it("API-22 accepts page sizes 10, 25, 50 and refuses 11, page=abc and page=0 (BR-27, C-43)", async () => {
    for (const pageSize of [10, 25, 50]) {
      const res = await list({ requesterId: owner.id, pageSize });
      expect(res.status, `pageSize ${pageSize}`).toBe(200);
      expect(res.body.meta.pageSize).toBe(pageSize);
    }
    const eleven = await list({ requesterId: owner.id, pageSize: 11 });
    expect(eleven.status).toBe(400);
    expect(eleven.body.error.code).toBe("INVALID_QUERY_PARAM");
    expect(Object.keys(eleven.body.error.fields)).toEqual(["pageSize"]);

    for (const page of ["abc", "0", "-1", "1.5"]) {
      const res = await list({ requesterId: owner.id, page });
      expect(res.status, `page ${page}`).toBe(400);
      expect(res.body.error.code).toBe("INVALID_QUERY_PARAM");
      expect(Object.keys(res.body.error.fields)).toEqual(["page"]);
    }
  });

  it("API-23 orders correctly on each of the four permitted sort fields, both directions (AC-46, BR-25)", async () => {
    const fields: Array<[string, (r: Record<string, string>) => string]> = [
      ["createdAt", (r) => r.createdAt],
      ["ticketNumber", (r) => r.ticketNumber],
      ["summary", (r) => r.summary],
      ["currentStatus", (r) => r.currentStatus],
    ];
    for (const [field, pick] of fields) {
      for (const dir of ["asc", "desc"] as const) {
        const res = await list({ requesterId: owner.id, sort: `${field}:${dir}`, pageSize: 50 });
        expect(res.status, `${field}:${dir}`).toBe(200);
        expect(res.body.meta.sort).toBe(`${field}:${dir}`);
        const values = res.body.data.map(pick);
        const sorted = [...values].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
        if (dir === "desc") sorted.reverse();
        expect(values, `${field}:${dir}`).toEqual(sorted);
      }
    }
  });

  it("API-24 refuses a sort outside BR-25 with 400 naming sort (AC-47, BR-28)", async () => {
    for (const sort of ["description:asc", "createdAt:sideways", "createdAt", "id:desc"]) {
      const res = await list({ requesterId: owner.id, sort });
      expect(res.status, sort).toBe(400);
      expect(res.body.error.code).toBe("INVALID_QUERY_PARAM");
      expect(Object.keys(res.body.error.fields)).toEqual(["sort"]);
    }
  });

  it("API-25 defaults to createdAt desc with id desc as the tiebreak (AC-48, BR-26)", async () => {
    const res = await list({ requesterId: owner.id, pageSize: 50 });
    const rows: { id: number; createdAt: string }[] = res.body.data;
    for (let i = 1; i < rows.length; i++) {
      const prev = rows[i - 1];
      const cur = rows[i];
      expect(prev.createdAt >= cur.createdAt).toBe(true);
      if (prev.createdAt === cur.createdAt) expect(prev.id).toBeGreaterThan(cur.id);
    }
    // rows 1 and 2 share a timestamp: the later id (row 2) must come first
    const i1 = rows.findIndex((r) => r.id === created[1].id);
    const i2 = rows.findIndex((r) => r.id === created[2].id);
    expect(i2).toBe(i1 - 1);
  });

  it("refuses malformed filter values and a bad caller per the check order", async () => {
    const badCat = await list({ requesterId: owner.id, categoryId: "x" });
    expect(badCat.status).toBe(400);
    expect(Object.keys(badCat.body.error.fields)).toEqual(["categoryId"]);

    const badStatus = await list({ requesterId: owner.id, currentStatus: "OPEN" });
    expect(badStatus.status).toBe(400);
    expect(Object.keys(badStatus.body.error.fields)).toEqual(["currentStatus"]);

    const noCaller = await list({});
    expect(noCaller.status).toBe(400);
    expect(noCaller.body.error.code).toBe("REQUESTER_REQUIRED");

    const unknown = await list({ requesterId: 999999 });
    expect(unknown.status).toBe(404);
    expect(unknown.body.error.code).toBe("REQUESTER_NOT_FOUND");
  });
});

describe("GET /api/tickets/:id - ownership refusals used by the Part 7 rejection capture", () => {
  it("returns 403 TICKET_FORBIDDEN with no Ticket field for another Requester's Ticket (AC-03, BR-21)", async () => {
    const res = await request(app).get(`/api/tickets/${created[0].id}?requesterId=${other.id}`);
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: { code: "TICKET_FORBIDDEN", message: expect.any(String) } });
    expect(JSON.stringify(res.body)).not.toContain(created[0].ticketNumber);
  });

  it("returns 200 with the full Ticket to its owner, and 404 for an unknown id", async () => {
    const ok = await request(app).get(`/api/tickets/${created[0].id}?requesterId=${owner.id}`);
    expect(ok.status).toBe(200);
    expect(ok.body.ticketNumber).toBe(created[0].ticketNumber);
    expect(ok.body.attachments).toEqual([]);

    const missing = await request(app).get(`/api/tickets/999999?requesterId=${owner.id}`);
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe("TICKET_NOT_FOUND");
  });
});
