// C-11 / BR-04 — the official Ticket Number is `TKT-YYYY-NNNNNN`, where the six
// digits are the Ticket's own zero-padded autoincrement id and the year comes
// from its createdAt. Deriving the digits from the primary key is what makes the
// number collision-free without a sequence table or a retry loop (C-49).
//
// The year is the UTC calendar year of createdAt. tests.md UNIT-03 fixes this:
// a Ticket created 2025-12-31T23:59Z must yield TKT-2025-. Note the consequence
// reported with Issue #11 — dates are *displayed* in Asia/Bangkok (BR-10), so a
// Ticket created between 17:00Z and 24:00Z on 31 December carries a number one
// year behind the Ticket Date printed beside it. Following the contract as
// written; the timezone of the number is not settled by any decision row.

export const TICKET_NUMBER_PATTERN = /^TKT-\d{4}-\d{6}$/;

export function formatTicketNumber(id: number, createdAt: Date): string {
  return `TKT-${createdAt.getUTCFullYear()}-${String(id).padStart(6, "0")}`;
}
