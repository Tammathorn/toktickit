import { describe, it, expect } from "vitest";
import { formatTicketNumber, TICKET_NUMBER_PATTERN } from "../../src/lib/ticket-number.js";
import { formatDisplayTimestamp } from "../../src/lib/format.js";
import { trimmed } from "../../src/lib/text.js";

// Lab 2 unit level — tests.md UNIT-01..UNIT-05.
// Pure functions only: no database, no Express, no Prisma client.

describe("UNIT-01 — Ticket Number format (AC-15, BR-04)", () => {
  it("builds TKT-YYYY-NNNNNN from a known id and createdAt", () => {
    const createdAt = new Date("2026-01-02T03:04:05.000Z");
    expect(formatTicketNumber(42, createdAt)).toBe("TKT-2026-000042");
  });

  it("matches the C-11 regex asserted by the unit test", () => {
    const createdAt = new Date("2026-01-02T03:04:05.000Z");
    expect(formatTicketNumber(42, createdAt)).toMatch(TICKET_NUMBER_PATTERN);
    expect(TICKET_NUMBER_PATTERN.source).toBe("^TKT-\\d{4}-\\d{6}$");
  });
});

describe("UNIT-02 — zero padding at the boundaries (BR-04)", () => {
  const createdAt = new Date("2026-06-15T00:00:00.000Z");

  it("pads id 1 to six digits", () => {
    expect(formatTicketNumber(1, createdAt)).toBe("TKT-2026-000001");
  });

  it("leaves id 999999 unpadded", () => {
    expect(formatTicketNumber(999999, createdAt)).toBe("TKT-2026-999999");
  });

  it("does not truncate the year segment when the id exceeds six digits", () => {
    const n = formatTicketNumber(1000000, createdAt);
    expect(n).toBe("TKT-2026-1000000");
    expect(n.startsWith("TKT-2026-")).toBe(true);
  });
});

describe("UNIT-03 — the year comes from createdAt, not from now (BR-04, BR-10)", () => {
  it("uses the ticket's own creation year", () => {
    const createdAt = new Date("2025-12-31T23:59:00.000Z");
    expect(formatTicketNumber(7, createdAt)).toMatch(/^TKT-2025-/);
  });

  it("uses the UTC year of createdAt, per the example tests.md UNIT-03 fixes", () => {
    // 2025-12-31T18:00Z is already 2026-01-01 in Asia/Bangkok, but the number
    // follows the stored UTC year. See the Issue #11 report: the Ticket Date
    // displayed beside this number would read 01 Jan 2026.
    const createdAt = new Date("2025-12-31T18:00:00.000Z");
    expect(formatTicketNumber(7, createdAt)).toBe("TKT-2025-000007");
  });
});

describe("UNIT-04 — display timestamp format (BR-10, AC-60)", () => {
  it("renders DD MMM YYYY HH:mm in Asia/Bangkok, +7 from the stored UTC value", () => {
    expect(formatDisplayTimestamp(new Date("2026-09-05T04:12:33.000Z")))
      .toBe("05 Sep 2026 11:12");
  });

  it("pads the day and uses a 24-hour clock", () => {
    expect(formatDisplayTimestamp(new Date("2026-01-02T15:04:00.000Z")))
      .toBe("02 Jan 2026 22:04");
  });

  it("rolls the date over when +7 crosses midnight", () => {
    expect(formatDisplayTimestamp(new Date("2026-03-10T18:30:00.000Z")))
      .toBe("11 Mar 2026 01:30");
  });
});

describe("UNIT-05 — trim helper (BR-30)", () => {
  it("removes leading and trailing whitespace before length is measured", () => {
    expect(trimmed("   Laptop battery drains quickly   ")).toBe(
      "Laptop battery drains quickly",
    );
  });

  it("collapses a whitespace-only value to the empty string", () => {
    expect(trimmed("   \t\n  ")).toBe("");
  });

  it("leaves interior whitespace alone", () => {
    expect(trimmed("  two  words  ")).toBe("two  words");
  });
});
