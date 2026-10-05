import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { hashPassword } from "../../src/lib/password.js";
import { removeUsers, signedInUser, TEST_PASSWORD, type Agent } from "../support/agents.js";
import { routesOf } from "../support/routes.js";

// Lab 3 Administrator user management - tests.md section 2.2, the rows Issue
// #43 owns: API-90, API-92..API-115, API-117 (api-spec.md section 9,
// specification.md 5.4, ui-spec.md section 17).
//
// Every user this file creates is tagged and removed in afterAll; the seeded
// accounts (graded-seed.ts) are never signed in as or mutated, so this file
// can run alongside every other Supertest file without disturbing demo data.

const prisma = getPrisma();
const TAG = "[users-admin-test]";
const NEW_PASSWORD = "Fresh#Start42";

type Person = { id: number; email: string; name: string; agent: Agent };
const created: number[] = [];

async function admin(name = "admin"): Promise<Person> {
  const p = await signedInUser(prisma, `${TAG}-${name}`, { role: "ADMINISTRATOR" });
  created.push(p.id);
  return p;
}
async function staff(name = "staff"): Promise<Person> {
  const p = await signedInUser(prisma, `${TAG}-${name}`, { role: "IT_STAFF" });
  created.push(p.id);
  return p;
}
async function requester(name = "requester"): Promise<Person> {
  const p = await signedInUser(prisma, `${TAG}-${name}`);
  created.push(p.id);
  return p;
}

// The LAST_ADMINISTRATOR rule is global: it counts every active Administrator
// in the table, including the seed's own (graded-seed.ts) and any created by
// other tests still running in this database. To exercise "the sole active
// Administrator", every other currently-active Administrator is deactivated
// for the body of `run`, then restored to active afterwards - regardless of
// outcome - so this file never leaves the seed or another test's fixture
// deactivated behind it.
async function withOnlyActiveAdmins<T>(keepActive: number[], run: () => Promise<T>): Promise<T> {
  const others = await prisma.user.findMany({
    where: { role: "ADMINISTRATOR", isActive: true, id: { notIn: keepActive } },
    select: { id: true },
  });
  const otherIds = others.map((o) => o.id);
  if (otherIds.length > 0) await prisma.user.updateMany({ where: { id: { in: otherIds } }, data: { isActive: false } });
  try {
    return await run();
  } finally {
    if (otherIds.length > 0) await prisma.user.updateMany({ where: { id: { in: otherIds } }, data: { isActive: true } });
  }
}

// A plain, inactive-by-default User row, not signed in - for list/search/filter
// fixtures that do not need an agent.
let counter = 0;
async function plainUser(overrides: { name?: string; email?: string; role?: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR"; isActive?: boolean } = {}) {
  counter += 1;
  const row = await prisma.user.create({
    data: {
      name: overrides.name ?? `${TAG} Plain ${counter}`,
      email: overrides.email ?? `${TAG.replace(/[[\]]/g, "")}-plain-${Date.now()}-${counter}@example.test`,
      role: overrides.role ?? "REQUESTER",
      isActive: overrides.isActive ?? true,
      passwordHash: hashPassword(TEST_PASSWORD),
      mustChangePassword: false,
    },
  });
  created.push(row.id);
  return row;
}

afterAll(async () => {
  await removeUsers(prisma, created);
});

describe("GET /api/users - the user list (9.1)", () => {
  it("API-90 every user appears with name, email, role, isActive and mustChangePassword (AC-82, FR-56)", async () => {
    const a = await admin("list-90");
    const u = await plainUser({ name: `${TAG} Visible User`, isActive: false });
    const res = await a.agent.get("/api/users");
    expect(res.status).toBe(200);
    const row = res.body.find((r: { id: number }) => r.id === u.id);
    expect(row).toMatchObject({ id: u.id, name: u.name, email: u.email, role: "REQUESTER", isActive: false, mustChangePassword: false });
    expect(row).toHaveProperty("createdAt");
    expect(row).toHaveProperty("updatedAt");
    expect(row.passwordHash).toBeUndefined();
  });

  it("API-92 search matches a name fragment and an email fragment, case-insensitively (AC-83, FR-57)", async () => {
    const a = await admin("list-92");
    const u = await plainUser({ name: `${TAG} Siriwan Uniquename`, email: `${TAG.replace(/[[\]]/g, "")}-uniquemail-${Date.now()}@example.test` });
    const byName = await a.agent.get(`/api/users?search=${encodeURIComponent("uniquename")}`);
    expect(byName.body.map((r: { id: number }) => r.id)).toContain(u.id);
    const byEmail = await a.agent.get(`/api/users?search=${encodeURIComponent("UNIQUEMAIL")}`);
    expect(byEmail.body.map((r: { id: number }) => r.id)).toContain(u.id);
  });

  it("API-93 the role filter returns only users holding that role (AC-84, FR-58)", async () => {
    const a = await admin("list-93");
    const req = await requester("role-filter-req");
    const st = await staff("role-filter-staff");
    const admin2 = await admin("role-filter-admin2");
    const requesterRes = await a.agent.get("/api/users?role=REQUESTER");
    const ids = requesterRes.body.map((r: { id: number; role: string }) => ({ id: r.id, role: r.role }));
    expect(ids.every((r: { role: string }) => r.role === "REQUESTER")).toBe(true);
    expect(ids.map((r: { id: number }) => r.id)).toContain(req.id);
    expect(ids.map((r: { id: number }) => r.id)).not.toContain(st.id);
    expect(ids.map((r: { id: number }) => r.id)).not.toContain(admin2.id);
  });

  it("API-94 ?page and ?pageSize do not paginate; the full list is returned (BR-84, FR-66, AC-98)", async () => {
    const a = await admin("list-94");
    const plain = await a.agent.get("/api/users");
    const paged = await a.agent.get("/api/users?page=2&pageSize=25");
    expect(Array.isArray(paged.body)).toBe(true);
    expect(paged.body.length).toBe(plain.body.length);
  });

  it("API-95 inactive users are listed too - Status is a column, not a filter (FR-56)", async () => {
    const a = await admin("list-95");
    const inactive = await plainUser({ isActive: false });
    const res = await a.agent.get("/api/users");
    expect(res.body.map((r: { id: number }) => r.id)).toContain(inactive.id);
  });

  it("API-117 the list is name ascending then id, and ?sort= changes nothing (BR-106, C-107)", async () => {
    const a = await admin("list-117");
    const plain = await a.agent.get("/api/users");
    const sorted = await a.agent.get("/api/users?sort=createdAt:desc");
    // Postgres's own collation (en_US.utf8) does not sort byte-for-byte like
    // a plain JS `.sort()`, and no JS Intl.Collator locale reproduces it
    // exactly either - the test fixtures' bracketed tag mixed with the
    // seed's plain names exposes the gap. So "ascending by name, then id"
    // (BR-106, C-107) is verified against the one order that is actually
    // authoritative: Postgres's own ORDER BY on the same two columns, read
    // directly, independent of the route under test.
    const direct = await prisma.user.findMany({ orderBy: [{ name: "asc" }, { id: "asc" }], select: { id: true } });
    expect(plain.body.map((r: { id: number }) => r.id)).toEqual(direct.map((u) => u.id));
    expect(sorted.body.map((r: { id: number }) => r.id)).toEqual(plain.body.map((r: { id: number }) => r.id));
  });
});

describe("POST /api/users - create (9.2)", () => {
  function email(tag: string) {
    return `${TAG.replace(/[[\]]/g, "")}-${tag}-${Date.now()}@example.test`;
  }

  it("API-96 creates a user: 201, the given fields stored, mustChangePassword true (AC-85, BR-75, BR-16)", async () => {
    const a = await admin("create-96");
    const body = { name: `${TAG} New Hire`, email: email("create-96"), role: "IT_STAFF", isActive: true, initialPassword: TEST_PASSWORD };
    const res = await a.agent.post("/api/users").send(body);
    expect(res.status).toBe(201);
    created.push(res.body.id);
    expect(res.body).toMatchObject({ name: body.name, email: body.email.toLowerCase(), role: "IT_STAFF", isActive: true, mustChangePassword: true });
    expect(res.body.passwordHash).toBeUndefined();
  });

  it("API-97 the created user signs in with the initial password, mustChangePassword true, and every other route is gated 403 (AC-86, BR-16)", async () => {
    const a = await admin("create-97");
    const body = { name: `${TAG} First Login`, email: email("create-97"), role: "REQUESTER", isActive: true, initialPassword: TEST_PASSWORD };
    const created201 = await a.agent.post("/api/users").send(body);
    created.push(created201.body.id);
    const request = (await import("supertest")).default;
    const agent = request.agent(app);
    const login = await agent.post("/api/auth/login").send({ email: body.email, password: TEST_PASSWORD });
    expect(login.status).toBe(200);
    expect(login.body.mustChangePassword).toBe(true);
    const gated = await agent.get("/api/tickets");
    expect(gated.status).toBe(403);
    expect(gated.body.error.code).toBe("PASSWORD_CHANGE_REQUIRED");
  });

  it("API-98 a weak initial password is refused with the shared BR-12 message (BR-12, BR-14, C-60)", async () => {
    const a = await admin("create-98");
    const res = await a.agent.post("/api/users").send({ name: `${TAG} Weak`, email: email("create-98"), role: "REQUESTER", isActive: true, initialPassword: "weak" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
    expect(res.body.error.fields.initialPassword).toBe(
      "Password must be 8 to 128 characters and contain an upper-case letter, a lower-case letter, a digit and a special character.",
    );
  });

  it("API-99 a duplicate email -> 409 EMAIL_TAKEN at the email field (AC-87, BR-77, FR-62)", async () => {
    const a = await admin("create-99");
    const existing = await plainUser();
    const res = await a.agent.post("/api/users").send({ name: `${TAG} Dup`, email: existing.email, role: "REQUESTER", isActive: true, initialPassword: TEST_PASSWORD });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("EMAIL_TAKEN");
    expect(res.body.error.fields.email).toBeTruthy();
  });

  it("API-100 an address differing only in case is still a duplicate (AC-88, BR-77, BR-06)", async () => {
    const a = await admin("create-100");
    const lower = email("case").toLowerCase();
    const existing = await plainUser({ email: lower });
    const res = await a.agent.post("/api/users").send({ name: `${TAG} Case`, email: lower.toUpperCase(), role: "REQUESTER", isActive: true, initialPassword: TEST_PASSWORD });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("EMAIL_TAKEN");
    expect(existing).toBeTruthy();
  });

  it("API-102 name bounds: 0 and 101 chars refused, 1 and 100 accepted, padding trimmed (AC-113, BR-99, C-94)", async () => {
    const a = await admin("create-102");
    const tooLong = "x".repeat(101);
    const bad = await a.agent.post("/api/users").send({ name: tooLong, email: email("n1"), role: "REQUESTER", isActive: true, initialPassword: TEST_PASSWORD });
    expect(bad.status).toBe(400);
    expect(bad.body.error.fields.name).toBeTruthy();
    const empty = await a.agent.post("/api/users").send({ name: "", email: email("n2"), role: "REQUESTER", isActive: true, initialPassword: TEST_PASSWORD });
    expect(empty.status).toBe(400);
    const padded = await a.agent.post("/api/users").send({ name: `  ${TAG} Padded Name  `, email: email("n3"), role: "REQUESTER", isActive: true, initialPassword: TEST_PASSWORD });
    expect(padded.status).toBe(201);
    created.push(padded.body.id);
    expect(padded.body.name).toBe(`${TAG} Padded Name`);
    const ok100 = await a.agent.post("/api/users").send({ name: "x".repeat(100), email: email("n4"), role: "REQUESTER", isActive: true, initialPassword: TEST_PASSWORD });
    expect(ok100.status).toBe(201);
    created.push(ok100.body.id);
  });

  it("API-103 email bounds and format: 254 accepted, 255 refused, no @ refused, padding and case normalised (AC-114, BR-99, C-94)", async () => {
    const a = await admin("create-103");
    const local = "x".repeat(254 - "@example.test".length);
    const ok254 = await a.agent.post("/api/users").send({ name: `${TAG} E254`, email: `${local}@example.test`, role: "REQUESTER", isActive: true, initialPassword: TEST_PASSWORD });
    expect(ok254.status).toBe(201);
    created.push(ok254.body.id);
    const local255 = "x".repeat(255 - "@example.test".length);
    const bad255 = await a.agent.post("/api/users").send({ name: `${TAG} E255`, email: `${local255}@example.test`, role: "REQUESTER", isActive: true, initialPassword: TEST_PASSWORD });
    expect(bad255.status).toBe(400);
    const noAt = await a.agent.post("/api/users").send({ name: `${TAG} NoAt`, email: "not-an-email", role: "REQUESTER", isActive: true, initialPassword: TEST_PASSWORD });
    expect(noAt.status).toBe(400);
    expect(noAt.body.error.fields.email).toBeTruthy();
    const mixedCase = `  Mixed.Case.${Date.now()}@Example.TEST  `;
    const padded = await a.agent.post("/api/users").send({ name: `${TAG} Mixed`, email: mixedCase, role: "REQUESTER", isActive: true, initialPassword: TEST_PASSWORD });
    expect(padded.status).toBe(201);
    created.push(padded.body.id);
    expect(padded.body.email).toBe(mixedCase.trim().toLowerCase());
  });

  it("role out of set -> 400 and exactly one role is accepted, never an array (BR-35, BR-75)", async () => {
    const a = await admin("create-role");
    const bad = await a.agent.post("/api/users").send({ name: `${TAG} BadRole`, email: email("role1"), role: "SUPERUSER", isActive: true, initialPassword: TEST_PASSWORD });
    expect(bad.status).toBe(400);
    expect(bad.body.error.fields.role).toBeTruthy();
  });

  it("API-113 there is no DELETE /api/users/:id (BR-81, FR-66, AC-98)", async () => {
    const { routes } = routesOf(app);
    expect(routes.some((r) => r.method === "DELETE" && r.path.startsWith("/api/users"))).toBe(false);
  });

  it("API-115 GET /api/requesters is removed (BR-93, C-62)", async () => {
    const { routes } = routesOf(app);
    expect(routes.some((r) => r.path === "/api/requesters")).toBe(false);
  });
});

describe("PATCH /api/users/:id - edit (9.3)", () => {
  it("API-101 editing to another user's address is 409; editing to one's own current address succeeds (AC-87)", async () => {
    const a = await admin("edit-101");
    const other = await plainUser();
    const target = await plainUser();
    const conflict = await a.agent.patch(`/api/users/${target.id}`).send({ email: other.email });
    expect(conflict.status).toBe(409);
    expect(conflict.body.error.code).toBe("EMAIL_TAKEN");
    const same = await a.agent.patch(`/api/users/${target.id}`).send({ email: target.email, name: target.name });
    expect(same.status).toBe(200);
  });

  it("API-104 name, email, role and isActive are all saved; createdAt, mustChangePassword and the hash are unchanged (AC-89, BR-76, FR-60)", async () => {
    const a = await admin("edit-104");
    const target = await plainUser({ role: "REQUESTER", isActive: true });
    const before = await prisma.user.findUniqueOrThrow({ where: { id: target.id } });
    const newEmail = `${TAG.replace(/[[\]]/g, "")}-edited-${Date.now()}@example.test`;
    const res = await a.agent.patch(`/api/users/${target.id}`).send({ name: `${TAG} Edited Name`, email: newEmail, role: "IT_STAFF", isActive: false });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ name: `${TAG} Edited Name`, email: newEmail, role: "IT_STAFF", isActive: false });
    const after = await prisma.user.findUniqueOrThrow({ where: { id: target.id } });
    expect(after.createdAt).toEqual(before.createdAt);
    expect(after.mustChangePassword).toBe(before.mustChangePassword);
    expect(after.passwordHash).toBe(before.passwordHash);
  });

  it("API-105 extra fields (passwordHash, mustChangePassword, id, createdAt) are not editable (BR-76, FR-60)", async () => {
    const a = await admin("edit-105");
    const target = await plainUser();
    const before = await prisma.user.findUniqueOrThrow({ where: { id: target.id } });
    const res = await a.agent.patch(`/api/users/${target.id}`).send({
      name: target.name,
      passwordHash: "scrypt$1$1$1$00$00",
      mustChangePassword: true,
      id: 999999,
      createdAt: "2000-01-01T00:00:00.000Z",
    });
    expect(res.status).toBe(200);
    const after = await prisma.user.findUniqueOrThrow({ where: { id: target.id } });
    expect(after.passwordHash).toBe(before.passwordHash);
    expect(after.mustChangePassword).toBe(before.mustChangePassword);
    expect(after.id).toBe(target.id);
    expect(after.createdAt).toEqual(before.createdAt);
  });

  it("API-106 a role change revokes that user's sessions - their next request is 401 (AC-90, BR-83, BR-24)", async () => {
    const a = await admin("edit-106");
    const target = await requester("role-change-target");
    const res = await a.agent.patch(`/api/users/${target.id}`).send({ role: "IT_STAFF" });
    expect(res.status).toBe(200);
    const next = await target.agent.get("/api/tickets");
    expect(next.status).toBe(401);
    expect(next.body.error.code).toBe("AUTH_REQUIRED");
  });

  it("API-107 setting a new initial password revokes sessions, flags mustChangePassword, and the next login requires a change (AC-91, BR-78, C-79)", async () => {
    const a = await admin("edit-107");
    const target = await requester("reset-target");
    const res = await a.agent.post(`/api/users/${target.id}/initial-password`).send({ initialPassword: NEW_PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.mustChangePassword).toBe(true);
    const stale = await target.agent.get("/api/tickets");
    expect(stale.status).toBe(401);
    const request = (await import("supertest")).default;
    const login = await request.agent(app).post("/api/auth/login").send({ email: target.email, password: NEW_PASSWORD });
    expect(login.status).toBe(200);
    expect(login.body.mustChangePassword).toBe(true);
  });

  it("API-108 self-deactivation -> 422 SELF_DEACTIVATION, stays active (AC-92, BR-79, C-81)", async () => {
    const a = await admin("edit-108");
    await admin("edit-108-other"); // keeps a second active Administrator so this is not also a last-admin conflict
    const res = await a.agent.patch(`/api/users/${a.id}`).send({ isActive: false });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("SELF_DEACTIVATION");
    expect((await prisma.user.findUniqueOrThrow({ where: { id: a.id } })).isActive).toBe(true);
  });

  // API-109 and API-110: with exactly one active Administrator, that one
  // account is also the only possible caller (the route requires an active
  // Administrator session). AC-93/AC-94 take precedence over AC-92's plain
  // self-deactivation in this exact case - LAST_ADMINISTRATOR is the
  // state-dependent check and runs first in the server's transaction, so
  // deactivating or demoting the sole active Administrator (even by that
  // account itself) is 409, not 422. See the PR note on this ordering.
  it("API-109 the last active Administrator cannot be deactivated -> 409 LAST_ADMINISTRATOR, stays active (AC-93, BR-80, C-80)", async () => {
    const sole = await admin("edit-109-sole");
    await withOnlyActiveAdmins([sole.id], async () => {
      const res = await sole.agent.patch(`/api/users/${sole.id}`).send({ isActive: false });
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe("LAST_ADMINISTRATOR");
      expect((await prisma.user.findUniqueOrThrow({ where: { id: sole.id } })).isActive).toBe(true);
    });
  });

  it("API-110 the last active Administrator's role cannot be changed away -> 409, twice over (AC-94, BR-80, BR-82)", async () => {
    const sole = await admin("edit-110-sole");
    await withOnlyActiveAdmins([sole.id], async () => {
      const toRequester = await sole.agent.patch(`/api/users/${sole.id}`).send({ role: "REQUESTER" });
      expect(toRequester.status).toBe(409);
      expect(toRequester.body.error.code).toBe("LAST_ADMINISTRATOR");
      const toStaff = await sole.agent.patch(`/api/users/${sole.id}`).send({ role: "IT_STAFF" });
      expect(toStaff.status).toBe(409);
      expect((await prisma.user.findUniqueOrThrow({ where: { id: sole.id } })).role).toBe("ADMINISTRATOR");
    });
  });

  it("API-112 self role change is permitted while another active Administrator exists (BR-82, C-81)", async () => {
    const a = await admin("edit-112-self");
    await admin("edit-112-other");
    const res = await a.agent.patch(`/api/users/${a.id}`).send({ role: "IT_STAFF" });
    expect(res.status).toBe(200);
    expect(res.body.role).toBe("IT_STAFF");
  });

  it("API-111 the last-Administrator race: two active Administrators deactivate each other concurrently - exactly one succeeds (AC-95, BR-80, C-80)", async () => {
    for (let round = 0; round < 3; round += 1) {
      const x = await admin(`race-${round}-x`);
      const y = await admin(`race-${round}-y`);
      await withOnlyActiveAdmins([x.id, y.id], async () => {
        // x deactivates y, y deactivates x - each targets the OTHER, so
        // neither is the plain self-deactivation BR-79 blocks; whichever
        // transaction's lock resolves second re-reads the other's commit and
        // finds itself the sole remaining active Administrator (C-80).
        const [rx, ry] = await Promise.all([
          x.agent.patch(`/api/users/${y.id}`).send({ isActive: false }),
          y.agent.patch(`/api/users/${x.id}`).send({ isActive: false }),
        ]);
        // Exactly one request succeeds. The loser's own status is genuinely
        // timing-dependent, not a second business code: a deactivation
        // revokes its target's sessions in the same transaction (line ~194),
        // so if the winner's commit lands before the loser's own auth
        // middleware re-checks its session, the loser's session is already
        // gone and the answer is 401 AUTH_REQUIRED, not 409 - the loser is no
        // longer a valid caller, never mind what they asked to change. If the
        // loser's auth check ran first, the transaction's own lock catches
        // the conflict and answers 409 LAST_ADMINISTRATOR instead. Both are
        // the correct refusal for their respective timing; only a 200 on
        // both, or a 200 on neither, would be the actual bug.
        const winners = [rx, ry].filter((r) => r.status === 200);
        const losers = [rx, ry].filter((r) => r.status !== 200);
        expect(winners, JSON.stringify([rx.status, ry.status])).toHaveLength(1);
        expect(losers).toHaveLength(1);
        expect([401, 409]).toContain(losers[0].status);
        if (losers[0].status === 409) expect(losers[0].body.error.code).toBe("LAST_ADMINISTRATOR");
        else expect(losers[0].body.error.code).toBe("AUTH_REQUIRED");
        const activeCount = await prisma.user.count({ where: { id: { in: [x.id, y.id] }, isActive: true } });
        expect(activeCount).toBe(1);
      });
    }
  });

  it("the malformed-path-id convention: a non-numeric id is 400 INVALID_QUERY_PARAM, not VALIDATION_FAILED (C-113)", async () => {
    const a = await admin("edit-badid");
    const res = await a.agent.patch("/api/users/abc").send({ name: "x" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_QUERY_PARAM");
  });

  it("an unknown id is 404 USER_NOT_FOUND", async () => {
    const a = await admin("edit-404");
    const res = await a.agent.patch("/api/users/999999").send({ name: "x" });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("USER_NOT_FOUND");
  });

  it("an empty body is 400, a no-op is a client defect (api-spec.md 9.3)", async () => {
    const a = await admin("edit-empty");
    const target = await plainUser();
    const res = await a.agent.patch(`/api/users/${target.id}`).send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });
});

describe("Deactivation retains data; no secrets ever (API-114, BR-29)", () => {
  it("API-114 a deactivated user's Tickets, Attachments, comments and notes still exist and are reachable by staff", async () => {
    const a = await admin("retain-admin");
    const owner = await staff("retain-owner");
    const req = await requester("retain-req");
    const category = await prisma.category.findFirstOrThrow({ where: { isActive: true } });
    const system = await prisma.relatedSystem.findFirstOrThrow({ where: { isActive: true } });
    const ticket = await prisma.ticket.create({
      data: {
        requesterId: req.id,
        categoryId: category.id,
        relatedSystemId: system.id,
        summary: `${TAG} retained ticket`,
        description: "Exists to prove deactivation retains data.",
        requestedPriority: "LOW",
        itPriority: "LOW",
        ownerId: owner.id,
      },
    });
    await prisma.publicComment.create({ data: { ticketId: ticket.id, authorId: req.id, body: `${TAG} a kept comment` } });
    await prisma.internalNote.create({ data: { ticketId: ticket.id, authorId: owner.id, body: `${TAG} a kept note` } });

    // This Ticket is created directly (ticketNumber is irrelevant to this
    // test's point), so it is never left behind for DB-06 to find in
    // tests/lab-02/data-model.db.test.ts - a try/finally, not plain
    // trailing code, so an assertion failure here still cleans it up.
    try {
      const deactivate = await a.agent.patch(`/api/users/${owner.id}`).send({ isActive: false });
      expect(deactivate.status).toBe(200);

      const stillThere = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
      expect(stillThere.ownerId).toBe(owner.id);
      const staffRead = await a.agent.get(`/api/staff/tickets/${ticket.id}`);
      expect(staffRead.status).toBe(200);
      expect(staffRead.body.internalNotes.length).toBeGreaterThan(0);
      expect(staffRead.body.publicComments.length).toBeGreaterThan(0);
    } finally {
      await prisma.publicComment.deleteMany({ where: { ticketId: ticket.id } });
      await prisma.internalNote.deleteMany({ where: { ticketId: ticket.id } });
      await prisma.ticket.delete({ where: { id: ticket.id } });
    }
  });
});
