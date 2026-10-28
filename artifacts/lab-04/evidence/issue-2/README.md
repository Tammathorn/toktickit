# Issue 2 (#63) - Data model, migration and seed

Terminal evidence for `feature/lab4-2-data-model`, ANSI stripped. Each file is headed with its
command, date, commit and exit code. The commit is `3bfade9` (the contract branch tip) with the
Issue 2 work uncommitted at capture time; `red-migration.txt` was captured before the
implementation was applied. Database commands ran inside the `toktickit-db` container with
`psql -f` (tests.md section 5); the SQL files were `tmp\lab4-counts.sql` and
`tmp\lab4-backfill.sql`, printed in tests.md section 5. No credential appears in any file.

## Tests first (MIG-01..MIG-08, MIG-14..MIG-21)

| File | What it proves |
|---|---|
| `red-migration.txt` | `server/tests/lab-04/migration.db.test.ts` before the implementation: 33 failed, 8 passed. The 8 are absence checks (no DROP, no `updatedAt`, nattapong.w with zero Tickets, a changed password kept) that hold before the change; MIG-07's "finds the Lab 4 migrations" guard fails, so none passes vacuously |
| `red-migration-audit-fix.txt` | After the end-of-Issue audit, MIG-17 was tightened (the failing-gate Ticket must fail despite a completed action, not merely for having none) and MIG-20 gained "lastActivityAt never before the latest Public Comment or action" (BR-46). This run is the patch's seed as applied, which ignored Public Comments: that new test fails, 1 failed, 41 passed |
| `green-migration.txt` | The final file after the implementation and the seed fix: 42 passed |

## Rehearsal on `toktickit_rehearsal` (C-129; MIG-09..MIG-12, AC-96)

| File | What it proves |
|---|---|
| `rehearsal-restore.txt` | `lab3-final.dump` restored into `toktickit_rehearsal`, which held no tables before |
| `rehearsal-before.txt` | Row counts per table and Tickets per Requester email, before `migrate deploy` (MIG-09) |
| `rehearsal-migrate-deploy.txt` | `migrate deploy` applies exactly the three Lab 4 migrations |
| `rehearsal-after.txt` | The same figures after the deploy, identical to `rehearsal-before.txt` (MIG-09) |
| `rehearsal-backfill.txt` | Every figure 0: no NULL or early `lastActivityAt`, no backfill mismatch, every `version` 0, every `resolvedAt` NULL (MIG-10); zero `ActionTaken` and zero `TicketStatusChange` rows (MIG-11) |
| `rehearsal-drift.txt` | `migrate diff --exit-code`: "No difference detected", exit 0 (MIG-12) |

## Backup and restore test (BR-68; MIG-13, AC-97)

| File | What it proves |
|---|---|
| `dev-pre-migration-dump.txt` | The dev database dumped with `pg_dump -Fc` to `C:\Users\Tamat\Downloads\lab4-pre-migration.dump`, outside the repository, before it was migrated (spec 7.7 step 1) |
| `dev-before.txt` | The dev database's row counts at the time of that dump: the source figures |
| `restore-check.txt` | That dump restored into the fresh database `toktickit_restore_check`; its counts equal `dev-before.txt` (MIG-13) |

## Dev database (spec 7.7 step 7; MIG-12)

| File | What it proves |
|---|---|
| `dev-migrate-deploy.txt` | `migrate deploy` on the dev database |
| `dev-drift.txt` | Zero drift on the dev database, exit 0 (MIG-12, second half) |
| `dev-generate.txt` | `prisma generate` for the new models |
| `dev-seed-1.txt`, `dev-seed-2.txt` | The seed run twice, both exit 0 |
| `dev-after-seed.txt` | After both runs: 9 actions (planned, completed, cancelled, follow-up required), 999 Tickets as before, 0 history rows - every dev Ticket is legacy (C-188) |

The first dev seed ran before a seed fix (see the PR): its planned VPN action was created by
araya.m, so the VPN Ticket had only two staff users. That one row was deleted and the seed
re-run twice. After the audit's seed fix (`lastActivityAt` now counts Public Comments and
Attachments) the seed ran twice more; `dev-seed-1.txt`, `dev-seed-2.txt` and
`dev-after-seed.txt` are those final runs.

## Suites (Labs 1-3 regression)

| File | What it proves |
|---|---|
| `green-server-suite.txt` | `cd server; npm test` on the final code: 339 passed, 16 files (297 and 15 before, plus the new file's 42) |
| `green-client-suite.txt` | `cd client; npm test`: 128 passed, 11 files (unchanged). Client and e2e ran before the audit's seed fix, which changes only seeded `lastActivityAt` values that no Lab 1-3 screen reads |
| `e2e-suite-run1-econnreset.txt` | First e2e run: 277 passed, 34 skipped, 1 failed - a transport-level `ECONNRESET` on an API login in L3 E2E-26 [tablet], before any assertion; the API log shows no restart or error |
| `green-e2e-suite.txt` | The full e2e re-run: 278 passed, 34 skipped = 312 runs, as before Lab 4 |
