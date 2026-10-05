import { Router, type Request, type Response } from "express";
import type { UserRole } from "@prisma/client";
import { getPrisma } from "../prisma.js";
import { sendError, sendInternalError } from "../lib/http-error.js";
import { adminOnly, authOf } from "../middleware/auth.js";
import { parsePathId } from "../lib/validation.js";
import { escapeLikeWildcards } from "../lib/list-query.js";
import { ROLES, validateUserFields } from "../lib/user-admin.js";
import { checkPasswordPolicy } from "../lib/password-policy.js";
import { hashPassword } from "../lib/password.js";
import { toAdminUserDto } from "../lib/user-dto.js";

// Administrator user management - api-spec.md section 9, ui-spec.md section
// 17, `LS 8.5` (#43). Every route here sits behind adminOnly, so an IT Staff
// or Requester caller is refused 403 FORBIDDEN_ROLE before any query
// parameter is parsed or any User row is loaded (C-63, C-65, BR-39).
//
// Users are deactivated, never deleted (BR-29, BR-81): there is no
// DELETE /api/users/:id and no route that removes a row.

export const usersRouter = Router();

const ADMIN_SELECT = { id: true, name: true, email: true, role: true, isActive: true, mustChangePassword: true, createdAt: true, updatedAt: true } as const;

function readBody(req: Request): Record<string, unknown> {
  return req.body && typeof req.body === "object" && !Array.isArray(req.body) ? req.body : {};
}

function sendUserNotFound(res: Response): void {
  sendError(res, 404, "USER_NOT_FOUND", "That item does not exist.");
}

function invalidId(res: Response): void {
  sendError(res, 400, "INVALID_QUERY_PARAM", "User id must be a positive integer.", { id: "User id must be a positive integer." });
}

// ---------------------------------------------------------------------------
// GET /api/users - api-spec.md 9.1. Search by name or email, an optional
// single role filter, no pagination and no user-controlled sort (BR-84,
// FR-66, C-107): the list is always returned name ascending, then id
// (BR-106). `page`, `pageSize` and `sort`, if supplied, change nothing.
// ---------------------------------------------------------------------------
usersRouter.get("/api/users", ...adminOnly, async (req: Request, res: Response) => {
  const q = req.query as Record<string, unknown>;
  const roleRaw = typeof q.role === "string" ? q.role : Array.isArray(q.role) ? String(q.role[0]) : undefined;
  if (roleRaw !== undefined && roleRaw !== "" && !(ROLES as readonly string[]).includes(roleRaw)) {
    sendError(res, 400, "INVALID_QUERY_PARAM", "Some search or filter values are not valid.", {
      role: `role must be one of ${ROLES.join(", ")}.`,
    });
    return;
  }
  const searchRaw = typeof q.search === "string" ? q.search : Array.isArray(q.search) ? String(q.search[0]) : undefined;
  const search = searchRaw?.replace(/\u0000/g, "").trim() || null;

  try {
    const where: Record<string, unknown> = {};
    if (roleRaw) where.role = roleRaw as UserRole;
    if (search) {
      const like = escapeLikeWildcards(search);
      where.OR = [
        { name: { contains: like, mode: "insensitive" } },
        { email: { contains: like, mode: "insensitive" } },
      ];
    }
    const users = await getPrisma().user.findMany({
      where,
      orderBy: [{ name: "asc" }, { id: "asc" }],
      select: ADMIN_SELECT,
    });
    res.status(200).json(users.map(toAdminUserDto));
  } catch {
    sendInternalError(res);
  }
});

// ---------------------------------------------------------------------------
// POST /api/users - api-spec.md 9.2. Created always with mustChangePassword
// true (BR-16, C-79); no email of any kind is sent (`LS 4.2`).
// ---------------------------------------------------------------------------
usersRouter.post("/api/users", ...adminOnly, async (req: Request, res: Response) => {
  const body = readBody(req);
  const { fields, values } = validateUserFields(body, { requireAll: true });

  const initialPassword = typeof body.initialPassword === "string" ? body.initialPassword : "";
  const passwordError = checkPasswordPolicy(initialPassword);
  if (passwordError) fields.initialPassword = passwordError;

  if (Object.keys(fields).length > 0) {
    sendError(res, 400, "VALIDATION_FAILED", "Some fields need attention.", fields);
    return;
  }

  try {
    const prisma = getPrisma();
    // BR-77, BR-06: case-insensitive against the stored lower-case value - both
    // sides are already lower-cased, so an exact match is the whole check.
    const existing = await prisma.user.findUnique({ where: { email: values.email! }, select: { id: true } });
    if (existing) {
      sendError(res, 409, "EMAIL_TAKEN", "That email address is already in use.", { email: "That email address is already in use." });
      return;
    }
    const created = await prisma.user.create({
      data: {
        name: values.name!,
        email: values.email!,
        role: values.role!,
        isActive: values.isActive!,
        passwordHash: hashPassword(initialPassword),
        mustChangePassword: true,
      },
      select: ADMIN_SELECT,
    });
    res.status(201).json(toAdminUserDto(created));
  } catch {
    sendInternalError(res);
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/users/:id - api-spec.md 9.3. name, email, role, isActive - any
// subset; a field absent is a field unchanged. SELF_DEACTIVATION (422) and
// LAST_ADMINISTRATOR (409) are C-100's two different refusals for the same
// neighbourhood: one depends only on who is calling, the other on the state
// of the other User rows and so runs inside a transaction that locks the
// active-Administrator rows (BR-80, C-80).
// ---------------------------------------------------------------------------
usersRouter.patch("/api/users/:id", ...adminOnly, async (req: Request, res: Response) => {
  const id = parsePathId(req.params.id);
  if (id === null) {
    invalidId(res);
    return;
  }

  try {
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      sendUserNotFound(res);
      return;
    }

    const body = readBody(req);
    const { fields, values } = validateUserFields(body, { requireAll: false });
    if (Object.keys(fields).length > 0) {
      sendError(res, 400, "VALIDATION_FAILED", "Some fields need attention.", fields);
      return;
    }
    if (Object.keys(values).length === 0) {
      sendError(res, 400, "VALIDATION_FAILED", "Some fields need attention.");
      return;
    }

    // BR-77: only when the email is actually changing - editing a user to
    // their own current address is not a conflict (AC-87's second half).
    if (values.email !== undefined && values.email !== user.email) {
      const existing = await prisma.user.findFirst({ where: { email: values.email, NOT: { id: user.id } }, select: { id: true } });
      if (existing) {
        sendError(res, 409, "EMAIL_TAKEN", "That email address is already in use.", { email: "That email address is already in use." });
        return;
      }
    }

    const roleChanged = values.role !== undefined && values.role !== user.role;
    const willDeactivate = values.isActive === false;
    const callerIsTarget = user.id === authOf(res).user.id;

    // BR-80/C-80 (LAST_ADMINISTRATOR) and BR-79/C-81 (SELF_DEACTIVATION) can
    // both describe the same request - the sole active Administrator
    // deactivating themselves. AC-93 and AC-94 require 409 for that case, so
    // the state-dependent check (whether this is the sole active
    // Administrator) runs first, inside the lock; SELF_DEACTIVATION, which
    // depends only on who is calling (C-100), is the fallback once the
    // Administrator count is known safe. AC-92's plain self-deactivation
    // (another active Administrator exists) still reaches 422.
    const outcome = await prisma.$transaction(async (tx) => {
      // C-80: locks every currently active Administrator row, so a concurrent
      // deactivation or role change on another active Administrator cannot be
      // decided from a stale count (AC-95).
      const activeAdmins = await tx.$queryRaw<{ id: number }[]>`SELECT id FROM "User" WHERE role = 'ADMINISTRATOR' AND "isActive" = true FOR UPDATE`;
      const activeAdminIds = new Set(activeAdmins.map((r) => r.id));
      const targetIsSoleActiveAdmin = activeAdminIds.has(user.id) && activeAdminIds.size === 1;
      const willChangeRoleAway = roleChanged && user.role === "ADMINISTRATOR" && values.role !== "ADMINISTRATOR";
      if (targetIsSoleActiveAdmin && (willDeactivate || willChangeRoleAway)) {
        return { kind: "last-administrator" as const };
      }
      if (willDeactivate && callerIsTarget) {
        return { kind: "self-deactivation" as const };
      }

      const updated = await tx.user.update({ where: { id: user.id }, data: values, select: ADMIN_SELECT });
      // BR-24, BR-83: a role change and a deactivation each revoke every
      // session of that user. A name or email change revokes nothing.
      if (roleChanged || willDeactivate) {
        await tx.session.deleteMany({ where: { userId: user.id } });
      }
      return { kind: "ok" as const, updated };
    });

    if (outcome.kind === "last-administrator") {
      sendError(res, 409, "LAST_ADMINISTRATOR", "There must always be at least one active Administrator.");
      return;
    }
    if (outcome.kind === "self-deactivation") {
      const message = "You cannot deactivate your own account.";
      sendError(res, 422, "SELF_DEACTIVATION", message, { isActive: message });
      return;
    }
    res.status(200).json(toAdminUserDto(outcome.updated));
  } catch {
    sendInternalError(res);
  }
});

// ---------------------------------------------------------------------------
// POST /api/users/:id/initial-password - api-spec.md 9.4, the lab's only
// account-recovery path (BR-78, C-79). Replaces the hash, flags
// mustChangePassword and revokes every session of that user, all at once.
// ---------------------------------------------------------------------------
usersRouter.post("/api/users/:id/initial-password", ...adminOnly, async (req: Request, res: Response) => {
  const id = parsePathId(req.params.id);
  if (id === null) {
    invalidId(res);
    return;
  }

  try {
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!user) {
      sendUserNotFound(res);
      return;
    }

    const body = readBody(req);
    const initialPassword = typeof body.initialPassword === "string" ? body.initialPassword : "";
    const passwordError = checkPasswordPolicy(initialPassword);
    if (passwordError) {
      sendError(res, 400, "VALIDATION_FAILED", "Some fields need attention.", { initialPassword: passwordError });
      return;
    }

    const [updated] = await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: hashPassword(initialPassword), mustChangePassword: true },
        select: ADMIN_SELECT,
      }),
      prisma.session.deleteMany({ where: { userId: user.id } }),
    ]);
    res.status(200).json(toAdminUserDto(updated));
  } catch {
    sendInternalError(res);
  }
});
