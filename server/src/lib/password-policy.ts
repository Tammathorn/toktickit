// The ONE password validator (C-60, BR-14, FR-17). It serves Change Password
// now, and Administrator create and set-initial-password in Issue #43, on the
// server and on the client alike: client/src/auth/ imports this same file, so
// the rule and its message cannot drift apart between the two sides
// (ui-spec.md section 11, "one module imported by both sides").
//
// It must stay plain TypeScript - no node: import, no Prisma, no DOM - because
// both the server and the Vite client compile it.
//
// Every string is the ui-spec.md section 6.1 catalogue, character for
// character (BR-87). Login's two presence messages live here too, so the
// whole authentication catalogue has one source.

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export const AUTH_MESSAGES = {
  emailRequired: "Email Address is required.",
  passwordRequired: "Password is required.",
  policy:
    "Password must be 8 to 128 characters and contain an upper-case letter, a lower-case letter, a digit and a special character.",
  sameAsCurrent: "New Password must be different from your current password.",
  confirmMismatch: "The confirmation does not match the new password.",
  currentRequired: "Current Password is required.",
  currentIncorrect: "That is not your current password.",
} as const;

// BR-12. Null when the password is acceptable, otherwise the one BR-12
// message. Length and character class share that message on purpose: a
// refusal must not tell an attacker which half of the rule failed
// (ui-spec.md 6.1). Length is counted in characters, not UTF-16 code units.
export function checkPasswordPolicy(password: string): string | null {
  const length = Array.from(password).length;
  const ok =
    length >= PASSWORD_MIN_LENGTH &&
    length <= PASSWORD_MAX_LENGTH &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password);
  return ok ? null : AUTH_MESSAGES.policy;
}

export interface PasswordChangeInput {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// BR-12, BR-13, BR-15 - one message per field, keyed by the request field, so
// the server's `fields` object and the client's inline messages are the same
// map. Whether the current password is CORRECT is not checked here: only the
// server holds the hash, and a wrong one is a 422, not a validation failure
// (C-106).
export function validatePasswordChange(input: PasswordChangeInput): Record<string, string> {
  const fields: Record<string, string> = {};
  if (input.currentPassword === "") fields.currentPassword = AUTH_MESSAGES.currentRequired;

  const policy = checkPasswordPolicy(input.newPassword);
  if (policy) fields.newPassword = policy;
  else if (input.newPassword === input.currentPassword) fields.newPassword = AUTH_MESSAGES.sameAsCurrent;

  if (input.confirmPassword !== input.newPassword) fields.confirmPassword = AUTH_MESSAGES.confirmMismatch;
  return fields;
}
