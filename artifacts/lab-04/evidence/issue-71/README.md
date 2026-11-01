# Issue 10 (#71) - Release documentation: the final runs and the GitHub read-back

Evidence for `feature/lab4-10-release-docs`. The folder is named by the GitHub number (`issue-71`).
Text files are headed with their command, date and commit, ANSI stripped, session tokens and
database URLs redacted (checked: no `tt_session=` value, no 64-hex string, no `scrypt$` hash and no
database password in this folder).

The code under test is `feature/lab4-9-e2e-visual` at `6ccf79d`: Issue #71 changes only documents and
evidence, so one run of each suite stands for both. These runs fill the `Final` column of
`docs/lab-04/tests.md`. They are **not** the run on `lab4-staging` or on `main` after the release merge
(C-157, Part 3), which has not happened yet.

## Files

| File | What it proves |
|---|---|
| `green-server-suite.txt` | `cd server; npx vitest run --reporter=verbose`: **510 passed, 21 files** (297 Lab 1-3 + 213 Lab 4). The verbose reporter lists every test by name, which is how each `Final` cell was matched to its test ID |
| `green-client-suite.txt` | `cd client; npx vitest run --reporter=verbose`: **193 passed, 15 files** (128 + 65) |
| `green-e2e-suite.txt` | `npx playwright test`: **413 passed, 37 skipped** = 450 runs. The 37 skips are the 34 that existed before Lab 4 plus the three `legacy-history` runs, which need `toktickit_rehearsal`. The `✘` lines (E2E-28, E2E-29, E2E-30, E2E-30c and E2E-32, 15 runs) are `test.fail()` tests that fail on purpose, as the console-error fixture's own proof; Playwright counts them as passed. Servers and `DATABASE_URL` pointed at the new `toktickit_final` |
| `final-db-migrate-deploy.txt` | `prisma migrate deploy` on the new `toktickit_final`: the nine migrations applied; then `prisma:seed` and `seed-demo` ran (their output is not saved; it lists seeded accounts) |
| `final-db-drift.txt` | `prisma migrate diff --exit-code` on `toktickit_final` after the deploy: "No difference detected", exit 0 |
| `perf-smoke.txt` | `cd server; npm run test:perf` on `toktickit_perf`: PERF-01 p95 5.9 ms and PERF-02 p95 10.2 ms against a 500 ms limit; `EXPLAIN` printed for information only (C-148) |
| `github-my-prs-readback.txt` | `gh` read-back of my PRs #72-#80: base, branch, opening time, and 0 reviews, 0 inline comments, 0 conversation comments, 0 requested reviewers on each. Read only |
| `github-partner-prs-readback.txt` | `gh` read-back of PAKATO123/toktickit #63, #64, #65 and #70: my four reviews verbatim with their times, and his three replies. Read only |
| `git-log-contract-to-release.txt` | `git log --reverse` from the Lab 4 plan to this branch, with ISO dates: the contract commits (13-15 Oct and 28 Oct) come before the first code commit `2b7e2b0` (28 Oct 15:35 +07:00) |

## What was run and how

- Server and client suites ran as they stand. `toktickit_test` is rebuilt by the server's global setup (C-198).
- The Playwright run used a database created for it, `toktickit_final`, migrated from nothing and seeded, with the API
  (`npx tsx src/index.ts`) and the client dev server started for the run and stopped by process id afterwards. No
  node process was left running. The development database `toktickit` and the other databases were not touched, and
  no row was deleted by hand.
- The e2e run rewrites tracked captures. `git checkout -- artifacts/lab-02 artifacts/lab-03 artifacts/lab-04/screenshots
  artifacts/lab-04/evidence/issue-70` restored them, so the committed screenshots and measurement JSON are those of Issue #70.
- There was no `ECONNRESET` in this run (see `tests.md` 6.3 for the earlier ones).
