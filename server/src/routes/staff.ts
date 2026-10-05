import { Router, type Request, type Response } from "express";
import { getPrisma } from "../prisma.js";
import { sendError, sendInternalError } from "../lib/http-error.js";
import { authOf, staffOnly } from "../middleware/auth.js";
import { parseQueueQuery, queueWhere, queueOrderBy, type QueueQuery } from "../lib/list-query.js";

export const staffRouter = Router();

// ---------------------------------------------------------------------------
// GET /api/staff/tickets — api-spec.md 8.1, the Ticket Queue. IT Staff and
// Administrator only (C-101); a Requester is refused 403 FORBIDDEN_ROLE
// before any query parameter is parsed (C-63, C-65, SEC-03). Not scoped to
// any Requester (BR-74) - the row shape is api-spec.md 10.4, no `requester`
// key.
// ---------------------------------------------------------------------------
staffRouter.get(
  "/api/staff/tickets",
  ...staffOnly,
  (req: Request, res: Response, next) => {
    const parsed = parseQueueQuery(req.query as Record<string, unknown>);
    if (!parsed.ok) {
      sendError(res, 400, "INVALID_QUERY_PARAM", "Some search or filter values are not valid.", parsed.fields);
      return;
    }
    res.locals.queueQuery = parsed.query;
    next();
  },
  async (_req: Request, res: Response) => {
    const prisma = getPrisma();
    const q = res.locals.queueQuery as QueueQuery;
    try {
      const where = queueWhere(authOf(res).user.id, q);
      const [total, rows] = await Promise.all([
        prisma.ticket.count({ where }),
        prisma.ticket.findMany({
          where,
          orderBy: queueOrderBy(q),
          skip: (q.page - 1) * q.pageSize,
          take: q.pageSize,
          select: {
            id: true,
            ticketNumber: true,
            summary: true,
            category: { select: { id: true, name: true } },
            requestedPriority: true,
            itPriority: true,
            currentStatus: true,
            owner: { select: { id: true, name: true, isActive: true } },
            requesterResolvedAt: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
      ]);
      res.status(200).json({
        data: rows,
        meta: { page: q.page, pageSize: q.pageSize, total, totalPages: Math.ceil(total / q.pageSize), sort: q.sort },
      });
    } catch {
      sendInternalError(res);
    }
  },
);
