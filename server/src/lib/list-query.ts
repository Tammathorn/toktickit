import type { Prisma, TicketStatus } from "@prisma/client";

// The GET /api/tickets query contract - api-spec.md 3.2, C-27, C-43, BR-23..BR-29.
// Parsing is pure: it returns either the normalised query or one field error per
// offending parameter, so the route can answer 400 INVALID_QUERY_PARAM before
// anything touches the database (check order step 1).

export const SORT_FIELDS = ["createdAt", "ticketNumber", "summary", "currentStatus"] as const;
export const SORT_DIRECTIONS = ["asc", "desc"] as const;
export const PAGE_SIZES = [10, 25, 50] as const;
export const STATUSES: readonly TicketStatus[] = ["NEW", "IN_PROGRESS", "RESOLVED", "CLOSED", "CANCELLED"];
export const DEFAULT_SORT = "createdAt:desc";

export type SortField = (typeof SORT_FIELDS)[number];
export type SortDirection = (typeof SORT_DIRECTIONS)[number];

export interface ListQuery {
  search: string | null;
  categoryId: number | null;
  relatedSystemId: number | null;
  currentStatus: TicketStatus | null;
  sortField: SortField;
  sortDirection: SortDirection;
  sort: string;
  page: number;
  pageSize: number;
}

type Raw = Record<string, unknown>;

function one(raw: Raw, name: string): string | undefined {
  const v = raw[name];
  if (Array.isArray(v)) return String(v[0]);
  return v === undefined ? undefined : String(v);
}

function positiveInt(value: string): number | null {
  return /^\d+$/.test(value) && Number(value) > 0 ? Number(value) : null;
}

export function parseListQuery(raw: Raw): { ok: true; query: ListQuery } | { ok: false; fields: Record<string, string> } {
  const fields: Record<string, string> = {};

  const searchRaw = one(raw, "search");
  const search = searchRaw && searchRaw.trim() !== "" ? searchRaw.trim() : null;

  const idParam = (name: "categoryId" | "relatedSystemId"): number | null => {
    const v = one(raw, name);
    if (v === undefined || v === "") return null;
    const n = positiveInt(v);
    if (n === null) fields[name] = `${name} must be a positive integer.`;
    return n;
  };
  const categoryId = idParam("categoryId");
  const relatedSystemId = idParam("relatedSystemId");

  let currentStatus: TicketStatus | null = null;
  const statusRaw = one(raw, "currentStatus");
  if (statusRaw !== undefined && statusRaw !== "") {
    if (STATUSES.includes(statusRaw as TicketStatus)) currentStatus = statusRaw as TicketStatus;
    else fields.currentStatus = `currentStatus must be one of ${STATUSES.join(", ")}.`;
  }

  let sortField: SortField = "createdAt";
  let sortDirection: SortDirection = "desc";
  const sortRaw = one(raw, "sort");
  if (sortRaw !== undefined && sortRaw !== "") {
    const [f, d, ...rest] = sortRaw.split(":");
    if (rest.length === 0 && SORT_FIELDS.includes(f as SortField) && SORT_DIRECTIONS.includes(d as SortDirection)) {
      sortField = f as SortField;
      sortDirection = d as SortDirection;
    } else {
      fields.sort = `sort must be field:direction with field one of ${SORT_FIELDS.join(", ")} and direction asc or desc.`;
    }
  }

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

  if (Object.keys(fields).length > 0) return { ok: false, fields };
  return {
    ok: true,
    query: {
      search,
      categoryId,
      relatedSystemId,
      currentStatus,
      sortField,
      sortDirection,
      sort: `${sortField}:${sortDirection}`,
      page,
      pageSize,
    },
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
