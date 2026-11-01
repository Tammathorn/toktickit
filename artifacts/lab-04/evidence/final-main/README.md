# Final run on main (Part 3)

Evidence for the post-release run. Code under test: `main` at `5b118f4c69996362d7e96e3ec623b327582fb386`
(the merge of release PR #82, `lab4-staging` into `main`, 1 November 2026). Text files are headed with their
command, date and commit, ANSI stripped, session tokens and database URLs redacted (checked: no `tt_session=`
value, no 64-hex string, no `scrypt$` hash, no database URL in this folder).

| File | What it proves |
|---|---|
| `green-server-suite.txt` | `cd server; npx vitest run --reporter=verbose`: **518 passed, 21 files**. The 8 more than the 510 of `issue-71/` are API-125..API-132, the review fix of PR #74 (C-199, `tests.md` 2.12) |
| `green-client-suite.txt` | `cd client; npx vitest run --reporter=verbose`: **193 passed, 15 files** |
| `green-e2e-suite.txt` | `npx playwright test`: **413 passed, 37 skipped** = 450 runs, three viewports. The skips are the same 37 as in `issue-71/`. The `test.fail()` tests (E2E-28..E2E-32) fail on purpose and Playwright counts them as passed. API and client dev server and `DATABASE_URL` on the new `toktickit_mainfinal2` |
| `final-db-migrate-deploy.txt` | `prisma migrate deploy` on the new `toktickit_mainfinal2`: the nine migrations applied (`prisma:seed` and `seed-demo` ran afterwards; their output is not saved) |
| `final-db-drift.txt` | `prisma migrate diff --exit-code` on `toktickit_mainfinal2`: "No difference detected", exit 0 |
| `perf-smoke.txt` | `cd server; npm run test:perf` on `toktickit_perf`: PERF-01 p95 7.8 ms and PERF-02 p95 13.8 ms against a 500 ms limit |

## Run notes

- A first Playwright attempt on a first fresh database (`toktickit_mainfinal`) had 4 failures
  (`staff-ticket-flow.spec.ts:250` and `visual-evidence.spec.ts:557` at three viewports, the inactive-owner marker, AC-75).
  The cause was the run, not the code: `DATABASE_URL` was not exported to the Playwright process, so those two specs'
  direct Prisma update (`getPrisma()`) looked in the default development database while the servers used the new one
  ("Record to update not found"). The servers were stopped, a second new database (`toktickit_mainfinal2`) was created,
  and the full suite was rerun with `DATABASE_URL` exported to every process: 413 passed. The first attempt's log is not
  kept. No test was changed, skipped or deleted. The update found no row, so the development database was not written.
- Both servers were started for the run and stopped by process id afterwards; nothing is left running. The existing
  databases were not dropped or reset and no row was deleted by hand.
- The e2e run rewrites tracked captures; `git checkout -- artifacts` restored them before staging, so the committed
  screenshots and measurements stay those of Issue #70.
