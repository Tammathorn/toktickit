import { createHash, randomBytes } from "node:crypto";
import type { PrismaClient, User } from "@prisma/client";

// C-54, C-55, C-96 - sessions are rows in the Session table. The 32-byte
// random token travels only in the tt_session cookie; the table holds its
// SHA-256, so a leaked row cannot be replayed as a session (BR-21). A session
// lasts 8 hours from creation, absolutely: nothing renews it, and nothing but
// login writes the cookie (api-spec.md 1.5).

export const SESSION_COOKIE = "tt_session";
export const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

// api-spec.md 1.5. No Max-Age or Expires: the server-side expiresAt is the
// authority. No Secure: the lab runs on http://localhost, where Secure would
// stop the cookie being sent at all.
const ATTRIBUTES = "HttpOnly; SameSite=Strict; Path=/";
export const CLEARED_SESSION_COOKIE = `${SESSION_COOKIE}=; Max-Age=0; ${ATTRIBUTES}`;

export function sessionCookie(token: string): string {
  return `${SESSION_COOKIE}=${token}; ${ATTRIBUTES}`;
}

const TOKEN_FORMAT = /^[0-9a-f]{64}$/;

export function generateSessionToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function sessionExpiry(createdAt: Date): Date {
  return new Date(createdAt.getTime() + SESSION_TTL_MS);
}

export function isSessionExpired(expiresAt: Date, now: Date): boolean {
  return now.getTime() >= expiresAt.getTime();
}

// Creates the row and returns the raw token, which the caller puts in the
// cookie and nowhere else.
export async function createSession(prisma: PrismaClient, userId: number, now = new Date()): Promise<string> {
  const token = generateSessionToken();
  await prisma.session.create({
    data: { tokenHash: hashSessionToken(token), userId, createdAt: now, expiresAt: sessionExpiry(now) },
  });
  return token;
}

export type SessionLookup = { sessionId: number; user: User };

// Step 1 of the C-63 check order. Null for a token that is malformed, unknown
// or expired, or whose user is inactive (BR-22, BR-24) - the caller answers
// all of them with the same 401. The lookup that finds a row expired deletes
// it (BR-101, C-96); there is no background sweep.
export async function findSession(prisma: PrismaClient, token: string, now = new Date()): Promise<SessionLookup | null> {
  if (!TOKEN_FORMAT.test(token)) return null;
  const row = await prisma.session.findUnique({ where: { tokenHash: hashSessionToken(token) }, include: { user: true } });
  if (!row) return null;
  if (isSessionExpired(row.expiresAt, now)) {
    await prisma.session.deleteMany({ where: { id: row.id } });
    return null;
  }
  if (!row.user.isActive) return null;
  return { sessionId: row.id, user: row.user };
}

export async function deleteSession(prisma: PrismaClient, sessionId: number): Promise<void> {
  await prisma.session.deleteMany({ where: { id: sessionId } });
}
