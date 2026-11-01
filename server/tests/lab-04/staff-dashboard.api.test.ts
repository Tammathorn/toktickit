import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Prisma, UserRole } from "@prisma/client";
import { getPrisma } from "../../src/prisma.js";
import { deleteTickets } from "../support/cleanup.js";
import { createTicketWithNumber, type NewTicket } from "../../src/lib/ticket-repository.js";
import { hashPassword } from "../../src/lib/password.js";
import { removeUsers, signedInUser, TEST_PASSWORD, type Agent } from "../support/agents.js";

// Lab 4 IT Staff and Administrator dashboard - tests.md section 2.3 (API-60 to
// API-81) and 2.4 (SEC-05, SEC-07), Issue #67.
//
// Count equals drill-down (C-127, BR-56): each card test builds its own rows,
// including rows the card must not count, then in ONE test reads the
// dashboard and the API query behind the card's own `drillDown` URL, and
// asserts count = meta.total (or the panel's row count, C-169) and that the
// count moved by exactly the fixture's expected number. Lists are checked
// against the first rows of their drill-down (C-161). The 168 h boundary is
// asserted with `now` injected (C-142).
//
// Every user, Ticket and action here is created by this file and removed in
// afterAll; Tickets go through deleteTickets (Issue #63), which removes their
// actions and history rows first. Server test files run one at a time
// (fileParallelism: false), so the before/after deltas are stable.

const prisma = getPrisma();
const TAG = "[staff-dashboard-test]";
const SECOND = 1000;
const HOUR = 60 * 60 * SECOND;
const DASHBOARD = "../../src/routes/dashboard.js";

const CARDS: [string, string, string][] = [
  ["unassigned", "Unassigned", "/queue?owner=unassigned"],
  ["mine", "Mine", "/queue?owner=me"],
  ["statusNew", "New", "/queue?currentStatus=NEW"],
  ["statusOpen", "Open", "/queue?currentStatus=OPEN"],
  ["statusInProgress", "In Progress", "/queue?currentStatus=IN_PROGRESS"],
  ["statusWaitingForRequester", "Waiting for Requester", "/queue?currentStatus=WAITING_FOR_REQUESTER"],
  ["statusReopened", "Reopened", "/queue?currentStatus=REOPENED"],
  ["statusResolved", "Resolved", "/queue?currentStatus=RESOLVED"],
  ["highItPriority", "High IT Priority", "/queue?itPriority=HIGH"],
  ["requesterSaysResolved", "Requester says resolved", "/queue?requesterResolved=true"],
  ["myPlannedActions", "My planned actions", "/dashboard#my-actions"],
];

type Person = { id: number; name: string; email: string; agent: Agent };
let staffA: Person;
let staffB: Person;
let admin: Person;
let requester: Person;
const userIds: number[] = [];

let seq = 0;
// A token unique to one test, put in each fixture's summary so the queue's
// `search` can pick out exactly this test's rows.
const token = (id: string) => `sd67-${id}-${Date.now()}-${++seq}`;

// A fixture Ticket two hours old (so lastActivityAt = createdAt sits behind
// the API-76 rows), unowned and OPEN unless the overrides say otherwise.
async function ticket(summaryToken: string, overrides: Partial<NewTicket> = {}) {
  const category = await prisma.category.findFirstOrThrow({ where: { isActive: true } });
  const system = await prisma.relatedSystem.findFirstOrThrow({ where: { isActive: true } });
  return createTicketWithNumber(prisma, {
    requesterId: requester.id,
    categoryId: category.id,
    relatedSystemId: system.id,
    summary: `${TAG} ${summaryToken}`,
    description: "Fixture row for staff-dashboard.api.test.ts.",
    requestedPriority: "MEDIUM",
    createdAt: new Date(Date.now() - 2 * HOUR),
    currentStatus: "OPEN",
    ...overrides,
  });
}

function plannedAction(ticketId: number, assigneeId: number, data: Partial<Prisma.ActionTakenUncheckedCreateInput> = {}) {
  return prisma.actionTaken.create({
    data: {
      ticketId,
      status: "PLANNED",
      actionAt: new Date(Date.now() + HOUR),
      description: `${TAG} planned work`,
      assigneeId,
      createdById: assigneeId,
      ...data,
    },
  });
}

async function dashboard(as: Agent) {
  const res = await as.get("/api/dashboard/staff");
  expect(res.status, JSON.stringify(res.body)).toBe(200);
  return res.body;
}

async function card(as: Agent, key: string): Promise<{ key: string; label: string; count: number; drillDown: string }> {
  const body = await dashboard(as);
  const found = body.cards.find((c: { key: string }) => c.key === key);
  expect(found, `card ${key}`).toBeDefined();
  return found;
}

// The API behind a `/queue?...` drill-down URL is GET /api/staff/tickets with
// the same query string (ui-spec: the queue screen reads its URL).
async function queue(as: Agent, query: string) {
  const res = await as.get(`/api/staff/tickets?${query}`);
  expect(res.status, JSON.stringify(res.body)).toBe(200);
  return res.body as { data: { id: number; lastActivityAt: string; requesterResolvedAt: string | null; currentStatus: string }[]; meta: { total: number } };
}
const drillQuery = (drillDown: string) => {
  expect(drillDown.startsWith("/queue?")).toBe(true);
  return drillDown.slice("/queue?".length);
};

// One test per staff card: count before, fixtures, count after and the
// drill-down's meta.total in the same test.
async function expectCardEqualsDrillDown(
  key: string,
  build: (t: string) => Promise<{ counted: number[]; notCounted: number[] }>,
  as: Agent = staffA.agent,
) {
  const before = await card(as, key);
  const t = token(key);
  const { counted, notCounted } = await build(t);
  const after = await card(as, key);
  const drill = await queue(as, drillQuery(after.drillDown));
  expect(after.count).toBe(drill.meta.total);
  expect(after.count - before.count).toBe(counted.length);
  // The drill-down list holds the counted fixtures and none of the others.
  const mine = await queue(as, `${drillQuery(after.drillDown)}&search=${t}&pageSize=50`);
  expect(mine.data.map((r) => r.id).sort((a, b) => a - b)).toEqual([...counted].sort((a, b) => a - b));
  for (const id of notCounted) expect(mine.data.map((r) => r.id)).not.toContain(id);
}

async function userFixture(role: UserRole, isActive: boolean) {
  const u = await prisma.user.create({
    data: {
      name: `${TAG} ${role} ${isActive ? "active" : "inactive"} ${++seq}`,
      email: `sd67-${role.toLowerCase()}-${Date.now()}-${seq}@example.test`,
      role,
      isActive,
      passwordHash: hashPassword(TEST_PASSWORD),
      mustChangePassword: false,
    },
  });
  userIds.push(u.id);
  return u;
}

beforeAll(async () => {
  staffA = await signedInUser(prisma, "sd-staffa", { role: "IT_STAFF", name: `${TAG} Staff A` });
  staffB = await signedInUser(prisma, "sd-staffb", { role: "IT_STAFF", name: `${TAG} Staff B` });
  admin = await signedInUser(prisma, "sd-admin", { role: "ADMINISTRATOR", name: `${TAG} Admin` });
  requester = await signedInUser(prisma, "sd-req", { name: `${TAG} Requester` });
  userIds.push(staffA.id, staffB.id, admin.id, requester.id);
});

afterAll(async () => {
  await deleteTickets(prisma, { summary: { startsWith: TAG } });
  await removeUsers(prisma, userIds);
});

describe("Lab 4 staff dashboard - shape (API-60)", () => {
  it("API-60 GET /api/dashboard/staff -> 200 with generatedAt, Asia/Bangkok, eleven cards in api-spec 4.2 order and three lists", async () => {
    const body = await dashboard(staffA.agent);
    expect(new Date(body.generatedAt).toISOString()).toBe(body.generatedAt);
    expect(body.timeZone).toBe("Asia/Bangkok");
    expect(body.cards.map((c: { key: string; label: string; drillDown: string }) => [c.key, c.label, c.drillDown])).toEqual(CARDS);
    for (const c of body.cards) {
      expect(Object.keys(c).sort()).toEqual(["count", "drillDown", "key", "label"]);
      expect(Number.isInteger(c.count)).toBe(true);
    }
    expect(Object.keys(body.lists).sort()).toEqual(["myPlannedActions", "recentlyUpdated", "urgent"]);
    expect(body.lists.myPlannedActions.viewAll).toBeNull();
    expect(body.lists.recentlyUpdated.viewAll).toBe("/queue?sort=lastActivityAt:desc");
    expect(body.lists.urgent.viewAll).toBe("/queue?itPriority=HIGH");
  });
});

describe("Lab 4 staff dashboard - one count = drill-down test per card (C-127, BR-56)", () => {
  it("API-61 card unassigned = GET /api/staff/tickets?owner=unassigned meta.total: an unowned OPEN counted, an unowned CLOSED not", async () => {
    await expectCardEqualsDrillDown("unassigned", async (t) => {
      const yes = await ticket(t);
      const no = await ticket(t, { currentStatus: "CLOSED" });
      const owned = await ticket(t, { ownerId: staffA.id });
      return { counted: [yes.id], notCounted: [no.id, owned.id] };
    });
  });

  it("API-62 card mine = ?owner=me meta.total: only the caller's active Tickets; another user's and the caller's CLOSED excluded", async () => {
    await expectCardEqualsDrillDown("mine", async (t) => {
      const yes = await ticket(t, { ownerId: staffA.id, currentStatus: "IN_PROGRESS" });
      const other = await ticket(t, { ownerId: staffB.id });
      const closed = await ticket(t, { ownerId: staffA.id, currentStatus: "CLOSED" });
      return { counted: [yes.id], notCounted: [other.id, closed.id] };
    });
  });

  const statusCards: [string, string, "NEW" | "OPEN" | "IN_PROGRESS" | "WAITING_FOR_REQUESTER" | "REOPENED" | "RESOLVED", "NEW" | "OPEN"][] = [
    ["API-63", "statusNew", "NEW", "OPEN"],
    ["API-64", "statusOpen", "OPEN", "NEW"],
    ["API-65", "statusInProgress", "IN_PROGRESS", "OPEN"],
    ["API-66", "statusWaitingForRequester", "WAITING_FOR_REQUESTER", "OPEN"],
    ["API-67", "statusReopened", "REOPENED", "OPEN"],
    ["API-68", "statusResolved", "RESOLVED", "OPEN"],
  ];
  for (const [id, key, status, otherStatus] of statusCards) {
    it(`${id} card ${key} = ?currentStatus=${status} meta.total: only ${status} counted`, async () => {
      await expectCardEqualsDrillDown(key, async (t) => {
        const yes = await ticket(t, { currentStatus: status, ownerId: staffA.id });
        const other = await ticket(t, { currentStatus: otherStatus, ownerId: staffA.id });
        const closed = await ticket(t, { currentStatus: "CLOSED", ownerId: staffA.id });
        return { counted: [yes.id], notCounted: [other.id, closed.id] };
      });
    });
  }

  it("API-69 card highItPriority = ?itPriority=HIGH meta.total: an active High counted, a CLOSED High and an active Medium not", async () => {
    await expectCardEqualsDrillDown("highItPriority", async (t) => {
      const yes = await ticket(t, { itPriority: "HIGH" });
      const closed = await ticket(t, { itPriority: "HIGH", currentStatus: "CLOSED" });
      const medium = await ticket(t, { itPriority: "MEDIUM" });
      return { counted: [yes.id], notCounted: [closed.id, medium.id] };
    });
  });

  it("API-70 card requesterSaysResolved = ?requesterResolved=true meta.total: a flagged active Ticket counted and listed, an unflagged one and a flagged CLOSED one not", async () => {
    await expectCardEqualsDrillDown("requesterSaysResolved", async (t) => {
      const yes = await ticket(t, { currentStatus: "IN_PROGRESS", ownerId: staffA.id, requesterResolvedAt: new Date() });
      const unflagged = await ticket(t, { currentStatus: "IN_PROGRESS", ownerId: staffA.id });
      const closed = await ticket(t, { currentStatus: "CLOSED", ownerId: staffA.id, requesterResolvedAt: new Date() });
      return { counted: [yes.id], notCounted: [unflagged.id, closed.id] };
    });
  });

  it("API-71 card myPlannedActions = the panel's row count: the caller's PLANNED action on an active Ticket counted; another assignee's, a COMPLETED one and one on a CLOSED Ticket not", async () => {
    const before = await dashboard(staffA.agent);
    const beforeCard = before.cards.find((c: { key: string }) => c.key === "myPlannedActions");
    const t = token("planned");
    const active = await ticket(t, { ownerId: staffA.id, currentStatus: "IN_PROGRESS" });
    const closed = await ticket(t, { ownerId: staffA.id, currentStatus: "CLOSED" });
    const yes = await plannedAction(active.id, staffA.id);
    const other = await plannedAction(active.id, staffB.id);
    const done = await plannedAction(active.id, staffA.id, { status: "COMPLETED", actionAt: new Date(Date.now() - HOUR), result: "Done.", performedById: staffA.id, finishedAt: new Date(Date.now() - HOUR) });
    const onClosed = await plannedAction(closed.id, staffA.id);

    const after = await dashboard(staffA.agent);
    const afterCard = after.cards.find((c: { key: string }) => c.key === "myPlannedActions");
    const panel = after.lists.myPlannedActions.items as { id: number }[];
    expect(afterCard.drillDown).toBe("/dashboard#my-actions");
    expect(afterCard.count).toBe(panel.length);
    expect(afterCard.count - beforeCard.count).toBe(1);
    const ids = panel.map((i) => i.id);
    expect(ids).toContain(yes.id);
    for (const id of [other.id, done.id, onClosed.id]) expect(ids).not.toContain(id);
  });
});

describe("Lab 4 staff dashboard - Administrator user cards (BR-87)", () => {
  const userCards: [string, string, UserRole, string][] = [
    ["API-72", "requesters", "REQUESTER", "Requesters"],
    ["API-73", "itStaff", "IT_STAFF", "IT Staff"],
    ["API-74", "administrators", "ADMINISTRATOR", "Administrators"],
  ];
  for (const [id, key, role, label] of userCards) {
    it(`${id} Administrator card ${key} = GET /api/users?role=${role}: count is the list length, inactive included; activeCount the active ones`, async () => {
      const before = (await dashboard(admin.agent)).userCounts.find((u: { key: string }) => u.key === key);
      await userFixture(role, true);
      await userFixture(role, false);
      const body = await dashboard(admin.agent);
      const u = body.userCounts.find((x: { key: string }) => x.key === key);
      expect(u.label).toBe(label);
      expect(u.drillDown).toBe(`/users?role=${role}`);
      const list = await admin.agent.get(`/api/users?role=${role}`);
      expect(list.status).toBe(200);
      expect(u.count).toBe(list.body.length);
      expect(u.activeCount).toBe(list.body.filter((x: { isActive: boolean }) => x.isActive).length);
      expect(u.count - before.count).toBe(2);
      expect(u.activeCount - before.activeCount).toBe(1);
    });
  }
});

describe("Lab 4 staff dashboard - list order, caps and the time boundary (C-161, C-169, C-142)", () => {
  it("API-75 seven PLANNED actions assigned to the caller -> all seven in the panel, actionAt asc then id asc, no cap; card 7", async () => {
    const staffC = await signedInUser(prisma, "sd-staffc", { role: "IT_STAFF", name: `${TAG} Staff C` });
    userIds.push(staffC.id);
    const tk = await ticket(token("api75"), { ownerId: staffC.id, currentStatus: "IN_PROGRESS" });
    const base = Date.now() + 2 * HOUR;
    // Out of order on purpose; two share an actionAt to prove the id-asc tie-break.
    const offsets = [5, 1, 3, 3, 7, 2, 6];
    const created = [];
    for (const o of offsets) created.push(await plannedAction(tk.id, staffC.id, { actionAt: new Date(base + o * HOUR) }));
    const expected = [...created].sort((a, b) => a.actionAt.getTime() - b.actionAt.getTime() || a.id - b.id).map((a) => a.id);

    const body = await dashboard(staffC.agent);
    const items = body.lists.myPlannedActions.items;
    expect(items.map((i: { id: number }) => i.id)).toEqual(expected);
    expect(body.cards.find((c: { key: string }) => c.key === "myPlannedActions").count).toBe(7);
    expect(Object.keys(items[0]).sort()).toEqual(["actionAt", "description", "id", "ticket"]);
    expect(Object.keys(items[0].ticket).sort()).toEqual(["currentStatus", "id", "summary", "ticketNumber"]);
  });

  it("API-76 recentlyUpdated with seven recent active Tickets and a CLOSED one updated today -> five items, the CLOSED absent, equal to the first five rows of ?sort=lastActivityAt:desc", async () => {
    const t = token("api76");
    const now = Date.now();
    const made = [];
    // Seconds ago; two share a lastActivityAt to prove the id-desc tie-break.
    for (const s of [7, 2, 4, 4, 6, 3, 5]) {
      const tk = await ticket(t, { ownerId: staffA.id });
      made.push(await prisma.ticket.update({ where: { id: tk.id }, data: { lastActivityAt: new Date(now - s * SECOND) } }));
    }
    const closed = await ticket(t, { ownerId: staffA.id, currentStatus: "CLOSED" });
    await prisma.ticket.update({ where: { id: closed.id }, data: { lastActivityAt: new Date(now - SECOND) } });
    const expected = [...made]
      .sort((a, b) => b.lastActivityAt.getTime() - a.lastActivityAt.getTime() || b.id - a.id)
      .slice(0, 5)
      .map((x) => x.id);

    const body = await dashboard(staffA.agent);
    const items = body.lists.recentlyUpdated.items as { id: number }[];
    const drill = await queue(staffA.agent, "sort=lastActivityAt:desc");
    expect(items.map((i) => i.id)).toEqual(expected);
    expect(items.map((i) => i.id)).toEqual(drill.data.slice(0, 5).map((r) => r.id));
    expect(items.map((i) => i.id)).not.toContain(closed.id);
    expect(Object.keys(items[0]).sort()).toEqual(["currentStatus", "id", "itPriority", "lastActivityAt", "summary", "ticketNumber"]);
  });

  it("API-77 urgent with seven active High Tickets (two sharing createdAt), Medium ones and a CLOSED High -> five High items, createdAt asc then id desc, equal to the first five rows of ?itPriority=HIGH", async () => {
    const t = token("api77");
    // Older than any seeded Ticket, so these are the first High rows in the queue.
    const day = (d: number) => new Date(Date.UTC(2001, 0, d, 3, 0, 0));
    const highs = [];
    for (const d of [6, 2, 4, 4, 7, 3, 5]) highs.push(await ticket(t, { itPriority: "HIGH", createdAt: day(d) }));
    await ticket(t, { itPriority: "MEDIUM", createdAt: day(1) });
    await ticket(t, { itPriority: "MEDIUM", createdAt: day(2) });
    const closedHigh = await ticket(t, { itPriority: "HIGH", currentStatus: "CLOSED", createdAt: day(1) });
    const expected = [...highs]
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || b.id - a.id)
      .slice(0, 5)
      .map((x) => x.id);

    const body = await dashboard(staffA.agent);
    const items = body.lists.urgent.items as { id: number; itPriority: string; createdAt: string }[];
    const drill = await queue(staffA.agent, "itPriority=HIGH");
    expect(items.map((i) => i.id)).toEqual(expected);
    expect(items.map((i) => i.id)).toEqual(drill.data.slice(0, 5).map((r) => r.id));
    expect(items.map((i) => i.id)).not.toContain(closedHigh.id);
    for (const i of items) expect(i.itPriority).toBe("HIGH");
    expect(Object.keys(items[0]).sort()).toEqual(["createdAt", "currentStatus", "id", "itPriority", "lastActivityAt", "summary", "ticketNumber"]);
  });

  it("API-78 staff recentlyUpdated with now injected: a row at exactly now - 168 h is included, one 1 ms earlier is excluded", async () => {
    const { staffDashboard } = await import(DASHBOARD);
    // A fixed future `now`, so no other row in the database falls in its window.
    const now = new Date("2031-03-15T03:00:00.000Z");
    const boundary = new Date(now.getTime() - 168 * HOUR);
    const t = token("api78");
    const inside = await ticket(t, { ownerId: staffA.id });
    const outside = await ticket(t, { ownerId: staffA.id });
    try {
      await prisma.ticket.update({ where: { id: inside.id }, data: { lastActivityAt: boundary } });
      await prisma.ticket.update({ where: { id: outside.id }, data: { lastActivityAt: new Date(boundary.getTime() - 1) } });
      const body = await staffDashboard(staffA.id, "IT_STAFF", now);
      const ids = body.lists.recentlyUpdated.items.map((i: { id: number }) => i.id);
      expect(new Date(body.generatedAt).toISOString()).toBe(now.toISOString());
      expect(ids).toContain(inside.id);
      expect(ids).not.toContain(outside.id);
    } finally {
      // Rows dated in the future would lead every later lastActivityAt list.
      await deleteTickets(prisma, { id: { in: [inside.id, outside.id] } });
    }
  });

  it("API-79 the Administrator who owns nothing -> mine 0 and myPlannedActions 0, both present; panel items []", async () => {
    const body = await dashboard(admin.agent);
    const mine = body.cards.find((c: { key: string }) => c.key === "mine");
    const planned = body.cards.find((c: { key: string }) => c.key === "myPlannedActions");
    expect(mine.count).toBe(0);
    expect(planned.count).toBe(0);
    expect(body.lists.myPlannedActions.items).toEqual([]);
  });
});

describe("Lab 4 queue changes behind the staff cards (api-spec 5.8)", () => {
  it("API-80 queue sort=lastActivityAt:desc -> lastActivityAt desc then id desc, lastActivityAt on each row; sort=updatedAt:desc still 200", async () => {
    const t = token("api80");
    const at = new Date(Date.now() - 3 * HOUR);
    const a = await ticket(t, { ownerId: staffA.id });
    const b = await ticket(t, { ownerId: staffA.id });
    await prisma.ticket.updateMany({ where: { id: { in: [a.id, b.id] } }, data: { lastActivityAt: at } });
    const res = await queue(staffA.agent, "sort=lastActivityAt:desc&pageSize=50");
    expect(res.data.length).toBeGreaterThan(1);
    for (const r of res.data) expect(typeof r.lastActivityAt).toBe("string");
    for (let i = 1; i < res.data.length; i++) {
      const prev = res.data[i - 1];
      const cur = res.data[i];
      const p = Date.parse(prev.lastActivityAt);
      const c = Date.parse(cur.lastActivityAt);
      expect(p > c || (p === c && prev.id > cur.id), `row ${i}`).toBe(true);
    }
    const tied = await queue(staffA.agent, `sort=lastActivityAt:desc&search=${t}`);
    expect(tied.data.map((r) => r.id)).toEqual([b.id, a.id]);
    const old = await staffA.agent.get("/api/staff/tickets?sort=updatedAt:desc");
    expect(old.status).toBe(200);
  });

  it("API-81 queue requesterResolved=true filters to flagged rows within the default status set; =false and =yes -> 400 INVALID_QUERY_PARAM", async () => {
    const t = token("api81");
    const flagged = await ticket(t, { ownerId: staffA.id, requesterResolvedAt: new Date() });
    const unflagged = await ticket(t, { ownerId: staffA.id });
    const closedFlagged = await ticket(t, { ownerId: staffA.id, currentStatus: "CLOSED", requesterResolvedAt: new Date() });
    const all = await queue(staffA.agent, "requesterResolved=true&pageSize=50");
    for (const r of all.data) {
      expect(r.requesterResolvedAt).not.toBeNull();
      expect(["CLOSED", "CANCELLED"]).not.toContain(r.currentStatus);
    }
    const mine = await queue(staffA.agent, `requesterResolved=true&search=${t}`);
    expect(mine.data.map((r) => r.id)).toEqual([flagged.id]);
    expect(mine.data.map((r) => r.id)).not.toContain(unflagged.id);
    expect(mine.data.map((r) => r.id)).not.toContain(closedFlagged.id);
    for (const bad of ["false", "yes"]) {
      const res = await staffA.agent.get(`/api/staff/tickets?requesterResolved=${bad}`);
      expect(res.status, bad).toBe(400);
      expect(res.body.error.code).toBe("INVALID_QUERY_PARAM");
    }
  });
});

describe("Lab 4 staff dashboard - authorization (SEC-05, SEC-07)", () => {
  it("SEC-05 Requester GET /api/dashboard/staff -> 403 FORBIDDEN_ROLE, body exactly { error: { code, message } }, no metric content", async () => {
    const res = await requester.agent.get("/api/dashboard/staff");
    expect(res.status).toBe(403);
    expect(Object.keys(res.body)).toEqual(["error"]);
    expect(Object.keys(res.body.error).sort()).toEqual(["code", "message"]);
    expect(res.body.error.code).toBe("FORBIDDEN_ROLE");
    const text = JSON.stringify(res.body);
    for (const k of ["cards", "lists", "userCounts", "count", "generatedAt"]) expect(text).not.toContain(k);
  });

  it("SEC-07 IT Staff and Administrator GET /api/dashboard/staff -> only the Administrator's body has userCounts; on IT Staff's the key is absent, not null", async () => {
    const staff = await dashboard(staffA.agent);
    expect(Object.prototype.hasOwnProperty.call(staff, "userCounts")).toBe(false);
    const adm = await dashboard(admin.agent);
    expect(adm.userCounts.map((u: { key: string }) => u.key)).toEqual(["requesters", "itStaff", "administrators"]);
    for (const u of adm.userCounts) expect(Object.keys(u).sort()).toEqual(["activeCount", "count", "drillDown", "key", "label"]);
  });
});
