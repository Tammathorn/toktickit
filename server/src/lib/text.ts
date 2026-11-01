// BR-30 — all text values are trimmed before validation and stored trimmed.
// Kept as a named helper so that "trimmed before validation" is one behaviour
// with one test (UNIT-05), rather than a .trim() repeated at every call site.

export function trimmed(value: string): string {
  return value.trim();
}

// L3 C-74 - the Public Comment and Internal Note text rule: trimmed, then 1 to
// `max` characters. Returns the trimmed text, or null when it fails. Lab 4
// BR-04 reuses this same function for an action's description and result.
export function trimmedWithin(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const t = trimmed(value);
  return t.length >= 1 && t.length <= max ? t : null;
}
