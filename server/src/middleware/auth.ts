import type { Request, RequestHandler, Response } from "express";
import type { User, UserRole } from "@prisma/client";
import { getPrisma } from "../prisma.js";
import { sendError, sendInternalError } from "../lib/http-error.js";
import { SESSION_COOKIE, findSession } from "../lib/session.js";

// The front of the C-63 check order, as one shared chain rather than code
// repeated per route (api-spec.md 1.4):
//
//   originCheck        before step 1, on POST, PATCH and DELETE only (C-58)
//   1. requireAuth     a valid tt_session, or 401
//   2. requirePasswordChanged   mustChangePassword set, or 403 (C-99)
//   3. requireRole     the caller's role may perform this operation, or 403
//                      - before the resource is loaded (C-63, C-65)
//   4.-7.              parameters, load, ownership, body - inside each route
//
// `protect` is steps 1 and 2 together. Every protected route uses it except the
// three the gate exempts - current user, change-password and logout - which
// take requireAuth alone (BR-19, C-61).

// CLIENT_ORIGIN is configuration (server/.env.example). The default is the
// Vite dev server, the only client this lab runs.
export function clientOrigin(): string {
  return process.env.CLIENT_ORIGIN || "http://localhost:5173";
}

const STATE_CHANGING = new Set(["POST", "PATCH", "DELETE"]);

// C-58, BR-27 - the second half of the CSRF cover, beside SameSite=Strict. A
// present Origin that is not the client's is refused before the session is
// looked at. An absent Origin is accepted: server-to-server callers and
// Supertest send none, and a browser cannot suppress it on a cross-site write.
export const originCheck: RequestHandler = (req, res, next) => {
  const origin = req.headers.origin;
  if (STATE_CHANGING.has(req.method) && origin !== undefined && origin !== clientOrigin()) {
    sendError(res, 403, "ORIGIN_NOT_ALLOWED", "This request did not come from the TokTickIT client.");
    return;
  }
  next();
};

// No cookie-parser: one cookie is read, and CLAUDE.md admits no dependency
// that is not approved.
function readCookie(req: Request, name: string): string | undefined {
  for (const pair of (req.headers.cookie ?? "").split(";")) {
    const index = pair.indexOf("=");
    if (index > 0 && pair.slice(0, index).trim() === name) return pair.slice(index + 1).trim();
  }
  return undefined;
}

export interface AuthLocals {
  user: User;
  sessionId: number;
}

// The authenticated identity for this request. The ONLY place a route learns
// who is calling (BR-31, C-64).
export function authOf(res: Response): AuthLocals {
  return res.locals.auth as AuthLocals;
}

// One body for every cause - no cookie, a malformed or unknown token, an
// expired session, a logged-out one, an inactive user - so a 401 says nothing
// about which it was (api-spec.md 1.1, BR-22, BR-24).
function sendAuthRequired(res: Response): void {
  sendError(res, 401, "AUTH_REQUIRED", "Your session has ended. Please sign in again.");
}

export const requireAuth: RequestHandler = (req, res, next) => {
  const token = readCookie(req, SESSION_COOKIE);
  if (!token) {
    sendAuthRequired(res);
    return;
  }
  findSession(getPrisma(), token).then(
    (found) => {
      if (!found) {
        sendAuthRequired(res);
        return;
      }
      res.locals.auth = { user: found.user, sessionId: found.sessionId } satisfies AuthLocals;
      next();
    },
    () => sendInternalError(res),
  );
};

// BR-19, C-99 - 403, never 401: the caller is authenticated and must keep the
// session to change the password. The screen the client shows is feedback;
// this is the control (BR-20).
export const requirePasswordChanged: RequestHandler = (_req, res, next) => {
  if (authOf(res).user.mustChangePassword) {
    sendError(res, 403, "PASSWORD_CHANGE_REQUIRED", "You must change your password before you continue.");
    return;
  }
  next();
};

export const protect: readonly RequestHandler[] = [requireAuth, requirePasswordChanged];

// Step 3 (BR-38, C-65). Runs before any parameter is parsed or row loaded, so
// its 403 is byte-identical whether or not the addressed resource exists, and a
// malformed id cannot be used to tell a forbidden route from a missing one
// (api-spec.md 1.4). The roles each route admits are specification.md 5.2.
export function requireRole(...roles: UserRole[]): RequestHandler {
  return (_req, res, next) => {
    if (!roles.includes(authOf(res).user.role)) {
      sendError(res, 403, "FORBIDDEN_ROLE", "You do not have access to that page.");
      return;
    }
    next();
  };
}

// The two chains every ticket route uses: Requester-only operations, and the
// reads every role may make, whose ownership rule the route applies itself.
export const requesterOnly: readonly RequestHandler[] = [...protect, requireRole("REQUESTER")];
export const anyRole: readonly RequestHandler[] = [...protect, requireRole("REQUESTER", "IT_STAFF", "ADMINISTRATOR")];
// Staff routes: the Ticket Queue and staff Ticket operations (C-101). A
// Requester is refused 403 FORBIDDEN_ROLE before any query parameter is
// parsed or any resource is loaded (C-63, C-65).
export const staffOnly: readonly RequestHandler[] = [...protect, requireRole("IT_STAFF", "ADMINISTRATOR")];
