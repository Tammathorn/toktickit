import type { Response } from "express";

// The api-spec.md section 1.1 error envelope. Every 4xx/5xx goes through here so
// no route can leak a stack trace, SQL, path or raw database text (BR-38).
export type ErrorCode =
  | "VALIDATION_FAILED"
  | "INVALID_QUERY_PARAM"
  | "REQUESTER_REQUIRED"
  | "REQUESTER_NOT_FOUND"
  | "REQUESTER_INACTIVE"
  | "TICKET_FORBIDDEN"
  | "ATTACHMENT_FORBIDDEN"
  | "TICKET_NOT_FOUND"
  | "ATTACHMENT_NOT_FOUND"
  | "ATTACHMENT_REMOVED"
  | "FILE_TOO_LARGE"
  | "UNSUPPORTED_FILE_TYPE"
  | "ATTACHMENT_LIMIT_REACHED"
  | "REMOVAL_REASON_REQUIRED"
  | "INTERNAL_ERROR";

export function sendError(
  res: Response,
  status: number,
  code: ErrorCode,
  message: string,
  fields?: Record<string, string>,
): void {
  res.status(status).json({ error: fields ? { code, message, fields } : { code, message } });
}

export function sendInternalError(res: Response): void {
  sendError(res, 500, "INTERNAL_ERROR", "Something went wrong on our side.");
}
