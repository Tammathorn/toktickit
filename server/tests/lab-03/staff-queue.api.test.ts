import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getPrisma } from "../../src/prisma.js";
import { seedGraded } from "../../src/seed/graded-seed.js";
import { createTicketWithNumber, type NewTicket } from "../../src/lib/ticket-repository.js";
import { removeUsers, signedInUser, type Agent } from "../support/agents.js";

// Planned rows from tests.md section 2.2: API-29..API-48 (Issue #41). The
// queue is not Requester-scoped (BR-74, api-spec.md 8.1), so every fixture
// Ticket carries a unique marker word in its summary and tests scope their
// assertions with `search=<marker>` rather than relying on a total count -
// the graded seed and any Ticket another file leaves behind must never
// change what these tests see.
//
// Every user and Ticket here is created by this file and removed in
// afterAll; the seeded accounts are never signed in as.

const prisma = getPrisma();
const TAG = "[queue-test]";

type Row = { id: number; ticketNumber: string | null };

let staffX: { id: number; name: string; agent: Agent };
let staffY: { id: number; name: string; agent: Agent };
let admin: { id: number; agent: Agent };
let reqA: { id: number; agent: Agent };
let reqB: { id: number; agent: Agent };
let inactiveStaff: { id: number; name: string };
let categories: { id: number; name: string }[];
const allUserIds: number[] = [];
const allTicketIds: number[] = [];
const fixtures: Record<string, Row> = {};

function queue(as: Agent, query: Record<string, string | number | undefined> = {}) {
  const qs = Object.entries(query)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join("&");
  return as.get(`/api/staff/tickets${qs ? `?${qs}` : ""}`);
}

async function ticket(summary: string, overrides: Partial<NewTicket>): Promise<Row> {
  const relatedSystem = await prisma.relatedSystem.findFirstOrThrow({ where: { isActive: true } });
  const t = await createTicketWithNumber(prisma, {
    requesterId: reqA.id,
    categoryId: categories[0].id,
    relatedSystemId: relatedSystem.id,
    summary: `${TAG} ${summary}`,
    description: "Fixture row for staff-queue.api.test.ts. The word NEVERMATCH only appears here.",
    requestedPriority: "MEDIUM",
    ...overrides,
  });
  allTicketIds.push(t.id);
  return { id: t.id, ticketNumber: t.ticketNumber };
}

beforeAll(async () => {
  await seedGraded(prisma);
  staffX = await signedInUser(prisma, "queue-staffx", { role: "IT_STAFF", name: `${TAG} Staff X` });
  staffY = await signedInUser(prisma, "queue-staffy", { role: "IT_STAFF", name: `${TAG} Staff Y` });
  admin = await signedInUser(prisma, "queue-admin", { role: "ADMINISTRATOR" });
  reqA = await signedInUser(prisma, "queue-reqa");
  reqB = await signedInUser(prisma, "queue-reqb");
  const inactive = await signedInUser(prisma, "queue-inactive-owner", { role: "IT_STAFF", name: `${TAG} Retired Owner` });
  inactiveStaff = inactive;
  await prisma.user.update({ where: { id: inactive.id }, data: { isActive: false } });
  allUserIds.push(staffX.id, staffY.id, admin.id, reqA.id, reqB.id, inactive.id);

  categories = await prisma.category.findMany({ where: { isActive: true }, orderBy: { id: "asc" } });

  // --- one Ticket per status, marked QSTATUS, to prove the default view's
  // exclusion (API-29) and that naming a status explicitly lifts it (API-30,
  // API-44). Flagged separately as fixtures.closed / fixtures.cancelled.
  const base = Date.parse("2026-04-01T00:00:00Z");
  const statuses = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CLOSED", "REOPENED", "CANCELLED"] as const;
  for (const [i, status] of statuses.entries()) {
    fixtures[`status_${status}`] = await ticket(`QSTATUS ${status}`, {
      currentStatus: status,
      itPriority: "MEDIUM",
      createdAt: new Date(base + i * 60 * 60 * 1000),
    });
  }

  // --- the resolution marker (API-45) and the inactive-owner marker (API-46).
  fixtures.resolved = await ticket("QRESOLVED a Requester-resolved ticket", {
    currentStatus: "WAITING_FOR_REQUESTER",
    itPriority: "LOW",
    requesterResolvedAt: new Date(base + 50 * 60 * 60 * 1000),
  });
  fixtures.inactiveOwned = await ticket("QINACTIVE owned by a deactivated staff user", {
    currentStatus: "OPEN",
    itPriority: "HIGH",
    ownerId: inactiveStaff.id,
  });

  // --- owner filter fixtures (API-33, API-34, API-35): one unassigned, two
  // owned by staffX, one owned by staffY.
  fixtures.unassigned = await ticket("QOWNER unassigned", { currentStatus: "NEW", itPriority: "MEDIUM" });
  fixtures.ownedByX1 = await ticket("QOWNER owned by staff X, first", { currentStatus: "OPEN", itPriority: "MEDIUM", ownerId: staffX.id });
  fixtures.ownedByX2 = await ticket("QOWNER owned by staff X, second", { currentStatus: "OPEN", itPriority: "MEDIUM", ownerId: staffX.id });
  fixtures.ownedByY = await ticket("QOWNER owned by staff Y", { currentStatus: "OPEN", itPriority: "MEDIUM", ownerId: staffY.id });

  // --- category filter fixtures (API-37): one in each of two categories.
  fixtures.inCategory0 = await ticket("QCATEGORY in the first category", { currentStatus: "OPEN", itPriority: "MEDIUM", categoryId: categories[0].id });
  fixtures.inCategory1 = await ticket("QCATEGORY in the second category", { currentStatus: "OPEN", itPriority: "MEDIUM", categoryId: categories[1].id });

  // --- two filters together (API-36): currentStatus=OPEN and itPriority=HIGH.
  fixtures.matchesBoth = await ticket("QCOMBO matches both filters", { currentStatus: "OPEN", itPriority: "HIGH" });
  fixtures.matchesOneOnly = await ticket("QCOMBO matches only the status filter", { currentStatus: "OPEN", itPriority: "LOW" });

  // --- cross-Requester fixture (API-47): a Ticket raised by reqB, not reqA.
  fixtures.otherRequester = await (async () => {
    const relatedSystem = await prisma.relatedSystem.findFirstOrThrow({ where: { isActive: true } });
    const t = await createTicketWithNumber(prisma, {
      requesterId: reqB.id,
      categoryId: categories[0].id,
      relatedSystemId: relatedSystem.id,
      summary: `${TAG} QCROSS raised by the other requester`,
      description: "Fixture row for staff-queue.api.test.ts.",
      requestedPriority: "MEDIUM",
      currentStatus: "OPEN",
      itPriority: "MEDIUM",
    });
    allTicketIds.push(t.id);
    return { id: t.id, ticketNumber: t.ticketNumber };
  })();

  // --- summary search (API-32): "Zephyr" appears only in this row's summary;
  // "NEVERMATCH" appears only in every fixture's description and must never
  // match, proving Description is not searched.
  fixtures.summaryMatch = await ticket("QSEARCH Zephyr printer needs a new fuser", { currentStatus: "OPEN", itPriority: "MEDIUM" });

  // --- Ticket Number search (API-31): two Tickets created back to back whose
  // ids share every digit but the last (guarded by the alignment probe below),
  // so the shared prefix (ticketNumber minus its last character) matches both.
  // numberA will be probe.id + 1 and numberB will be probe.id + 2, so both
  // must land before the decade boundary: probe.id % 10 must be at most 7.
  let probe = await ticket("QNUMBER alignment probe", { currentStatus: "CANCELLED", itPriority: "LOW" });
  while (probe.id % 10 > 7) {
    probe = await ticket("QNUMBER alignment probe", { currentStatus: "CANCELLED", itPriority: "LOW" });
  }
  fixtures.numberA = await ticket("QNUMBER first of the pair", { currentStatus: "OPEN", itPriority: "MEDIUM" });
  fixtures.numberB = await ticket("QNUMBER second of the pair", { currentStatus: "OPEN", itPriority: "MEDIUM" });

  // --- sort fixtures (API-38, API-39): three Tickets, strictly ordered on
  // every one of the five sortable fields - createdAt and ticketNumber (both
  // by creation order), currentStatus and itPriority (both by declaration
  // order), and updatedAt (deliberately reversed, so an updatedAt sort cannot
  // be mistaken for a createdAt or id sort).
  const sortBase = base + 200 * 60 * 60 * 1000;
  fixtures.s1 = await ticket("QSORT first", { currentStatus: "NEW", itPriority: "LOW", createdAt: new Date(sortBase) });
  fixtures.s2 = await ticket("QSORT second", { currentStatus: "OPEN", itPriority: "MEDIUM", createdAt: new Date(sortBase + 60 * 60 * 1000) });
  fixtures.s3 = await ticket("QSORT third", { currentStatus: "IN_PROGRESS", itPriority: "HIGH", createdAt: new Date(sortBase + 2 * 60 * 60 * 1000) });
  await prisma.ticket.update({ where: { id: fixtures.s1.id }, data: { updatedAt: new Date(sortBase + 300 * 60 * 60 * 1000) } });
  await prisma.ticket.update({ where: { id: fixtures.s2.id }, data: { updatedAt: new Date(sortBase + 200 * 60 * 60 * 1000) } });
  await prisma.ticket.update({ where: { id: fixtures.s3.id }, data: { updatedAt: new Date(sortBase + 100 * 60 * 60 * 1000) } });

  // --- paging fixtures (API-40, API-41): 13 Tickets sharing one marker, so
  // pageSize 10 gives a full first page and a 3-row second page.
  for (let i = 0; i < 13; i++) {
    await ticket(`QPAGE row ${String(i).padStart(2, "0")}`, { currentStatus: "OPEN", itPriority: "MEDIUM" });
  }
});

afterAll(async () => {
  await prisma.ticket.deleteMany({ where: { id: { in: allTicketIds } } });
  await removeUsers(prisma, allUserIds);
});

describe("GET /api/staff/tickets", () => {
  it("API-29 the default view excludes Closed and Cancelled, and orders IT Priority high to low then oldest first (AC-61, BR-72, FR-38)", async () => {
    const statusRes = await queue(staffX.agent, { search: "QSTATUS", pageSize: 50 });
    expect(statusRes.status).toBe(200);
    const statusIds = statusRes.body.data.map((r: { id: number }) => r.id);
    expect(statusIds).not.toContain(fixtures.status_CLOSED.id);
    expect(statusIds).not.toContain(fixtures.status_CANCELLED.id);
    expect(statusIds).toContain(fixtures.status_NEW.id);
    expect(statusIds).toContain(fixtures.status_REOPENED.id);

    const sortRes = await queue(staffX.agent, { search: "QSORT" });
    expect(sortRes.body.meta.sort).toBe("itPriority:desc,createdAt:asc");
    expect(sortRes.body.data.map((r: { id: number }) => r.id)).toEqual([fixtures.s3.id, fixtures.s2.id, fixtures.s1.id]);
  });

  it("API-30 supplying currentStatus=CLOSED returns Closed tickets, proving the exclusion is a default and not permanent (BR-72)", async () => {
    const res = await queue(staffX.agent, { search: "QSTATUS", currentStatus: "CLOSED" });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].id).toBe(fixtures.status_CLOSED.id);
  });

  it("API-31 search by Ticket Number: an exact number returns exactly that Ticket, a shared prefix returns the group (AC-62, BR-71, FR-34)", async () => {
    const full = fixtures.numberA.ticketNumber!;
    const exact = await queue(staffX.agent, { search: full });
    expect(exact.body.data).toHaveLength(1);
    expect(exact.body.data[0].id).toBe(fixtures.numberA.id);

    // pageSize 50: the shared decade can hold other fixture rows ahead of
    // numberB in default id-desc tiebreak order, and this proves the group
    // rather than just the first page of it.
    const prefix = full.slice(0, -1);
    const grouped = await queue(staffX.agent, { search: prefix, pageSize: 50 });
    const ids = grouped.body.data.map((r: { id: number }) => r.id);
    expect(ids).toContain(fixtures.numberA.id);
    expect(ids).toContain(fixtures.numberB.id);
  });

  it("API-32 search by Ticket Summary: a case-insensitive substring matches, and Description is never searched (AC-62, BR-71)", async () => {
    const lower = await queue(staffX.agent, { search: "zephyr" });
    expect(lower.status).toBe(200);
    expect(lower.body.data.map((r: { id: number }) => r.id)).toContain(fixtures.summaryMatch.id);
    const descriptionOnly = await queue(staffX.agent, { search: "NEVERMATCH" });
    expect(descriptionOnly.body.data).toHaveLength(0);
  });

  it("API-33 owner filter unassigned: every returned Ticket has owner null (AC-63, BR-71, FR-35)", async () => {
    const res = await queue(staffX.agent, { search: "QOWNER", owner: "unassigned" });
    expect(res.status).toBe(200);
    const ids = res.body.data.map((r: { id: number }) => r.id);
    expect(ids).toEqual([fixtures.unassigned.id]);
    for (const row of res.body.data) expect(row.owner).toBeNull();
  });

  it("API-34 owner filter me: scoped to the calling staff user, and a different caller sees a different set (AC-64, BR-71)", async () => {
    const asX = await queue(staffX.agent, { search: "QOWNER", owner: "me" });
    expect(asX.body.data.map((r: { id: number }) => r.id).sort()).toEqual([fixtures.ownedByX1.id, fixtures.ownedByX2.id].sort());

    const asY = await queue(staffY.agent, { search: "QOWNER", owner: "me" });
    expect(asY.body.data.map((r: { id: number }) => r.id)).toEqual([fixtures.ownedByY.id]);
  });

  it("API-35 owner filter by a named user id: every returned Ticket is owned by that user (BR-71, FR-35)", async () => {
    const res = await queue(staffX.agent, { search: "QOWNER", owner: staffY.id });
    expect(res.status).toBe(200);
    expect(res.body.data.map((r: { id: number }) => r.id)).toEqual([fixtures.ownedByY.id]);
  });

  it("API-36 two filters together: currentStatus and itPriority combine conjunctively (AC-65, BR-71)", async () => {
    const res = await queue(staffX.agent, { search: "QCOMBO", currentStatus: "OPEN", itPriority: "HIGH" });
    expect(res.status).toBe(200);
    expect(res.body.data.map((r: { id: number }) => r.id)).toEqual([fixtures.matchesBoth.id]);
  });

  it("API-37 category filter: only Tickets in that category are returned (BR-71, FR-35)", async () => {
    const res = await queue(staffX.agent, { search: "QCATEGORY", categoryId: categories[0].id });
    expect(res.status).toBe(200);
    expect(res.body.data.map((r: { id: number }) => r.id)).toEqual([fixtures.inCategory0.id]);
  });

  it("API-38 all five sort fields, both directions, give the asserted order (AC-66, BR-71, FR-36)", async () => {
    const order = async (sort: string) => {
      const res = await queue(staffX.agent, { search: "QSORT", sort });
      return res.body.data.map((r: { id: number }) => r.id);
    };
    const [s1, s2, s3] = [fixtures.s1.id, fixtures.s2.id, fixtures.s3.id];
    expect(await order("createdAt:asc")).toEqual([s1, s2, s3]);
    expect(await order("createdAt:desc")).toEqual([s3, s2, s1]);
    expect(await order("ticketNumber:asc")).toEqual([s1, s2, s3]);
    expect(await order("ticketNumber:desc")).toEqual([s3, s2, s1]);
    expect(await order("currentStatus:asc")).toEqual([s1, s2, s3]);
    expect(await order("currentStatus:desc")).toEqual([s3, s2, s1]);
    expect(await order("itPriority:asc")).toEqual([s1, s2, s3]);
    expect(await order("itPriority:desc")).toEqual([s3, s2, s1]);
    // updatedAt is deliberately reversed relative to the other four fields.
    expect(await order("updatedAt:asc")).toEqual([s3, s2, s1]);
    expect(await order("updatedAt:desc")).toEqual([s1, s2, s3]);
  });

  it("API-39 itPriority:desc gives HIGH, MEDIUM, LOW - declaration order, not alphabetical (BR-71, api-spec 8.1)", async () => {
    const res = await queue(staffX.agent, { search: "QSORT", sort: "itPriority:desc" });
    const priorities = res.body.data.map((r: { itPriority: string }) => r.itPriority);
    expect(priorities).toEqual(["HIGH", "MEDIUM", "LOW"]);
    expect(priorities).not.toEqual(["MEDIUM", "LOW", "HIGH"]);
  });

  it("API-40 page sizes 10, 25 and 50 give 200; 11 gives 400 naming pageSize (AC-67, BR-72)", async () => {
    for (const size of [10, 25, 50]) {
      const res = await queue(staffX.agent, { search: "QPAGE", pageSize: size });
      expect(res.status, `pageSize=${size}`).toBe(200);
    }
    const bad = await queue(staffX.agent, { pageSize: 11 });
    expect(bad.status).toBe(400);
    expect(bad.body.error.fields.pageSize).toEqual(expect.any(String));
  });

  it("API-41 paging boundaries: a partial last page, and one page beyond returns an empty array with 200, not an error (BR-72, L2 C-43)", async () => {
    const page1 = await queue(staffX.agent, { search: "QPAGE", pageSize: 10, page: 1 });
    expect(page1.body.data).toHaveLength(10);
    expect(page1.body.meta.total).toBe(13);
    expect(page1.body.meta.totalPages).toBe(2);

    const page2 = await queue(staffX.agent, { search: "QPAGE", pageSize: 10, page: 2 });
    expect(page2.body.data).toHaveLength(3);

    const page3 = await queue(staffX.agent, { search: "QPAGE", pageSize: 10, page: 3 });
    expect(page3.status).toBe(200);
    expect(page3.body.data).toEqual([]);
    expect(page3.body.meta.total).toBe(13);
  });

  it("API-42 an unknown sort field gives 400 INVALID_QUERY_PARAM naming sort, before any query reaches the database (AC-68, BR-73, FR-42)", async () => {
    const res = await queue(staffX.agent, { sort: "description:asc" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_QUERY_PARAM");
    expect(res.body.error.fields.sort).toEqual(expect.any(String));
  });

  it("API-43 three bad parameters at once give three field entries, not one generic message (BR-73)", async () => {
    const res = await queue(staffX.agent, { sort: "nope", pageSize: 7, itPriority: "URGENT" });
    expect(res.status).toBe(400);
    expect(Object.keys(res.body.error.fields).sort()).toEqual(["itPriority", "pageSize", "sort"]);
  });

  it("API-44 all eight TicketStatus values are accepted as a filter (BR-71, C-70)", async () => {
    for (const status of ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CLOSED", "REOPENED", "CANCELLED"]) {
      const res = await queue(staffX.agent, { search: "QSTATUS", currentStatus: status });
      expect(res.status, status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].currentStatus).toBe(status);
    }
  });

  it("API-45 a Ticket carrying requesterResolvedAt returns it non-null in its queue row (AC-60, BR-62, FR-40)", async () => {
    const res = await queue(staffX.agent, { search: "QRESOLVED", currentStatus: "WAITING_FOR_REQUESTER" });
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].requesterResolvedAt).not.toBeNull();
  });

  it("API-46 a Ticket owned by a deactivated user returns owner.isActive false and keeps that owner (AC-75, BR-30, FR-46)", async () => {
    const res = await queue(staffX.agent, { search: "QINACTIVE" });
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].owner).toEqual({ id: inactiveStaff.id, name: inactiveStaff.name, isActive: false });
  });

  it("API-47 the queue is not Requester-scoped: Tickets from more than one Requester appear together (BR-74, api-spec 10.4)", async () => {
    const res = await queue(staffX.agent, { search: "QCROSS" });
    expect(res.body.data.map((r: { id: number }) => r.id)).toContain(fixtures.otherRequester.id);
    const asAdmin = await queue(admin.agent, { search: "QCROSS" });
    expect(asAdmin.body.data.map((r: { id: number }) => r.id)).toContain(fixtures.otherRequester.id);
  });

  it("API-48 the queue row carries exactly the api-spec 10.4 keys, and no requester key (api-spec 10.4, FR-39)", async () => {
    const res = await queue(staffX.agent, { search: "QOWNER", owner: "unassigned" });
    expect(res.body.data).toHaveLength(1);
    expect(Object.keys(res.body.data[0]).sort()).toEqual(
      ["category", "createdAt", "currentStatus", "id", "itPriority", "owner", "requestedPriority", "requesterResolvedAt", "summary", "ticketNumber", "updatedAt"].sort(),
    );
  });
});
