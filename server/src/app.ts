import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import { getPrisma } from "./prisma.js";
import { sendError, sendInternalError } from "./lib/http-error.js";
import { clientOrigin, originCheck } from "./middleware/auth.js";
import { authRouter } from "./routes/auth.js";
import { ticketsRouter } from "./routes/tickets.js";
import { attachmentsRouter } from "./routes/attachments.js";
import { staffRouter } from "./routes/staff.js";
import { commentsNotesRouter } from "./routes/comments-notes.js";
import { usersRouter } from "./routes/users.js";
// getPrisma() is the lazy database handle. It is called INSIDE the routes that
// need the DB, so routes like /api/health stay free of database side effects.

// The Express app is exported separately from app.listen() (see index.ts) so
// Supertest can import `app` without opening a port. Do not merge these files.
export const app = express();

// C-56 - the client reaches this API same-origin through the Vite proxy, so the
// Lab 2 wildcard cors() is pinned to CLIENT_ORIGIN: a wildcard origin cannot
// carry credentials, and nothing else should be calling from a browser.
app.use(cors({ origin: (_origin, allow) => allow(null, clientOrigin()) }));
// C-58 - a cross-origin write is refused before its body is even parsed.
app.use(originCheck);
app.use(express.json());
// A body express.json cannot parse is treated as no body at all, and the
// request carries on through the chain. The session, gate and role checks then
// answer first, exactly as for any other request, and the route's own body
// validation - the last step of api-spec.md 1.4 - reports what is missing. An
// anonymous caller is told 401, never whether their body would have parsed
// (BR-86). The parser's message, which quotes the body, is dropped (BR-88).
app.use((error: { type?: unknown }, req: Request, _res: Response, next: NextFunction) => {
  if (error?.type === "entity.parse.failed") {
    req.body = {};
    next();
    return;
  }
  next(error);
});

// ---------------------------------------------------------------------------
// Issue 2 — API health check
// Make the test in tests/lab-01/health.test.ts pass.
// It must return HTTP 200 with JSON: { status: "ok", service: "TokTickIT API" }
// ---------------------------------------------------------------------------
app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", service: "TokTickIT API" });
});

// ---------------------------------------------------------------------------
// Issue 4 — Category list
// Add:  GET /api/categories
//   -> read categories from PostgreSQL via getPrisma().category.findMany(...)
//   -> return each { id, name } in a predictable (id) order
//   -> on failure, respond 500 with a safe message (no internal details)
app.get("/api/categories", async (_req: Request, res: Response) => {
  try {
    // BR-56 / C-05 — active rows only, still { id, name } in id order, so the
    // Lab 1 Supertest assertion continues to pass unchanged.
    const categories = await getPrisma().category.findMany({
      where: { isActive: true },
      orderBy: { id: "asc" },
      select: { id: true, name: true },
    });
    res.status(200).json(categories);
  } catch {
    sendInternalError(res);
  }
});

// Lab 2, Issue #13 — GET /api/related-systems (api-spec.md 2.2). A flat list,
// never scoped to a Category (C-24); active rows only, id order (BR-56).
app.get("/api/related-systems", async (_req: Request, res: Response) => {
  try {
    const systems = await getPrisma().relatedSystem.findMany({
      where: { isActive: true },
      orderBy: { id: "asc" },
      select: { id: true, name: true },
    });
    res.status(200).json(systems);
  } catch {
    sendInternalError(res);
  }
});
// Lab 2's GET /api/requesters is removed (api-spec.md 1.7, C-62, C-64): it was
// an unauthenticated list of every active user, the selector's data source.
// The Administrator user list replaces its one legitimate purpose (#43).

// Lab 3 authentication - login, current user, change-password, logout.
app.use(authRouter);

// Lab 2 Ticket and Attachment endpoints (Issues #13-#15).
app.use(ticketsRouter);
app.use(attachmentsRouter);
// Lab 3 (#41, #42) - the IT Staff Ticket Queue, staff Ticket Detail and the
// staff Ticket operations.
app.use(staffRouter);
// Lab 3 (#42) - Public Comments and Internal Notes, append-only.
app.use(commentsNotesRouter);
// Lab 3 (#43) - Administrator user management.
app.use(usersRouter);

// The one error handler, last. Express's own would answer with an HTML page
// quoting the error - for a body express.json cannot parse, a page quoting the
// body, which on /api/auth/login is the password (BR-88, BR-89). Instead:
// a client error Express or the body parser raised (a malformed body, an
// undecodable path) is the 400 envelope, and anything else is the safe 500.
// Nothing about the error is logged, because its message can quote request
// data.
app.use((error: { status?: unknown }, _req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) {
    next(error);
    return;
  }
  const status = typeof error?.status === "number" ? error.status : 500;
  if (status >= 400 && status < 500) sendError(res, 400, "VALIDATION_FAILED", "Some fields need attention.");
  else sendInternalError(res);
});

export default app;
