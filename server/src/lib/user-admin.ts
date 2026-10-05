import type { UserRole } from "@prisma/client";
import { trimmed } from "./text.js";
import { MESSAGES } from "./validation.js";

// Shared shape validation for Administrator create (api-spec.md 9.2) and edit
// (9.3) - "the same rule as 9.2" the spec repeats for every field, so it is
// one function rather than two copies that could drift (BR-99, BR-75, FR-59).

export const ROLES: readonly UserRole[] = ["REQUESTER", "IT_STAFF", "ADMINISTRATOR"];

const NAME_MAX = 100;
const EMAIL_MAX = 254;
// A practical "valid format" check (BR-99): something, an @, something, a dot,
// something, with no whitespace - enough to catch "no @ at all" (API-103)
// without pretending to be a full RFC 5322 parser.
const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type FieldErrors = Record<string, string>;

export interface UserCoreInput {
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
}

// `opts.requireAll` is create's rule (9.2): every field is required, so an
// absent field fails its own bounds message exactly as an empty one would.
// Edit (9.3) passes false: a field absent from the body is a field left out of
// `values` entirely, so the route can tell "not supplied" from "supplied and
// invalid" and PATCH's "absent = unchanged" rule holds.
export function validateUserFields(
  body: Record<string, unknown>,
  opts: { requireAll: boolean },
): { fields: FieldErrors; values: Partial<UserCoreInput> } {
  const fields: FieldErrors = {};
  const values: Partial<UserCoreInput> = {};

  if (opts.requireAll || "name" in body) {
    const raw = body.name;
    const name = typeof raw === "string" ? trimmed(raw) : "";
    if (name.length < 1 || name.length > NAME_MAX) fields.name = MESSAGES.nameBounds;
    else values.name = name;
  }

  if (opts.requireAll || "email" in body) {
    const raw = body.email;
    const email = typeof raw === "string" ? trimmed(raw).toLowerCase() : "";
    if (email.length < 1 || email.length > EMAIL_MAX || !EMAIL_FORMAT.test(email)) fields.email = MESSAGES.emailBounds;
    else values.email = email;
  }

  if (opts.requireAll || "role" in body) {
    const raw = body.role;
    if (raw === undefined || raw === null || raw === "") fields.role = MESSAGES.roleRequired;
    else if (!(ROLES as readonly string[]).includes(raw as string)) fields.role = MESSAGES.roleInvalid;
    else values.role = raw as UserRole;
  }

  if (opts.requireAll || "isActive" in body) {
    const raw = body.isActive;
    if (typeof raw !== "boolean") fields.isActive = MESSAGES.statusRequired;
    else values.isActive = raw;
  }

  return { fields, values };
}
