import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { getPrisma } from "../../src/prisma.js";
import { seedGraded } from "../../src/seed/graded-seed.js";
import { createTicketWithNumber } from "../../src/lib/ticket-repository.js";

// Lab 3 migration and seed shape — tests.md MIG-01..MIG-20.
//
// This file runs against a freshly created toktickit_test with no Lab 2
// history (C-83), so it proves the SHAPE of the migration and the invariants
// of the seed. It cannot prove that the C-67 rename PRESERVED existing data:
// that is the C-83 rehearsal, whose captures are committed under
// artifacts/lab-03/migration/ (MIG-21, MIG-22).

const prisma = getPrisma();
const SERVER_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const MIGRATIONS_DIR = join(SERVER_DIR, "prisma", "migrations");

// The dedicated first-login account (C-72, D-08). The seed creates it flagged
// and never updates it again, so the mandatory-change path can be demonstrated
// repeatedly.
const FIRST_LOGIN_EMAIL = "first.login@example.ac.th";

type Column = { column_name: string; is_nullable: string; column_default: string | null };

async function columns(table: string): Promise<Record<string, Column>> {
  const rows = await prisma.$queryRawUnsafe<Column[]>(
    `SELECT column_name, is_nullable, column_default FROM information_schema.columns
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

async function tableExists(table: string): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
    `SELECT count(*) FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1`,
    table,
  );
  return Number(rows[0]?.count ?? 0) > 0;
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

async function indexDefinitions(table: string): Promise<string[]> {
  const rows = await prisma.$queryRawUnsafe<{ indexdef: string }[]>(
    `SELECT indexdef FROM pg_indexes WHERE schemaname = 'public' AND tablename = $1`,
    table,
  );
  return rows.map((r) => r.indexdef.replace(/\s+/g, " "));
}

// Comments are stripped, so this reads the statements a migration executes
// rather than the prose around them: lab03_user_rename_and_roles documents the
// DROP TABLE that Prisma generated and that was replaced by hand.
function migrationSqlFiles(): { path: string; sql: string }[] {
  return readdirSync(MIGRATIONS_DIR)
    .map((entry) => join(MIGRATIONS_DIR, entry))
    .filter((path) => statSync(path).isDirectory())
    .map((path) => join(path, "migration.sql"))
    .map((path) => ({
      path,
      sql: readFileSync(path, "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/^\s*--.*$/gm, ""),
    }));
}

describe("MIG-01 — the TicketStatus enum carries eight values (C-70, BR-52)", () => {
  it("holds NEW, OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER, RESOLVED, CLOSED, REOPENED, CANCELLED in declaration order", async () => {
    expect(await enumLabels("TicketStatus")).toEqual([
      "NEW",
      "OPEN",
      "IN_PROGRESS",
      "WAITING_FOR_REQUESTER",
      "RESOLVED",
      "CLOSED",
      "REOPENED",
      "CANCELLED",
    ]);
  });
});

describe("MIG-02 — the UserRole enum exists (C-69)", () => {
  it("holds REQUESTER, IT_STAFF, ADMINISTRATOR", async () => {
    expect(await enumLabels("UserRole")).toEqual(["REQUESTER", "IT_STAFF", "ADMINISTRATOR"]);
  });
});

describe("MIG-03 — the table is named User (C-67)", () => {
  it("has a User table and no RequesterUser table", async () => {
    expect(await tableExists("User")).toBe(true);
    expect(await tableExists("RequesterUser")).toBe(false);
  });
});

describe("MIG-04 — the rename was not a drop (C-67)", () => {
  it("contains no DROP TABLE \"RequesterUser\" in any migration SQL file", () => {
    const offenders = migrationSqlFiles()
      .filter((f) => /DROP\s+TABLE[^;]*"RequesterUser"/i.test(f.sql))
      .map((f) => f.path);
    expect(offenders).toEqual([]);
  });

  it("renames the table with ALTER TABLE \"RequesterUser\" RENAME TO \"User\"", () => {
    const renames = migrationSqlFiles().filter((f) =>
      /ALTER\s+TABLE\s+"RequesterUser"\s+RENAME\s+TO\s+"User"/i.test(f.sql),
    );
    expect(renames.length).toBe(1);
  });
});

describe("MIG-05 — the foreign key column keeps its name (C-68)", () => {
  it("keeps Ticket.requesterId, pointing at User", async () => {
    expect(Object.keys(await columns("Ticket"))).toContain("requesterId");
    const keys = await foreignKeys();
    expect(keys).toEqual(
      expect.arrayContaining([{ from: "Ticket", column: "requesterId", to: "User" }]),
    );
  });
});

describe("MIG-06 — User carries the new columns (specification 7)", () => {
  it("adds role NOT NULL default REQUESTER, nullable passwordHash, mustChangePassword NOT NULL default true, and updatedAt", async () => {
    const cols = await columns("User");

    expect(cols.role?.is_nullable).toBe("NO");
    expect(cols.role?.column_default).toContain("REQUESTER");
    expect(cols.passwordHash?.is_nullable).toBe("YES");
    expect(cols.mustChangePassword?.is_nullable).toBe("NO");
    expect(cols.mustChangePassword?.column_default).toBe("true");
    expect(cols.updatedAt).toBeDefined();
  });

  it("keeps the Lab 2 columns, so the rename preserved the shape", async () => {
    const cols = await columns("User");
    for (const name of ["id", "name", "email", "isActive", "createdAt"]) {
      expect(cols[name], name).toBeDefined();
    }
  });
});

describe("MIG-07 — itPriority is NOT NULL and copies Requested Priority (C-71, BR-49, AC-45)", () => {
  it("makes Ticket.itPriority NOT NULL", async () => {
    const cols = await columns("Ticket");
    expect(cols.itPriority?.is_nullable).toBe("NO");
  });

  it("gives a newly created Ticket an itPriority equal to its requestedPriority", async () => {
    const requester = await prisma.user.findFirstOrThrow({
      where: { role: "REQUESTER", isActive: true },
    });
    const category = await prisma.category.findFirstOrThrow();
    const system = await prisma.relatedSystem.findFirstOrThrow();

    const ticket = await createTicketWithNumber(prisma, {
      requesterId: requester.id,
      categoryId: category.id,
      relatedSystemId: system.id,
      summary: "MIG-07 IT Priority default check",
      description:
        "Created by the Lab 3 migration test to prove IT Priority is copied from Requested Priority on create.",
      requestedPriority: "HIGH",
    });

    expect(ticket.itPriority).toBe("HIGH");
    expect(ticket.itPriority).toBe(ticket.requestedPriority);

    await prisma.ticket.delete({ where: { id: ticket.id } });
  });
});

describe("MIG-08 — Ticket carries the new workflow columns (specification 7)", () => {
  it("adds a nullable ownerId foreign key to User and a nullable requesterResolvedAt", async () => {
    const cols = await columns("Ticket");
    expect(cols.ownerId?.is_nullable).toBe("YES");
    expect(cols.requesterResolvedAt?.is_nullable).toBe("YES");

    const keys = await foreignKeys();
    expect(keys).toEqual(
      expect.arrayContaining([{ from: "Ticket", column: "ownerId", to: "User" }]),
    );
  });
});

describe("MIG-09 — the three new tables exist (specification 7, C-73)", () => {
  it("creates Session with its columns and its User foreign key", async () => {
    const cols = await columns("Session");
    for (const name of ["id", "tokenHash", "userId", "createdAt", "expiresAt"]) {
      expect(cols[name], name).toBeDefined();
    }
    const keys = await foreignKeys();
    expect(keys).toEqual(
      expect.arrayContaining([{ from: "Session", column: "userId", to: "User" }]),
    );
  });

  it("creates PublicComment and InternalNote as two separate tables with Ticket and User foreign keys", async () => {
    for (const table of ["PublicComment", "InternalNote"]) {
      const cols = await columns(table);
      for (const name of ["id", "ticketId", "authorId", "body", "createdAt"]) {
        expect(cols[name], `${table}.${name}`).toBeDefined();
      }
    }
    const keys = await foreignKeys();
    expect(keys).toEqual(
      expect.arrayContaining([
        { from: "PublicComment", column: "ticketId", to: "Ticket" },
        { from: "PublicComment", column: "authorId", to: "User" },
        { from: "InternalNote", column: "ticketId", to: "Ticket" },
        { from: "InternalNote", column: "authorId", to: "User" },
      ]),
    );
  });
});

describe("MIG-10 — comments and notes are append-only by absence (specification 7)", () => {
  it("gives neither PublicComment nor InternalNote an updatedAt or a deletedAt column", async () => {
    for (const table of ["PublicComment", "InternalNote"]) {
      const names = Object.keys(await columns(table));
      expect(names, table).not.toContain("updatedAt");
      expect(names, table).not.toContain("deletedAt");
    }
  });
});

describe("MIG-11 — the three queue indexes exist (specification 7)", () => {
  it("indexes [currentStatus, itPriority, createdAt], [currentStatus, ownerId] and [currentStatus, categoryId]", async () => {
    const defs = await indexDefinitions("Ticket");
    const has = (cols: string) => defs.some((d) => d.includes(cols));

    expect(has(`"currentStatus", "itPriority", "createdAt"`)).toBe(true);
    expect(has(`"currentStatus", "ownerId"`)).toBe(true);
    expect(has(`"currentStatus", "categoryId"`)).toBe(true);
  });
});

describe("MIG-12 — the session and list indexes exist (specification 7)", () => {
  it("makes Session.tokenHash unique and indexes Session by userId", async () => {
    const defs = await indexDefinitions("Session");
    expect(defs.some((d) => /UNIQUE/i.test(d) && d.includes(`"tokenHash"`))).toBe(true);
    expect(defs.some((d) => d.includes(`("userId")`))).toBe(true);
  });

  it("indexes PublicComment and InternalNote by [ticketId, createdAt]", async () => {
    for (const table of ["PublicComment", "InternalNote"]) {
      const defs = await indexDefinitions(table);
      expect(defs.some((d) => d.includes(`"ticketId", "createdAt"`)), table).toBe(true);
    }
  });
});

describe("MIG-13 — the four Lab 2 indexes survive the migration (specification 7)", () => {
  it("keeps every requesterId-led Ticket index, so My Tickets still has the index it was given", async () => {
    const defs = await indexDefinitions("Ticket");
    const has = (cols: string) => defs.some((d) => d.includes(cols));

    expect(has(`"requesterId", "createdAt" DESC`)).toBe(true);
    expect(has(`"requesterId", "currentStatus"`)).toBe(true);
    expect(has(`"requesterId", "categoryId"`)).toBe(true);
    expect(has(`"requesterId", "relatedSystemId"`)).toBe(true);
  });
});

describe("MIG-14 — the migrated database has zero drift from schema.prisma (DoD)", () => {
  it("reports no difference between the schema and the database it is deployed to", () => {
    let status = 0;
    let output = "";
    try {
      output = execSync(
        "npx prisma migrate diff" +
          " --from-schema-datasource prisma/schema.prisma" +
          " --to-schema-datamodel prisma/schema.prisma" +
          " --exit-code",
        { cwd: SERVER_DIR, env: process.env, encoding: "utf8" },
      );
    } catch (error) {
      const failure = error as { status?: number; stdout?: string; stderr?: string };
      status = failure.status ?? 1;
      output = `${failure.stdout ?? ""}${failure.stderr ?? ""}`;
    }
    expect(output.trim()).not.toBe("");
    expect(status, output).toBe(0);
  });
});

describe("MIG-15 — the graded seed is idempotent (AC-99, C-91)", () => {
  it("leaves the User, Category, RelatedSystem, Ticket, PublicComment and InternalNote counts unchanged on a second run", async () => {
    const counts = async () => ({
      users: await prisma.user.count(),
      categories: await prisma.category.count(),
      relatedSystems: await prisma.relatedSystem.count(),
      tickets: await prisma.ticket.count(),
      publicComments: await prisma.publicComment.count(),
      internalNotes: await prisma.internalNote.count(),
    });

    const before = await counts();
    await seedGraded(prisma);
    expect(await counts()).toEqual(before);
  });
});

describe("MIG-16 — the seed matches labsheet 5.3 (AC-100, C-91)", () => {
  it("seeds at least four active and one inactive Requester", async () => {
    expect(
      await prisma.user.count({ where: { role: "REQUESTER", isActive: true } }),
    ).toBeGreaterThanOrEqual(4);
    expect(
      await prisma.user.count({ where: { role: "REQUESTER", isActive: false } }),
    ).toBeGreaterThanOrEqual(1);
  });

  it("seeds three active and one inactive IT Staff", async () => {
    expect(
      await prisma.user.count({ where: { role: "IT_STAFF", isActive: true } }),
    ).toBeGreaterThanOrEqual(3);
    expect(
      await prisma.user.count({ where: { role: "IT_STAFF", isActive: false } }),
    ).toBeGreaterThanOrEqual(1);
  });

  it("seeds at least one active Administrator", async () => {
    expect(
      await prisma.user.count({ where: { role: "ADMINISTRATOR", isActive: true } }),
    ).toBeGreaterThanOrEqual(1);
  });

  it("seeds the dedicated first-login account, flagged and able to authenticate", async () => {
    const account = await prisma.user.findUnique({ where: { email: FIRST_LOGIN_EMAIL } });
    expect(account).not.toBeNull();
    expect(account?.mustChangePassword).toBe(true);
    expect(account?.passwordHash).not.toBeNull();
    expect(account?.isActive).toBe(true);
  });

  it("clears mustChangePassword for the named personas, so only the first-login account is flagged", async () => {
    const flagged = await prisma.user.findMany({
      where: { mustChangePassword: true },
      select: { email: true },
    });
    expect(flagged.map((u) => u.email)).toEqual([FIRST_LOGIN_EMAIL]);
  });

  it("never seeds a user without a password hash, so no seeded account is unreachable", async () => {
    expect(await prisma.user.count({ where: { passwordHash: null } })).toBe(0);
  });
});

describe("MIG-17 — the seed carries realistic Tickets, Comments and Notes (C-91, LS 5.3)", () => {
  it("spreads Tickets across more than one Requester", async () => {
    const grouped = await prisma.ticket.groupBy({ by: ["requesterId"], _count: true });
    expect(grouped.length).toBeGreaterThan(1);
  });

  it("covers all eight statuses", async () => {
    const grouped = await prisma.ticket.groupBy({ by: ["currentStatus"] });
    expect(grouped.map((g) => g.currentStatus).sort()).toEqual(
      [
        "CANCELLED",
        "CLOSED",
        "IN_PROGRESS",
        "NEW",
        "OPEN",
        "REOPENED",
        "RESOLVED",
        "WAITING_FOR_REQUESTER",
      ].sort(),
    );
  });

  it("covers all three Requested Priorities", async () => {
    const grouped = await prisma.ticket.groupBy({ by: ["requestedPriority"] });
    expect(grouped.length).toBe(3);
  });

  it("carries both owned and unassigned Tickets", async () => {
    expect(await prisma.ticket.count({ where: { ownerId: { not: null } } })).toBeGreaterThan(0);
    expect(await prisma.ticket.count({ where: { ownerId: null } })).toBeGreaterThan(0);
  });

  it("gives every Ticket a non-null IT Priority", async () => {
    const tickets = await prisma.ticket.findMany({ select: { itPriority: true } });
    expect(tickets.length).toBeGreaterThan(0);
    expect(tickets.every((t) => t.itPriority !== null)).toBe(true);
  });

  it("carries example Public Comments and Internal Notes", async () => {
    expect(await prisma.publicComment.count()).toBeGreaterThan(0);
    expect(await prisma.internalNote.count()).toBeGreaterThan(0);
  });

  // Proposed addition, reported with the issue: tests.md plans no row for it.
  // The Lab 2 "No tickets yet" empty state is reached by one active Requester
  // having none (BR-57, AC-49), and
  // e2e/lab-02/my-tickets-screenshots.spec.ts asserts that Requester's total is
  // 0. This is asserted over the seed FIXTURE rather than over the database,
  // because toktickit_test accumulates rows that tests create, while the
  // fixture is what a fresh dev database gets.
  it("plans no Ticket for at least one active Requester persona, which is how the empty state is reached", async () => {
    const { REQUESTERS, SEED_TICKETS } = await import("../../src/seed/graded-seed.js");
    const withTickets = new Set(SEED_TICKETS.map((t) => t.requesterEmail));
    const withNone = REQUESTERS.filter((r) => r.isActive && !withTickets.has(r.email));
    expect(withNone.map((r) => r.email)).toHaveLength(1);
  });
});

describe("MIG-18 — the seed never overwrites a changed password (AC-101, C-72)", () => {
  it("keeps a hash that was changed after seeding when the seed runs again", async () => {
    const persona = await prisma.user.findFirstOrThrow({
      where: { role: "REQUESTER", isActive: true, email: { not: FIRST_LOGIN_EMAIL } },
    });
    const original = persona.passwordHash;
    const changed = "scrypt$16384$8$1$00112233445566778899aabbccddeeff$changed-by-the-user";

    await prisma.user.update({ where: { id: persona.id }, data: { passwordHash: changed } });
    try {
      await seedGraded(prisma);
      const after = await prisma.user.findUniqueOrThrow({ where: { id: persona.id } });
      expect(after.passwordHash).toBe(changed);
      expect(after.mustChangePassword).toBe(false);
    } finally {
      await prisma.user.update({
        where: { id: persona.id },
        data: { passwordHash: original },
      });
    }
  });
});

describe("MIG-19 — the first-login account stays flagged (C-72)", () => {
  it("keeps mustChangePassword true after a re-seed", async () => {
    await seedGraded(prisma);
    const account = await prisma.user.findUniqueOrThrow({
      where: { email: FIRST_LOGIN_EMAIL },
    });
    expect(account.mustChangePassword).toBe(true);
  });
});

describe("MIG-20 — the (Requester email, summary) natural key is safe (C-91)", () => {
  it("raises rather than proceeding if two seeded Tickets would share a Requester email and summary", async () => {
    const { assertUniqueTicketKeys } = await import("../../src/seed/graded-seed.js");

    expect(() =>
      assertUniqueTicketKeys([
        { requesterEmail: "a@example.ac.th", summary: "Duplicated summary" },
        { requesterEmail: "a@example.ac.th", summary: "Duplicated summary" },
      ]),
    ).toThrowError(/duplicate/i);
  });

  it("accepts the shipped seed fixture, which carries no duplicate key", async () => {
    const { assertUniqueTicketKeys, SEED_TICKETS } = await import(
      "../../src/seed/graded-seed.js"
    );
    expect(() => assertUniqueTicketKeys(SEED_TICKETS)).not.toThrow();
  });
});
