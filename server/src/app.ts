import express, { Request, Response } from "express";
import cors from "cors";
import { getPrisma } from "./prisma.js";
import { sendInternalError } from "./lib/http-error.js";
import { ticketsRouter } from "./routes/tickets.js";
import { attachmentsRouter } from "./routes/attachments.js";
// getPrisma() is the lazy database handle. It is called INSIDE the routes that
// need the DB, so routes like /api/health stay free of database side effects.

// The Express app is exported separately from app.listen() (see index.ts) so
// Supertest can import `app` without opening a port. Do not merge these files.
export const app = express();

app.use(cors());          // already wired: lets the Vite dev server call this API
app.use(express.json());

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
// ---------------------------------------------------------------------------
// Lab 2, Issue #12 — GET /api/requesters (api-spec.md 2.3)
//   -> active RequesterUser rows only (BR-11, C-33), ascending id
//   -> { id, name, email }; no credential of any kind (BR-03, BR-65)
//   -> [] when none is active: that is the Selection screen's empty state, not an error
//   -> 500 INTERNAL_ERROR envelope on failure, which drives the failure state
app.get("/api/requesters", async (_req: Request, res: Response) => {
  try {
    const requesters = await getPrisma().requesterUser.findMany({
      where: { isActive: true },
      orderBy: { id: "asc" },
      select: { id: true, name: true, email: true },
    });
    res.status(200).json(requesters);
  } catch {
    sendInternalError(res);
  }
});
// ---------------------------------------------------------------------------

// Lab 2 Ticket and Attachment endpoints (Issues #13-#15).
app.use(ticketsRouter);
app.use(attachmentsRouter);

export default app;
