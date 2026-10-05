import fs from "node:fs";
import path from "node:path";
import { Router, type Request, type Response } from "express";
import type { Attachment, TicketStatus } from "@prisma/client";
import { getPrisma } from "../prisma.js";
import { sendError, sendInternalError } from "../lib/http-error.js";
import { anyRole, authOf, requesterOnly } from "../middleware/auth.js";
import { trimmed } from "../lib/text.js";
import { MESSAGES } from "../lib/validation.js";
import { UPLOAD_DIR } from "../lib/uploads.js";
import { sendTicketClosed } from "../lib/ticket-access.js";
import { isTerminal } from "../lib/status-transitions.js";

// Attachment download / preview (api-spec.md 4.3) and soft removal (4.4).
//
// Check order per api-spec.md 1.4 on both routes: session, gate and role (the
// shared chain) -> parameters (400) -> attachment exists (404) -> owner (404,
// C-65) -> removal state (410) -> body (400 / 422) -> operation. Ownership
// before removal state is the C-65 rewrite of L2 C-20: a non-owning Requester
// gets the same 404 as a missing attachment and never learns a file was
// removed. Ownership binds a Requester only; IT Staff and Administrator read
// and download any Attachment and write none (C-103).

export const attachmentsRouter = Router();

export function toAttachmentDto(row: Attachment) {
  return {
    id: row.id,
    originalFilename: row.originalFilename,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    uploadedAt: row.uploadedAt,
    isRemoved: row.isRemoved,
    removedAt: row.removedAt,
    removalReason: row.removalReason,
  };
}

function parseId(raw: string): number | null {
  return /^\d+$/.test(raw) && Number(raw) > 0 ? Number(raw) : null;
}

// Steps 4 to 6: the id, the row, then the owner. Sends the refusal itself and
// returns null so the caller just stops.
type VisibleAttachment = Attachment & { ticket: { requesterId: number; currentStatus: TicketStatus } };

async function loadVisibleAttachment(req: Request, res: Response): Promise<VisibleAttachment | null> {
  const id = parseId(req.params.id);
  if (id === null) {
    sendError(res, 400, "INVALID_QUERY_PARAM", "Attachment id must be a positive integer.", { id: "Attachment id must be a positive integer." });
    return null;
  }
  const row = await getPrisma().attachment.findUnique({
    where: { id },
    include: { ticket: { select: { requesterId: true, currentStatus: true } } },
  });
  const { user } = authOf(res);
  if (!row || (user.role === "REQUESTER" && row.ticket.requesterId !== user.id)) {
    sendError(res, 404, "ATTACHMENT_NOT_FOUND", "That attachment does not exist.");
    return null;
  }
  return row;
}

// ---------------------------------------------------------------------------
// GET /api/attachments/:id/download?disposition=attachment|inline
// api-spec.md 5.3. Every role. One ownership-checked route serves both
// download and preview (L2 BR-49, L2 BR-54). Per L2 C-44 and L2 C-52 the
// caller, ownership and removal state are settled BEFORE disposition is
// validated, so an invalid disposition never changes which of 404 or 410 a
// caller receives; it is 400 only once the caller is entitled to the bytes.
// ---------------------------------------------------------------------------
attachmentsRouter.get(
  "/api/attachments/:id/download",
  ...anyRole,
  async (req: Request, res: Response) => {
    try {
      const row = await loadVisibleAttachment(req, res);
      if (!row) return;
      if (row.isRemoved) {
        sendError(res, 410, "ATTACHMENT_REMOVED", "That attachment was removed and can no longer be downloaded.");
        return;
      }
      const raw = req.query.disposition;
      const disposition = raw === undefined || raw === "" ? "attachment" : String(raw);
      if (disposition !== "attachment" && disposition !== "inline") {
        sendError(res, 400, "INVALID_QUERY_PARAM", "disposition must be attachment or inline.", { disposition: "disposition must be attachment or inline." });
        return;
      }
      const file = path.join(UPLOAD_DIR, row.storedFilename);
      if (!fs.existsSync(file)) {
        sendInternalError(res);
        return;
      }
      const safeName = row.originalFilename.replace(/["\r\n]/g, "_");
      res.status(200);
      res.setHeader("Content-Type", row.mimeType);
      res.setHeader("Content-Length", String(row.sizeBytes));
      res.setHeader("Content-Disposition", `${disposition}; filename="${safeName}"`);
      fs.createReadStream(file).pipe(res);
    } catch {
      sendInternalError(res);
    }
  },
);

// ---------------------------------------------------------------------------
// DELETE /api/attachments/:id   body { removalReason }
// api-spec.md 5.4. The owning Requester only; staff are refused 403 by the
// role step (C-103). Nothing is deleted: the row is marked removed with the
// timestamp and the trimmed reason, and the file stays on disk (L2 BR-46,
// L2 BR-47). A Closed or Cancelled Ticket refuses the removal 409
// TICKET_CLOSED, after ownership so a non-owner still gets 404, and ahead of
// the body: a missing key is still 409, not 400 (BR-108, C-109). Once past
// that, the body is validated: a missing key is malformed (400); an
// empty-after-trim reason violates L2 BR-47 (422). Nothing is modified unless
// the removal itself proceeds.
// ---------------------------------------------------------------------------
attachmentsRouter.delete("/api/attachments/:id", ...requesterOnly, async (req: Request, res: Response) => {
  const body: Record<string, unknown> = req.body && typeof req.body === "object" ? req.body : {};

  try {
    const row = await loadVisibleAttachment(req, res);
    if (!row) return;
    if (row.isRemoved) {
      sendError(res, 410, "ATTACHMENT_REMOVED", "That attachment was already removed.");
      return;
    }
    if (isTerminal(row.ticket.currentStatus)) {
      sendTicketClosed(res);
      return;
    }
    if (body.removalReason === undefined || typeof body.removalReason !== "string") {
      sendError(res, 400, "VALIDATION_FAILED", "Some fields need attention.", { removalReason: MESSAGES.removalReason });
      return;
    }
    const reason = trimmed(body.removalReason);
    if (reason === "") {
      sendError(res, 422, "REMOVAL_REASON_REQUIRED", MESSAGES.removalReason);
      return;
    }
    const updated = await getPrisma().attachment.update({
      where: { id: row.id },
      data: { isRemoved: true, removedAt: new Date(), removalReason: reason },
    });
    res.status(200).json(toAttachmentDto(updated));
  } catch {
    sendInternalError(res);
  }
});
