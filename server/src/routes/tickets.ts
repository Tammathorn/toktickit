import { Router, type Request, type Response } from "express";
import multer from "multer";
import { getPrisma } from "../prisma.js";
import { sendError, sendInternalError } from "../lib/http-error.js";
import { anyRole, authOf, requesterOnly } from "../middleware/auth.js";
import { validateTicketShape, validateTicketReferences, type ValidTicketInput } from "../lib/validation.js";
import { createTicketWithNumber } from "../lib/ticket-repository.js";
import { loadTicketDto } from "../lib/ticket-dto.js";
import { parseListQuery, listWhere, listOrderBy, type ListQuery } from "../lib/list-query.js";
import { uploadSingleFile, unlinkQuietly, UnsupportedFileTypeError } from "../lib/uploads.js";
import { toAttachmentDto } from "./attachments.js";

export const ticketsRouter = Router();

const MAX_ACTIVE_ATTACHMENTS = 5;

// Lab 3 (#40): every route here sits behind the shared chain - session,
// password-change gate, role - before anything else runs (api-spec.md 1.4,
// C-63). The caller is the signed-in user and nobody else: a requesterId in a
// query or a body is ignored (C-64, BR-31). Another Requester's Ticket answers
// 404, the same body as a missing one (C-65), so the answer never says the
// Ticket exists.

function sendTicketNotFound(res: Response): void {
  sendError(res, 404, "TICKET_NOT_FOUND", "That ticket does not exist.");
}

// ---------------------------------------------------------------------------
// POST /api/tickets — api-spec.md 4.1. Requester only (C-101). The Ticket is
// bound to the signed-in user; a requesterId in the body is not rejected, it is
// simply not obeyed (AC-41). Body validation is step 7; then one transaction
// assigns the number from the row's own id (C-49).
// ---------------------------------------------------------------------------
ticketsRouter.post("/api/tickets", ...requesterOnly, async (req: Request, res: Response) => {
  const prisma = getPrisma();
  const body: Record<string, unknown> = req.body && typeof req.body === "object" ? req.body : {};

  try {
    const { fields, values } = validateTicketShape(body);
    await validateTicketReferences(prisma, values, fields);
    if (Object.keys(fields).length > 0) {
      sendError(res, 400, "VALIDATION_FAILED", "Some fields need attention.", fields);
      return;
    }

    const input = values as ValidTicketInput;
    const created = await createTicketWithNumber(prisma, { requesterId: authOf(res).user.id, ...input });
    res.status(201).json(await loadTicketDto(prisma, created.id));
  } catch {
    sendInternalError(res);
  }
});

// ---------------------------------------------------------------------------
// GET /api/tickets — api-spec.md 4.2. Requester only. Query parameters are
// validated (400 INVALID_QUERY_PARAM naming each offending one; a requesterId
// parameter is accepted and discarded), then the query runs scoped to the
// signed-in user before any search, filter or sort applies (BR-43). C-27
// envelope; C-43 page rules.
// ---------------------------------------------------------------------------
ticketsRouter.get(
  "/api/tickets",
  ...requesterOnly,
  (req: Request, res: Response, next) => {
    const parsed = parseListQuery(req.query as Record<string, unknown>);
    if (!parsed.ok) {
      sendError(res, 400, "INVALID_QUERY_PARAM", "Some search or filter values are not valid.", parsed.fields);
      return;
    }
    res.locals.listQuery = parsed.query;
    next();
  },
  async (_req: Request, res: Response) => {
    const prisma = getPrisma();
    const q = res.locals.listQuery as ListQuery;
    try {
      const where = listWhere(authOf(res).user.id, q);
      const [total, rows] = await Promise.all([
        prisma.ticket.count({ where }),
        prisma.ticket.findMany({
          where,
          orderBy: listOrderBy(q),
          skip: (q.page - 1) * q.pageSize,
          take: q.pageSize,
          select: {
            id: true,
            ticketNumber: true,
            summary: true,
            category: { select: { id: true, name: true } },
            relatedSystem: { select: { id: true, name: true } },
            requestedPriority: true,
            itPriority: true,
            currentStatus: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
      ]);
      res.status(200).json({
        data: rows,
        meta: {
          page: q.page,
          pageSize: q.pageSize,
          total,
          totalPages: Math.ceil(total / q.pageSize),
          sort: q.sort,
        },
      });
    } catch {
      sendInternalError(res);
    }
  },
);

// ---------------------------------------------------------------------------
// GET /api/tickets/:id — api-spec.md 4.3. Requester only. 404 for a missing
// Ticket and for another Requester's, one identical body (C-65, AC-38).
// ---------------------------------------------------------------------------
ticketsRouter.get("/api/tickets/:id", ...requesterOnly, async (req: Request, res: Response) => {
  const prisma = getPrisma();
  const id = /^\d+$/.test(req.params.id) && Number(req.params.id) > 0 ? Number(req.params.id) : null;
  if (id === null) {
    sendError(res, 400, "INVALID_QUERY_PARAM", "Ticket id must be a positive integer.", { id: "Ticket id must be a positive integer." });
    return;
  }
  try {
    const ticket = await prisma.ticket.findUnique({ where: { id }, select: { id: true, requesterId: true } });
    if (!ticket || ticket.requesterId !== authOf(res).user.id) {
      sendTicketNotFound(res);
      return;
    }
    res.status(200).json(await loadTicketDto(prisma, id));
  } catch {
    sendInternalError(res);
  }
});

// ---------------------------------------------------------------------------
// Steps 4 to 6 for the attachment routes: parse the id, load the Ticket, and
// apply ownership - which binds a Requester only. IT Staff and Administrator
// read any Ticket's Attachments (C-103); their writes were already refused by
// the role step. Sends the refusal itself and returns null so the caller stops.
// ---------------------------------------------------------------------------
async function loadVisibleTicket(req: Request, res: Response): Promise<number | null> {
  const id = /^\d+$/.test(req.params.id) ? Number(req.params.id) : null;
  if (id === null || id <= 0) {
    sendError(res, 400, "VALIDATION_FAILED", "Ticket id must be a positive integer.", { id: "Ticket id must be a positive integer." });
    return null;
  }
  const ticket = await getPrisma().ticket.findUnique({ where: { id }, select: { id: true, requesterId: true } });
  const { user } = authOf(res);
  if (!ticket || (user.role === "REQUESTER" && ticket.requesterId !== user.id)) {
    sendTicketNotFound(res);
    return null;
  }
  return ticket.id;
}

// ---------------------------------------------------------------------------
// GET /api/tickets/:id/attachments — api-spec.md 5.1. Every role: the owning
// Requester, and any IT Staff or Administrator (C-103). Active and removed
// alike, ascending id; the removed ones keep their metadata and reason (BR-50).
// ---------------------------------------------------------------------------
ticketsRouter.get("/api/tickets/:id/attachments", ...anyRole, async (req: Request, res: Response) => {
  try {
    const ticketId = await loadVisibleTicket(req, res);
    if (ticketId === null) return;
    const rows = await getPrisma().attachment.findMany({ where: { ticketId }, orderBy: { id: "asc" } });
    res.status(200).json(rows.map(toAttachmentDto));
  } catch {
    sendInternalError(res);
  }
});

// ---------------------------------------------------------------------------
// POST /api/tickets/:id/attachments — api-spec.md 5.2. The owning Requester
// only; staff are refused 403 by the role step (C-103). The caller and the
// Ticket are checked BEFORE the multipart body is parsed, so a refused caller
// never gets a file onto disk; the only post-write refusal is the five-slot
// rule, and that unlinks first (BR-41).
// ---------------------------------------------------------------------------
ticketsRouter.post(
  "/api/tickets/:id/attachments",
  ...requesterOnly,
  async (req: Request, res: Response, next) => {
    try {
      const ticketId = await loadVisibleTicket(req, res);
      if (ticketId === null) return;
      res.locals.ticketId = ticketId;
      next();
    } catch {
      sendInternalError(res);
    }
  },
  (req: Request, res: Response, next) => {
    uploadSingleFile(req, res, (err: unknown) => {
      if (!err) {
        next();
        return;
      }
      if (err instanceof UnsupportedFileTypeError) {
        sendError(res, 415, "UNSUPPORTED_FILE_TYPE", "That file type is not permitted. Allowed types are JPG, PNG, WEBP and PDF.");
      } else if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
        sendError(res, 413, "FILE_TOO_LARGE", "That file is larger than 5 MB.");
      } else if (err instanceof multer.MulterError) {
        // LIMIT_FILE_COUNT, LIMIT_UNEXPECTED_FILE and the like: malformed multipart
        sendError(res, 400, "VALIDATION_FAILED", "Send exactly one file in the `file` part.", { file: "Send exactly one file in the `file` part." });
      } else {
        sendInternalError(res);
      }
    });
  },
  async (req: Request, res: Response) => {
    const prisma = getPrisma();
    const file = req.file;
    if (!file) {
      sendError(res, 400, "VALIDATION_FAILED", "A file is required.", { file: "A file is required." });
      return;
    }
    const ticketId: number = res.locals.ticketId;

    try {
      // Step 6, BR-44 / C-18: only active attachments occupy a slot. The file is
      // already on disk, so a refusal deletes it first (BR-41).
      const active = await prisma.attachment.count({ where: { ticketId, isRemoved: false } });
      if (active >= MAX_ACTIVE_ATTACHMENTS) {
        unlinkQuietly(file.filename);
        sendError(res, 422, "ATTACHMENT_LIMIT_REACHED", "This ticket already has five active attachments. Remove one before adding another.");
        return;
      }

      let row;
      try {
        row = await prisma.attachment.create({
          data: {
            ticketId,
            originalFilename: file.originalname,
            storedFilename: file.filename,
            mimeType: file.mimetype,
            sizeBytes: file.size,
          },
        });
      } catch (insertError) {
        // File written, row failed: compensate by deleting the file (BR-41).
        unlinkQuietly(file.filename);
        throw insertError;
      }

      res.status(201).json({
        id: row.id,
        ticketId: row.ticketId,
        originalFilename: row.originalFilename,
        mimeType: row.mimeType,
        sizeBytes: row.sizeBytes,
        uploadedAt: row.uploadedAt,
        isRemoved: row.isRemoved,
        removedAt: row.removedAt,
        removalReason: row.removalReason,
      });
    } catch {
      sendInternalError(res);
    }
  },
);
