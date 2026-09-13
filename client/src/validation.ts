import type { RequestedPriority } from "./api.js";

// The ui-spec.md section 6 validation message catalogue, character for
// character. BR-35: client and server both source their text from that table
// and neither emits validation text absent from it. server/src/lib/validation.ts
// carries the same constants; UI-13 and API-09 pin both sides to these strings.

export const MESSAGES = {
  summary: "Ticket Summary is required and must be between 5 and 120 characters.",
  description: "Description is required and must be between 20 and 5000 characters.",
  categoryRequired: "Category is required.",
  relatedSystemRequired: "Related System is required.",
  requestedPriorityRequired: "Requested Priority is required.",
  categoryInvalid: "Select an active Category from the list.",
  relatedSystemInvalid: "Select an active Related System from the list.",
  requestedPriorityInvalid: "Requested Priority must be Low, Medium or High.",
  removalReason: "A removal reason is required.",
  // api-spec.md 3.1: a system-generated field supplied in the body.
  systemGenerated: (name: string) => `${name} is system generated and cannot be supplied.`,
} as const;

export const SUMMARY_MIN = 5;
export const SUMMARY_MAX = 120;
export const DESCRIPTION_MIN = 20;
export const DESCRIPTION_MAX = 5000;
export const PRIORITIES: readonly RequestedPriority[] = ["LOW", "MEDIUM", "HIGH"];

export interface TicketFormValues {
  categoryId: string;
  relatedSystemId: string;
  summary: string;
  description: string;
  requestedPriority: string;
}

export type TicketFieldErrors = Partial<Record<keyof TicketFormValues, string>>;

// FR-16: the client checks every required field before submission, applying
// the same rules the server applies (BR-30..BR-34). Values are trimmed first
// (BR-30). Returns one catalogue message per failing field.
export function validateTicketForm(values: TicketFormValues): TicketFieldErrors {
  const errors: TicketFieldErrors = {};

  const summary = values.summary.trim();
  if (summary.length < SUMMARY_MIN || summary.length > SUMMARY_MAX) errors.summary = MESSAGES.summary;

  const description = values.description.trim();
  if (description.length < DESCRIPTION_MIN || description.length > DESCRIPTION_MAX) {
    errors.description = MESSAGES.description;
  }

  if (values.categoryId === "") errors.categoryId = MESSAGES.categoryRequired;
  if (values.relatedSystemId === "") errors.relatedSystemId = MESSAGES.relatedSystemRequired;

  if (values.requestedPriority === "") errors.requestedPriority = MESSAGES.requestedPriorityRequired;
  else if (!PRIORITIES.includes(values.requestedPriority as RequestedPriority)) {
    errors.requestedPriority = MESSAGES.requestedPriorityInvalid;
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Attachments - ui-spec.md 6.1 per-file messages and the BR-42 / BR-43 limits.
// The client check marks a file before any request; the server is authoritative.
// ---------------------------------------------------------------------------

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const PERMITTED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".pdf"] as const;
export const PERMITTED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const;

export function unsupportedTypeMessage(filename: string): string {
  return `${filename} is not a permitted file type. Allowed types are JPG, PNG, WEBP and PDF.`;
}

export function fileTooLargeMessage(filename: string): string {
  return `${filename} is larger than 5 MB.`;
}

export function checkFile(file: File): string | null {
  const dot = file.name.lastIndexOf(".");
  const ext = dot >= 0 ? file.name.slice(dot).toLowerCase() : "";
  const typeOk =
    (PERMITTED_EXTENSIONS as readonly string[]).includes(ext) &&
    (file.type === "" || (PERMITTED_MIME_TYPES as readonly string[]).includes(file.type));
  if (!typeOk) return unsupportedTypeMessage(file.name);
  if (file.size > MAX_UPLOAD_BYTES) return fileTooLargeMessage(file.name);
  return null;
}

// Maps an api-spec.md error code to its ui-spec.md 6.1 message. Codes with no
// user-facing message of their own render as INTERNAL_ERROR (6.1).
export function messageForCode(code: string, filename?: string): string {
  switch (code) {
    case "UNSUPPORTED_FILE_TYPE":
      return unsupportedTypeMessage(filename ?? "That file");
    case "FILE_TOO_LARGE":
      return fileTooLargeMessage(filename ?? "That file");
    case "ATTACHMENT_LIMIT_REACHED":
      return "This ticket already has five active attachments. Remove one before adding another.";
    case "TICKET_FORBIDDEN":
    case "ATTACHMENT_FORBIDDEN":
      return "You do not have access to that item.";
    case "REQUESTER_INACTIVE":
      return "That Development Requester is no longer active. Choose another.";
    case "REQUESTER_NOT_FOUND":
      return "That Development Requester no longer exists. Choose another.";
    case "TICKET_NOT_FOUND":
    case "ATTACHMENT_NOT_FOUND":
      return "That item does not exist.";
    case "ATTACHMENT_REMOVED":
      return "That attachment was removed and can no longer be downloaded.";
    case "INVALID_QUERY_PARAM":
      return "Some search or filter values in the address are not valid. Clear filters to return to the default list.";
    default:
      return INTERNAL_ERROR_MESSAGE;
  }
}

export const INTERNAL_ERROR_MESSAGE =
  "Something went wrong on our side. Your work has not been lost - please try again.";
