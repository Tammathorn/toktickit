import { Router, type Request, type Response } from "express";
import type { Prisma, TicketStatus, UserRole } from "@prisma/client";
import { getPrisma } from "../prisma.js";
import { sendInternalError } from "../lib/http-error.js";
import { authOf, requesterOnly, staffOnly } from "../middleware/auth.js";
import { OPEN_GROUP } from "../lib/list-query.js";

// ===========================================================================
// Lab 4 - the two dashboards (api-spec.md section 4, BR-52 to BR-87).
//
// Every metric is computed at request time from the authoritative rows, with
// `now` read once and passed to every query (BR-52). "Recent" is the rolling
// 168 hours, inclusive (BR-53, C-142). Each card's `where` is the very clause
// its drill-down list applies, so count = drill-down total by construction
// (BR-56), and each list uses its drill-down's order so its rows are that
// list's first rows (C-161). No Ticket collection is returned: lists hold at
// most five rows, except "My planned actions" (C-169).
// ===========================================================================

export const dashboardRouter = Router();

const TIME_ZONE = "Asia/Bangkok";
const RECENT_MS = 168 * 60 * 60 * 1000;
const LIST_SIZE = 5;
// BR-54: "active" is not Closed and not Cancelled - the queue's default set.
const ACTIVE: Prisma.TicketWhereInput = { currentStatus: { notIn: ["CLOSED", "CANCELLED"] } };

const listItemSelect = {
  id: true,
  ticketNumber: true,
  summary: true,
  currentStatus: true,
  itPriority: true,
  lastActivityAt: true,
} satisfies Prisma.TicketSelect;

export function recentSince(now: Date): Date {
  return new Date(now.getTime() - RECENT_MS);
}

// ---------------------------------------------------------------------------
// The Requester dashboard - api-spec.md 4.1. Every clause starts with the
// session user's id (AC-02, BR-22 carried).
// ---------------------------------------------------------------------------
export async function requesterDashboard(userId: number, now: Date) {
  const prisma = getPrisma();
  const mine: Prisma.TicketWhereInput = { requesterId: userId };
  const since = recentSince(now);
  const cardDefs: { key: string; label: string; where: Prisma.TicketWhereInput; drillDown: string }[] = [
    { key: "openTickets", label: "Open tickets", where: { ...mine, currentStatus: { in: [...OPEN_GROUP] } }, drillDown: "/tickets?statusGroup=open" },
    { key: "waitingForYou", label: "Waiting for you", where: { ...mine, currentStatus: "WAITING_FOR_REQUESTER" }, drillDown: "/tickets?currentStatus=WAITING_FOR_REQUESTER" },
    { key: "resolvedAwaitingClosure", label: "Resolved - awaiting closure", where: { ...mine, currentStatus: "RESOLVED" }, drillDown: "/tickets?currentStatus=RESOLVED" },
    { key: "closed", label: "Closed", where: { ...mine, currentStatus: "CLOSED" }, drillDown: "/tickets?currentStatus=CLOSED" },
  ];
  const [counts, recentlyUpdated, recentlyResolved] = await Promise.all([
    Promise.all(cardDefs.map((c) => prisma.ticket.count({ where: c.where }))),
    prisma.ticket.findMany({
      where: { ...mine, lastActivityAt: { gte: since } },
      orderBy: [{ lastActivityAt: "desc" }, { id: "desc" }],
      take: LIST_SIZE,
      select: listItemSelect,
    }),
    prisma.ticket.findMany({
      where: { ...mine, resolvedAt: { gte: since } },
      orderBy: [{ resolvedAt: "desc" }, { id: "desc" }],
      take: LIST_SIZE,
      select: { ...listItemSelect, resolvedAt: true },
    }),
  ]);
  return {
    generatedAt: now,
    timeZone: TIME_ZONE,
    cards: cardDefs.map((c, i) => ({ key: c.key, label: c.label, count: counts[i], drillDown: c.drillDown })),
    lists: {
      recentlyUpdated: { items: recentlyUpdated, viewAll: "/tickets?sort=lastActivityAt:desc" },
      recentlyResolved: { items: recentlyResolved, viewAll: null },
    },
  };
}

// ---------------------------------------------------------------------------
// The IT Staff / Administrator dashboard - api-spec.md 4.2.
// ---------------------------------------------------------------------------
const STATUS_CARDS: { key: string; label: string; status: TicketStatus }[] = [
  { key: "statusNew", label: "New", status: "NEW" },
  { key: "statusOpen", label: "Open", status: "OPEN" },
  { key: "statusInProgress", label: "In Progress", status: "IN_PROGRESS" },
  { key: "statusWaitingForRequester", label: "Waiting for Requester", status: "WAITING_FOR_REQUESTER" },
  { key: "statusReopened", label: "Reopened", status: "REOPENED" },
  { key: "statusResolved", label: "Resolved", status: "RESOLVED" },
];

const USER_COUNTS: { key: string; label: string; role: UserRole }[] = [
  { key: "requesters", label: "Requesters", role: "REQUESTER" },
  { key: "itStaff", label: "IT Staff", role: "IT_STAFF" },
  { key: "administrators", label: "Administrators", role: "ADMINISTRATOR" },
];

export async function staffDashboard(userId: number, role: UserRole, now: Date) {
  const prisma = getPrisma();
  const since = recentSince(now);
  const cardDefs: { key: string; label: string; where: Prisma.TicketWhereInput; drillDown: string }[] = [
    { key: "unassigned", label: "Unassigned", where: { ...ACTIVE, ownerId: null }, drillDown: "/queue?owner=unassigned" },
    { key: "mine", label: "Mine", where: { ...ACTIVE, ownerId: userId }, drillDown: "/queue?owner=me" },
    ...STATUS_CARDS.map((c) => ({ key: c.key, label: c.label, where: { currentStatus: c.status }, drillDown: `/queue?currentStatus=${c.status}` })),
    { key: "highItPriority", label: "High IT Priority", where: { ...ACTIVE, itPriority: "HIGH" }, drillDown: "/queue?itPriority=HIGH" },
    { key: "requesterSaysResolved", label: "Requester says resolved", where: { ...ACTIVE, requesterResolvedAt: { not: null } }, drillDown: "/queue?requesterResolved=true" },
  ];
  // BR-84: planned actions assigned to me on active Tickets.
  const plannedWhere: Prisma.ActionTakenWhereInput = { assigneeId: userId, status: "PLANNED", ticket: ACTIVE };
  const [counts, planned, recentlyUpdated, urgent, users] = await Promise.all([
    Promise.all(cardDefs.map((c) => prisma.ticket.count({ where: c.where }))),
    prisma.actionTaken.findMany({
      where: plannedWhere,
      orderBy: [{ actionAt: "asc" }, { id: "asc" }],
      select: {
        id: true,
        actionAt: true,
        description: true,
        ticket: { select: { id: true, ticketNumber: true, summary: true, currentStatus: true } },
      },
    }),
    prisma.ticket.findMany({
      where: { ...ACTIVE, lastActivityAt: { gte: since } },
      orderBy: [{ lastActivityAt: "desc" }, { id: "desc" }],
      take: LIST_SIZE,
      select: listItemSelect,
    }),
    // C-161: exactly what /queue?itPriority=HIGH returns - the queue default
    // order, oldest first, with the L2 C-29 id-desc tie-break.
    prisma.ticket.findMany({
      where: { ...ACTIVE, itPriority: "HIGH" },
      orderBy: [{ itPriority: "desc" }, { createdAt: "asc" }, { id: "desc" }],
      take: LIST_SIZE,
      select: { ...listItemSelect, createdAt: true },
    }),
    role === "ADMINISTRATOR"
      ? Promise.all(
          USER_COUNTS.map(async (u) => ({
            key: u.key,
            label: u.label,
            count: await prisma.user.count({ where: { role: u.role } }),
            activeCount: await prisma.user.count({ where: { role: u.role, isActive: true } }),
            drillDown: `/users?role=${u.role}`,
          })),
        )
      : Promise.resolve(null),
  ]);
  const cards = cardDefs.map((c, i) => ({ key: c.key, label: c.label, count: counts[i], drillDown: c.drillDown }));
  cards.push({ key: "myPlannedActions", label: "My planned actions", count: planned.length, drillDown: "/dashboard#my-actions" });
  const body: Record<string, unknown> = {
    generatedAt: now,
    timeZone: TIME_ZONE,
    cards,
    lists: {
      myPlannedActions: { items: planned, viewAll: null },
      recentlyUpdated: { items: recentlyUpdated, viewAll: "/queue?sort=lastActivityAt:desc" },
      urgent: { items: urgent, viewAll: "/queue?itPriority=HIGH" },
    },
  };
  // AC-87: absent, not null, for IT Staff.
  if (users) body.userCounts = users;
  return body;
}

dashboardRouter.get("/api/dashboard/requester", ...requesterOnly, async (_req: Request, res: Response) => {
  try {
    res.status(200).json(await requesterDashboard(authOf(res).user.id, new Date()));
  } catch {
    sendInternalError(res);
  }
});

dashboardRouter.get("/api/dashboard/staff", ...staffOnly, async (_req: Request, res: Response) => {
  try {
    const { user } = authOf(res);
    res.status(200).json(await staffDashboard(user.id, user.role, new Date()));
  } catch {
    sendInternalError(res);
  }
});
