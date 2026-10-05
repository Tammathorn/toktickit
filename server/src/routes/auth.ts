import { Router, type Response } from "express";
import { getPrisma } from "../prisma.js";
import { sendError, sendInternalError } from "../lib/http-error.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { AUTH_MESSAGES, validatePasswordChange } from "../lib/password-policy.js";
import { CLEARED_SESSION_COOKIE, createSession, deleteSession, sessionCookie } from "../lib/session.js";
import { toUserDto } from "../lib/user-dto.js";
import { authOf, requireAuth } from "../middleware/auth.js";

// Lab 3 authentication endpoints - api-spec.md 2.4 and 3.1 to 3.3.
//
// Login is public (C-62). The other three require a session and are the only
// routes the password-change gate exempts (BR-19, C-61), so they take
// requireAuth and not `protect`.
//
// Nothing in this file logs. A request body here carries a password, so no
// line may ever print one (BR-88).

export const authRouter = Router();

const asString = (value: unknown): string => (typeof value === "string" ? value : "");

// One body for the three causes BR-07 names: unknown email, wrong password,
// NULL hash. Built once, so the three responses are byte-identical.
function sendInvalidCredentials(res: Response): void {
  sendError(res, 401, "INVALID_CREDENTIALS", "That email address and password do not match an account.");
}

authRouter.post("/api/auth/login", async (req, res) => {
  const email = asString(req.body?.email).trim().toLowerCase();
  // BR-11: a password is never trimmed - surrounding spaces are part of it.
  const password = asString(req.body?.password);

  const fields: Record<string, string> = {};
  if (email === "") fields.email = AUTH_MESSAGES.emailRequired;
  if (password === "") fields.password = AUTH_MESSAGES.passwordRequired;
  if (Object.keys(fields).length > 0) {
    sendError(res, 400, "VALIDATION_FAILED", "Some fields need attention.", fields);
    return;
  }

  try {
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({ where: { email } });
    // Verify FIRST, for every caller: an unknown email is checked against a
    // decoy hash so it costs what a real check costs (C-53).
    const verified = verifyPassword(user?.passwordHash ?? null, password);
    if (!user || !verified) {
      sendInvalidCredentials(res);
      return;
    }
    // Only now, to a caller who holds the right password, is inactivity
    // revealed (BR-09, C-59).
    if (!user.isActive) {
      sendError(res, 403, "ACCOUNT_INACTIVE", "That account is not active. Contact an administrator.");
      return;
    }
    const token = await createSession(prisma, user.id);
    res.setHeader("Set-Cookie", sessionCookie(token));
    res.status(200).json(toUserDto(user));
  } catch {
    sendInternalError(res);
  }
});

// Exempt from the gate, so Change Password can say whose password it is
// (C-61, BR-32).
authRouter.get("/api/auth/me", requireAuth, (_req, res) => {
  res.status(200).json(toUserDto(authOf(res).user));
});

authRouter.post("/api/auth/change-password", requireAuth, async (req, res) => {
  const { user, sessionId } = authOf(res);
  const input = {
    currentPassword: asString(req.body?.currentPassword),
    newPassword: asString(req.body?.newPassword),
    confirmPassword: asString(req.body?.confirmPassword),
  };

  // BR-12, BR-13 - the shared validator, the same one the client runs (C-60).
  const fields = validatePasswordChange(input);
  if (Object.keys(fields).length > 0) {
    sendError(res, 400, "VALIDATION_FAILED", "Some fields need attention.", fields);
    return;
  }

  // BR-15, BR-105 - a valid session alone cannot change the password. A wrong
  // current password is 422 at the field, never 401: 401 would tell the client
  // the session is gone and lose the session this change needs (C-106).
  if (!verifyPassword(user.passwordHash, input.currentPassword)) {
    sendError(res, 422, "CURRENT_PASSWORD_INCORRECT", AUTH_MESSAGES.currentIncorrect, {
      currentPassword: AUTH_MESSAGES.currentIncorrect,
    });
    return;
  }

  try {
    const prisma = getPrisma();
    // BR-18, C-97 - the gate clears, the calling session survives, and every
    // other session of this user ends, in one transaction.
    const [updated] = await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: hashPassword(input.newPassword), mustChangePassword: false },
      }),
      prisma.session.deleteMany({ where: { userId: user.id, id: { not: sessionId } } }),
    ]);
    res.status(200).json(toUserDto(updated));
  } catch {
    sendInternalError(res);
  }
});

// Ends the calling session only (BR-23, C-55); the user's other sessions keep
// working.
authRouter.post("/api/auth/logout", requireAuth, async (_req, res) => {
  try {
    await deleteSession(getPrisma(), authOf(res).sessionId);
    res.setHeader("Set-Cookie", CLEARED_SESSION_COOKIE);
    res.status(204).end();
  } catch {
    sendInternalError(res);
  }
});
