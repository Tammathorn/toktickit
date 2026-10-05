import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";
import express from "express";
import type { RequestHandler } from "express";

// timingSafeEqual is wrapped, not replaced, so UNIT-03 can prove the password
// comparison goes through it while every hash still verifies for real.
vi.mock("node:crypto", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:crypto")>();
  return { ...actual, timingSafeEqual: vi.fn(actual.timingSafeEqual) };
});

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { hashPassword } from "../../src/lib/password.js";

// Lab 3 authentication - tests.md section 2.1 (UNIT-01..06, 08, 09) and
// section 2.2 (API-01..API-28), Issue #39.
//
// API-14 grows with the routes behind the gate: GET /api/tickets from #40, the
// queue in #41, the user list in #43. The probe route below proves the chain
// itself, independently of any one route.
// UNIT-07 needs the Administrator call sites (#43); UNIT-10 and UNIT-11 test
// the name, email and comment bounds of #42 and #43.
//
// Every user here is created by this file with an @auth.test address and
// removed in afterAll, so no seeded account's password is ever changed.

const prisma = getPrisma();
const PASSWORD = "Correct#Horse1";
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? "http://localhost:5173";
const EIGHT_HOURS = 8 * 60 * 60 * 1000;
const MINUTE = 60 * 1000;

// ui-spec.md section 6, character for character.
const MSG = {
  email: "Email Address is required.",
  password: "Password is required.",
  policy:
    "Password must be 8 to 128 characters and contain an upper-case letter, a lower-case letter, a digit and a special character.",
  sameAsCurrent: "New Password must be different from your current password.",
  confirm: "The confirmation does not match the new password.",
  currentRequired: "Current Password is required.",
  currentIncorrect: "That is not your current password.",
};

const USER_KEYS = ["email", "id", "isActive", "mustChangePassword", "name", "role"];

type TestUser = { id: number; email: string };
const created: number[] = [];
let counter = 0;

async function makeUser(options: {
  password?: string | null;
  isActive?: boolean;
  mustChangePassword?: boolean;
  role?: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";
} = {}): Promise<TestUser> {
  counter += 1;
  const email = `auth-${Date.now()}-${counter}@auth.test`;
  const password = options.password === undefined ? PASSWORD : options.password;
  const user = await prisma.user.create({
    data: {
      name: `Auth Test ${counter}`,
      email,
      role: options.role ?? "REQUESTER",
      isActive: options.isActive ?? true,
      mustChangePassword: options.mustChangePassword ?? false,
      passwordHash: password === null ? null : hashPassword(password),
    },
  });
  created.push(user.id);
  return { id: user.id, email };
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function sessionCookie(res: request.Response): string | undefined {
  const header = res.headers["set-cookie"] as unknown as string[] | undefined;
  return header?.find((c) => c.startsWith("tt_session="));
}

function tokenOf(res: request.Response): string {
  const cookie = sessionCookie(res);
  if (!cookie) throw new Error(`no tt_session cookie (status ${res.status})`);
  return cookie.split(";")[0].slice("tt_session=".length);
}

async function login(email: string, password = PASSWORD) {
  const res = await request(app).post("/api/auth/login").send({ email, password });
  return { res, token: res.status === 200 ? tokenOf(res) : "" };
}

const asCookie = (token: string) => `tt_session=${token}`;

function me(token: string) {
  return request(app).get("/api/auth/me").set("Cookie", asCookie(token));
}

async function insertSession(userId: number, createdAt: Date) {
  const token = randomBytes(32).toString("hex");
  await prisma.session.create({
    data: { tokenHash: sha256(token), userId, createdAt, expiresAt: new Date(createdAt.getTime() + EIGHT_HOURS) },
  });
  return token;
}

afterAll(async () => {
  await prisma.session.deleteMany({ where: { userId: { in: created } } });
  await prisma.user.deleteMany({ where: { id: { in: created } } });
});

// ---------------------------------------------------------------------------
// Unit - the password and session primitives (tests.md 2.1)
// ---------------------------------------------------------------------------
describe("password and session primitives", () => {
  let pw: typeof import("../../src/lib/password.js");
  let policy: typeof import("../../src/lib/password-policy.js");
  let session: typeof import("../../src/lib/session.js");

  beforeAll(async () => {
    pw = await import("../../src/lib/password.js");
    policy = await import("../../src/lib/password-policy.js");
    session = await import("../../src/lib/session.js");
  });

  const ofLength = (n: number) => "Aa1!" + "x".repeat(n - 4);

  it("UNIT-01 hashPassword() stores scrypt$N$r$p$salt$hash with a 16-byte salt (BR-11, C-53)", () => {
    const parts = pw.hashPassword(PASSWORD).split("$");
    expect(parts).toHaveLength(6);
    expect(parts[0]).toBe("scrypt");
    expect(parts.slice(1, 4).every((p) => /^\d+$/.test(p))).toBe(true);
    expect(parts[4]).toMatch(/^[0-9a-f]{32}$/);
    expect(parts[5]).toMatch(/^[0-9a-f]+$/);
  });

  it("UNIT-02 the same password hashed twice gives two strings that both verify (BR-11)", () => {
    const a = pw.hashPassword(PASSWORD);
    const b = pw.hashPassword(PASSWORD);
    expect(a).not.toBe(b);
    expect(pw.verifyPassword(a, PASSWORD)).toBe(true);
    expect(pw.verifyPassword(b, PASSWORD)).toBe(true);
  });

  it("UNIT-03 verifyPassword() is right for right and wrong, and compares with timingSafeEqual (BR-11)", () => {
    const stored = pw.hashPassword(PASSWORD);
    vi.mocked(timingSafeEqual).mockClear();
    expect(pw.verifyPassword(stored, PASSWORD)).toBe(true);
    expect(pw.verifyPassword(stored, "Wrong#Horse1")).toBe(false);
    expect(vi.mocked(timingSafeEqual)).toHaveBeenCalledTimes(2);
  });

  it("UNIT-04 a NULL or malformed stored hash never verifies and throws nothing (BR-17, C-72)", () => {
    expect(pw.verifyPassword(null, PASSWORD)).toBe(false);
    expect(pw.verifyPassword(null, "")).toBe(false);
    expect(pw.verifyPassword("not-a-hash", PASSWORD)).toBe(false);
    expect(pw.verifyPassword("scrypt$1$2$3$zz$zz", PASSWORD)).toBe(false);
    expect(pw.verifyPassword("scrypt$3$8$1$aa$bb", PASSWORD)).toBe(false); // parses, but scrypt refuses N=3
  });

  it("UNIT-05 the policy accepts 8 and 128 characters and refuses 7 and 129 (BR-12)", () => {
    expect(policy.checkPasswordPolicy(ofLength(7))).toBe(MSG.policy);
    expect(policy.checkPasswordPolicy(ofLength(8))).toBeNull();
    expect(policy.checkPasswordPolicy(ofLength(128))).toBeNull();
    expect(policy.checkPasswordPolicy(ofLength(129))).toBe(MSG.policy);
  });

  it("UNIT-06 the policy refuses a password missing any one character class (BR-12)", () => {
    expect(policy.checkPasswordPolicy("abcdef1!")).toBe(MSG.policy); // no upper case
    expect(policy.checkPasswordPolicy("ABCDEF1!")).toBe(MSG.policy); // no lower case
    expect(policy.checkPasswordPolicy("Abcdefg!")).toBe(MSG.policy); // no digit
    expect(policy.checkPasswordPolicy("Abcdefg1")).toBe(MSG.policy); // no special character
    expect(policy.checkPasswordPolicy("Abcdef1!")).toBeNull();
  });

  it("UNIT-08 a session token is 32 bytes as 64 hex characters, stored only as its SHA-256 (BR-21, C-54)", () => {
    const token = session.generateSessionToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    expect(session.hashSessionToken(token)).toBe(sha256(token));
    expect(session.hashSessionToken(token)).not.toBe(token);
  });

  it("UNIT-09 a session expires exactly 8 hours after creation: live at +7h59m, expired at +8h01m (BR-22, C-55)", () => {
    const createdAt = new Date("2026-10-02T01:00:00.000Z");
    const expiresAt = session.sessionExpiry(createdAt);
    expect(expiresAt.getTime() - createdAt.getTime()).toBe(EIGHT_HOURS);
    expect(session.isSessionExpired(expiresAt, new Date(createdAt.getTime() + EIGHT_HOURS - MINUTE))).toBe(false);
    expect(session.isSessionExpired(expiresAt, new Date(createdAt.getTime() + EIGHT_HOURS + MINUTE))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// POST /api/auth/login (api-spec 2.4)
// ---------------------------------------------------------------------------
describe("POST /api/auth/login", () => {
  let active: TestUser;
  let inactive: TestUser;
  let nullHash: TestUser;

  beforeAll(async () => {
    active = await makeUser();
    inactive = await makeUser({ isActive: false });
    nullHash = await makeUser({ password: null });
  });

  it("API-01 valid credentials -> 200 with the user's identity and role (AC-01, FR-02)", async () => {
    const { res } = await login(active.email);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: active.id, email: active.email, role: "REQUESTER", isActive: true, mustChangePassword: false });
    expect(typeof res.body.name).toBe("string");
  });

  it("API-02 the login body has exactly six keys and no password, hash, token or session id (AC-12, BR-10)", async () => {
    const { res, token } = await login(active.email);
    expect(Object.keys(res.body).sort()).toEqual(USER_KEYS);
    const text = JSON.stringify(res.body);
    expect(text).not.toContain(PASSWORD);
    expect(text).not.toContain("scrypt$");
    expect(text).not.toContain(token);
  });

  it("API-03 Set-Cookie names tt_session with HttpOnly, SameSite=Strict, Path=/ and no expiry or Secure (AC-13, BR-21)", async () => {
    const { res, token } = await login(active.email);
    const cookie = sessionCookie(res)!;
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    const attributes = cookie.split(";").slice(1).map((a) => a.trim().toLowerCase());
    expect(attributes).toContain("httponly");
    expect(attributes).toContain("samesite=strict");
    expect(attributes).toContain("path=/");
    expect(attributes.some((a) => a.startsWith("max-age") || a.startsWith("expires") || a === "secure")).toBe(false);
  });

  it("API-04 the Session row stores the token's SHA-256 and the raw token appears in no column (AC-14, BR-21)", async () => {
    const { token } = await login(active.email);
    const row = await prisma.session.findUnique({ where: { tokenHash: sha256(token) } });
    expect(row).not.toBeNull();
    expect(row!.userId).toBe(active.id);
    const rows = await prisma.session.findMany({ where: { userId: active.id } });
    expect(JSON.stringify(rows)).not.toContain(token);
  });

  it("API-05 unknown email -> 401 INVALID_CREDENTIALS, byte-identical to a wrong password, no cookie (AC-05, BR-07)", async () => {
    const unknown = await request(app).post("/api/auth/login").send({ email: "nobody@auth.test", password: PASSWORD });
    const wrong = await request(app).post("/api/auth/login").send({ email: active.email, password: "Wrong#Horse1" });
    expect(unknown.status).toBe(401);
    expect(unknown.body.error.code).toBe("INVALID_CREDENTIALS");
    expect(unknown.text).toBe(wrong.text);
    expect(sessionCookie(unknown)).toBeUndefined();
  });

  it("API-06 wrong password -> 401, and the password appears in no response body or log line (AC-06, BR-88)", async () => {
    const secret = "Wrong#Secret-6f1c";
    const lines: string[] = [];
    const spies = (["log", "info", "warn", "error", "debug"] as const).map((level) =>
      vi.spyOn(console, level).mockImplementation((...args: unknown[]) => {
        lines.push(args.map(String).join(" "));
      }),
    );
    try {
      const res = await request(app).post("/api/auth/login").send({ email: active.email, password: secret });
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
      expect(res.text).not.toContain(secret);
      expect(sessionCookie(res)).toBeUndefined();
    } finally {
      spies.forEach((s) => s.mockRestore());
    }
    expect(lines.join("\n")).not.toContain(secret);
  });

  it("API-07 a NULL password hash -> the same generic 401 for any password (AC-07, BR-17)", async () => {
    const wrong = await request(app).post("/api/auth/login").send({ email: active.email, password: "Wrong#Horse1" });
    for (const password of [PASSWORD, " ", "anything"]) {
      const res = await request(app).post("/api/auth/login").send({ email: nullHash.email, password });
      expect(res.status).toBe(401);
      expect(res.text).toBe(wrong.text);
      expect(sessionCookie(res)).toBeUndefined();
    }
  });

  it("API-08 inactive account with the right password -> 403 ACCOUNT_INACTIVE and no cookie (AC-08, BR-09)", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: inactive.email, password: PASSWORD });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("ACCOUNT_INACTIVE");
    expect(sessionCookie(res)).toBeUndefined();
  });

  it("API-09 inactive account with a wrong password -> the generic 401, not ACCOUNT_INACTIVE (AC-09, BR-09)", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: inactive.email, password: "Wrong#Horse1" });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("API-10 ten failures then the right password -> 200: there is no lockout (AC-10, BR-08)", async () => {
    for (let i = 0; i < 10; i += 1) {
      const res = await request(app).post("/api/auth/login").send({ email: active.email, password: `Wrong#${i}x` });
      expect(res.status).toBe(401);
    }
    const { res } = await login(active.email);
    expect(res.status).toBe(200);
  });

  it("API-11 a mixed-case, padded email logs in to the lower-case account (AC-11, BR-06)", async () => {
    const { res } = await login(`  ${active.email.toUpperCase()} `);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(active.id);
  });

  it("a missing email or password -> 400 VALIDATION_FAILED with the catalogue message at each field (api-spec 2.4)", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: "   ", password: "" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
    expect(res.body.error.fields).toEqual({ email: MSG.email, password: MSG.password });
    expect(sessionCookie(res)).toBeUndefined();
  });

  it("an undecodable path -> the 400 envelope, not Express's page and not 500 (api-spec 1.2)", async () => {
    const res = await request(app).get("/api/tickets/%E0?requesterId=1");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });

  it("a malformed JSON body -> 400, and the text sent is echoed nowhere (BR-88, BR-89)", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send('{"email":"a@auth.test","password":"Leaky#Secret9"');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
    expect(res.text).not.toContain("Leaky#Secret9");
    expect(res.text).not.toMatch(/at .*\.(js|ts):\d+/);
  });
});

// ---------------------------------------------------------------------------
// GET /api/auth/me (api-spec 3.1)
// ---------------------------------------------------------------------------
describe("GET /api/auth/me", () => {
  it("API-12 a user who must change their password still gets 200 with name and role (AC-22, BR-32)", async () => {
    const gated = await makeUser({ mustChangePassword: true, role: "IT_STAFF" });
    const { token } = await login(gated.email);
    const res = await me(token);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: gated.id, role: "IT_STAFF", mustChangePassword: true });
    expect(res.body.name).toMatch(/^Auth Test/);
  });

  it("API-13 the current-user body has the six keys and no hash or token (BR-33, FR-70)", async () => {
    const user = await makeUser();
    const { token } = await login(user.email);
    const res = await me(token);
    expect(Object.keys(res.body).sort()).toEqual(USER_KEYS);
    expect(res.text).not.toContain("scrypt$");
    expect(res.text).not.toContain(token);
  });

  it("no cookie -> 401 AUTH_REQUIRED (BR-34)", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("AUTH_REQUIRED");
  });

  it("every 401 cause - unknown, malformed, expired, logged out, deactivated - gives a body byte-identical to no cookie (api-spec 1.1)", async () => {
    const none = await request(app).get("/api/auth/me");
    expect(none.status).toBe(401);

    const expiredUser = await makeUser();
    const expired = await insertSession(expiredUser.id, new Date(Date.now() - EIGHT_HOURS - MINUTE));

    const loggedOutUser = await makeUser();
    const loggedOut = (await login(loggedOutUser.email)).token;
    await request(app).post("/api/auth/logout").set("Cookie", asCookie(loggedOut));

    const deactivatedUser = await makeUser();
    const deactivated = (await login(deactivatedUser.email)).token;
    await prisma.user.update({ where: { id: deactivatedUser.id }, data: { isActive: false } });

    for (const token of [randomBytes(32).toString("hex"), "not-a-token", expired, loggedOut, deactivated]) {
      const res = await me(token);
      expect(res.status).toBe(401);
      expect(res.text).toBe(none.text);
    }
  });
});

// ---------------------------------------------------------------------------
// The password-change gate (BR-19, C-99). API-14 itself needs the ticket,
// queue and user routes behind the gate (#40, #41, #43); this proves the gate
// on a probe route mounted with the same exported chain those routes will use.
// ---------------------------------------------------------------------------
describe("the password-change gate on a protected probe route", () => {
  let probe: express.Express;

  beforeAll(async () => {
    const { protect } = await import("../../src/middleware/auth.js");
    probe = express();
    probe.get("/probe", ...(protect as RequestHandler[]), (_req, res) => {
      res.status(200).json({ reached: true });
    });
  });

  it("a gated session -> 403 PASSWORD_CHANGE_REQUIRED, never 401 (AC-21, BR-19, C-99)", async () => {
    const gated = await makeUser({ mustChangePassword: true });
    const { token } = await login(gated.email);
    const res = await request(probe).get("/probe").set("Cookie", asCookie(token));
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("PASSWORD_CHANGE_REQUIRED");
  });

  it("an ungated session passes the gate, and no session is 401 before the gate runs (C-63)", async () => {
    const user = await makeUser();
    const { token } = await login(user.email);
    expect((await request(probe).get("/probe").set("Cookie", asCookie(token))).status).toBe(200);
    const anonymous = await request(probe).get("/probe");
    expect(anonymous.status).toBe(401);
    expect(anonymous.body.error.code).toBe("AUTH_REQUIRED");
  });
});

describe("API-14 the gate on the real protected routes", () => {
  it("API-14 a gated user gets 403 PASSWORD_CHANGE_REQUIRED, never 401, from GET /api/tickets (AC-21, AC-02, C-99)", async () => {
    const gated = await makeUser({ mustChangePassword: true });
    const { token } = await login(gated.email);
    const calls: Array<[string, () => request.Test]> = [
      ["GET /api/tickets", () => request(app).get("/api/tickets")],
      ["GET /api/tickets/1", () => request(app).get("/api/tickets/1")],
      ["GET /api/tickets/1/attachments", () => request(app).get("/api/tickets/1/attachments")],
      ["POST /api/tickets", () => request(app).post("/api/tickets").send({})],
      ["POST /api/tickets/1/attachments", () => request(app).post("/api/tickets/1/attachments")],
      ["GET /api/attachments/1/download", () => request(app).get("/api/attachments/1/download")],
      ["DELETE /api/attachments/1", () => request(app).delete("/api/attachments/1").send({ removalReason: "x" })],
    ];
    for (const [route, call] of calls) {
      const res = await call().set("Cookie", asCookie(token));
      expect(res.status, route).toBe(403);
      expect(res.body.error.code, route).toBe("PASSWORD_CHANGE_REQUIRED");
    }
  });
});

// ---------------------------------------------------------------------------
// POST /api/auth/change-password (api-spec 3.2)
// ---------------------------------------------------------------------------
describe("POST /api/auth/change-password", () => {
  const NEW_PASSWORD = "Fresh#Start42";

  function change(token: string, body: Record<string, unknown>) {
    return request(app).post("/api/auth/change-password").set("Cookie", asCookie(token)).send(body);
  }

  it("API-15 a valid change -> 200, mustChangePassword false in the body, the session still works (AC-28, BR-18)", async () => {
    const user = await makeUser({ mustChangePassword: true });
    const { token } = await login(user.email);
    const res = await change(token, { currentPassword: PASSWORD, newPassword: NEW_PASSWORD, confirmPassword: NEW_PASSWORD });
    expect(res.status).toBe(200);
    expect(Object.keys(res.body).sort()).toEqual(USER_KEYS);
    expect(res.body.mustChangePassword).toBe(false);
    expect((await me(token)).body.mustChangePassword).toBe(false);
    expect((await login(user.email, NEW_PASSWORD)).res.status).toBe(200);
    expect((await login(user.email, PASSWORD)).res.status).toBe(401);
  });

  it("API-16 a wrong current password -> 422 CURRENT_PASSWORD_INCORRECT at the field, not 401; nothing changes (AC-27, BR-105, C-106)", async () => {
    const user = await makeUser({ mustChangePassword: true });
    const { token } = await login(user.email);
    const before = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    const res = await change(token, { currentPassword: "Wrong#Horse1", newPassword: NEW_PASSWORD, confirmPassword: NEW_PASSWORD });
    expect(res.status).not.toBe(401);
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("CURRENT_PASSWORD_INCORRECT");
    expect(res.body.error.fields).toEqual({ currentPassword: MSG.currentIncorrect });
    const after = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(after.passwordHash).toBe(before.passwordHash);
    expect(after.mustChangePassword).toBe(true);
    expect((await me(token)).status).toBe(200);
  });

  it("API-17 7 characters, 129 characters and each missing class -> 400 with the BR-12 message at newPassword (AC-23, AC-24)", async () => {
    const user = await makeUser();
    const { token } = await login(user.email);
    for (const candidate of ["Aa1!xyz", "Aa1!" + "x".repeat(125), "abcdef1!", "ABCDEF1!", "Abcdefg!", "Abcdefg1"]) {
      const res = await change(token, { currentPassword: PASSWORD, newPassword: candidate, confirmPassword: candidate });
      expect(res.status, candidate).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_FAILED");
      expect(res.body.error.fields.newPassword).toBe(MSG.policy);
    }
  });

  it("API-18 the current password as the new one -> 400 with the BR-13 message (AC-25)", async () => {
    const user = await makeUser();
    const { token } = await login(user.email);
    const res = await change(token, { currentPassword: PASSWORD, newPassword: PASSWORD, confirmPassword: PASSWORD });
    expect(res.status).toBe(400);
    expect(res.body.error.fields.newPassword).toBe(MSG.sameAsCurrent);
  });

  it("API-19 a mismatched confirmation is refused by the server too, and the current password is required (AC-26, BR-13)", async () => {
    const user = await makeUser();
    const { token } = await login(user.email);
    const mismatch = await change(token, { currentPassword: PASSWORD, newPassword: NEW_PASSWORD, confirmPassword: "Other#Pass99" });
    expect(mismatch.status).toBe(400);
    expect(mismatch.body.error.fields).toEqual({ confirmPassword: MSG.confirm });
    const missing = await change(token, { newPassword: NEW_PASSWORD, confirmPassword: NEW_PASSWORD });
    expect(missing.status).toBe(400);
    expect(missing.body.error.fields).toEqual({ currentPassword: MSG.currentRequired });
  });

  it("API-20 changing the password keeps the calling session and ends the user's other session (AC-29, BR-102, C-97)", async () => {
    const user = await makeUser();
    const first = await login(user.email);
    const second = await login(user.email);
    const res = await change(first.token, { currentPassword: PASSWORD, newPassword: NEW_PASSWORD, confirmPassword: NEW_PASSWORD });
    expect(res.status).toBe(200);
    expect((await me(first.token)).status).toBe(200);
    expect((await me(second.token)).status).toBe(401);
  });

  it("no session -> 401 AUTH_REQUIRED", async () => {
    const res = await request(app).post("/api/auth/change-password").send({});
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("AUTH_REQUIRED");
  });
});

// ---------------------------------------------------------------------------
// POST /api/auth/logout (api-spec 3.3)
// ---------------------------------------------------------------------------
describe("POST /api/auth/logout", () => {
  it("API-21 logging out one session -> 204 and the user's other session still works (AC-16, BR-23)", async () => {
    const user = await makeUser();
    const first = await login(user.email);
    const second = await login(user.email);
    const res = await request(app).post("/api/auth/logout").set("Cookie", asCookie(first.token));
    expect(res.status).toBe(204);
    expect(res.text).toBe("");
    expect((await me(second.token)).status).toBe(200);
  });

  it("API-22 the logged-out token replayed -> 401, its row is gone, and the cookie was cleared (AC-17, FR-07)", async () => {
    const user = await makeUser();
    const { token } = await login(user.email);
    const res = await request(app).post("/api/auth/logout").set("Cookie", asCookie(token));
    expect(sessionCookie(res)).toBe("tt_session=; Max-Age=0; HttpOnly; SameSite=Strict; Path=/");
    expect(await prisma.session.findUnique({ where: { tokenHash: sha256(token) } })).toBeNull();
    expect((await me(token)).status).toBe(401);
  });

  it("no session -> 401 AUTH_REQUIRED", async () => {
    const res = await request(app).post("/api/auth/logout");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("AUTH_REQUIRED");
  });
});

// ---------------------------------------------------------------------------
// Session lifetime and revocation (C-55, C-96)
// ---------------------------------------------------------------------------
describe("session lifetime", () => {
  it("API-23 a session older than 8 hours -> 401 on every protected route; one at 7h59m still works (AC-15, BR-22)", async () => {
    const user = await makeUser();
    const live = await insertSession(user.id, new Date(Date.now() - EIGHT_HOURS + MINUTE));
    expect((await me(live)).status).toBe(200);
    for (const call of [
      (t: string) => me(t),
      (t: string) => request(app).post("/api/auth/change-password").set("Cookie", asCookie(t)).send({}),
      (t: string) => request(app).post("/api/auth/logout").set("Cookie", asCookie(t)),
    ]) {
      const expired = await insertSession(user.id, new Date(Date.now() - EIGHT_HOURS - MINUTE));
      const res = await call(expired);
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("AUTH_REQUIRED");
    }
  });

  it("API-24 the lookup that finds a session expired deletes its row (AC-116, BR-101, C-96)", async () => {
    const user = await makeUser();
    const expired = await insertSession(user.id, new Date(Date.now() - EIGHT_HOURS - MINUTE));
    expect(await prisma.session.findUnique({ where: { tokenHash: sha256(expired) } })).not.toBeNull();
    expect((await me(expired)).status).toBe(401);
    expect(await prisma.session.findUnique({ where: { tokenHash: sha256(expired) } })).toBeNull();
  });

  it("API-25 a user deactivated after logging in -> 401 on their next request (AC-18, BR-24)", async () => {
    // The Administrator route that deactivates arrives in #43; the session
    // check that refuses an inactive user's session is this Issue's.
    const user = await makeUser();
    const { token } = await login(user.email);
    expect((await me(token)).status).toBe(200);
    await prisma.user.update({ where: { id: user.id }, data: { isActive: false } });
    const res = await me(token);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("AUTH_REQUIRED");
  });

  it("API-26 logging in again while signed in issues a second Session row and both tokens work (A-01)", async () => {
    const user = await makeUser();
    const first = await login(user.email);
    const second = await login(user.email);
    expect(first.token).not.toBe(second.token);
    expect(await prisma.session.count({ where: { userId: user.id } })).toBe(2);
    expect((await me(first.token)).status).toBe(200);
    expect((await me(second.token)).status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// CSRF - the Origin check (api-spec 1.6, C-58)
// ---------------------------------------------------------------------------
describe("the Origin check on state-changing requests", () => {
  it("API-27 POST with a valid session and Origin http://evil.example -> 403 ORIGIN_NOT_ALLOWED, nothing done (AC-19, BR-27)", async () => {
    const user = await makeUser();
    const { token } = await login(user.email);
    const res = await request(app).post("/api/auth/logout").set("Cookie", asCookie(token)).set("Origin", "http://evil.example");
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("ORIGIN_NOT_ALLOWED");
    expect((await me(token)).status).toBe(200);
    const signIn = await request(app).post("/api/auth/login").set("Origin", "http://evil.example").send({ email: user.email, password: PASSWORD });
    expect(signIn.status).toBe(403);
    expect(sessionCookie(signIn)).toBeUndefined();
  });

  it("a foreign Origin is refused before the session is looked at: no cookie still gives 403, not 401 (api-spec 1.4)", async () => {
    const res = await request(app).post("/api/auth/logout").set("Origin", "http://evil.example");
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("ORIGIN_NOT_ALLOWED");
  });

  it("API-28 the same POST with no Origin header -> accepted (AC-20, BR-27)", async () => {
    const user = await makeUser();
    const { token } = await login(user.email);
    const res = await request(app).post("/api/auth/logout").set("Cookie", asCookie(token));
    expect(res.status).toBe(204);
  });

  it("a POST from the configured client origin is accepted, and a GET is never Origin-checked (C-58)", async () => {
    const user = await makeUser();
    const { token } = await login(user.email);
    expect((await me(token).set("Origin", "http://evil.example")).status).toBe(200);
    const res = await request(app).post("/api/auth/logout").set("Cookie", asCookie(token)).set("Origin", CLIENT_ORIGIN);
    expect(res.status).toBe(204);
  });
});
