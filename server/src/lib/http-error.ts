import type { Response } from "express";

// The api-spec.md section 1.1 error envelope. Every 4xx/5xx goes through here so
// no route can leak a stack trace, SQL, path or raw database text (BR-38).
export type ErrorCode =
  | "VALIDATION_FAILED"
  | "INVALID_QUERY_PARAM"
  | "TICKET_NOT_FOUND"
  | "ATTACHMENT_NOT_FOUND"
  | "ATTACHMENT_REMOVED"
  | "FILE_TOO_LARGE"
  | "UNSUPPORTED_FILE_TYPE"
  | "ATTACHMENT_LIMIT_REACHED"
  | "REMOVAL_REASON_REQUIRED"
  // Lab 3 authentication (api-spec.md 1.3).
  | "AUTH_REQUIRED"
  | "INVALID_CREDENTIALS"
  | "ACCOUNT_INACTIVE"
  | "PASSWORD_CHANGE_REQUIRED"
  | "ORIGIN_NOT_ALLOWED"
  | "FORBIDDEN_ROLE"
  | "CURRENT_PASSWORD_INCORRECT"
  // Lab 3 staff ticket operations, comments and notes (api-spec.md 1.3, #42).
  | "SAME_STATUS"
  | "ALREADY_OWNED"
  | "OWNER_REQUIRED"
  | "TICKET_CLOSED"
  | "INVALID_STATUS_TRANSITION"
  | "RESOLUTION_NOT_PERMITTED_IN_STATUS"
  | "ASSIGNEE_NOT_ELIGIBLE"
  // Lab 3 Administrator user management (api-spec.md 1.3, 9.1-9.4, #43).
  | "USER_NOT_FOUND"
  | "EMAIL_TAKEN"
  | "LAST_ADMINISTRATOR"
  | "SELF_DEACTIVATION"
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
