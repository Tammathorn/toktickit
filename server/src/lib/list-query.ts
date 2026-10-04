import type { Prisma, TicketStatus, RequestedPriority } from "@prisma/client";

// Shared query-parsing primitives for every Ticket list - api-spec.md 4.2 (the
// Requester list) and 8.1 (the Ticket Queue). Parsing is pure in both: it
// returns either the normalised query or one field error per offending
// parameter, so the route can answer 400 INVALID_QUERY_PARAM before anything
// touches the database (check order step 4). The two lists do not share a
// filter or default set - the queue is not requester-scoped (BR-74) and sorts
// and filters on different fields (C-78) - so each gets its own parse
// function built from these primitives rather than one function doing both
// jobs behind flags.

export const SORT_DIRECTIONS = ["asc", "desc"] as const;
export const PAGE_SIZES = [10, 25, 50] as const;
// C-70, FR-32 - all eight statuses, in the TicketStatus declaration order.
export const STATUSES: readonly TicketStatus[] = [
  "NEW",
  "OPEN",
  "IN_PROGRESS",
  "WAITING_FOR_REQUESTER",
  "RESOLVED",
  "CLOSED",
  "REOPENED",
  "CANCELLED",
];
export const IT_PRIORITIES: readonly RequestedPriority[] = ["LOW", "MEDIUM", "HIGH"];

export type SortDirection = (typeof SORT_DIRECTIONS)[number];

type Raw = Record<string, unknown>;
type Fields = Record<string, string>;

function one(raw: Raw, name: string): string | undefined {
  const v = raw[name];
  if (Array.isArray(v)) return String(v[0]);
  return v === undefined ? undefined : String(v);
}

function positiveInt(value: string): number | null {
  return /^\d+$/.test(value) && Number(value) > 0 ? Number(value) : null;
}

function parseSearch(raw: Raw): string | null {
  const searchRaw = one(raw, "search");
  return searchRaw && searchRaw.trim() !== "" ? searchRaw.trim() : null;
}

function parseIdParam(raw: Raw, name: string, fields: Fields): number | null {
  const v = one(raw, name);
  if (v === undefined || v === "") return null;
  const n = positiveInt(v);
  if (n === null) fields[name] = `${name} must be a positive integer.`;
  return n;
}

function parseStatusParam(raw: Raw, fields: Fields): TicketStatus | null {
  const v = one(raw, "currentStatus");
  if (v === undefined || v === "") return null;
  if (STATUSES.includes(v as TicketStatus)) return v as TicketStatus;
  fields.currentStatus = `currentStatus must be one of ${STATUSES.join(", ")}.`;
  return null;
}

function parsePaging(raw: Raw, fields: Fields): { page: number; pageSize: number } {
  let page = 1;
  const pageRaw = one(raw, "page");
  if (pageRaw !== undefined && pageRaw !== "") {
    const n = positiveInt(pageRaw);
    if (n === null) fields.page = "page must be a positive integer.";
    else page = n;
  }
  let pageSize = 10;
  const sizeRaw = one(raw, "pageSize");
  if (sizeRaw !== undefined && sizeRaw !== "") {
    const n = positiveInt(sizeRaw);
    if (n === null || !(PAGE_SIZES as readonly number[]).includes(n)) fields.pageSize = "pageSize must be 10, 25 or 50.";
    else pageSize = n;
  }
  return { page, pageSize };
}

function parseSortToken<F extends string>(
  raw: Raw,
  fields: Fields,
  allowedFields: readonly F[],
): { field: F; direction: SortDirection } | null {
  const sortRaw = one(raw, "sort");
  if (sortRaw === undefined || sortRaw === "") return null;
  const [f, d, ...rest] = sortRaw.split(":");
  if (rest.length === 0 && allowedFields.includes(f as F) && SORT_DIRECTIONS.includes(d as SortDirection)) {
    return { field: f as F, direction: d as SortDirection };
  }
  fields.sort = `sort must be field:direction with field one of ${allowedFields.join(", ")} and direction asc or desc.`;
  return null;
}

// ---------------------------------------------------------------------------
// api-spec.md 4.2 - GET /api/tickets, the Requester's own list (C-27, C-43).
// ---------------------------------------------------------------------------

export const TICKET_SORT_FIELDS = ["createdAt", "ticketNumber", "summary", "currentStatus"] as const;
export type TicketSortField = (typeof TICKET_SORT_FIELDS)[number];

export interface ListQuery {
  search: string | null;
  categoryId: number | null;
  relatedSystemId: number | null;
  currentStatus: TicketStatus | null;
  sortField: TicketSortField;
  sortDirection: SortDirection;
  sort: string;
  page: number;
  pageSize: number;
}

export function parseListQuery(raw: Raw): { ok: true; query: ListQuery } | { ok: false; fields: Fields } {
  const fields: Fields = {};
  const search = parseSearch(raw);
  const categoryId = parseIdParam(raw, "categoryId", fields);
  const relatedSystemId = parseIdParam(raw, "relatedSystemId", fields);
  const currentStatus = parseStatusParam(raw, fields);
  const sortToken = parseSortToken(raw, fields, TICKET_SORT_FIELDS);
  const sortField = sortToken?.field ?? "createdAt";
  const sortDirection = sortToken?.direction ?? "desc";
  const { page, pageSize } = parsePaging(raw, fields);

  if (Object.keys(fields).length > 0) return { ok: false, fields };
  return {
    ok: true,
    query: { search, categoryId, relatedSystemId, currentStatus, sortField, sortDirection, sort: `${sortField}:${sortDirection}`, page, pageSize },
  };
}

// BR-22: the owner scope is the first clause; search and filters are added to it.
// BR-23: Ticket Number by exact or prefix, Ticket Summary by case-insensitive
// substring; Description is never searched.
export function listWhere(requesterId: number, q: ListQuery): Prisma.TicketWhereInput {
  const where: Prisma.TicketWhereInput = { requesterId };
  if (q.categoryId !== null) where.categoryId = q.categoryId;
  if (q.relatedSystemId !== null) where.relatedSystemId = q.relatedSystemId;
  if (q.currentStatus !== null) where.currentStatus = q.currentStatus;
  if (q.search !== null) {
    where.OR = [
      { ticketNumber: { startsWith: q.search, mode: "insensitive" } },
      { summary: { contains: q.search, mode: "insensitive" } },
    ];
  }
  return where;
}

// BR-26: id desc is the tiebreak under every permitted sort field.
export function listOrderBy(q: ListQuery): Prisma.TicketOrderByWithRelationInput[] {
  return [{ [q.sortField]: q.sortDirection }, { id: "desc" }];
}

// ---------------------------------------------------------------------------
// api-spec.md 8.1 - GET /api/staff/tickets, the Ticket Queue (C-78). Not
// scoped to any Requester; the default excludes Closed and Cancelled and
// orders IT Priority high to low, then oldest first (BR-72) - a composite
// that is the behaviour of omitting `sort` rather than a sort token of its
// own, so `sortField`/`sortDirection` are null until a caller supplies one.
// ---------------------------------------------------------------------------

export const QUEUE_SORT_FIELDS = ["createdAt", "updatedAt", "itPriority", "ticketNumber", "currentStatus"] as const;
export type QueueSortField = (typeof QUEUE_SORT_FIELDS)[number];

export type OwnerFilter = { kind: "me" } | { kind: "unassigned" } | { kind: "user"; id: number };

export const DEFAULT_QUEUE_SORT_REPORT = "itPriority:desc,createdAt:asc";

export interface QueueQuery {
  search: string | null;
  categoryId: number | null;
  currentStatus: TicketStatus | null;
  itPriority: RequestedPriority | null;
  owner: OwnerFilter | null;
  sortField: QueueSortField | null;
  sortDirection: SortDirection | null;
  sort: string;
  page: number;
  pageSize: number;
}

function parseOwnerParam(raw: Raw, fields: Fields): OwnerFilter | null {
  const v = one(raw, "owner");
  if (v === undefined || v === "") return null;
  if (v === "me") return { kind: "me" };
  if (v === "unassigned") return { kind: "unassigned" };
  const n = positiveInt(v);
  if (n === null) {
    fields.owner = 'owner must be "me", "unassigned" or a positive integer user id.';
    return null;
  }
  return { kind: "user", id: n };
}

function parseItPriorityParam(raw: Raw, fields: Fields): RequestedPriority | null {
  const v = one(raw, "itPriority");
  if (v === undefined || v === "") return null;
  if ((IT_PRIORITIES as readonly string[]).includes(v)) return v as RequestedPriority;
  fields.itPriority = `itPriority must be one of ${IT_PRIORITIES.join(", ")}.`;
  return null;
}

export function parseQueueQuery(raw: Raw): { ok: true; query: QueueQuery } | { ok: false; fields: Fields } {
  const fields: Fields = {};
  const search = parseSearch(raw);
  const categoryId = parseIdParam(raw, "categoryId", fields);
  const currentStatus = parseStatusParam(raw, fields);
  const itPriority = parseItPriorityParam(raw, fields);
  const owner = parseOwnerParam(raw, fields);
  const sortToken = parseSortToken(raw, fields, QUEUE_SORT_FIELDS);
  const { page, pageSize } = parsePaging(raw, fields);

  if (Object.keys(fields).length > 0) return { ok: false, fields };
  return {
    ok: true,
    query: {
      search,
      categoryId,
      currentStatus,
      itPriority,
      owner,
      sortField: sortToken?.field ?? null,
      sortDirection: sortToken?.direction ?? null,
      sort: sortToken ? `${sortToken.field}:${sortToken.direction}` : DEFAULT_QUEUE_SORT_REPORT,
      page,
      pageSize,
    },
  };
}

// BR-72: no currentStatus supplied excludes the two terminal statuses; naming
// one explicitly (any one, including CLOSED or CANCELLED) replaces that
// default rather than narrowing it further.
export function queueWhere(callerId: number, q: QueueQuery): Prisma.TicketWhereInput {
  const where: Prisma.TicketWhereInput = {};
  where.currentStatus = q.currentStatus !== null ? q.currentStatus : { notIn: ["CLOSED", "CANCELLED"] };
  if (q.itPriority !== null) where.itPriority = q.itPriority;
  if (q.categoryId !== null) where.categoryId = q.categoryId;
  if (q.owner !== null) {
    if (q.owner.kind === "me") where.ownerId = callerId;
    else if (q.owner.kind === "unassigned") where.ownerId = null;
    else where.ownerId = q.owner.id;
  }
  if (q.search !== null) {
    where.OR = [
      { ticketNumber: { startsWith: q.search, mode: "insensitive" } },
      { summary: { contains: q.search, mode: "insensitive" } },
    ];
  }
  return where;
}

// BR-72's composite default when no sort is supplied; BR-26's id-desc tiebreak
// under every explicit sort field. Prisma orders a native Postgres enum
// column by its declaration order, so `itPriority: "desc"` and
// `currentStatus: "asc"` already give HIGH/MEDIUM/LOW and
// NEW/OPEN/.../CANCELLED respectively, not alphabetical order (C-78, API-39).
export function queueOrderBy(q: QueueQuery): Prisma.TicketOrderByWithRelationInput[] {
  if (q.sortField === null) {
    return [{ itPriority: "desc" }, { createdAt: "asc" }, { id: "desc" }];
  }
  return [{ [q.sortField]: q.sortDirection }, { id: "desc" }];
}
