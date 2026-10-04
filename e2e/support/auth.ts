import fs from "node:fs";
import path from "node:path";
import { expect, request as playwrightRequest, type APIRequestContext, type Page } from "@playwright/test";
import { API_URL } from "../../playwright.config";
import { FIRST_LOGIN_ACCOUNT, SEED_PASSWORDS } from "../../server/src/seed/graded-seed";
import { hashPassword } from "../../server/src/lib/password";
import { getPrisma } from "../../server/src/prisma";

// Sign-in helpers for the Playwright specs (Lab 3, #39, #40). The passwords are
// the seed's own constants, imported rather than copied, so a spec can never
// drift from what the seed wrote (README, "Seeded accounts - local development
// only"). E2E reuses these fixed accounts (C-83).

export type Account = { email: string; password: string };

const requester = (email: string): Account => ({ email, password: SEED_PASSWORDS.requester });

// The demo seed's three Requesters, read and never written by the specs:
// A holds 14 Tickets, B 3, C none (Part 7's fixture, tests.md section 6).
export const REQUESTER_A = requester("anucha.p@example.ac.th");
export const REQUESTER_B = requester("kanya.s@example.ac.th");
export const REQUESTER_C = requester("nattapong.w@example.ac.th");

// The dedicated E2E Requester: every Ticket and Attachment a spec creates is
// created as this account, which the demo seed never touches, so A, B and C's
// counts never drift. It is the fourth persona - Lab 2 reached it as "the last
// active Requester", which since the Lab 3 seed would be the first-login
// account. That account is never used for data (#40).
export const E2E_REQUESTER = requester("siriporn.c@example.ac.th");

export const REQUESTER = REQUESTER_A;
export const INACTIVE_REQUESTER = requester("prasit.b@example.ac.th");
export const IT_STAFF: Account = { email: "araya.m@example.ac.th", password: SEED_PASSWORDS.itStaff };
export const ADMINISTRATOR: Account = { email: "panida.s@example.ac.th", password: SEED_PASSWORDS.administrator };
export const FIRST_LOGIN: Account = { email: FIRST_LOGIN_ACCOUNT.email, password: FIRST_LOGIN_ACCOUNT.password };

// One storageState per role, written by e2e/auth.setup.ts before the viewport
// projects run (tests.md section 1.2). e2e/.auth/ is gitignored.
export const AUTH_DIR = path.resolve(__dirname, "../.auth");
export const STATE = {
  requester: path.join(AUTH_DIR, "requester.json"),
  itStaff: path.join(AUTH_DIR, "it-staff.json"),
  administrator: path.join(AUTH_DIR, "administrator.json"),
};

// Signs the page's browser context in through the API - the same request the
// Login screen sends - so the tt_session cookie lands in the context's jar and
// every later navigation carries it. Through baseURL, so through the Vite proxy.
export async function signIn(page: Page, account: Account = REQUESTER): Promise<void> {
  const res = await page.request.post("/api/auth/login", { data: account });
  expect(res.status(), `sign in as ${account.email}`).toBe(200);
}

// A request context of its own, signed in as `account`, straight against the
// API: what a direct API call by that user returns (the "direct request"
// evidence the Lab 2 and Lab 3 specs assert). Dispose it when done.
export async function apiAs(account: Account): Promise<APIRequestContext> {
  const context = await playwrightRequest.newContext({ baseURL: API_URL });
  const res = await context.post("/api/auth/login", { data: account });
  expect(res.status(), `API sign-in as ${account.email}`).toBe(200);
  return context;
}

// ---------------------------------------------------------------------------
// TEMPORARY FIXTURE - replaced in #43 by the Administrator set-initial-password
// action (handoff Issue 8; tests.md section 2.12, E2E-03).
//
// The forced first-password change consumes the seeded first-login account:
// once changed, it no longer needs a change. Until the Administrator action
// exists, this puts that ONE account back into the state the seed creates it
// in - the seed's own password, mustChangePassword true. It finds the account
// by its email, fails loudly if the account does not exist, and updates no
// other row (not even that account's sessions).
// ---------------------------------------------------------------------------
export async function resetFirstLoginAccount(): Promise<void> {
  const prisma = getPrisma();
  const result = await prisma.user.updateMany({
    where: { email: FIRST_LOGIN_ACCOUNT.email },
    data: { passwordHash: hashPassword(FIRST_LOGIN_ACCOUNT.password), mustChangePassword: true },
  });
  if (result.count !== 1) {
    throw new Error(`The seeded first-login account ${FIRST_LOGIN_ACCOUNT.email} does not exist - run the graded seed.`);
  }
}

// The three viewport projects run in parallel, and there is one first-login
// account. A directory is created atomically or not at all, so it serves as a
// lock across the worker processes; e2e/.auth/ is gitignored.
const LOCK = path.resolve(__dirname, "../.auth/first-login.lock");

export async function withFirstLoginAccount<T>(run: () => Promise<T>): Promise<T> {
  fs.mkdirSync(path.dirname(LOCK), { recursive: true });
  const deadline = Date.now() + 120_000;
  for (;;) {
    try {
      fs.mkdirSync(LOCK);
      break;
    } catch {
      // A lock left by a crashed run is stale after two minutes.
      const age = Date.now() - (fs.statSync(LOCK, { throwIfNoEntry: false })?.mtimeMs ?? Date.now());
      if (age > 120_000) fs.rmSync(LOCK, { recursive: true, force: true });
      if (Date.now() > deadline) throw new Error("Timed out waiting for the first-login account");
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  try {
    await resetFirstLoginAccount();
    return await run();
  } finally {
    // Leave the account as the README documents it, for the next run and for
    // a person signing in by hand.
    await resetFirstLoginAccount();
    fs.rmSync(LOCK, { recursive: true, force: true });
  }
}

// The L2 focus-ring lesson: a capture taken while a transition is still
// running records a state nobody sees. Wait for every running transition and
// finite animation to finish, then two frames for the paint. An infinite one -
// the busy button's spinner - never finishes, and is meant to be caught moving.
export async function settle(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const finite = document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity);
    await Promise.all(finite.map((animation) => animation.finished.catch(() => undefined)));
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}
