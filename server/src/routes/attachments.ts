import fs from "node:fs";
import path from "node:path";
import { Router, type Request, type Response } from "express";
import type { Attachment } from "@prisma/client";
import { getPrisma } from "../prisma.js";
import { sendError, sendInternalError } from "../lib/http-error.js";
import { requireRequesterQuery } from "../lib/requester.js";
import { trimmed } from "../lib/text.js";
import { MESSAGES } from "../lib/validation.js";
import { UPLOAD_DIR } from "../lib/uploads.js";

// Attachment download / preview (api-spec.md 4.3) and soft removal (4.4).
//
// Check order per 1.4 on both routes: parameters (400) -> caller (404 / 403)
// -> attachment exists (404) -> owner (403) -> removal state (410) ->
// business rule (422) -> operation. Ownership before removal state is C-13
// and C-20: a non-owner gets 403 and never learns a file was removed (AC-37).

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

// Steps 3 and 4: the row, then the owner. Sends the refusal itself and
// returns null so the caller just stops.
async function loadOwnedAttachment(req: Request, res: Response): Promise<Attachment | null> {
  const id = parseId(req.params.id);
  if (id === null) {
    sendError(res, 400, "INVALID_QUERY_PARAM", "Attachment id must be a positive integer.", { id: "Attachment id must be a positive integer." });
    return null;
  }
  const row = await getPrisma().attachment.findUnique({
    where: { id },
    include: { ticket: { select: { requesterId: true } } },
  });
  if (!row) {
    sendError(res, 404, "ATTACHMENT_NOT_FOUND", "That attachment does not exist.");
    return null;
  }
  if (row.ticket.requesterId !== res.locals.requesterId) {
    sendError(res, 403, "ATTACHMENT_FORBIDDEN", "You do not have access to that item.");
    return null;
  }
  return row;
}

// ---------------------------------------------------------------------------
// GET /api/attachments/:id/download?requesterId=&disposition=attachment|inline
// One ownership-checked route serves both download and preview (BR-49,
// BR-54). Per C-44 the caller, ownership and removal state are settled BEFORE
// disposition is looked at, so an invalid disposition never changes which of
// 403, 404 or 410 a caller receives; it is 400 only once the caller is
// entitled to the bytes. (api-spec 1.4 words this as "validated at step 1 but
// applied at step 7"; a 400 at step 1 would contradict the sentence that
// follows it, so the decision text is the one implemented.)
// ---------------------------------------------------------------------------
attachmentsRouter.get(
  "/api/attachments/:id/download",
  requireRequesterQuery,
  async (req: Request, res: Response) => {
    try {
      const row = await loadOwnedAttachment(req, res);
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
// DELETE /api/attachments/:id?requesterId=   body { removalReason }
// Nothing is deleted: the row is marked removed with the timestamp and the
// trimmed reason, and the file stays on disk (BR-46, BR-47). A missing key is
// malformed (400); an empty-after-trim reason violates BR-47 (422, BR-39).
// ---------------------------------------------------------------------------
attachmentsRouter.delete("/api/attachments/:id", requireRequesterQuery, async (req: Request, res: Response) => {
  const body: Record<string, unknown> = req.body && typeof req.body === "object" ? req.body : {};
  if (body.removalReason === undefined || typeof body.removalReason !== "string") {
    sendError(res, 400, "VALIDATION_FAILED", "Some fields need attention.", { removalReason: MESSAGES.removalReason });
    return;
  }
  const reason = trimmed(body.removalReason);

  try {
    const row = await loadOwnedAttachment(req, res);
    if (!row) return;
    if (row.isRemoved) {
      sendError(res, 410, "ATTACHMENT_REMOVED", "That attachment was already removed.");
      return;
    }
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
