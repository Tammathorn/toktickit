import type { PrismaClient } from "@prisma/client";
import type { Request, Response, NextFunction } from "express";
import { getPrisma } from "../prisma.js";
import { sendError } from "./http-error.js";

// Steps 1 and 2 of the api-spec.md 1.4 check order for the caller identity.
//
// requesterId is a client-supplied testing value (BR-64): it is never an
// authenticated identity. What it does get is re-checked on every request -
// parsed, then resolved against the table - before any Ticket or Attachment
// is looked up (C-45), so an unknown caller learns nothing about the resource.

export type RequesterResolution =
  | { ok: true; id: number }
  | { ok: false; status: 400; code: "REQUESTER_REQUIRED"; message: string }
  | { ok: false; status: 404; code: "REQUESTER_NOT_FOUND"; message: string }
  | { ok: false; status: 403; code: "REQUESTER_INACTIVE"; message: string };

export function parseRequesterId(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isInteger(raw) && raw > 0) return raw;
  if (typeof raw === "string" && /^\d+$/.test(raw) && Number(raw) > 0) return Number(raw);
  return null;
}

export async function resolveRequester(prisma: PrismaClient, raw: unknown): Promise<RequesterResolution> {
  const id = parseRequesterId(raw);
  if (id === null) {
    return { ok: false, status: 400, code: "REQUESTER_REQUIRED", message: "requesterId is required." };
  }
  const row = await prisma.requesterUser.findUnique({ where: { id }, select: { isActive: true } });
  if (!row) {
    return { ok: false, status: 404, code: "REQUESTER_NOT_FOUND", message: "That Development Requester no longer exists." };
  }
  if (!row.isActive) {
    return { ok: false, status: 403, code: "REQUESTER_INACTIVE", message: "That Development Requester is no longer active." };
  }
  return { ok: true, id };
}

// Express middleware for every endpoint that carries ?requesterId= (C-42).
// On success the resolved id is placed on res.locals.requesterId.
export function requireRequesterQuery(req: Request, res: Response, next: NextFunction): void {
  resolveRequester(getPrisma(), req.query.requesterId).then(
    (result) => {
      if (!result.ok) {
        sendError(res, result.status, result.code, result.message);
        return;
      }
      res.locals.requesterId = result.id;
      next();
    },
    () => sendError(res, 500, "INTERNAL_ERROR", "Something went wrong on our side."),
  );
}
