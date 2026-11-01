# Lab 4 Evidence Index

TokTickIT - CPE 334 Individual Sprint 4.

Every Part requirement mapped to the file that evidences it, the Issue that produces it, and
its status. The rules that govern it are in `CLAUDE.md`, section "Evidence".

| Status | Meaning |
|---|---|
| `captured` | The file exists in the repository and shows the state the row names |
| `pending` | Not yet captured. The producing Issue's PR is not ready while its rows are pending |
| `manual` | Produced or judged by a person, not by a script - a checklist, a review, an approval |

Paths are relative to `artifacts/lab-04/`. In `evidence/issue-<N>/`, N is the Lab 4 Issue
index used in the branch names (`feature/lab4-N-slug`), not the GitHub number: Issue #63 writes
to `evidence/issue-2/`. Each Issue adds its own rows; rows for Issues not yet started are added
by those Issues.

---

## Data model, migration and seed - Issue 2 (#63)

| Requirement | Test ID / AC | Evidence | Issue | Status |
|---|---|---|---|---|
| Lab 4 schema shape: enum, `ActionTaken`, `TicketStatusChange`, new Ticket columns, replay keys, indexes, additive SQL | MIG-01..MIG-08 | `evidence/issue-2/red-migration.txt`, `red-migration-audit-fix.txt`, `green-migration.txt` | 2 | captured |
| Rehearsal: counts and Tickets per Requester unchanged by `migrate deploy` | MIG-09, AC-96 | `evidence/issue-2/rehearsal-before.txt`, `rehearsal-after.txt`, `rehearsal-migrate-deploy.txt` | 2 | captured |
| Rehearsal backfill: `lastActivityAt`, `version`, `resolvedAt` | MIG-10, AC-96 | `evidence/issue-2/rehearsal-backfill.txt` | 2 | captured |
| Legacy rows: no invented actions or history | MIG-11 | `evidence/issue-2/rehearsal-backfill.txt` | 2 | captured |
| Zero drift on rehearsal and dev | MIG-12, AC-96 | `evidence/issue-2/rehearsal-drift.txt`, `dev-drift.txt` | 2 | captured |
| Pre-migration backup and restore test | MIG-13, AC-97, BR-68 | `evidence/issue-2/dev-pre-migration-dump.txt`, `dev-before.txt`, `restore-check.txt` | 2 | captured |
| Seed idempotent; changed password kept | MIG-14, AC-98 | `evidence/issue-2/green-migration.txt`, `dev-seed-1.txt`, `dev-seed-2.txt`, `dev-after-seed.txt` | 2 | captured |
| Seed composition: actions, states, gate, resolved Tickets, zero-metric accounts, run-relative times, rule-abiding actions | MIG-15..MIG-21, AC-99 | `evidence/issue-2/green-migration.txt` | 2 | captured |
| Labs 1-3 suites still pass after the migration | AC-100 (interim; final is MIG-22, Issue 10) | `evidence/issue-2/green-server-suite.txt`, `green-client-suite.txt`, `green-e2e-suite.txt` | 2 | captured |
