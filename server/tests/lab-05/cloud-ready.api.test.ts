import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import request from "supertest";
import fs from "node:fs";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { deleteTickets } from "../support/cleanup.js";
import { seedGraded, seedPlan, SEED_PASSWORDS, ADMINISTRATORS } from "../../src/seed/graded-seed.js";
import { createTicketWithNumber } from "../../src/lib/ticket-repository.js";
import { UPLOAD_DIR } from "../../src/lib/uploads.js";
import { sessionCookie, clearedSessionCookie } from "../../src/lib/session.js";
import { removeUsers, signedInUser, type Agent } from "../support/agents.js";

// Lab 5 - what changes when TokTickIT runs on Cloud Run (Student Guide
// Episode 2; handout R-02, R-03, R-04). docs/labs/lab-05/deployment.md
// section 3 lists each change; every one has a test here.

const prisma = getPrisma();
const TEST_TAG = "[lab5-test]";
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

const users: number[] = [];
let owner: Agent;
let ticketId: number;
const savedEnv = { ...process.env };

beforeAll(async () => {
  await seedGraded(prisma);
  const a = await signedInUser(prisma, "lab5-owner");
  users.push(a.id);
  owner = a.agent;
  const category = await prisma.category.findFirstOrThrow({ where: { isActive: true } });
  const system = await prisma.relatedSystem.findFirstOrThrow({ where: { isActive: true } });
  const ticket = await createTicketWithNumber(prisma, {
    requesterId: a.id,
    categoryId: category.id,
    relatedSystemId: system.id,
    summary: `${TEST_TAG} attachment host`,
    description: "Created by cloud-ready.api.test.ts to receive a database-stored upload.",
    requestedPriority: "MEDIUM",
  });
  ticketId = ticket.id;
});

afterEach(() => {
  process.env = { ...savedEnv };
});

afterAll(async () => {
  const tickets = await prisma.ticket.findMany({ where: { summary: { startsWith: TEST_TAG } }, select: { id: true } });
  const ids = tickets.map((t) => t.id);
  await prisma.attachment.deleteMany({ where: { ticketId: { in: ids } } });
  await deleteTickets(prisma, { id: { in: ids } });
  await removeUsers(prisma, users);
});

describe("GET /api/ready (smoke test target)", () => {
  it("LAB5-01 answers 200 with db connected when the database responds", async () => {
    const res = await request(app).get("/api/ready");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ready", db: "connected" });
  });
});

describe("GET /api/version (R-08)", () => {
  it("LAB5-10 reports the commit baked into the image, or unknown locally", async () => {
    delete process.env.APP_COMMIT;
    expect((await request(app).get("/api/version")).body).toEqual({ commit: "unknown" });
    process.env.APP_COMMIT = "a".repeat(40);
    const res = await request(app).get("/api/version");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ commit: "a".repeat(40) });
  });
});

describe("attachments kept in the database (R-04)", () => {
  it("LAB5-02 an upload in database mode writes the bytes into the row and nothing to UPLOAD_DIR", async () => {
    process.env.ATTACHMENT_STORAGE = "database";
    const before = fs.existsSync(UPLOAD_DIR) ? fs.readdirSync(UPLOAD_DIR).length : 0;

    const res = await owner.post(`/api/tickets/${ticketId}/attachments`).attach("file", PNG, "cloud.png");

    expect(res.status).toBe(201);
    expect(res.body.content).toBeUndefined();
    const row = await prisma.attachment.findUniqueOrThrow({ where: { id: res.body.id } });
    expect(row.content).not.toBeNull();
    expect(Buffer.from(row.content!).equals(PNG)).toBe(true);
    const after = fs.existsSync(UPLOAD_DIR) ? fs.readdirSync(UPLOAD_DIR).length : 0;
    expect(after).toBe(before);
  });

  it("LAB5-03 the download serves the stored bytes, and the list never carries them", async () => {
    process.env.ATTACHMENT_STORAGE = "database";
    const up = await owner.post(`/api/tickets/${ticketId}/attachments`).attach("file", PNG, "again.png");
    expect(up.status).toBe(201);

    // Back in disk mode: a database-stored row is still served from its row.
    process.env.ATTACHMENT_STORAGE = "disk";
    const down = await owner.get(`/api/attachments/${up.body.id}/download`).buffer(true).parse((r, cb) => {
      const chunks: Buffer[] = [];
      r.on("data", (c: Buffer) => chunks.push(c));
      r.on("end", () => cb(null, Buffer.concat(chunks)));
    });
    expect(down.status).toBe(200);
    expect(down.headers["content-type"]).toBe("image/png");
    expect(Buffer.compare(down.body as Buffer, PNG)).toBe(0);

    const list = await owner.get(`/api/tickets/${ticketId}/attachments`);
    expect(list.status).toBe(200);
    for (const a of list.body) expect(a).not.toHaveProperty("content");
  });
});

describe("production seed takes passwords from the environment (R-02)", () => {
  it("LAB5-04 outside production the local development passwords are used", () => {
    const plan = seedPlan({ NODE_ENV: "test" });
    expect(plan.users.find((u) => u.role === "ADMINISTRATOR")?.password).toBe(SEED_PASSWORDS.administrator);
    expect(plan.adminMustChange).toBe(false);
  });

  it("LAB5-05 production without ADMIN_PASSWORD refuses to seed", () => {
    expect(() => seedPlan({ NODE_ENV: "production" })).toThrow(/ADMIN_PASSWORD/);
  });

  it("LAB5-06 production without demo data seeds only the Administrator, who must change the password", () => {
    const plan = seedPlan({ NODE_ENV: "production", ADMIN_PASSWORD: "From-Secret-Manager1!" });
    expect(plan.users.map((u) => u.email)).toEqual(ADMINISTRATORS.map((u) => u.email));
    expect(plan.users[0].password).toBe("From-Secret-Manager1!");
    expect(plan.firstLogin).toBeNull();
    expect(plan.tickets).toBe(false);
    expect(plan.adminMustChange).toBe(true);
  });

  it("LAB5-07 production demo data requires DEMO_USER_PASSWORD and uses no password from the code", () => {
    expect(() => seedPlan({ NODE_ENV: "production", ADMIN_PASSWORD: "A-1!aaaaaaaa", SEED_DEMO_DATA: "true" })).toThrow(
      /DEMO_USER_PASSWORD/,
    );
    const plan = seedPlan({
      NODE_ENV: "production",
      ADMIN_PASSWORD: "Admin-From-Secret1!",
      SEED_DEMO_DATA: "true",
      DEMO_USER_PASSWORD: "Demo-From-Secret1!",
    });
    const codePasswords = new Set<string>(Object.values(SEED_PASSWORDS));
    for (const u of [...plan.users, plan.firstLogin!]) expect(codePasswords.has(u.password)).toBe(false);
    expect(plan.tickets).toBe(true);
  });
});

describe("HTTPS and same-origin on Cloud Run (R-03)", () => {
  it("LAB5-08 the session cookie is Secure in production only", () => {
    process.env.NODE_ENV = "test";
    expect(sessionCookie("x")).not.toMatch(/Secure/);
    process.env.NODE_ENV = "production";
    expect(sessionCookie("x")).toMatch(/; Secure$/);
    expect(clearedSessionCookie()).toMatch(/; Secure$/);
  });

  it("LAB5-09 a write from the service's own https origin is accepted; any other origin is still refused", async () => {
    const host = "toktickit-abc123-as.a.run.app";
    const own = await request(app)
      .post("/api/auth/logout")
      .set("Host", host)
      .set("X-Forwarded-Proto", "https")
      .set("Origin", `https://${host}`);
    expect(own.status).not.toBe(403);

    const foreign = await request(app)
      .post("/api/auth/logout")
      .set("Host", host)
      .set("X-Forwarded-Proto", "https")
      .set("Origin", "https://evil.example");
    expect(foreign.status).toBe(403);
    expect(foreign.body.code ?? foreign.body.error?.code).toBe("ORIGIN_NOT_ALLOWED");
  });
});
