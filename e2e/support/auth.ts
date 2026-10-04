import fs from "node:fs";
import path from "node:path";
import { expect, type Page } from "@playwright/test";
import { FIRST_LOGIN_ACCOUNT, SEED_PASSWORDS } from "../../server/src/seed/graded-seed";
import { hashPassword } from "../../server/src/lib/password";
import { getPrisma } from "../../server/src/prisma";

// Sign-in helpers for the Playwright specs (Lab 3, #39). The passwords are the
// seed's own constants, imported rather than copied, so a spec can never drift
// from what the seed wrote (README, "Seeded accounts - local development only").

export type Account = { email: string; password: string };

export const REQUESTER: Account = { email: "anucha.p@example.ac.th", password: SEED_PASSWORDS.requester };
export const INACTIVE_REQUESTER: Account = { email: "prasit.b@example.ac.th", password: SEED_PASSWORDS.requester };
export const FIRST_LOGIN: Account = { email: FIRST_LOGIN_ACCOUNT.email, password: FIRST_LOGIN_ACCOUNT.password };

// Signs the page's browser context in through the API - the same request the
// Login screen sends - so the tt_session cookie lands in the context's jar and
// every later navigation carries it. Through baseURL, so through the Vite proxy.
export async function signIn(page: Page, account: Account = REQUESTER): Promise<void> {
  const res = await page.request.post("/api/auth/login", { data: account });
  expect(res.status(), `sign in as ${account.email}`).toBe(200);
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
