import { test as base, expect, type Response } from "@playwright/test";

// The Lab 4 console-error fixture (C-149, C-182; tests.md section 2.11, BR-66).
//
// Every Lab 4 spec imports `test` and `expect` from here instead of from
// "@playwright/test". It watches every page of the test's browser context and
// fails the test, at teardown, on:
//   - a `console.error` message,
//   - an uncaught page exception (`pageerror`), and
//   - a same-origin response with status >= 500.
//
// Allowlist, and nothing else (C-149): the browser logs a "Failed to load
// resource ... status of NNN" line for every 4xx/5xx the page fetches, even one
// the screen handles. `expectStatus(…)` declares that this test expects a 401,
// 403, 404, 409 or 422, and allows only those lines (optionally only for one URL).
//
// Failures the test causes on purpose (C-182): `declareFailure(…)` allows a
// mocked 5xx (route.fulfill) or an aborted request (route.abort) for one URL
// pattern, together with the browser's log line and the 5xx response for it.
// The allowance belongs to that test and that URL; every other error still fails.
//
// Only a declared expectation allows anything: there is no global allowlist.

export type UrlMatch = string | RegExp;

const EXPECTABLE = [401, 403, 404, 409, 422] as const;
type ExpectableStatus = (typeof EXPECTABLE)[number];

type StatusExpectation = { kind: "status"; status: number; url?: UrlMatch };
type FailureDeclaration = { kind: "failure"; mode: "status" | "abort"; url: UrlMatch; status?: number };

export type ConsoleGuard = {
  /** This test expects the app to receive `status` (401/403/404/409/422), optionally only from `url`. */
  expectStatus: (status: ExpectableStatus, url?: UrlMatch) => void;
  /** This test causes a failure on purpose for `url`: a mocked 5xx (`status`) or an aborted request. */
  declareFailure: (declaration: { url: UrlMatch; status?: number; abort?: boolean }) => void;
};

function urlMatches(match: UrlMatch | undefined, url: string): boolean {
  if (match === undefined) return true;
  return typeof match === "string" ? url.includes(match) : match.test(url);
}

const LOAD_STATUS = /^Failed to load resource: the server responded with a status of (\d{3})\b/;
const LOAD_NETWORK = /^Failed to load resource: net::ERR_[A-Z_]+/;

type Problem = { kind: "console.error" | "pageerror" | "5xx"; text: string };

export const test = base.extend<{ consoleGuard: ConsoleGuard }>({
  consoleGuard: [
    async ({ context, baseURL }, use) => {
      const expectations: Array<StatusExpectation | FailureDeclaration> = [];
      const consoleErrors: Array<{ text: string; url: string }> = [];
      const pageErrors: string[] = [];
      const serverErrors: Array<{ status: number; url: string }> = [];
      // Same-origin means the app's own origin (the Vite server that proxies /api).
      const appOrigin = new URL(baseURL ?? "http://localhost:5173").origin;

      context.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push({ text: message.text(), url: message.location().url });
      });
      context.on("weberror", (webError) => {
        pageErrors.push(String(webError.error()));
      });
      context.on("response", (response: Response) => {
        if (response.status() < 500) return;
        const url = response.url();
        // Same-origin only (C-149): the app and the proxied API share an origin.
        if (new URL(url).origin === appOrigin) serverErrors.push({ status: response.status(), url });
      });

      const guard: ConsoleGuard = {
        expectStatus: (status, url) => {
          if (!EXPECTABLE.includes(status)) throw new Error(`expectStatus accepts only 401, 403, 404, 409 or 422, not ${status} (C-149)`);
          expectations.push({ kind: "status", status, url });
        },
        declareFailure: ({ url, status, abort }) => {
          if (abort) expectations.push({ kind: "failure", mode: "abort", url });
          else if (status !== undefined && status >= 500) expectations.push({ kind: "failure", mode: "status", url, status });
          else throw new Error("declareFailure needs abort: true or a 5xx status (C-182)");
        },
      };

      await use(guard);

      const problems: Problem[] = [];
      for (const error of consoleErrors) {
        const loadStatus = LOAD_STATUS.exec(error.text);
        if (loadStatus) {
          const status = Number(loadStatus[1]);
          const allowed = expectations.some((e) =>
            e.kind === "status"
              ? e.status === status && urlMatches(e.url, error.url)
              : e.mode === "status" && e.status === status && urlMatches(e.url, error.url),
          );
          if (!allowed) problems.push({ kind: "console.error", text: `${error.text} (${error.url})` });
        } else if (LOAD_NETWORK.test(error.text)) {
          const allowed = expectations.some((e) => e.kind === "failure" && e.mode === "abort" && urlMatches(e.url, error.url));
          if (!allowed) problems.push({ kind: "console.error", text: `${error.text} (${error.url})` });
        } else {
          problems.push({ kind: "console.error", text: error.text });
        }
      }
      for (const text of pageErrors) problems.push({ kind: "pageerror", text });
      for (const error of serverErrors) {
        const allowed = expectations.some((e) => e.kind === "failure" && e.mode === "status" && e.status === error.status && urlMatches(e.url, error.url));
        if (!allowed) problems.push({ kind: "5xx", text: `${error.status} from ${error.url}` });
      }

      if (problems.length > 0) {
        throw new Error(
          `Console-error fixture: ${problems.length} problem(s) (C-149):\n` + problems.map((p) => `  [${p.kind}] ${p.text}`).join("\n"),
        );
      }
    },
    { auto: true },
  ],
});

export { expect };
