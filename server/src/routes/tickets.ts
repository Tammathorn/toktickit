import { Router, type Request, type Response } from "express";
import multer from "multer";
import { getPrisma } from "../prisma.js";
import { sendError, sendInternalError } from "../lib/http-error.js";
import { resolveRequester, requireRequesterQuery } from "../lib/requester.js";
import { validateTicketShape, validateTicketReferences, type ValidTicketInput } from "../lib/validation.js";
import { createTicketWithNumber } from "../lib/ticket-repository.js";
import { loadTicketDto } from "../lib/ticket-dto.js";
import { uploadSingleFile, unlinkQuietly, UnsupportedFileTypeError } from "../lib/uploads.js";

export const ticketsRouter = Router();

const MAX_ACTIVE_ATTACHMENTS = 5;

// ---------------------------------------------------------------------------
// POST /api/tickets — api-spec.md 3.1. The one endpoint that carries
// requesterId in the body (C-12). Check order per 1.4:
//   1. body shape and BR-34 reference rules      -> 400 VALIDATION_FAILED
//      requesterId absent or unparseable          -> 400 REQUESTER_REQUIRED
//   2. resolve the Requester                       -> 404 / 403
//   7. create inside one transaction, number assigned from the row's own id (C-49)
// ---------------------------------------------------------------------------
ticketsRouter.post("/api/tickets", async (req: Request, res: Response) => {
  const prisma = getPrisma();
  const body: Record<string, unknown> = req.body && typeof req.body === "object" ? req.body : {};

  try {
    const { fields, values } = validateTicketShape(body);
    await validateTicketReferences(prisma, values, fields);
    if (Object.keys(fields).length > 0) {
      sendError(res, 400, "VALIDATION_FAILED", "Some fields need attention.", fields);
      return;
    }

    const caller = await resolveRequester(prisma, body.requesterId);
    if (!caller.ok) {
      sendError(res, caller.status, caller.code, caller.message);
      return;
    }

    const input = values as ValidTicketInput;
    const created = await createTicketWithNumber(prisma, { requesterId: caller.id, ...input });
    res.status(201).json(await loadTicketDto(prisma, created.id));
  } catch {
    sendInternalError(res);
  }
});

// ---------------------------------------------------------------------------
// POST /api/tickets/:id/attachments — api-spec.md 4.1. requesterId in the
// query (C-42). The caller and the Ticket are checked BEFORE the multipart body
// is parsed, so a refused caller never gets a file onto disk; the only
// post-write refusal is the five-slot rule, and that unlinks first (BR-41).
// ---------------------------------------------------------------------------
async function loadOwnedTicket(req: Request, res: Response): Promise<number | null> {
  const id = /^\d+$/.test(req.params.id) ? Number(req.params.id) : null;
  if (id === null || id <= 0) {
    sendError(res, 400, "VALIDATION_FAILED", "Ticket id must be a positive integer.", { id: "Ticket id must be a positive integer." });
    return null;
  }
  const ticket = await getPrisma().ticket.findUnique({ where: { id }, select: { id: true, requesterId: true } });
  if (!ticket) {
    sendError(res, 404, "TICKET_NOT_FOUND", "That ticket does not exist.");
    return null;
  }
  if (ticket.requesterId !== res.locals.requesterId) {
    sendError(res, 403, "ATTACHMENT_FORBIDDEN", "You do not have access to that item.");
    return null;
  }
  return ticket.id;
}

ticketsRouter.post(
  "/api/tickets/:id/attachments",
  requireRequesterQuery,
  async (req: Request, res: Response, next) => {
    try {
      const ticketId = await loadOwnedTicket(req, res);
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
