import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import type { TicketStatus } from "@prisma/client";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { deleteTickets } from "../support/cleanup.js";
import { createTicketWithNumber, type NewTicket } from "../../src/lib/ticket-repository.js";
import { SEED_PASSWORDS } from "../../src/seed/graded-seed.js";
import { removeUsers, signIn, signedInUser, type Agent } from "../support/agents.js";

// Lab 4 Requester dashboard - tests.md section 2.1 (UNIT-08), 2.3 (API-49 to
// API-59) and 2.4 (SEC-06, SEC-08, SEC-13), Issue #68.
//
// Count equals drill-down (C-127, BR-56): each card test reads the dashboard
// and GET /api/tickets with the card's own `drillDown` query in ONE test and
// asserts count = meta.total and the same Ticket ids. Every Requester here is
// created by this file, so a Requester's Tickets are exactly the fixture's
// and the expected counts are exact, not deltas. Lists are checked against
// the first rows of their drill-down (C-161). The 168 h boundary is asserted
// with `now` injected (C-142).
//
// Every user and Ticket here is created by this file and removed in afterAll;
// Tickets go through deleteTickets (Issue #63), which removes their history
// rows first.

const prisma = getPrisma();
const TAG = "[requester-dashboard-test]";
const SECOND = 1000;
const HOUR = 60 * 60 * SECOND;
const DAY = 24 * HOUR;
const DASHBOARD = "../../src/routes/dashboard.js";

const CARDS: [string, string, string][] = [
  ["openTickets", "Open tickets", "/tickets?statusGroup=open"],
  ["waitingForYou", "Waiting for you", "/tickets?currentStatus=WAITING_FOR_REQUESTER"],
  ["resolvedAwaitingClosure", "Resolved - awaiting closure", "/tickets?currentStatus=RESOLVED"],
  ["closed", "Closed", "/tickets?currentStatus=CLOSED"],
];
const ALL_STATUSES: TicketStatus[] = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CLOSED", "REOPENED", "CANCELLED"];
const OPEN_STATUSES: TicketStatus[] = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "REOPENED"];
const LIST_ITEM_KEYS = ["currentStatus", "id", "itPriority", "lastActivityAt", "summary", "ticketNumber"];

type Person = { id: number; email: string; name: string; agent: Agent };
const userIds: number[] = [];
let staff: Person;
let admin: Person;

let seq = 0;
// A fresh Requester with no Tickets, so its counts are exactly its fixture.
async function requester(label: string): Promise<Person> {
  const p = await signedInUser(prisma, `rd68-${label}`, { name: `${TAG} Requester ${label} ${++seq}` });
  userIds.push(p.id);
  return p;
}

// A fixture Ticket two hours old, OPEN unless the overrides say otherwise.
async function ticket(owner: Person, overrides: Partial<NewTicket> = {}) {
  const category = await prisma.category.findFirstOrThrow({ where: { isActive: true } });
  const system = await prisma.relatedSystem.findFirstOrThrow({ where: { isActive: true } });
  return createTicketWithNumber(prisma, {
    requesterId: owner.id,
    categoryId: category.id,
    relatedSystemId: system.id,
    summary: `${TAG} fixture ${++seq}`,
    description: "Fixture row for requester-dashboard.api.test.ts.",
    requestedPriority: "MEDIUM",
    createdAt: new Date(Date.now() - 2 * HOUR),
    currentStatus: "OPEN",
    ...overrides,
  });
}

// One Ticket in each of the eight statuses; returns the ids by status.
async function oneOfEach(owner: Person): Promise<Record<TicketStatus, number>> {
  const ids = {} as Record<TicketStatus, number>;
  for (const s of ALL_STATUSES) ids[s] = (await ticket(owner, { currentStatus: s })).id;
  return ids;
}

async function dashboard(as: Agent) {
  const res = await as.get("/api/dashboard/requester");
  expect(res.status, res.text).toBe(200);
  return res.body;
}

const cardOf = (body: { cards: { key: string; count: number; drillDown: string }[] }, key: string) => {
  const found = body.cards.find((c) => c.key === key);
  expect(found, `card ${key}`).toBeDefined();
  return found!;
};

// The API behind a `/tickets?...` drill-down URL is GET /api/tickets with the
// same query string (My Tickets reads its URL).
async function myTickets(as: Agent, query: string) {
  const res = await as.get(`/api/tickets?${query}`);
  expect(res.status, res.text).toBe(200);
  return res.body as { data: { id: number; lastActivityAt: string; currentStatus: string }[]; meta: { total: number } };
}
const drillQuery = (drillDown: string) => {
  expect(drillDown.startsWith("/tickets?")).toBe(true);
  return drillDown.slice("/tickets?".length);
};

const sortIds = (ids: number[]) => [...ids].sort((a, b) => a - b);

// count = meta.total, and the drill-down holds exactly the expected ids.
async function expectCardEqualsDrillDown(as: Agent, key: string, expectedIds: number[]) {
  const c = cardOf(await dashboard(as), key);
  const drill = await myTickets(as, `${drillQuery(c.drillDown)}&pageSize=50`);
  expect(c.count).toBe(drill.meta.total);
  expect(c.count).toBe(expectedIds.length);
  expect(sortIds(drill.data.map((r) => r.id))).toEqual(sortIds(expectedIds));
}

beforeAll(async () => {
  staff = await signedInUser(prisma, "rd68-staff", { role: "IT_STAFF", name: `${TAG} Staff` });
  admin = await signedInUser(prisma, "rd68-admin", { role: "ADMINISTRATOR", name: `${TAG} Admin` });
  userIds.push(staff.id, admin.id);
});

afterAll(async () => {
  await deleteTickets(prisma, { summary: { startsWith: TAG } });
  await removeUsers(prisma, userIds);
});

describe("Lab 4 Requester dashboard - the recent predicate (UNIT-08)", () => {
  it("UNIT-08 recentSince(now) is now - 168 h: a time exactly at it is recent, 1 ms earlier is not", async () => {
    const { recentSince } = await import(DASHBOARD);
    const now = new Date("2026-10-15T03:00:00.000Z");
    const since: Date = recentSince(now);
    const boundary = new Date(now.getTime() - 168 * HOUR);
    expect(since.toISOString()).toBe(boundary.toISOString());
    const isRecent = (t: Date) => t.getTime() >= since.getTime();
    expect(isRecent(boundary)).toBe(true);
    expect(isRecent(new Date(boundary.getTime() - 1))).toBe(false);
  });
});

describe("Lab 4 Requester dashboard - shape (API-49)", () => {
  it("API-49 GET /api/dashboard/requester -> 200 with generatedAt, Asia/Bangkok, four cards in api-spec 4.1 order; recentlyUpdated.viewAll set, recentlyResolved.viewAll null", async () => {
    const r = await requester("api49");
    const body = await dashboard(r.agent);
    expect(new Date(body.generatedAt).toISOString()).toBe(body.generatedAt);
    expect(body.timeZone).toBe("Asia/Bangkok");
    expect(body.cards.map((c: { key: string; label: string; drillDown: string }) => [c.key, c.label, c.drillDown])).toEqual(CARDS);
    for (const c of body.cards) {
      expect(Object.keys(c).sort()).toEqual(["count", "drillDown", "key", "label"]);
      expect(Number.isInteger(c.count)).toBe(true);
    }
    expect(Object.keys(body.lists).sort()).toEqual(["recentlyResolved", "recentlyUpdated"]);
    expect(body.lists.recentlyUpdated.viewAll).toBe("/tickets?sort=lastActivityAt:desc");
    expect(body.lists.recentlyResolved.viewAll).toBeNull();
  });
});

describe("Lab 4 Requester dashboard - one count = drill-down test per card (C-127, BR-56)", () => {
  it("API-50 card openTickets = GET /api/tickets?statusGroup=open: own Tickets in all eight statuses -> the five open statuses counted, RESOLVED, CLOSED, CANCELLED not; meta.total equal, same ids", async () => {
    const r = await requester("api50");
    const ids = await oneOfEach(r);
    await expectCardEqualsDrillDown(r.agent, "openTickets", OPEN_STATUSES.map((s) => ids[s]));
    const drill = await myTickets(r.agent, "statusGroup=open&pageSize=50");
    for (const row of drill.data) expect(OPEN_STATUSES).toContain(row.currentStatus);
  });

  it("API-51 card waitingForYou = ?currentStatus=WAITING_FOR_REQUESTER: only WAITING_FOR_REQUESTER counted; equals meta.total", async () => {
    const r = await requester("api51");
    const ids = await oneOfEach(r);
    await expectCardEqualsDrillDown(r.agent, "waitingForYou", [ids.WAITING_FOR_REQUESTER]);
  });

  it("API-52 card resolvedAwaitingClosure = ?currentStatus=RESOLVED: only RESOLVED counted; equals meta.total", async () => {
    const r = await requester("api52");
    const ids = await oneOfEach(r);
    await expectCardEqualsDrillDown(r.agent, "resolvedAwaitingClosure", [ids.RESOLVED]);
  });

  it("API-53 card closed = ?currentStatus=CLOSED: only CLOSED counted; equals meta.total", async () => {
    const r = await requester("api53");
    const ids = await oneOfEach(r);
    await expectCardEqualsDrillDown(r.agent, "closed", [ids.CLOSED]);
  });
});

describe("Lab 4 Requester dashboard - lists, order and the time boundary (C-161, C-142)", () => {
  it("API-54 recentlyUpdated with seven own recent Tickets, one own active 8 days ago and another Requester's recent one -> five own items within 7 days, lastActivityAt desc then id desc, equal to the first five rows of ?sort=lastActivityAt:desc", async () => {
    const r = await requester("api54");
    const other = await requester("api54-other");
    const now = Date.now();
    const made = [];
    // Seconds ago; two share a lastActivityAt to prove the id-desc tie-break.
    for (const s of [7, 2, 4, 4, 6, 3, 5]) {
      const tk = await ticket(r);
      made.push(await prisma.ticket.update({ where: { id: tk.id }, data: { lastActivityAt: new Date(now - s * SECOND) } }));
    }
    const old = await ticket(r);
    await prisma.ticket.update({ where: { id: old.id }, data: { lastActivityAt: new Date(now - 8 * DAY) } });
    const theirs = await ticket(other);
    await prisma.ticket.update({ where: { id: theirs.id }, data: { lastActivityAt: new Date(now - SECOND) } });
    const expected = [...made]
      .sort((a, b) => b.lastActivityAt.getTime() - a.lastActivityAt.getTime() || b.id - a.id)
      .slice(0, 5)
      .map((x) => x.id);

    const body = await dashboard(r.agent);
    const items = body.lists.recentlyUpdated.items as { id: number; lastActivityAt: string }[];
    const drill = await myTickets(r.agent, "sort=lastActivityAt:desc");
    expect(items.map((i) => i.id)).toEqual(expected);
    expect(items.map((i) => i.id)).toEqual(drill.data.slice(0, 5).map((row) => row.id));
    expect(items.map((i) => i.id)).not.toContain(old.id);
    expect(items.map((i) => i.id)).not.toContain(theirs.id);
    for (const i of items) expect(Date.parse(i.lastActivityAt)).toBeGreaterThanOrEqual(Date.parse(body.generatedAt) - 168 * HOUR);
  });

  it("API-55 recentlyResolved: a RESOLVED Ticket and one CLOSED after resolving both listed, resolvedAt desc then id desc; a legacy CLOSED Ticket with NULL resolvedAt never", async () => {
    const r = await requester("api55");
    const now = Date.now();
    const resolved = await ticket(r, { currentStatus: "RESOLVED" });
    const closedAfter = await ticket(r, { currentStatus: "CLOSED" });
    const resolvedEarlier = await ticket(r, { currentStatus: "RESOLVED" });
    const legacy = await ticket(r, { currentStatus: "CLOSED" });
    await prisma.ticket.update({ where: { id: resolved.id }, data: { resolvedAt: new Date(now - 1 * HOUR) } });
    await prisma.ticket.update({ where: { id: closedAfter.id }, data: { resolvedAt: new Date(now - 2 * HOUR) } });
    await prisma.ticket.update({ where: { id: resolvedEarlier.id }, data: { resolvedAt: new Date(now - 3 * HOUR) } });
    expect((await prisma.ticket.findUniqueOrThrow({ where: { id: legacy.id } })).resolvedAt).toBeNull();

    const body = await dashboard(r.agent);
    const items = body.lists.recentlyResolved.items as { id: number; resolvedAt: string; currentStatus: string }[];
    expect(items.map((i) => i.id)).toEqual([resolved.id, closedAfter.id, resolvedEarlier.id]);
    expect(items.find((i) => i.id === closedAfter.id)!.currentStatus).toBe("CLOSED");
    expect(items.map((i) => i.id)).not.toContain(legacy.id);
    expect(Object.keys(items[0]).sort()).toEqual([...LIST_ITEM_KEYS, "resolvedAt"].sort());
  });

  it("API-56 both Requester lists with now injected: rows at exactly now - 168 h are included, rows 1 ms earlier are excluded", async () => {
    const { requesterDashboard } = await import(DASHBOARD);
    const r = await requester("api56");
    // A fixed future `now`, so no other row of this Requester falls in its window.
    const now = new Date("2031-03-15T03:00:00.000Z");
    const boundary = new Date(now.getTime() - 168 * HOUR);
    const before = new Date(boundary.getTime() - 1);
    const inside = await ticket(r, { currentStatus: "RESOLVED" });
    const outside = await ticket(r, { currentStatus: "RESOLVED" });
    try {
      await prisma.ticket.update({ where: { id: inside.id }, data: { lastActivityAt: boundary, resolvedAt: boundary } });
      await prisma.ticket.update({ where: { id: outside.id }, data: { lastActivityAt: before, resolvedAt: before } });
      const body = await requesterDashboard(r.id, now);
      expect(new Date(body.generatedAt).toISOString()).toBe(now.toISOString());
      for (const list of ["recentlyUpdated", "recentlyResolved"] as const) {
        const ids = body.lists[list].items.map((i: { id: number }) => i.id);
        expect(ids, list).toEqual([inside.id]);
      }
    } finally {
      // Rows dated in the future would lead every later lastActivityAt list.
      await deleteTickets(prisma, { id: { in: [inside.id, outside.id] } });
    }
  });

  it("API-57 nattapong.w, who has zero Tickets -> four cards present, each count 0; both lists items []", async () => {
    const agent = await signIn("nattapong.w@example.ac.th", SEED_PASSWORDS.requester);
    const body = await dashboard(agent);
    expect(body.cards.map((c: { key: string }) => c.key)).toEqual(CARDS.map(([k]) => k));
    for (const c of body.cards) expect(c.count, c.key).toBe(0);
    expect(body.lists.recentlyUpdated.items).toEqual([]);
    expect(body.lists.recentlyResolved.items).toEqual([]);
    await agent.post("/api/auth/logout");
  });
});

describe("Lab 4 My Tickets changes behind the Requester cards (api-spec 5.2)", () => {
  it("API-58 GET /api/tickets?statusGroup=open&currentStatus=NEW and ?statusGroup=closed -> each 400 INVALID_QUERY_PARAM with fields.statusGroup", async () => {
    const r = await requester("api58");
    for (const query of ["statusGroup=open&currentStatus=NEW", "statusGroup=closed"]) {
      const res = await r.agent.get(`/api/tickets?${query}`);
      expect(res.status, query).toBe(400);
      expect(res.body.error.code).toBe("INVALID_QUERY_PARAM");
      expect(typeof res.body.error.fields.statusGroup, query).toBe("string");
    }
  });

  it("API-59 My Tickets sort=lastActivityAt:desc -> rows in lastActivityAt desc then id desc, each carrying lastActivityAt", async () => {
    const r = await requester("api59");
    const at = new Date(Date.now() - 3 * HOUR);
    const a = await ticket(r);
    const b = await ticket(r);
    const c = await ticket(r);
    await prisma.ticket.updateMany({ where: { id: { in: [a.id, b.id] } }, data: { lastActivityAt: at } });
    await prisma.ticket.update({ where: { id: c.id }, data: { lastActivityAt: new Date(Date.now() - HOUR) } });
    const res = await myTickets(r.agent, "sort=lastActivityAt:desc");
    for (const row of res.data) expect(typeof row.lastActivityAt).toBe("string");
    expect(res.data.map((row) => row.id)).toEqual([c.id, b.id, a.id]);
  });
});

describe("Lab 4 Requester dashboard - authorization (SEC-06, SEC-08, SEC-13)", () => {
  it("SEC-06 IT Staff and Administrator GET /api/dashboard/requester -> each 403 FORBIDDEN_ROLE, body exactly { error: { code, message } }, no metric content", async () => {
    for (const who of [staff, admin]) {
      const res = await who.agent.get("/api/dashboard/requester");
      expect(res.status, who.name).toBe(403);
      expect(Object.keys(res.body)).toEqual(["error"]);
      expect(Object.keys(res.body.error).sort()).toEqual(["code", "message"]);
      expect(res.body.error.code).toBe("FORBIDDEN_ROLE");
      for (const k of ["cards", "lists", "count", "generatedAt"]) expect(res.text).not.toContain(k);
    }
    const anon = await request(app).get("/api/dashboard/requester");
    expect(anon.status).toBe(401);
  });

  it("SEC-08 Requester A never sees Requester B's numbers: A's counts equal A's fixture, no B id or number in A's body, ?requesterId=<B> changes nothing, B's new Tickets leave A's response identical", async () => {
    const a = await requester("sec08-a");
    const b = await requester("sec08-b");
    const aOpen = await ticket(a, { currentStatus: "IN_PROGRESS" });
    const aResolved = await ticket(a, { currentStatus: "RESOLVED" });
    await prisma.ticket.update({ where: { id: aResolved.id }, data: { resolvedAt: new Date(Date.now() - HOUR) } });
    const bTickets = [];
    for (const s of ALL_STATUSES) bTickets.push(await ticket(b, { currentStatus: s }));
    for (const s of ["RESOLVED", "CLOSED"] as TicketStatus[]) {
      const tk = await ticket(b, { currentStatus: s });
      bTickets.push(await prisma.ticket.update({ where: { id: tk.id }, data: { resolvedAt: new Date(Date.now() - HOUR) } }));
    }

    const strip = (body: Record<string, unknown>) => ({ ...body, generatedAt: undefined });
    const first = await dashboard(a.agent);
    const counts = Object.fromEntries(first.cards.map((c: { key: string; count: number }) => [c.key, c.count]));
    expect(counts).toEqual({ openTickets: 1, waitingForYou: 0, resolvedAwaitingClosure: 1, closed: 0 });
    expect(first.lists.recentlyUpdated.items.map((i: { id: number }) => i.id).sort()).toEqual(sortIds([aOpen.id, aResolved.id]));
    expect(first.lists.recentlyResolved.items.map((i: { id: number }) => i.id)).toEqual([aResolved.id]);
    const text = JSON.stringify(first);
    for (const t of bTickets) {
      expect(text).not.toContain(t.ticketNumber);
      expect(text).not.toMatch(new RegExp(`"id":${t.id}[,}]`));
    }

    const spoofed = await a.agent.get(`/api/dashboard/requester?requesterId=${b.id}`);
    expect(spoofed.status).toBe(200);
    expect(strip(spoofed.body)).toEqual(strip(first));

    await ticket(b, { currentStatus: "WAITING_FOR_REQUESTER" });
    await ticket(b, { currentStatus: "CLOSED" });
    const after = await dashboard(a.agent);
    expect(strip(after)).toEqual(strip(first));
  });

  it("SEC-13 Requester dashboard list items carry only the api-spec 4.1 keys: no requester, owner, email, description or note key", async () => {
    const r = await requester("sec13");
    const tk = await ticket(r, { currentStatus: "RESOLVED", ownerId: staff.id });
    await prisma.ticket.update({ where: { id: tk.id }, data: { resolvedAt: new Date(Date.now() - HOUR) } });
    const body = await dashboard(r.agent);
    const updated = body.lists.recentlyUpdated.items;
    const resolved = body.lists.recentlyResolved.items;
    expect(updated).toHaveLength(1);
    expect(resolved).toHaveLength(1);
    expect(Object.keys(updated[0]).sort()).toEqual([...LIST_ITEM_KEYS].sort());
    expect(Object.keys(resolved[0]).sort()).toEqual([...LIST_ITEM_KEYS, "resolvedAt"].sort());
    const text = JSON.stringify(body);
    for (const k of ["requester", "owner", "email", "description", "note"]) expect(text.toLowerCase()).not.toContain(`"${k}`);
    expect(text).not.toContain(staff.email);
  });
});
