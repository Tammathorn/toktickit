// BR-10 — timestamps are stored in UTC and displayed in Asia/Bangkok using the
// single fixed format `DD MMM YYYY HH:mm`. No other display format is used.
//
// The API itself returns ISO 8601 with a Z offset (api-spec.md section 1); this
// helper is the server-side implementation of the one display format, tested by
// UNIT-04 and reused wherever the server renders a date for a human.

export const DISPLAY_TIME_ZONE = "Asia/Bangkok";

// Month names are pinned rather than taken from a locale. `en-GB` renders
// September as "Sept" under current ICU, which would silently break the single
// fixed format BR-10 requires, and an ICU update could change it again.
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

const zoneParts = new Intl.DateTimeFormat("en-GB", {
  timeZone: DISPLAY_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function partsIn(value: Date): Record<string, string> {
  return Object.fromEntries(
    zoneParts.formatToParts(value).map((p) => [p.type, p.value]),
  );
}

export function formatDisplayTimestamp(value: Date): string {
  const p = partsIn(value);
  const month = MONTHS[Number(p.month) - 1];
  // Assembled part by part, so the output cannot drift with a locale or ICU change.
  return `${p.day} ${month} ${p.year} ${p.hour}:${p.minute}`;
}
