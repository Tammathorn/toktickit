import type { PrismaClient, RequestedPriority } from "@prisma/client";
import { trimmed } from "./text.js";

// The ui-spec.md section 6 validation message catalogue, character for
// character. BR-35: client and server both source their text from that table
// and neither emits validation text absent from it. client/src/validation.ts
// carries the same constants; API-09 and UI-13 pin both sides to these strings.

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

// Fields the server generates. api-spec.md 3.1: rejected if supplied.
const SYSTEM_FIELDS = ["ticketNumber", "createdAt", "updatedAt", "currentStatus", "itPriority"] as const;

export type FieldErrors = Record<string, string>;

export interface ValidTicketInput {
  categoryId: number;
  relatedSystemId: number;
  summary: string;
  description: string;
  requestedPriority: RequestedPriority;
}

function isMissing(value: unknown): boolean {
  return value === undefined || value === null || value === "";
}

export function isPositiveInt(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

// Accepts the JSON number the client sends, or a numeric string (a form value
// that was not coerced). Anything else is out of set.
function toId(value: unknown): number | null {
  if (isPositiveInt(value)) return value;
  if (typeof value === "string" && /^\d+$/.test(value)) return toId(Number(value));
  return null;
}

function textInRange(value: unknown, min: number, max: number): string | null {
  if (typeof value !== "string") return null;
  const t = trimmed(value);
  return t.length >= min && t.length <= max ? t : null;
}

// Step 1 of the api-spec.md 1.4 check order for POST /api/tickets: the pure
// shape and length rules (BR-30..BR-33 and the enum half of BR-34), with no
// database access. Returns the coerced values alongside any field errors.
export function validateTicketShape(body: Record<string, unknown>): {
  fields: FieldErrors;
  values: Partial<ValidTicketInput>;
} {
  const fields: FieldErrors = {};
  const values: Partial<ValidTicketInput> = {};

  for (const name of SYSTEM_FIELDS) {
    if (body[name] !== undefined) fields[name] = MESSAGES.systemGenerated(name);
  }

  const summary = textInRange(body.summary, SUMMARY_MIN, SUMMARY_MAX);
  if (summary === null) fields.summary = MESSAGES.summary;
  else values.summary = summary;

  const description = textInRange(body.description, DESCRIPTION_MIN, DESCRIPTION_MAX);
  if (description === null) fields.description = MESSAGES.description;
  else values.description = description;

  if (isMissing(body.categoryId)) fields.categoryId = MESSAGES.categoryRequired;
  else {
    const id = toId(body.categoryId);
    if (id === null) fields.categoryId = MESSAGES.categoryInvalid;
    else values.categoryId = id;
  }

  if (isMissing(body.relatedSystemId)) fields.relatedSystemId = MESSAGES.relatedSystemRequired;
  else {
    const id = toId(body.relatedSystemId);
    if (id === null) fields.relatedSystemId = MESSAGES.relatedSystemInvalid;
    else values.relatedSystemId = id;
  }

  if (isMissing(body.requestedPriority)) fields.requestedPriority = MESSAGES.requestedPriorityRequired;
  else if (!PRIORITIES.includes(body.requestedPriority as RequestedPriority)) {
    fields.requestedPriority = MESSAGES.requestedPriorityInvalid;
  } else values.requestedPriority = body.requestedPriority as RequestedPriority;

  return { fields, values };
}

// The database half of BR-34: Category and Related System must name a row
// that exists and is active. Only runs for ids that passed the shape check.
export async function validateTicketReferences(
  prisma: PrismaClient,
  values: Partial<ValidTicketInput>,
  fields: FieldErrors,
): Promise<void> {
  if (values.categoryId !== undefined) {
    const row = await prisma.category.findUnique({ where: { id: values.categoryId }, select: { isActive: true } });
    if (!row || !row.isActive) fields.categoryId = MESSAGES.categoryInvalid;
  }
  if (values.relatedSystemId !== undefined) {
    const row = await prisma.relatedSystem.findUnique({ where: { id: values.relatedSystemId }, select: { isActive: true } });
    if (!row || !row.isActive) fields.relatedSystemId = MESSAGES.relatedSystemInvalid;
  }
}
