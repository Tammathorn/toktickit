import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { seedGraded, REQUESTERS } from "../../src/seed/graded-seed.js";

// Planned rows from tests.md section 2.2 that live in this file.
// Issue #12 lands API-11 (the selector's data source); the Create Ticket rows
// API-01..API-10, API-12..API-14 and API-44 follow with Issue #13.

beforeAll(async () => {
  await seedGraded(getPrisma());
});

describe("API-11 — GET /api/requesters lists active Requesters only (AC-04, BR-11)", () => {
  it("returns 200 with every active seeded Requester and none of the inactive ones", async () => {
    const res = await request(app).get("/api/requesters");
    expect(res.status).toBe(200);

    const names = res.body.map((r: { name: string }) => r.name);
    for (const r of REQUESTERS) {
      if (r.isActive) expect(names).toContain(r.name);
      else expect(names).not.toContain(r.name);
    }
  });

  it("returns { id, name, email } rows in ascending id order and nothing else", async () => {
    const res = await request(app).get("/api/requesters");
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(4);

    for (const row of res.body) {
      expect(Object.keys(row).sort()).toEqual(["email", "id", "name"]);
    }
    const ids = res.body.map((r: { id: number }) => r.id);
    expect(ids).toEqual([...ids].sort((a, b) => a - b));
  });
});
