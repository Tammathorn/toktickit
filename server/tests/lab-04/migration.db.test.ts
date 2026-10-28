import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { basename, dirname, join, resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { getPrisma } from "../../src/prisma.js";
import { seedGraded, SEED_TICKETS, SEED_ACTIONS } from "../../src/seed/graded-seed.js";

// Lab 4 migration and seed shape - tests.md MIG-01..MIG-08 and MIG-14..MIG-21.
//
// MIG-01..MIG-08 read the schema of toktickit_test, which the global setup
// migrates. MIG-14..MIG-21 are claims about a FRESH seed (spec 7.9, C-146,
// C-188), and toktickit_test is not fresh: it persists between runs, its seed
// Tickets predate the Lab 4 migration (so, as legacy rows, they rightly carry
// no history and a NULL resolvedAt), and the tests add rows to it. Those rows
// therefore run against a scratch database that this file creates, migrates
// with `migrate deploy`, seeds, and drops again. The data-preservation half -
// counts unchanged, the backfill, the restore - is the C-129 rehearsal, whose
// captures are under artifacts/lab-04/evidence/issue-2/ (MIG-09..MIG-13).

const prisma = getPrisma();
const SERVER_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const MIGRATIONS_DIR = join(SERVER_DIR, "prisma", "migrations");
const FRESH_DATABASE = "toktickit_test_fresh_seed";
const HOUR = 60 * 60 * 1000;

const OPEN_STATUSES = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "REOPENED"] as const;
const ACTIVE_EXCLUDED = ["CLOSED", "CANCELLED"] as const;

type Column = {
  column_name: string;
  is_nullable: string;
  column_default: string | null;
  data_type: string;
  udt_name: string;
};

async function columns(table: string): Promise<Record<string, Column>> {
  const rows = await prisma.$queryRawUnsafe<Column[]>(
    `SELECT column_name, is_nullable, column_default, data_type, udt_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1`,
    table,
  );
  return Object.fromEntries(rows.map((r) => [r.column_name, r]));
}

async function enumLabels(typeName: string): Promise<string[]> {
  const rows = await prisma.$queryRawUnsafe<{ enumlabel: string }[]>(
    `SELECT enumlabel FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
     WHERE t.typname = $1 ORDER BY e.enumsortorder`,
    typeName,
  );
  return rows.map((r) => r.enumlabel);
}

async function foreignKeys(): Promise<{ from: string; column: string; to: string }[]> {
  const rows = await prisma.$queryRawUnsafe<
    { table_name: string; column_name: string; foreign_table_name: string }[]
  >(
    `SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table_name
     FROM information_schema.table_constraints tc
     JOIN information_schema.key_column_usage kcu
       ON kcu.constraint_name = tc.constraint_name
     JOIN information_schema.constraint_column_usage ccu
       ON ccu.constraint_name = tc.constraint_name
     WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'`,
  );
  return rows.map((r) => ({
    from: r.table_name,
    column: r.column_name,
    to: r.foreign_table_name,
  }));
}

// Each index on a table as { unique, columns } with the column list in order,
// read from pg_indexes: `CREATE [UNIQUE] INDEX name ON public."T" USING btree (a, "b")`.
async function indexes(table: string): Promise<{ unique: boolean; columns: string[] }[]> {
  const rows = await prisma.$queryRawUnsafe<{ indexdef: string }[]>(
    `SELECT indexdef FROM pg_indexes WHERE schemaname = 'public' AND tablename = $1`,
    table,
  );
  return rows.map(({ indexdef }) => ({
    unique: /^CREATE UNIQUE INDEX/i.test(indexdef),
    columns: (indexdef.match(/\(([^)]*)\)\s*$/)?.[1] ?? "")
      .split(",")
      .map((c) => c.trim().replace(/"/g, "")),
  }));
}

async function hasIndex(table: string, cols: string[], unique = false): Promise<boolean> {
  return (await indexes(table)).some(
    (i) => (!unique || i.unique) && i.columns.join(",") === cols.join(","),
  );
}

// Comments stripped, so this reads the statements a migration executes rather
// than the prose around them.
function migrationSqlFiles(): { folder: string; sql: string }[] {
  return readdirSync(MIGRATIONS_DIR)
    .map((entry) => join(MIGRATIONS_DIR, entry))
    .filter((path) => statSync(path).isDirectory())
    .sort()
    .map((path) => ({
      folder: basename(path),
      sql: readFileSync(join(path, "migration.sql"), "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/^\s*--.*$/gm, ""),
    }));
}

function statements(sql: string): string[] {
  return sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s !== "");
}

// The resolution gate as BR-29..BR-31 define it (C-137, C-186), evaluated from
// rows: owner absence is not a reason (BR-28), and met means no reason applies.
async function gateReasons(db: PrismaClient, ticketId: number): Promise<string[]> {
  const actions = await db.actionTaken.findMany({ where: { ticketId } });
  const completed = actions
    .filter((a) => a.status === "COMPLETED")
    .sort(
      (a, b) =>
        (b.finishedAt?.getTime() ?? 0) - (a.finishedAt?.getTime() ?? 0) || b.id - a.id,
    );
  const reasons: string[] = [];
  if (completed.length === 0) reasons.push("NO_COMPLETED_ACTION");
  if (actions.some((a) => a.status === "PLANNED")) reasons.push("PLANNED_ACTIONS_OPEN");
  if (completed[0]?.followUpRequired) reasons.push("FOLLOW_UP_REQUIRED");
  const reopened = await db.ticketStatusChange.findFirst({
    where: { ticketId, toStatus: "REOPENED" },
    orderBy: [{ changedAt: "desc" }, { id: "desc" }],
  });
  if (
    reopened &&
    !completed.some((a) => a.finishedAt !== null && a.finishedAt > reopened.changedAt)
  ) {
    reasons.push("NO_ACTION_SINCE_REOPEN");
  }
  return reasons;
}

class Rollback extends Error {}

// Runs `work` inside a transaction that is always rolled back, so a test can
// insert rows into toktickit_test without leaving any behind.
async function inRolledBackTransaction(
  work: (tx: Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0]) => Promise<void>,
): Promise<void> {
  try {
    await prisma.$transaction(async (tx) => {
      await work(tx);
      throw new Rollback();
    });
  } catch (error) {
    if (!(error instanceof Rollback)) throw error;
  }
}

describe("MIG-01 — the ActionStatus enum, alone in its own migration (C-145, L3 C-70)", () => {
  it("holds exactly PLANNED, COMPLETED, CANCELLED in declaration order", async () => {
    expect(await enumLabels("ActionStatus")).toEqual(["PLANNED", "COMPLETED", "CANCELLED"]);
  });

  it("is created by a migration whose only statement is CREATE TYPE \"ActionStatus\"", () => {
    const creators = migrationSqlFiles().filter((f) =>
      /CREATE\s+TYPE\s+"ActionStatus"/i.test(f.sql),
    );
    expect(creators.map((f) => f.folder)).toHaveLength(1);
    expect(statements(creators[0].sql)).toHaveLength(1);
  });

  it("is ordered before the migration that creates the ActionTaken table", () => {
    const files = migrationSqlFiles();
    const enumAt = files.findIndex((f) => /CREATE\s+TYPE\s+"ActionStatus"/i.test(f.sql));
    const tableAt = files.findIndex((f) => /CREATE\s+TABLE\s+"ActionTaken"/i.test(f.sql));
    expect(enumAt).toBeGreaterThanOrEqual(0);
    expect(tableAt).toBeGreaterThan(enumAt);
  });
});

describe("MIG-02 — ActionTaken carries every spec 7.2 column (BR-01)", () => {
  it("has each column with its type and nullability", async () => {
    const cols = await columns("ActionTaken");
    const expected: [string, string, "YES" | "NO"][] = [
      ["id", "int4", "NO"],
      ["ticketId", "int4", "NO"],
      ["status", "ActionStatus", "NO"],
      ["actionAt", "timestamp", "NO"],
      ["description", "text", "NO"],
      ["result", "text", "YES"],
      ["followUpRequired", "bool", "NO"],
      ["followUpNote", "text", "YES"],
      ["attachmentNotes", "text", "YES"],
      ["assigneeId", "int4", "NO"],
      ["performedById", "int4", "YES"],
      ["finishedAt", "timestamp", "YES"],
      ["createdById", "int4", "NO"],
      ["createdAt", "timestamp", "NO"],
      ["version", "int4", "NO"],
      ["clientRequestId", "text", "YES"],
    ];
    for (const [name, udt, nullable] of expected) {
      expect(cols[name]?.udt_name, `${name} type`).toBe(udt);
      expect(cols[name]?.is_nullable, `${name} nullability`).toBe(nullable);
    }
    expect(Object.keys(cols).sort()).toEqual(expected.map(([n]) => n).sort());
  });

  it("defaults followUpRequired to false, version to 0 and createdAt to now", async () => {
    const cols = await columns("ActionTaken");
    expect(cols.followUpRequired?.column_default).toBe("false");
    expect(cols.version?.column_default).toBe("0");
    expect(cols.createdAt?.column_default).toBe("CURRENT_TIMESTAMP");
  });

  it("references exactly one Ticket and the assignee, creator and performer Users", async () => {
    const keys = (await foreignKeys()).filter((k) => k.from === "ActionTaken");
    expect(keys).toEqual(
      expect.arrayContaining([
        { from: "ActionTaken", column: "ticketId", to: "Ticket" },
        { from: "ActionTaken", column: "assigneeId", to: "User" },
        { from: "ActionTaken", column: "createdById", to: "User" },
        { from: "ActionTaken", column: "performedById", to: "User" },
      ]),
    );
    expect(keys).toHaveLength(4);
  });
});

describe("MIG-03 — TicketStatusChange is append-only by absence (spec 7.3, C-167)", () => {
  it("has a nullable fromStatus, a NOT NULL toStatus, both TicketStatus, and changedAt defaulting to now", async () => {
    const cols = await columns("TicketStatusChange");
    expect(cols.fromStatus?.udt_name).toBe("TicketStatus");
    expect(cols.fromStatus?.is_nullable).toBe("YES");
    expect(cols.toStatus?.udt_name).toBe("TicketStatus");
    expect(cols.toStatus?.is_nullable).toBe("NO");
    expect(cols.changedById?.is_nullable).toBe("NO");
    expect(cols.changedAt?.is_nullable).toBe("NO");
    expect(cols.changedAt?.column_default).toBe("CURRENT_TIMESTAMP");
  });

  it("references the Ticket and the User who made the change", async () => {
    expect(await foreignKeys()).toEqual(
      expect.arrayContaining([
        { from: "TicketStatusChange", column: "ticketId", to: "Ticket" },
        { from: "TicketStatusChange", column: "changedById", to: "User" },
      ]),
    );
  });

  it("has no updatedAt column", async () => {
    expect(Object.keys(await columns("TicketStatusChange"))).not.toContain("updatedAt");
  });
});

describe("MIG-04 — Ticket gains version, lastActivityAt and resolvedAt (spec 7.4, BR-35)", () => {
  it("adds version INT NOT NULL DEFAULT 0", async () => {
    const cols = await columns("Ticket");
    expect(cols.version?.udt_name).toBe("int4");
    expect(cols.version?.is_nullable).toBe("NO");
    expect(cols.version?.column_default).toBe("0");
  });

  it("adds lastActivityAt NOT NULL DEFAULT now()", async () => {
    const cols = await columns("Ticket");
    expect(cols.lastActivityAt?.udt_name).toBe("timestamp");
    expect(cols.lastActivityAt?.is_nullable).toBe("NO");
    expect(cols.lastActivityAt?.column_default).toBe("CURRENT_TIMESTAMP");
  });

  it("adds a nullable resolvedAt", async () => {
    const cols = await columns("Ticket");
    expect(cols.resolvedAt?.udt_name).toBe("timestamp");
    expect(cols.resolvedAt?.is_nullable).toBe("YES");
  });
});

describe("MIG-05 — the four clientRequestId composite uniques (BR-42, C-145)", () => {
  it("makes Ticket(requesterId, clientRequestId), PublicComment and InternalNote (authorId, clientRequestId) and ActionTaken(createdById, clientRequestId) unique", async () => {
    expect(await hasIndex("Ticket", ["requesterId", "clientRequestId"], true)).toBe(true);
    expect(await hasIndex("PublicComment", ["authorId", "clientRequestId"], true)).toBe(true);
    expect(await hasIndex("InternalNote", ["authorId", "clientRequestId"], true)).toBe(true);
    expect(await hasIndex("ActionTaken", ["createdById", "clientRequestId"], true)).toBe(true);
  });

  it("lets one author insert two rows with a NULL key into each of the four tables", async () => {
    const requester = await prisma.user.findFirstOrThrow({
      where: { role: "REQUESTER", isActive: true },
    });
    const staff = await prisma.user.findFirstOrThrow({ where: { role: "IT_STAFF", isActive: true } });
    const category = await prisma.category.findFirstOrThrow();
    const system = await prisma.relatedSystem.findFirstOrThrow();
    let inserted = 0;

    await inRolledBackTransaction(async (tx) => {
      const tickets = [];
      for (const n of [1, 2]) {
        tickets.push(
          await tx.ticket.create({
            data: {
              requesterId: requester.id,
              categoryId: category.id,
              relatedSystemId: system.id,
              summary: `MIG-05 NULL key Ticket ${n}`,
              description: "Created inside a rolled-back transaction by the Lab 4 migration test.",
              itPriority: "LOW",
            },
          }),
        );
      }
      const ticketId = tickets[0].id;
      for (const n of [1, 2]) {
        await tx.publicComment.create({
          data: { ticketId, authorId: requester.id, body: `MIG-05 comment ${n}` },
        });
        await tx.internalNote.create({
          data: { ticketId, authorId: staff.id, body: `MIG-05 note ${n}` },
        });
        await tx.actionTaken.create({
          data: {
            ticketId,
            status: "PLANNED",
            actionAt: new Date(),
            description: `MIG-05 action ${n}`,
            assigneeId: staff.id,
            createdById: staff.id,
          },
        });
      }
      inserted =
        tickets.length +
        (await tx.publicComment.count({ where: { ticketId, clientRequestId: null } })) +
        (await tx.internalNote.count({ where: { ticketId, clientRequestId: null } })) +
        (await tx.actionTaken.count({ where: { ticketId, clientRequestId: null } }));
    });

    expect(inserted).toBe(8);
  });
});

describe("MIG-06 — the five named indexes exist with their column order (spec 7.5, C-145)", () => {
  it.each([
    ["ActionTaken", ["ticketId", "actionAt", "id"]],
    ["ActionTaken", ["assigneeId", "status"]],
    ["Ticket", ["requesterId", "lastActivityAt"]],
    ["Ticket", ["resolvedAt"]],
    ["TicketStatusChange", ["ticketId", "changedAt", "id"]],
  ] as const)("indexes %s(%s)", async (table, cols) => {
    expect(await hasIndex(table, [...cols])).toBe(true);
  });
});

describe("MIG-07 — every Lab 4 migration is additive (BR-67, C-145)", () => {
  const lab4 = () => migrationSqlFiles().filter((f) => /lab04/i.test(f.folder));

  it("finds the Lab 4 migrations to inspect", () => {
    expect(lab4().length).toBeGreaterThanOrEqual(1);
  });

  it.each([
    ["DROP TABLE", /DROP\s+TABLE/i],
    ["DROP COLUMN", /DROP\s+COLUMN/i],
    ["DROP TYPE", /DROP\s+TYPE/i],
    ["a column type change", /ALTER\s+COLUMN\s+"?\w+"?\s+(SET\s+DATA\s+)?TYPE/i],
    ["a CHECK constraint", /\bCHECK\s*\(/i],
  ])("contains no %s", (_label, pattern) => {
    expect(lab4().filter((f) => pattern.test(f.sql)).map((f) => f.folder)).toEqual([]);
  });
});

describe("MIG-08 — a Ticket created without any Lab 4 field gets the defaults (C-145)", () => {
  it("creates with version 0, lastActivityAt set and resolvedAt null", async () => {
    const requester = await prisma.user.findFirstOrThrow({
      where: { role: "REQUESTER", isActive: true },
    });
    const category = await prisma.category.findFirstOrThrow();
    const system = await prisma.relatedSystem.findFirstOrThrow();
    const before = Date.now();

    const ticket = await prisma.ticket.create({
      data: {
        requesterId: requester.id,
        categoryId: category.id,
        relatedSystemId: system.id,
        summary: "MIG-08 Lab 4 defaults check",
        description: "Created by the Lab 4 migration test naming no Lab 4 field.",
        itPriority: "MEDIUM",
      },
    });
    try {
      expect(ticket.version).toBe(0);
      expect(ticket.lastActivityAt).toBeInstanceOf(Date);
      expect(ticket.lastActivityAt.getTime()).toBeGreaterThanOrEqual(before - 5_000);
      expect(ticket.resolvedAt).toBeNull();
    } finally {
      await prisma.ticket.delete({ where: { id: ticket.id } });
    }
  });
});

describe("Lab 4 seed on a fresh database (spec 7.9, C-146, C-188)", () => {
  let fresh: PrismaClient;
  const freshUrl = (() => {
    const url = new URL(process.env.DATABASE_URL ?? "");
    url.pathname = `/${FRESH_DATABASE}`;
    return url.toString();
  })();

  const dropFresh = () =>
    prisma.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${FRESH_DATABASE}" WITH (FORCE)`);

  // The seed's own Tickets, located by their natural key (Requester email, summary).
  async function seededTickets() {
    const found = [];
    for (const t of SEED_TICKETS) {
      const ticket = await fresh.ticket.findFirst({
        where: { requester: { email: t.requesterEmail }, summary: t.summary },
      });
      if (ticket) found.push({ plan: t, ticket });
    }
    return found;
  }

  beforeAll(async () => {
    await dropFresh();
    await prisma.$executeRawUnsafe(`CREATE DATABASE "${FRESH_DATABASE}"`);
    execSync("npx prisma migrate deploy", {
      cwd: SERVER_DIR,
      env: { ...process.env, DATABASE_URL: freshUrl },
      stdio: "pipe",
    });
    fresh = new PrismaClient({ datasources: { db: { url: freshUrl } } });
    await seedGraded(fresh);
  }, 120_000);

  afterAll(async () => {
    await fresh?.$disconnect();
    await dropFresh();
  });

  describe("MIG-14 — the seed run a second time duplicates nothing (AC-98, BR-69, L3 C-72)", () => {
    it("leaves the Ticket, Public Comment, Internal Note, ActionTaken and TicketStatusChange counts unchanged", async () => {
      const counts = async () => ({
        tickets: await fresh.ticket.count(),
        publicComments: await fresh.publicComment.count(),
        internalNotes: await fresh.internalNote.count(),
        actions: await fresh.actionTaken.count(),
        statusChanges: await fresh.ticketStatusChange.count(),
      });
      const before = await counts();
      expect(before.actions).toBeGreaterThan(0);
      expect(before.statusChanges).toBeGreaterThan(0);

      await seedGraded(fresh);
      expect(await counts()).toEqual(before);
    });

    it("keys actions by (Ticket, description): each seeded action exists exactly once", async () => {
      for (const a of SEED_ACTIONS) {
        const plan = SEED_TICKETS.find((t) => t.summary === a.ticketSummary);
        expect(plan, a.ticketSummary).toBeDefined();
        const n = await fresh.actionTaken.count({
          where: {
            description: a.description,
            ticket: { summary: a.ticketSummary, requester: { email: plan?.requesterEmail } },
          },
        });
        expect(n, a.description).toBe(1);
      }
    });

    it("keeps a password that was changed after seeding", async () => {
      const persona = await fresh.user.findFirstOrThrow({
        where: { role: "REQUESTER", isActive: true, mustChangePassword: false },
      });
      const changed = "scrypt$16384$8$1$00112233445566778899aabbccddeeff$changed-by-the-user";
      await fresh.user.update({ where: { id: persona.id }, data: { passwordHash: changed } });

      await seedGraded(fresh);
      const after = await fresh.user.findUniqueOrThrow({ where: { id: persona.id } });
      expect(after.passwordHash).toBe(changed);
    });
  });

  describe("MIG-15 — seed composition: action counts (AC-99, BR-02, C-146)", () => {
    it("holds Tickets with zero, one and several actions", async () => {
      const perTicket = await Promise.all(
        (await seededTickets()).map(({ ticket }) =>
          fresh.actionTaken.count({ where: { ticketId: ticket.id } }),
        ),
      );
      expect(perTicket).toContain(0);
      expect(perTicket).toContain(1);
      expect(perTicket.some((n) => n > 1)).toBe(true);
    });

    it("holds one Ticket whose actions were created or performed by three different staff users", async () => {
      let widest = 0;
      for (const { ticket } of await seededTickets()) {
        const actions = await fresh.actionTaken.findMany({
          where: { ticketId: ticket.id },
          include: { creator: true, performer: true },
        });
        const staff = new Set<number>();
        for (const a of actions) {
          for (const u of [a.creator, a.performer]) {
            if (u && u.role !== "REQUESTER") staff.add(u.id);
          }
        }
        widest = Math.max(widest, staff.size);
      }
      expect(widest).toBeGreaterThanOrEqual(3);
    });
  });

  describe("MIG-16 — seed composition: action states (C-146)", () => {
    it("holds at least one PLANNED, COMPLETED, CANCELLED and follow-up-required action", async () => {
      for (const status of ["PLANNED", "COMPLETED", "CANCELLED"] as const) {
        expect(await fresh.actionTaken.count({ where: { status } }), status).toBeGreaterThan(0);
      }
      expect(await fresh.actionTaken.count({ where: { followUpRequired: true } })).toBeGreaterThan(0);
    });
  });

  describe("MIG-17 — seed composition: the resolution gate (AC-99, C-146)", () => {
    // The failing Ticket must fail despite recorded work: a Ticket with no
    // action at all fails trivially (NO_COMPLETED_ACTION) and proves nothing.
    it("holds one open Ticket whose gate is met and one whose gate is not despite a completed action", async () => {
      const results: { summary: string; reasons: string[] }[] = [];
      for (const { ticket } of await seededTickets()) {
        if (!(OPEN_STATUSES as readonly string[]).includes(ticket.currentStatus)) continue;
        results.push({ summary: ticket.summary, reasons: await gateReasons(fresh, ticket.id) });
      }
      expect(results.some((r) => r.reasons.length === 0), JSON.stringify(results)).toBe(true);
      expect(
        results.some((r) => r.reasons.length > 0 && !r.reasons.includes("NO_COMPLETED_ACTION")),
        JSON.stringify(results),
      ).toBe(true);
    });
  });

  describe("MIG-18 — seeded RESOLVED and CLOSED Tickets (C-146, BR-32, BR-49)", () => {
    it("gives each a resolvedAt and completed actions that satisfy the gate", async () => {
      const finished = (await seededTickets()).filter(({ ticket }) =>
        ["RESOLVED", "CLOSED"].includes(ticket.currentStatus),
      );
      expect(finished.map(({ ticket }) => ticket.currentStatus).sort()).toEqual([
        "CLOSED",
        "RESOLVED",
      ]);
      for (const { ticket } of finished) {
        expect(ticket.resolvedAt, ticket.summary).not.toBeNull();
        expect(
          await fresh.actionTaken.count({ where: { ticketId: ticket.id, status: "COMPLETED" } }),
          ticket.summary,
        ).toBeGreaterThan(0);
        expect(await gateReasons(fresh, ticket.id), ticket.summary).toEqual([]);
      }
    });
  });

  describe("MIG-19 — the zero-metric accounts (AC-99, C-146)", () => {
    it("leaves the active Requester nattapong.w with zero Tickets", async () => {
      const nattapong = await fresh.user.findUniqueOrThrow({
        where: { email: "nattapong.w@example.ac.th" },
      });
      expect(nattapong.isActive).toBe(true);
      expect(await fresh.ticket.count({ where: { requesterId: nattapong.id } })).toBe(0);
    });

    it("leaves the Administrator owning zero Tickets and assigned zero planned actions", async () => {
      const admin = await fresh.user.findFirstOrThrow({
        where: { role: "ADMINISTRATOR", isActive: true },
      });
      expect(await fresh.ticket.count({ where: { ownerId: admin.id } })).toBe(0);
      expect(
        await fresh.actionTaken.count({ where: { assigneeId: admin.id, status: "PLANNED" } }),
      ).toBe(0);
    });
  });

  describe("MIG-20 — activity times are relative to the run (C-146)", () => {
    it("never dates a seeded Ticket's lastActivityAt before its latest Public Comment or action (BR-46)", async () => {
      for (const { ticket } of await seededTickets()) {
        const [comment, action] = await Promise.all([
          fresh.publicComment.findFirst({ where: { ticketId: ticket.id }, orderBy: { createdAt: "desc" } }),
          fresh.actionTaken.findFirst({ where: { ticketId: ticket.id }, orderBy: { createdAt: "desc" } }),
        ]);
        for (const at of [comment?.createdAt, action?.createdAt]) {
          if (at) expect(ticket.lastActivityAt.getTime(), ticket.summary).toBeGreaterThanOrEqual(at.getTime());
        }
      }
    });

    it("fills the staff Recently updated list (BR-85)", async () => {
      const since = new Date(Date.now() - 168 * HOUR);
      expect(
        await fresh.ticket.count({
          where: {
            currentStatus: { notIn: [...ACTIVE_EXCLUDED] },
            lastActivityAt: { gte: since },
          },
        }),
      ).toBeGreaterThan(0);
    });

    it("fills a seeded Requester's Recently updated and Recently resolved lists (BR-77, BR-78)", async () => {
      const since = new Date(Date.now() - 168 * HOUR);
      const requesters = await fresh.user.findMany({ where: { role: "REQUESTER" } });
      const both = [];
      for (const r of requesters) {
        const updated = await fresh.ticket.count({
          where: { requesterId: r.id, lastActivityAt: { gte: since } },
        });
        const resolved = await fresh.ticket.count({
          where: { requesterId: r.id, resolvedAt: { gte: since } },
        });
        if (updated > 0 && resolved > 0) both.push(r.email);
      }
      expect(both.length).toBeGreaterThan(0);
    });
  });

  describe("MIG-21 — seeded actions obey their own rules (BR-04 to BR-07, C-146)", () => {
    it("never dates an action before its Ticket, nor a completed one after now + 5 min", async () => {
      const latest = Date.now() + 5 * 60 * 1000;
      const actions = await fresh.actionTaken.findMany({ include: { ticket: true } });
      expect(actions.length).toBeGreaterThan(0);
      for (const a of actions) {
        expect(a.actionAt.getTime(), a.description).toBeGreaterThanOrEqual(
          a.ticket.createdAt.getTime(),
        );
        if (a.status === "COMPLETED") {
          expect(a.actionAt.getTime(), a.description).toBeLessThanOrEqual(latest);
        }
      }
    });

    it("carries a followUpNote if and only if followUpRequired", async () => {
      for (const a of await fresh.actionTaken.findMany()) {
        expect(a.followUpNote !== null, a.description).toBe(a.followUpRequired);
      }
    });

    it("keeps every text field within its bounds after trim", async () => {
      const within = (value: string | null, min: number, max: number) =>
        value === null || (value.trim().length >= min && value.trim().length <= max);
      for (const a of await fresh.actionTaken.findMany()) {
        expect(within(a.description, 1, 2000), `description: ${a.description}`).toBe(true);
        expect(a.description.trim()).toBe(a.description);
        expect(within(a.result, 1, 2000), `result: ${a.description}`).toBe(true);
        expect(within(a.followUpNote, 1, 1000), `followUpNote: ${a.description}`).toBe(true);
        expect(within(a.attachmentNotes, 0, 500), `attachmentNotes: ${a.description}`).toBe(true);
      }
    });
  });
});
