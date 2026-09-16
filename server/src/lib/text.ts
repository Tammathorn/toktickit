// BR-30 — all text values are trimmed before validation and stored trimmed.
// Kept as a named helper so that "trimmed before validation" is one behaviour
// with one test (UNIT-05), rather than a .trim() repeated at every call site.

export function trimmed(value: string): string {
  return value.trim();
}
