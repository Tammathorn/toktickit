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

## Actions Taken UI - Issue 4 (#65, with the workflow UI of #66)

This Issue's folder is `evidence/issue-65/`, named by the GitHub number as its task directed.
No screenshots are committed in this Issue; the `actions-taken/` and `ticket-workflow/` captures
belong to the Playwright specs of Issue 9.

| Requirement | Test ID / AC | Evidence | Issue | Status |
|---|---|---|---|---|
| Tests written first and shown failing | UNIT-09..11, UI-21..UI-51, STYLE-01, STYLE-02, STYLE-06, STYLE-11 | `evidence/issue-65/red-client-suite.txt` | 4 | captured |
| Actions Taken card on IT Staff Ticket Detail: list, composer, edit, complete, cancel, row controls from `allowedOperations`, conflicts, plain text | UNIT-09..11, UI-21..UI-37, UI-39, STYLE-01, STYLE-02, STYLE-06; FR-01, FR-08, FR-09, AC-09, AC-14 | `evidence/issue-65/green-client-suite.txt` | 4 | captured |
| Actions Taken read-only on Requester Ticket Detail: every action, names only, no control | UI-38; C-123, BR-20 | `evidence/issue-65/green-client-suite.txt` | 4 | captured |
| Workflow UI: status select from `allowedTransitions`, gate callout, `version` on every PATCH, `STALE_UPDATE` panel, gate and planned-action refusals, status history, `lastActivityAt` | UI-40..UI-49, UI-51, STYLE-11 (against mocked responses; the server reads `version` from #66 on) | `evidence/issue-65/green-client-suite.txt` | 4 | captured |
| A successful row write returns the row to view mode | UI-31..UI-33 (extended) | `evidence/issue-65/red-panel-closes.txt`, `green-client-suite.txt` | 4 | captured |
| Real app, dev database: create planned, edit, complete, cancel, Requester view, no console error | Task step 5 | `evidence/issue-65/manual-actions-card-check.txt` (+ script and the three earlier runs) | 4 | captured |
| Labs 1-3 suites still pass; E2E-11, E2E-15, E2E-45, E2E-46 adapted (C-137, C-123) | see `evidence/issue-65/README.md` | `evidence/issue-65/green-server-suite.txt`, `green-client-suite.txt`, `green-e2e-suite.txt`, `e2e-suite-run1-before-adaptation.txt` | 4 | captured |

## Ticket workflow - Issue 5 (#66)

This Issue's folder is `evidence/issue-66/`, named by the GitHub number like the two above.
No screenshots are committed in this Issue; the `ticket-workflow/` captures belong to the
Playwright specs of Issue 9.

| Requirement | Test ID / AC | Evidence | Issue | Status |
|---|---|---|---|---|
| e2e fixture PATCHes assert their status before any version change | C-156 | commit `5617a2c`; `evidence/issue-66/green-e2e-suite.txt` | 5 | captured |
| Tests written first and shown failing | UNIT-05..07, WF-01..WF-64 | `evidence/issue-66/red-ticket-workflow.txt` | 5 | captured |
| Resolution gate: `OWNER_REQUIRED` first, each reason alone, combined, fixed order, cancelled action after reopen, bypassing PATCH refused; cancel blocked by a planned action | UNIT-05, UNIT-06, WF-01..WF-13, WF-21; AC-43..AC-51, AC-130; C-137, C-186 | `evidence/issue-66/green-server-suite.txt` | 5 | captured |
| `allowedTransitions` and `resolutionGate` in the staff DTO | UNIT-07, WF-11, WF-14; AC-42, AC-135 | `evidence/issue-66/green-server-suite.txt` | 5 | captured |
| Status route's seven-step order | WF-15..WF-21; BR-89, C-164 | `evidence/issue-66/green-server-suite.txt` | 5 | captured |
| Stale updates: missing/old `version` on status, owner, IT Priority and actions; races; the envelope; body before stale | WF-22..WF-34; AC-52..AC-55, AC-59, AC-61; C-138 | `evidence/issue-66/green-server-suite.txt` | 5 | captured |
| `lastActivityAt` and `version` per write path; Internal Notes move neither; IT Priority re-sent unchanged is no write | WF-35..WF-49; AC-56..AC-58, AC-70, AC-71; C-140, C-187 | `evidence/issue-66/green-server-suite.txt` | 5 | captured |
| `resolvedAt` set/kept/cleared; history row per change in the same transaction; legacy Tickets | WF-50..WF-55; AC-36, AC-74..AC-77, AC-129, AC-147 | `evidence/issue-66/green-server-suite.txt` | 5 | captured |
| Replays on Public Comments and Internal Notes, concurrent and after closing; Ticket create ignores the key | WF-56..WF-64; AC-63, AC-65, AC-66, AC-127, AC-128; C-139, C-158 | `evidence/issue-66/green-server-suite.txt` | 5 | captured |
| Labs 1-3 suites still pass; adaptations per `tests.md` 4.1/4.3 | see `evidence/issue-66/README.md` | `evidence/issue-66/green-server-suite.txt`, `green-client-suite.txt`, `green-e2e-suite.txt`, `e2e-suite-run1-before-adaptation.txt` | 5 | captured |

## IT Staff and Administrator dashboard - Issue 6 (#67)

This Issue's folder is `evidence/issue-67/`, named by the GitHub number like the three above.
Dashboard screenshots (E2E-33, C-180) are rows of Issue 9, which writes `e2e/lab-04/dashboards.spec.ts`.

| Requirement | Test ID / AC | Evidence | Issue | Status |
|---|---|---|---|---|
| Tests written first and shown failing | API-60..API-81, SEC-05, SEC-07; UI-01..UI-12, STYLE-09, STYLE-10, STYLE-12 | `evidence/issue-67/red-staff-dashboard-server.txt`, `red-dashboards-client.txt`, `red-audit-fixes-client.txt` | 6 | captured |
| Staff dashboard shape: eleven cards in api-spec order, three lists | API-60; AC-78, BR-52 | `evidence/issue-67/green-staff-dashboard-server-verbose.txt` | 6 | captured |
| Every staff card's count equals its drill-down's total, one test per card | API-61..API-71; AC-81, AC-109..AC-114; C-127, C-143, C-169 | `evidence/issue-67/green-staff-dashboard-server-verbose.txt` | 6 | captured |
| Administrator user cards equal `GET /api/users?role=`, inactive included | API-72..API-74; AC-81, AC-117; BR-87 | `evidence/issue-67/green-staff-dashboard-server-verbose.txt` | 6 | captured |
| List order and tie-breaks; My planned actions uncapped; 168 h inclusive boundary with `now` injected; zero Administrator | API-75..API-79; AC-79, AC-82, AC-83, AC-115, AC-116, AC-133, AC-137; C-142, C-161, C-169 | `evidence/issue-67/green-staff-dashboard-server-verbose.txt` | 6 | captured |
| Queue `sort=lastActivityAt` and `requesterResolved=true` | API-80, API-81; AC-72, AC-73; C-143 | `evidence/issue-67/green-staff-dashboard-server-verbose.txt` | 6 | captured |
| Part 5 role restriction: Requester -> 403, no metric content; `userCounts` only for the Administrator | SEC-05, SEC-07; AC-86, AC-87; C-180 | `evidence/issue-67/green-staff-dashboard-server-verbose.txt` | 6 | captured |
| Part 5 metrics match database queries (dev database, one psql query per staff card, beside the API JSON of the same moment) | AC-81; BR-56, C-127 | `evidence/issue-67/part5-staff-cards.sql`, `part5-psql-staff-cards.txt`, `part5-api-staff-dashboard-it-staff.json`, `part5-api-staff-dashboard-administrator.json`, `part5-api-drilldown-totals.json` | 6 | captured |
| Staff Dashboard UI: cards, user row, zero/empty, Refresh without polling, no deltas, Quick Actions, `#my-actions`, list rows, loading/failure, drill-down landings, nav | UI-01..UI-12, STYLE-09, STYLE-10, STYLE-12; AC-80, AC-82..AC-84, AC-88, AC-90; C-128, C-144 | `evidence/issue-67/green-client-suite.txt` | 6 | captured |
| Labs 1-3 suites still pass; C-144 adaptations per `tests.md` 4.2/4.3 | see `evidence/issue-67/README.md` | `evidence/issue-67/green-server-suite.txt`, `green-client-suite.txt`, `green-e2e-suite.txt`, `e2e-suite-run1-resp12-header.txt` | 6 | captured |

## Requester dashboard and the route-matrix test - Issue 7 (#68)

This Issue's folder is `evidence/issue-68/`. The Requester dashboard code and its client tests
came with #67's patch, so the #68 API tests had no code-caused red run; the README says so.
Requester dashboard screenshots (E2E-34, C-180) are rows of Issue 9.

| Requirement | Test ID / AC | Evidence | Issue | Status |
|---|---|---|---|---|
| Requester dashboard shape: four cards in api-spec 4.1 order, two lists | API-49; AC-78, BR-52 | `evidence/issue-68/green-requester-dashboard-server-verbose.txt` | 7 | captured |
| Every Requester card's count equals its `GET /api/tickets` drill-down total, one test per card | API-50..API-53; AC-81, AC-103..AC-106; C-127 | `evidence/issue-68/green-requester-dashboard-server-verbose.txt` | 7 | captured |
| Recent lists: order, tie-break, 168 h inclusive boundary with `now` injected; zero Requester (nattapong.w) | UNIT-08, API-54..API-57; AC-79, AC-82, AC-83, AC-107, AC-108, AC-138; C-142, C-161 | `evidence/issue-68/green-requester-dashboard-server-verbose.txt` | 7 | captured |
| My Tickets `statusGroup=open` conflicts -> 400; `sort=lastActivityAt:desc` | API-58, API-59; AC-72, AC-134; C-170 | `evidence/issue-68/green-requester-dashboard-server-verbose.txt` | 7 | captured |
| Part 5 role restriction: IT Staff and Administrator -> 403; Requester A never sees B's numbers; list items carry no staff-only key | SEC-06, SEC-08, SEC-13; AC-02, AC-85; C-180 | `evidence/issue-68/green-requester-dashboard-server-verbose.txt` | 7 | captured |
| Every registered route is in the `specification.md` 5.2 matrix and every matrix row is registered (36 rows) | SEC-09; AC-101; C-155, C-184 | `evidence/issue-68/green-requester-dashboard-server-verbose.txt` | 7 | captured |
| Stale `toktickit_test` rows (pre-`1c688b5` seed) found by API-57; test DB rebuilt from migrations + seed, dev DB untouched | API-57 | `evidence/issue-68/first-run-api57-stale-test-db.txt`, `test-db-rebuild-drop.txt` | 7 | captured |
| Labs 1-3 suites still pass | see `evidence/issue-68/README.md` | `evidence/issue-68/green-server-suite.txt`, `green-client-suite.txt` | 7 | captured |
