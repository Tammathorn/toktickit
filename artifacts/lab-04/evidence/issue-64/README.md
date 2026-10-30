# Issue 3 (#64) - Actions Taken API

Terminal evidence for `feature/lab4-3-actions-api`, ANSI stripped. Each file is headed with
its command, date, commit and exit code. The commit is `6378a7a` (the Issue 2 branch tip) with
the Issue 3 work uncommitted at capture time. `red-actions-authorization.txt` was captured
before the implementation was applied; every other file after it, with the end-of-Issue
audit's fixes, except `green-client-suite.txt` (see below).

This folder is named by the GitHub Issue number (`issue-64`), as the task for this Issue
directed; `evidence.md` notes the difference from Issue 2's `issue-2/`.

The two `e2e-suite-run*-econnreset.txt` files had one `tt_session` cookie value each in a
Playwright call log; it is replaced with `[REDACTED]` (CLAUDE.md: a session token never enters
a tracked file). Nothing else in any file was changed.

## Tests first

| File | What it proves |
|---|---|
| `red-actions-authorization.txt` | `server/tests/lab-04/actions-taken.api.test.ts` and `authorization.api.test.ts` before the implementation: 62 failed, 1 passed. Every failure is a missing route (Express's 404 page) or the missing `workflow.ts` module. The one pass is API-43 (another Requester's Ticket -> 404, byte-identical to a missing one), which the Lab 3 ownership rule already guarantees |
| `green-actions-authorization.txt` | The same two files after the implementation: 63 passed (UNIT-01..04, API-01..48, SEC-01..04, SEC-14 in the first; SEC-10 x 4 routes, SEC-11, SEC-12 in the second). Includes the audit's tightenings: an impossible date (UNIT-02), `id`/`ticketId` refused (UNIT-03), an assignee id beyond int4 -> 422 not 500 (API-08), a stale complete with a future stored `actionAt` -> 409 not 400 (API-30), API-46 holding the Ticket's row lock so the four losers can only be answered through the P2002 path, and SEC-12 failing if the session token is not found |

## Suites (Labs 1-3 regression)

| File | What it proves |
|---|---|
| `green-server-suite.txt` | `cd server; npm test`: 402 passed, 18 files (339 and 16 before, plus the two new files' 63). Three Lab 2/3 key-set tests were adapted as `tests.md` 4.1 names them: L3 API-49, L3 SEC-26, L2 API-28 |
| `green-client-suite.txt` | `cd client; npm test`: 128 passed, 11 files (unchanged). Captured after the implementation and before the audit fixes, which change server files only; the client tests mock `fetch` and run no server code |
| `e2e-suite-run1-econnreset.txt` | First e2e run on the final code: 277 passed, 34 skipped, 1 failed - a transport-level `ECONNRESET` on an API login in L3 E2E-12 [desktop], before any assertion. A stray `tsx watch` API process from an earlier run was serving (see run 3) |
| `e2e-suite-run2-econnreset.txt` | Second run, same server setup: 277 passed, 34 skipped, 1 failed - the same `ECONNRESET` on an API login, this time in L3 E2E-46 [mobile]. Issue 2's evidence records the same transport failure |
| `green-e2e-suite.txt` | Run 3, after every API and client process was stopped and exactly one of each started: 278 passed, 34 skipped = 312 runs, as before. The API log shows no error |
