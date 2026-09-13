import { describe, it, expect, beforeAll } from "vitest";
import { getPrisma } from "../../src/prisma.js";
import { seedGraded } from "../../src/seed/graded-seed.js";
import { TICKET_NUMBER_PATTERN } from "../../src/lib/ticket-number.js";
import { createTicketWithNumber } from "../../src/lib/ticket-repository.js";

// Lab 2 data model, migration and seed — Issue #11.
// tests.md carries no planned rows for this level; DB-01..DB-08 are proposed
// additions, reported with the issue. They discharge the specification.md
// Definition of Done items "schema.prisma matches section 7, including every
// index" and "npm run prisma:seed run twice creates no duplicate rows".

const prisma = getPrisma();

describe("DB-01 — the graded seed matches labsheet 5.3 (C-22)", () => {
  beforeAll(async () => {
    await seedGraded(prisma);
  });

  it("seeds exactly the four required Categories, all active", async () => {
    const categories = await prisma.category.findMany({ orderBy: { id: "asc" } });
    expect(categories.map((c) => c.name)).toEqual([
      "Account and Access",
      "Hardware",
      "Software",
      "Network",
    ]);
    expect(categories.every((c) => c.isActive)).toBe(true);
  });

  it("seeds at least six Related Systems", async () => {
    const systems = await prisma.relatedSystem.findMany();
    expect(systems.length).toBeGreaterThanOrEqual(6);
  });

  it("seeds at least four active Development Requesters", async () => {
    const active = await prisma.requesterUser.count({ where: { isActive: true } });
    expect(active).toBeGreaterThanOrEqual(4);
  });

  it("seeds at least one inactive Development Requester (BR-11, C-33)", async () => {
    const inactive = await prisma.requesterUser.count({ where: { isActive: false } });
    expect(inactive).toBeGreaterThanOrEqual(1);
  });
});

describe("DB-02 — the graded seed is idempotent (LS 5.3)", () => {
  it("creates no duplicate rows when run a second time", async () => {
    const before = {
      categories: await prisma.category.count(),
      systems: await prisma.relatedSystem.count(),
      requesters: await prisma.requesterUser.count(),
    };

    await seedGraded(prisma);

    expect(await prisma.category.count()).toBe(before.categories);
    expect(await prisma.relatedSystem.count()).toBe(before.systems);
    expect(await prisma.requesterUser.count()).toBe(before.requesters);
  });
});

describe("DB-03 — the Lab 1 contract survives the additive migration (C-05, C-37)", () => {
  it("keeps the four Lab 1 Categories in id order with their original ids", async () => {
    const categories = await prisma.category.findMany({
      orderBy: { id: "asc" },
      select: { id: true, name: true },
    });
    expect(categories.slice(0, 4)).toEqual([
      { id: 1, name: "Account and Access" },
      { id: 2, name: "Hardware" },
      { id: 3, name: "Software" },
      { id: 4, name: "Network" },
    ]);
  });

  it("defaults the new isActive column to true, so no backfill was needed", async () => {
    const inactive = await prisma.category.count({ where: { isActive: false } });
    expect(inactive).toBe(0);
  });
});

describe("DB-04 — enums carry their full Lab 3 range (C-21, C-23)", () => {
  it("accepts every TicketStatus value the enum declares", async () => {
    const values = await prisma.$queryRawUnsafe<{ enumlabel: string }[]>(
      `SELECT enumlabel FROM pg_enum e
       JOIN pg_type t ON t.oid = e.enumtypid
       WHERE t.typname = 'TicketStatus' ORDER BY e.enumsortorder`,
    );
    expect(values.map((v) => v.enumlabel)).toEqual([
      "NEW",
      "IN_PROGRESS",
      "RESOLVED",
      "CLOSED",
      "CANCELLED",
    ]);
  });

  it("declares exactly three Requested Priority values", async () => {
    const values = await prisma.$queryRawUnsafe<{ enumlabel: string }[]>(
      `SELECT enumlabel FROM pg_enum e
       JOIN pg_type t ON t.oid = e.enumtypid
       WHERE t.typname = 'RequestedPriority' ORDER BY e.enumsortorder`,
    );
    expect(values.map((v) => v.enumlabel)).toEqual(["LOW", "MEDIUM", "HIGH"]);
  });
});

describe("DB-05 — every index in specification.md section 7 exists", () => {
  it("creates the four Ticket indexes and the Attachment index", async () => {
    const rows = await prisma.$queryRawUnsafe<{ indexdef: string }[]>(
      `SELECT indexdef FROM pg_indexes WHERE tablename IN ('Ticket', 'Attachment')`,
    );
    const defs = rows.map((r) => r.indexdef.replace(/\s+/g, " "));
    const has = (cols: string) => defs.some((d) => d.includes(cols));

    expect(has(`"requesterId", "createdAt" DESC`)).toBe(true);
    expect(has(`"requesterId", "currentStatus"`)).toBe(true);
    expect(has(`"requesterId", "categoryId"`)).toBe(true);
    expect(has(`"requesterId", "relatedSystemId"`)).toBe(true);
    expect(has(`"ticketId", "isRemoved"`)).toBe(true);
  });

  it("makes ticketNumber unique, which is the index C-30's search relies on", async () => {
    const rows = await prisma.$queryRawUnsafe<{ indexdef: string }[]>(
      `SELECT indexdef FROM pg_indexes WHERE tablename = 'Ticket'`,
    );
    expect(
      rows.some((r) => /UNIQUE/i.test(r.indexdef) && r.indexdef.includes("ticketNumber")),
    ).toBe(true);
  });

  it("leaves summary and description unindexed, per C-30", async () => {
    const rows = await prisma.$queryRawUnsafe<{ indexdef: string }[]>(
      `SELECT indexdef FROM pg_indexes WHERE tablename = 'Ticket'`,
    );
    const singleColumn = rows.filter(
      (r) => r.indexdef.includes(`("summary")`) || r.indexdef.includes(`("description")`),
    );
    expect(singleColumn).toEqual([]);
  });
});

describe("DB-06 — Ticket Number is assigned inside the creation transaction (C-49)", () => {
  it("returns a Ticket whose number is non-null and matches the pattern", async () => {
    const requester = await prisma.requesterUser.findFirstOrThrow({
      where: { isActive: true },
    });
    const category = await prisma.category.findFirstOrThrow();
    const system = await prisma.relatedSystem.findFirstOrThrow();

    const ticket = await createTicketWithNumber(prisma, {
      requesterId: requester.id,
      categoryId: category.id,
      relatedSystemId: system.id,
      summary: "DB-06 transaction check",
      description:
        "Created by the Issue #11 data-model test to prove the ticket number is assigned inside the transaction.",
      requestedPriority: "MEDIUM",
    });

    expect(ticket.ticketNumber).not.toBeNull();
    expect(ticket.ticketNumber).toMatch(TICKET_NUMBER_PATTERN);
    expect(ticket.ticketNumber).toBe(
      `TKT-${ticket.createdAt.getUTCFullYear()}-${String(ticket.id).padStart(6, "0")}`,
    );

    await prisma.ticket.delete({ where: { id: ticket.id } });
  });

  it("applies the Lab 2 defaults: status NEW and IT Priority null (BR-02, BR-07)", async () => {
    const requester = await prisma.requesterUser.findFirstOrThrow({
      where: { isActive: true },
    });
    const category = await prisma.category.findFirstOrThrow();
    const system = await prisma.relatedSystem.findFirstOrThrow();

    const ticket = await createTicketWithNumber(prisma, {
      requesterId: requester.id,
      categoryId: category.id,
      relatedSystemId: system.id,
      summary: "DB-06 defaults check",
      description:
        "Created by the Issue #11 data-model test to prove the Lab 2 defaults land on a new row.",
      requestedPriority: "MEDIUM",
    });

    expect(ticket.currentStatus).toBe("NEW");
    expect(ticket.itPriority).toBeNull();

    await prisma.ticket.delete({ where: { id: ticket.id } });
  });

  it("leaves no Ticket without a number visible outside the transaction (BR-01)", async () => {
    const orphans = await prisma.ticket.count({ where: { ticketNumber: null } });
    expect(orphans).toBe(0);
  });
});

describe("DB-07 — ownership and soft-removal columns exist as section 7 specifies", () => {
  it("makes ticketNumber nullable in the schema (C-49)", async () => {
    const rows = await prisma.$queryRawUnsafe<{ is_nullable: string }[]>(
      `SELECT is_nullable FROM information_schema.columns
       WHERE table_name = 'Ticket' AND column_name = 'ticketNumber'`,
    );
    expect(rows[0]?.is_nullable).toBe("YES");
  });

  it("gives Attachment its soft-removal trio, with removedAt and removalReason nullable", async () => {
    const rows = await prisma.$queryRawUnsafe<
      { column_name: string; is_nullable: string }[]
    >(
      `SELECT column_name, is_nullable FROM information_schema.columns
       WHERE table_name = 'Attachment'
         AND column_name IN ('isRemoved', 'removedAt', 'removalReason')`,
    );
    const byName = Object.fromEntries(rows.map((r) => [r.column_name, r.is_nullable]));
    expect(byName.isRemoved).toBe("NO");
    expect(byName.removedAt).toBe("YES");
    expect(byName.removalReason).toBe("YES");
  });
});

describe("DB-08 — the five LS 5.1 relationships are foreign keys", () => {
  it("declares Ticket -> RequesterUser, Category, RelatedSystem and Attachment -> Ticket", async () => {
    const rows = await prisma.$queryRawUnsafe<
      { table_name: string; foreign_table_name: string }[]
    >(
      `SELECT tc.table_name, ccu.table_name AS foreign_table_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.constraint_column_usage ccu
         ON ccu.constraint_name = tc.constraint_name
       WHERE tc.constraint_type = 'FOREIGN KEY'
         AND tc.table_name IN ('Ticket', 'Attachment')`,
    );
    const pairs = rows.map((r) => `${r.table_name}->${r.foreign_table_name}`);
    expect(pairs).toContain("Ticket->RequesterUser");
    expect(pairs).toContain("Ticket->Category");
    expect(pairs).toContain("Ticket->RelatedSystem");
    expect(pairs).toContain("Attachment->Ticket");
  });
});
