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

## Actions Taken API - Issue 3 (#64)

This Issue's folder is `evidence/issue-64/`, named by the GitHub number as its task directed,
not `issue-3/` by the convention above.

| Requirement | Test ID / AC | Evidence | Issue | Status |
|---|---|---|---|---|
| Tests written first and shown failing | UNIT-01..04, API-01..48, SEC-01..04, SEC-10..12, SEC-14 | `evidence/issue-64/red-actions-authorization.txt` | 3 | captured |
| Action field rules: text, follow-up, attachment notes, `actionAt`, accepted fields, `allowedOperations` | UNIT-01..UNIT-04; AC-06..AC-14, AC-17, AC-139, AC-140, AC-142 | `evidence/issue-64/green-actions-authorization.txt` | 3 | captured |
| Create, edit, complete, cancel; assignee eligibility; `ACTION_NOT_PLANNED`, `STALE_UPDATE`, `TICKET_RESOLVED`, `TICKET_CLOSED` in the fixed check order | API-01..API-38, API-41; AC-01, AC-04, AC-05, AC-18..AC-30, AC-37..AC-39, AC-62, AC-121, AC-131, AC-132, AC-143..AC-145, AC-148 | `evidence/issue-64/green-actions-authorization.txt` | 3 | captured |
| `lastActivityAt` moved by each action write, Ticket `version` and status untouched; a refused write changes nothing | API-01, API-19, API-20, API-24 and every "nothing changes" row; BR-46, BR-37 | `evidence/issue-64/green-actions-authorization.txt` | 3 | captured |
| Action arrays in both Ticket DTOs; Requester sees names only; another Requester's Ticket 404 | API-39, API-40, API-42..API-44; AC-31, AC-32, AC-35, AC-118 | `evidence/issue-64/green-actions-authorization.txt` | 3 | captured |
| `clientRequestId` replay, including five concurrent creates (P2002) and a replay on a closed Ticket | API-45..API-48; AC-64, AC-126 | `evidence/issue-64/green-actions-authorization.txt` | 3 | captured |
| Action routes: Requester 403 with no content, anonymous 401, MustChange 403, foreign Origin 403, append-only, no secrets | SEC-01..SEC-04, SEC-10, SEC-11, SEC-12, SEC-14; AC-03, AC-24, AC-101 | `evidence/issue-64/green-actions-authorization.txt` | 3 | captured |
| Labs 1-3 suites still pass; three key-set tests adapted per `tests.md` 4.1 | L3 API-49, L3 SEC-26, L2 API-28 | `evidence/issue-64/green-server-suite.txt`, `green-client-suite.txt`, `green-e2e-suite.txt` (and the two `ECONNRESET` runs kept beside it) | 3 | captured |
