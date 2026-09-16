// BR-10 / C-39 - timestamps arrive from the API in UTC (ISO 8601, Z offset)
// and are displayed in Asia/Bangkok using the single fixed format
// `DD MMM YYYY HH:mm`. No other display format is used anywhere.
//
// Month names are pinned rather than taken from a locale, so an ICU change
// (en-GB renders September as "Sept") cannot silently break the format. The
// server keeps the same helper in server/src/lib/format.ts, tested by UNIT-04.

export const DISPLAY_TIME_ZONE = "Asia/Bangkok";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

const zoneParts = new Intl.DateTimeFormat("en-GB", {
  timeZone: DISPLAY_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function formatDisplayTimestamp(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const p = Object.fromEntries(zoneParts.formatToParts(date).map((part) => [part.type, part.value]));
  return `${p.day} ${MONTHS[Number(p.month) - 1]} ${p.year} ${p.hour}:${p.minute}`;
}

// File sizes for attachment chips and metadata rows.
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
