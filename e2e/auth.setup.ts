import fs from "node:fs";
import { test as setup, expect } from "@playwright/test";
import { ADMINISTRATOR, AUTH_DIR, E2E_REQUESTER, IT_STAFF, STATE, type Account } from "./support/auth";

// The Playwright setup project (tests.md section 1.2, Lab 3 #40). It signs in
// once per role through the API - the request the Login screen sends - and
// writes that browser context's cookies to one storageState file per role in
// e2e/.auth/, which is gitignored. The viewport projects depend on it, so a
// spec starts from a known identity with `test.use({ storageState })`.

const ROLES: Array<[string, Account, string]> = [
  ["Requester", E2E_REQUESTER, STATE.requester],
  ["IT Staff", IT_STAFF, STATE.itStaff],
  ["Administrator", ADMINISTRATOR, STATE.administrator],
];

for (const [role, account, file] of ROLES) {
  setup(`sign in as the ${role} and keep the session`, async ({ page }) => {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
    const res = await page.request.post("/api/auth/login", { data: account });
    expect(res.status(), `${role} sign-in`).toBe(200);
    await page.context().storageState({ path: file });
  });
}
