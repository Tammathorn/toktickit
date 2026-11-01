# Issue 7 (#68) - Requester dashboard and the route-matrix test

Terminal evidence for `feature/lab4-7-requester-dashboard`, ANSI stripped. Each text file is
headed with its command, date, commit and exit code. The folder is named by the GitHub number
(`issue-68`), like `issue-64/` to `issue-67/`. No file here contains a session token or a
password hash (checked: no `tt_session=` value, no 64-hex string, no `scrypt$` hash).

## No red run, honestly

The Requester dashboard code (`GET /api/dashboard/requester`, `statusGroup=open`, the
`lastActivityAt` sort on My Tickets) and its client tests arrived with #67's patch (see
`../issue-67/README.md`). So the #68 API tests were written against code that already existed,
and **there is no red run caused by missing code**; none was staged. The one failure seen
(below) was a stale test database, not the product.

| File | What it proves |
|---|---|
| `first-run-api57-stale-test-db.txt` | First run of the two #68 files: 21 passed, 1 failed. API-57 (nattapong.w has zero Tickets) failed with `openTickets` 2: `toktickit_test` still held Tickets 3 and 7 from the seed before commit `1c688b5` ("keep one active Requester without Tickets"). The seed keys Tickets by (Requester, summary), so after that fix it created new rows for kanya.s and siriporn.c and never removed the old two. The dev database `toktickit` was clean (nattapong.w: 0) |
| `test-db-rebuild-drop.txt` | The fix, decided by the planner (task 005 answer B): `DROP DATABASE "toktickit_test"` on the maintenance database only, then `server/tests/global-setup.ts` recreated it on the next run (create, `prisma migrate deploy`, current seed). Not `migrate reset`; the dev database was not touched. The test was not changed |

## Suites

| File | What it proves |
|---|---|
| `green-requester-dashboard-server-verbose.txt` | `requester-dashboard.api.test.ts` and `authorization.api.test.ts` with `--reporter=verbose`: 22 passed. Every test name prints: UNIT-08; API-49..API-59 (one count = drill-down test per Requester card against `GET /api/tickets` with the card's own query, API-50..API-53); SEC-06 (IT Staff and Administrator -> 403 `FORBIDDEN_ROLE`, the Part 5 role-restriction evidence); SEC-08 (Requester A never sees Requester B's numbers, `?requesterId=` ignored); SEC-13; and **SEC-09**, the route-matrix test: the 36 routes registered on the Express app equal the 36 rows of the `specification.md` 5.2 matrix, none missing either way (C-155, C-184) |
| `green-server-suite.txt` | `cd server; npm test` after the rebuild: **510 passed, 21 files** (494 before + 15 in the new file + SEC-09; nothing deleted or skipped) |
| `green-client-suite.txt` | `cd client; npx vitest run`: **192 passed, 15 files**, unchanged (RequesterDashboard.test.tsx came with #67) |

The e2e suite was not rerun: #68 changes no e2e file, screen or navigation (bridge protocol,
deadline mode). Its last full run is `../issue-67/green-e2e-suite.txt` (278 passed + 34 skipped).
