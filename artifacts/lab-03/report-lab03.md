# Lab 3 Report - TokTickIT

CPE 334 Individual Sprint 3 (LS 14). Author: Tammathorn Kananurak (67070503489).
Repository: <https://github.com/Tammathorn/toktickit> (public). Final state: `main` at `bbfe988`; the
last code release is merge commit `afac6dc`, release PR [#61](https://github.com/Tammathorn/toktickit/pull/61) (`lab3-staging` into `main`), carrying
[#60](https://github.com/Tammathorn/toktickit/pull/60), Issue #12, which fixed the visual checklist's five UI defects. #60 and #61 were
**self-merged after the review period; not peer-reviewed**. Every suite passes on `main`: server 297,
client 128, Playwright 278 passed, 34 skipped, 0 failed. The visual checklist is **42 of 42**.

This report answers labsheet section 14, Parts 1 through 9. Every row links the evidence file that
`artifacts/lab-03/evidence.md` maps to it, and each Part ends with its screenshots inline. Every file
named here is committed on `main`. Paths in this Markdown file are relative to `artifacts/lab-03/`.

## Answer Part 1

*Git use with engineering workflow.*

| Row | Evidence |
|---|---|
| P1-01 | Commit graph on `main`: GitHub network page [`screenshots/github/2026-10-05-commit-graph-network.png`](screenshots/github/2026-10-05-commit-graph-network.png) and `git log --graph --oneline --all` (excerpt below, full text [`evidence/main/git-log-graph.txt`](evidence/main/git-log-graph.txt)). Nine feature branches merge into `lab3-staging` (#46 to #54), then `lab3-staging` into `main` (#55). |
| P1-02 | Board for every Issue: [`screenshots/github/2026-10-05-board-all-done-final.png`](screenshots/github/2026-10-05-board-all-done-final.png), cropped in [`final-board-columns-1-3.png`](screenshots/github/final-board-columns-1-3.png) and [`final-board-columns-4-6-done.png`](screenshots/github/final-board-columns-4-6-done.png): **Done 22**, every other column 0; `gh project item-list 3` confirms 22 Done after #61. History: opening #55 had reset #37 to #45 to Specified/Started ([`2026-10-05-board-all-done.png`](screenshots/github/2026-10-05-board-all-done.png)); they were moved back to Done and re-captured. |
| P1-03 | [`screenshots/github/2026-10-02-board-pr-review.png`](screenshots/github/2026-10-02-board-pr-review.png) |
| P1-04 | **Not captured.** No card entered Fixing this sprint: PAKATO123 requested no changes on any PR (see P1-08), so there was no Fixing state to photograph. A staged capture would break the "never stage a state that did not happen" rule. |
| P1-05 | PR Review moves: [`2026-10-04-board-39-pr-review.png`](screenshots/github/2026-10-04-board-39-pr-review.png), [`-40-`](screenshots/github/2026-10-04-board-40-pr-review.png), [`-41-`](screenshots/github/2026-10-04-board-41-pr-review.png), [`-42-`](screenshots/github/2026-10-04-board-42-pr-review.png). Done moves, one per card: [`#38`](screenshots/github/2026-10-05-board-38-done.png), [`#39`](screenshots/github/2026-10-05-board-39-done.png), [`#40`](screenshots/github/2026-10-05-board-40-done.png), [`#41`](screenshots/github/2026-10-05-board-41-done.png), [`#42`](screenshots/github/2026-10-05-board-42-done.png), [`#43`](screenshots/github/2026-10-05-board-43-done.png), [`#44`](screenshots/github/2026-10-05-board-44-done.png), [`#45`](screenshots/github/2026-10-05-board-45-done.png). |
| P1-06 | [`screenshots/github/2026-10-02-pr46-review-open.png`](screenshots/github/2026-10-02-pr46-review-open.png) |
| P1-07 | [`screenshots/github/2026-10-02-pr47-open.png`](screenshots/github/2026-10-02-pr47-open.png) |
| P1-08 | PAKATO123's APPROVED review on every PR from #46 to #59, confirmed with `gh pr view`; each merged page shows it: [#46](screenshots/github/2026-10-05-pr46-merged.png), [#47](screenshots/github/2026-10-05-pr47-merged.png), [#48](screenshots/github/2026-10-05-pr48-merged.png), [#49](screenshots/github/2026-10-05-pr49-merged.png), [#50](screenshots/github/2026-10-05-pr50-merged.png), [#51](screenshots/github/2026-10-05-pr51-merged.png), [#52](screenshots/github/2026-10-05-pr52-merged.png), [#53](screenshots/github/2026-10-05-pr53-merged.png), [#54](screenshots/github/2026-10-05-pr54-merged.png), [#55](screenshots/github/2026-10-05-pr55-merged.png), [#57](screenshots/github/2026-10-05-pr57-merged.png), [#59](screenshots/github/2026-10-05-pr59-merged.png). **#60 and #61 have no review: self-merged after the review period; not peer-reviewed** ([#60](screenshots/github/2026-10-05-pr60-merged.png), [#61](screenshots/github/2026-10-05-pr61-merged.png)), recorded in `reviewer.md`. |
| P1-09 | [`../../docs/lab-03/reviewer.md`](../../docs/lab-03/reviewer.md), rendered on `main`: [`screenshots/github/2026-10-05-main-reviewer.png`](screenshots/github/2026-10-05-main-reviewer.png), [`screenshots/github/2026-10-05-main-reviewer-b.png`](screenshots/github/2026-10-05-main-reviewer-b.png). |
| P1-10 | [`../../README.md`](../../README.md) rendered on `main`: [`screenshots/github/2026-10-05-main-readme.png`](screenshots/github/2026-10-05-main-readme.png); [`../../.gitignore`](../../.gitignore): [`screenshots/github/2026-10-05-main-gitignore.png`](screenshots/github/2026-10-05-main-gitignore.png). |
| P1-11 | Repository root on `main`: [`screenshots/github/2026-10-05-main-repo-tree.png`](screenshots/github/2026-10-05-main-repo-tree.png); full tracked tree below and in [`evidence/main/directory-tree.txt`](evidence/main/directory-tree.txt). |

**Merge times (UTC, from `gh pr view`)**

| PR | Base | Merged | Approved by |
|---|---|---|---|
| #46 contract | lab3-staging | 13:14:46 | PAKATO123 |
| #47 to #54 | lab3-staging | 13:15:42, 13:17:35, 13:18:08, 13:18:49, 13:19:23, 13:19:54, 13:20:33, 13:23:25 | PAKATO123 |
| #55 release | main | 13:35:29 | PAKATO123 |
| #57 fix (Issue #56) | lab3-staging | 14:47:07 | PAKATO123 |
| #59 release | main | 16:11:49 | PAKATO123 |
| #60 Issue #12 | lab3-staging | 18:45:46 | - (self-merged, not peer-reviewed) |
| #61 release | main | 18:46:03 | - (self-merged, not peer-reviewed) |

**`git log --graph --oneline --all` on `main` (first 46 of 247 lines)**

```text
Command: git log --graph --oneline --all
Date: 2026-10-05
Commit: fc29ca4310bc21e69c0d35df3645f56496bcf078 (main)

*   fc29ca4 Merge pull request #55 from Tammathorn/lab3-staging
|\  
| *   235dcdc Merge pull request #54 from Tammathorn/feature/lab3-9-release-docs
| |\  
| | * ec07bcf docs: record PAKATO's approvals and the merged stack, add GitHub captures (#45)
| | * 257bd0d docs: final My Reflection (#45)
| | * 2ed7030 docs: add draft reflection and record reviews of PAKATO123's PRs (#45)
| | * 61e222e docs: add pre-review dry-run integration evidence (#45)
| | * 0fe04ea docs: record PR #54 now that it exists (#45)
| | * 9e13ae9 docs: fix stale P6-07 note - IT Staff Ticket Detail is no longer a placeholder (#45)
| | * f0f20e8 docs: add report-lab03.md, Answer Part 1 through Part 9 (#45)
| | * 5b5b534 docs: mark P1-09/10/11, P3-01, P4-01 captured (#45)
| | * 59e01b4 docs: add reviewer.md, the Lab 3 peer review record (#45)
| | * c77c237 docs: finalize ai-use.md with Phase 2/3 and seven key prompts (#45)
| | * 9d26d69 docs: finish the Lab 3 README section (#45)
| | * e8173df docs: fill tests.md section 2's Final column from real runs (#45)
| * | e664ba7 Merge pull request #53 from Tammathorn/feature/lab3-8-e2e-visual
| |\| 
| | * 43b737c fix: capture queue-<vp>-empty at all three viewports (audit finding)
| | * f65cdba docs: record Issue #44 terminal evidence, correct E2E-08/RESP-09 rows
| | * 250d5d6 docs: regenerate the final Part 6 and Part 9 screenshot sets (#44)
| | * f69a459 test: close Part 1 e2e gaps - E2E-17 requester side, staff-queue RESP-09
| * | 2a1afbb Merge pull request #52 from Tammathorn/feature/lab3-7-user-admin
| |\| 
| | * dc1d105 docs: capture the #43 green server, client and e2e runs
| | * 68449bb docs: record C-115, correct the E2E-23 row, mark Part 8 captured
| | * a498390 docs: capture Part 8 screenshots and the #43 server red run
| | * 4a57983 test: e2e user administration, three viewports (#43, C-115)
| | * ecbbc3b feat: User Management screen (ui-spec.md section 17, #43)
| | * 61474e8 test: User Management screen, written first (#43)
| | * 3806d14 feat: Administrator user management API (api-spec.md section 9, #43)
| | * 711c68b test: Administrator user management API, written first (#43)
| * | 6df8f97 Merge pull request #51 from Tammathorn/feature/lab3-6-staff-ticket-ops
| |\| 
| | * fe6ab26 docs: capture green server and client runs after the C-114 fix
| | * 46a12c1 docs: record C-114 and the new API-124/UI-53 rows
| | * 30a8970 fix: add isActive to the Requester Ticket DTO's owner (C-114)
| | * 9d3d1ad test: assert the owner's isActive on the Requester Ticket DTO (C-114)
| | * 53449c0 docs: capture the board with #42 moved to PR Review
| | * 762d5c1 docs: capture Issue #6 evidence and mark Part 7 rows captured
| | * e1580d3 test: e2e coverage for IT Staff Ticket Detail (tests.md 2.12, E2E-07..E2E-26)
| | * 57a2a5e fix: repair Lab 2 fixtures after the Ticket owner/comments contract widened
```

**Repository tree on `main`**

```text
Command: git ls-files  (tracked files on main, directories deeper than 3 levels collapsed to counts)
Date: 2026-10-05
Commit: fc29ca4310bc21e69c0d35df3645f56496bcf078 (main)
Total tracked files: 496

toktickit/
|-- artifacts/
|   |-- lab-02/
|   |   |-- evidence/  (51 files)
|   |   |-- screenshots/  (96 files)
|   |   |-- evidence.md
|   |   `-- report-lab02.md
|   `-- lab-03/
|       |-- evidence/  (48 files)
|       |-- migration/  (9 files)
|       |-- screenshots/  (142 files)
|       |-- evidence.md
|       `-- report-lab03.md
|-- client/
|   |-- src/
|   |   |-- auth/  (3 files)
|   |   |-- components/  (7 files)
|   |   |-- pages/  (9 files)
|   |   |-- App.tsx
|   |   |-- api.ts
|   |   |-- format.ts
|   |   |-- main.tsx
|   |   |-- router.tsx
|   |   |-- theme.css
|   |   |-- useMediaQuery.ts
|   |   |-- validation.ts
|   |   `-- vite-env.d.ts
|   |-- tests/
|   |   |-- lab-01/  (1 files)
|   |   |-- lab-02/  (4 files)
|   |   |-- lab-03/  (5 files)
|   |   |-- support/  (1 files)
|   |   |-- types/  (1 files)
|   |   `-- setup.ts
|   |-- .env.example
|   |-- index.html
|   |-- package-lock.json
|   |-- package.json
|   |-- tsconfig.json
|   `-- vite.config.ts
|-- docs/
|   |-- lab-01/
|   |   |-- spec/  (3 files)
|   |   |-- ai_use.md
|   |   |-- reviewer.md
|   |   `-- tests.md
|   |-- lab-02/
|   |   |-- ai-use.md
|   |   |-- api-spec.md
|   |   |-- decisions.md
|   |   |-- handoff.md
|   |   |-- reviewer.md
|   |   |-- specification.md
|   |   |-- tests.md
|   |   `-- ui-spec.md
|   `-- lab-03/
|       |-- ai-use.md
|       |-- api-spec.md
|       |-- decisions.md
|       |-- handoff.md
|       |-- phase1-analysis.md
|       |-- reviewer.md
|       |-- specification.md
|       |-- tests.md
|       `-- ui-spec.md
|-- e2e/
|   |-- lab-02/
|   |   |-- create-ticket-screenshots.spec.ts
|   |   |-- my-tickets-screenshots.spec.ts
|   |   |-- requester-ticket-flow.spec.ts
|   |   `-- ticket-detail-screenshots.spec.ts
|   |-- lab-03/
|   |   |-- authentication.spec.ts
|   |   |-- staff-ticket-flow.spec.ts
|   |   `-- user-administration.spec.ts
|   |-- support/
|   |   `-- auth.ts
|   `-- auth.setup.ts
|-- server/
|   |-- prisma/
|   |   |-- migrations/  (7 files)
|   |   |-- schema.prisma
|   |   |-- seed-demo.ts
|   |   `-- seed.ts
|   |-- src/
|   |   |-- lib/  (16 files)
|   |   |-- middleware/  (1 files)
|   |   |-- routes/  (6 files)
|   |   |-- seed/  (2 files)
|   |   |-- app.ts
|   |   |-- index.ts
|   |   `-- prisma.ts
|   |-- tests/
|   |   |-- lab-01/  (2 files)
|   |   |-- lab-02/  (6 files)
|   |   |-- lab-03/  (7 files)
|   |   |-- support/  (2 files)
|   |   `-- global-setup.ts
|   |-- .env.example
|   |-- package-lock.json
|   |-- package.json
|   |-- tsconfig.json
|   `-- vitest.config.ts
|-- .gitignore
|-- CLAUDE.md
|-- README.md
|-- package-lock.json
|-- package.json
`-- playwright.config.ts
```

## Answer Part 2

*Specification-driven development.*

| Row | Evidence |
|---|---|
| P2-01 | [`../../docs/lab-03/specification.md`](../../docs/lab-03/specification.md) rendered on `main`: top and Sections 1 to 3 [`screenshots/github/2026-10-05-main-specification.png`](screenshots/github/2026-10-05-main-specification.png); Section 4 Functional Requirements [`b`](screenshots/github/2026-10-05-main-specification-b.png); Section 5 Business Rules [`c`](screenshots/github/2026-10-05-main-specification-c.png); Section 9 Acceptance Criteria [`d`](screenshots/github/2026-10-05-main-specification-d.png); Section 10 Definition of Done [`e`](screenshots/github/2026-10-05-main-specification-e.png). |
| P2-02 | The specification came first. It was committed on 2026-09-26 (`c281d50`), the UI spec and test plan on 2026-09-28 (`f29cfc7`, `cf4d39b`); implementation work on the data-migration branch began 2026-10-01. PR #46 (the contract) merged at 13:14:46 UTC, before every implementation PR #47 to #53 (13:15:42 to 13:20:33): [#46](screenshots/github/2026-10-05-pr46-merged.png), [#47](screenshots/github/2026-10-05-pr47-merged.png), [#48](screenshots/github/2026-10-05-pr48-merged.png), [#49](screenshots/github/2026-10-05-pr49-merged.png), [#50](screenshots/github/2026-10-05-pr50-merged.png), [#51](screenshots/github/2026-10-05-pr51-merged.png), [#52](screenshots/github/2026-10-05-pr52-merged.png), [#53](screenshots/github/2026-10-05-pr53-merged.png), [#54](screenshots/github/2026-10-05-pr54-merged.png); graph in P1-01 ([`screenshots/github/2026-10-05-commit-graph-network.png`](screenshots/github/2026-10-05-commit-graph-network.png)). The merges were batched after review (decision C-110), so merge times are minutes apart; the commit dates are the real ordering. |

## Answer Part 3

*Test-driven development and traceability.*

| Row | Evidence |
|---|---|
| P3-01 | [`../../docs/lab-03/tests.md`](../../docs/lab-03/tests.md) - every section 2 row's `Final` column filled from a real run (server/client: [`evidence/issue-9/server-green.txt`](evidence/issue-9/server-green.txt), [`client-green.txt`](evidence/issue-9/client-green.txt), commit `43b737c`; e2e: [`evidence/issue-8/e2e-suite-final-green.txt`](evidence/issue-8/e2e-suite-final-green.txt), commit `dc1d105`). |
| P3-02 | **Passing output from `main` - all suites green on `main` @ `afac6dc`**, the merge commit of release PR [#61](https://github.com/Tammathorn/toktickit/pull/61) (`lab3-staging` into `main`, carrying #60, Issue #12; capture [`screenshots/github/2026-10-05-pr61-merged.png`](screenshots/github/2026-10-05-pr61-merged.png)). **This repository has no CI** - there is no `.github/` directory and no GitHub Actions workflow or run - so these are **local runs on `main`**, not an Actions run; each file carries the command, the date and the commit hash at the top. Server **297 passed**, 15 files ([`test-output/main-server.txt`](test-output/main-server.txt)); client **128 passed**, 11 files ([`test-output/main-client.txt`](test-output/main-client.txt)); Playwright, the Lab 3 specs at all three viewports, **170 passed, 34 skipped, 0 failed**, E2E-07 passing at desktop, tablet and mobile ([`test-output/main-e2e.txt`](test-output/main-e2e.txt)); the whole Playwright suite, Lab 2 and Lab 3, **278 passed, 34 skipped, 0 failed** ([`test-output/main-e2e-full.txt`](test-output/main-e2e-full.txt)), on a freshly seeded `toktickit_evidence`. The 34 skips are viewport-gated `test.skip` calls, not disabled tests. Totals are recorded in [`../../docs/lab-03/tests.md`](../../docs/lab-03/tests.md) section 7. **History:** `main` at `fc29ca4` (after #55) had 3 E2E-07 failures ([`evidence/main/`](evidence/main/)), fixed by #56 / #57 and released by #59; Issue #12's red and green runs are [`evidence/issue-12/`](evidence/issue-12/). |
| P3-03 | [`migration/red-run-migration-tests.txt`](migration/red-run-migration-tests.txt) |
| P3-04 | [`migration/rehearsal-before.txt`](migration/rehearsal-before.txt), [`rehearsal-deploy.txt`](migration/rehearsal-deploy.txt), [`rehearsal-after.txt`](migration/rehearsal-after.txt), [`rehearsal-drift.txt`](migration/rehearsal-drift.txt), [`rehearsal-seed.txt`](migration/rehearsal-seed.txt), [`rehearsal-summary.md`](migration/rehearsal-summary.md) |
| P3-05 | [`migration/dev-before-counts.txt`](migration/dev-before-counts.txt), [`migration/dev-after-counts.txt`](migration/dev-after-counts.txt) |
| P3-06 | [`evidence/issue-3/red-server-auth.txt`](evidence/issue-3/red-server-auth.txt), [`red-client-auth.txt`](evidence/issue-3/red-client-auth.txt), [`green-server.txt`](evidence/issue-3/green-server.txt), [`green-client.txt`](evidence/issue-3/green-client.txt), [`green-e2e.txt`](evidence/issue-3/green-e2e.txt) |
| P3-07 | #44's share - [`evidence/issue-8/server-suite-green.txt`](evidence/issue-8/server-suite-green.txt), [`client-suite-green.txt`](evidence/issue-8/client-suite-green.txt), [`e2e-suite-final-green.txt`](evidence/issue-8/e2e-suite-final-green.txt), [`e2e-evidence-db-run-red.txt`](evidence/issue-8/e2e-evidence-db-run-red.txt) - captured. #42's API half - [`evidence/issue-6/red-staff-ticket-ops.txt`](evidence/issue-6/red-staff-ticket-ops.txt), [`green-staff-ticket-detail.txt`](evidence/issue-6/green-staff-ticket-detail.txt), [`green-comments-notes.txt`](evidence/issue-6/green-comments-notes.txt), [`green-server.txt`](evidence/issue-6/green-server.txt), [`green-client.txt`](evidence/issue-6/green-client.txt) - captured. **#40, #41 and #43's own red/green runs are not independently re-verified by this report** - evidence.md's own note on this row says so; this Issue did not re-run them, only cited what already exists ([`evidence/issue-4/`](evidence/issue-4/), [`evidence/issue-7/`](evidence/issue-7/)). |
| P3-08 | [`evidence/issue-4/lab2-inventory-before.txt`](evidence/issue-4/lab2-inventory-before.txt), [`lab2-inventory-after.txt`](evidence/issue-4/lab2-inventory-after.txt) |

**Summaries on `main` before the fix (`fc29ca4`, after #55)** - kept as the record of the failing state; the passing output from `main` after #59 is the P3-02 row above.

```text
Command: cd server && npx vitest run
Date: 2026-10-05 13:43 UTC
Commit: fc29ca4310bc21e69c0d35df3645f56496bcf078 (main, after merge of PR #55)
Database: toktickit_test (vitest global-setup)
Summary only (per-test lines omitted):

 Test Files  15 passed (15)
      Tests  297 passed (297)
   Duration  33.50s (transform 371ms, setup 0ms, collect 3.15s, tests 23.76s, environment 2ms, prepare 937ms)

Command: cd client && npx vitest run
Date: 2026-10-05 13:43 UTC
Commit: fc29ca4310bc21e69c0d35df3645f56496bcf078 (main, after merge of PR #55)
Summary only (per-test lines omitted):

 Test Files  10 passed (10)
      Tests  118 passed (118)
   Duration  13.74s (transform 946ms, setup 1.40s, collect 6.40s, tests 39.11s, environment 7.78s, prepare 2.18s)

Command: DATABASE_URL=<toktickit_evidence> npx playwright test e2e/lab-03 --project=desktop --project=tablet --project=mobile --workers=1 --reporter=list
Date: 2026-10-05 13:43 UTC
Commit: fc29ca4310bc21e69c0d35df3645f56496bcf078 (main, after merge of PR #55)
Database: toktickit_evidence, dropped, recreated, migrate deploy + prisma:seed immediately before the run (11 users / 9 tickets at seed time)
Result: RED - 3 failed (E2E-07 on desktop, tablet, mobile), 28 skipped, 89 passed. Failure list and summary only:

  1) [desktop] › e2e\lab-03\staff-ticket-flow.spec.ts:344:7 › IT Staff Ticket Detail flow › E2E-07 the queue journey: search, each filter, sort, page size, and opening a Ticket (LS 14 Part 6) 
    Test timeout of 30000ms exceeded.
    Error: locator.click: Test timeout of 30000ms exceeded.
      - waiting for getByRole('button', { name: 'Clear filters' })
  2) [tablet] › e2e\lab-03\staff-ticket-flow.spec.ts:344:7 › IT Staff Ticket Detail flow › E2E-07 the queue journey: search, each filter, sort, page size, and opening a Ticket (LS 14 Part 6) 
    Test timeout of 30000ms exceeded.
    Error: locator.click: Test timeout of 30000ms exceeded.
      - waiting for getByRole('button', { name: 'Clear filters' })
  3) [mobile] › e2e\lab-03\staff-ticket-flow.spec.ts:344:7 › IT Staff Ticket Detail flow › E2E-07 the queue journey: search, each filter, sort, page size, and opening a Ticket (LS 14 Part 6) 
    Test timeout of 30000ms exceeded.
    Error: locator.click: Test timeout of 30000ms exceeded.
      - waiting for getByRole('button', { name: 'Clear filters' })
  3 failed
  28 skipped
  89 passed (2.6m)
```

**E2E-07 failure (not hidden).** `staff-ticket-flow.spec.ts:344` times out at `getByRole('button', { name: 'Clear filters' })`; it failed on desktop, tablet and mobile, and again on two isolated desktop re-runs. A direct browser script that selects the same filters one at a time, with a pause between them, works, so the cause is a race, not a missing control. `StaffTicketQueue.tsx` debounces search by 300 ms in an effect that depends only on `[searchText]`, so its callback calls `apply()` with the `state` captured when the search text last changed. The test's `fill("")` followed at once by a status filter lets that stale callback fire afterwards and reset the filters to the defaults. A user could hit it by clearing the search box and choosing a filter within 300 ms. The suite was green on the stacked branch (89 passed, 28 skipped, 0 failed in `evidence/issue-8/e2e-suite-final-green.txt`); the earlier red run in `e2e-evidence-db-run-red.txt` failed at the same step, which was attributed to CPU contention. It is reported here and not fixed, because nothing may be committed in this task.

**E2E-07 - resolved.** The race was fixed under Issue [#56](https://github.com/Tammathorn/toktickit/issues/56) in PR [#57](https://github.com/Tammathorn/toktickit/pull/57) (commit `9a945b3`: the debounced search callback now reads current state, with a client regression test - the client suite went from 118 to 119), approved by PAKATO123 and merged into `lab3-staging`. Release PR [#59](https://github.com/Tammathorn/toktickit/pull/59) carried it into `main` (merge commit `347e25e`). E2E-07 passes at desktop, tablet and mobile on `main` in `test-output/main-e2e.txt`; the three failures above are the state of `main` at `fc29ca4` only.

## Answer Part 4

*AI use with reflection.*

| Row | Evidence |
|---|---|
| P4-01 | [`../../docs/lab-03/ai-use.md`](../../docs/lab-03/ai-use.md) - the LLM and interface named (section 1); seven entries marked **(key prompt)** across Phase 1 (2.6, 2.9, 2.10, 2.11) and the new Phase 2/3 section (4.1, 4.3, 4.4), within `LS 4`'s six-to-ten range. **"My Reflection" (section 5) is a heading only, with nothing written under it** - that is by design (`CLAUDE.md`: "I write it"), not a missing capture. |

On `main`: [`screenshots/github/2026-10-05-main-ai-use.png`](screenshots/github/2026-10-05-main-ai-use.png) (top and Section 1 onwards), [`screenshots/github/2026-10-05-main-ai-use-b.png`](screenshots/github/2026-10-05-main-ai-use-b.png) (Section 5, My Reflection).

## Answer Part 5

*Working Login and Password Change UI.*

| Row | Evidence |
|---|---|
| P5-01 | [`screenshots/authentication/login-desktop-initial.png`](screenshots/authentication/login-desktop-initial.png), [`shell-desktop-requester.png`](screenshots/authentication/shell-desktop-requester.png) |
| P5-02 | [`screenshots/authentication/login-desktop-validation.png`](screenshots/authentication/login-desktop-validation.png), [`login-desktop-invalid-credentials.png`](screenshots/authentication/login-desktop-invalid-credentials.png) |
| P5-03 | [`screenshots/authentication/login-desktop-inactive-account.png`](screenshots/authentication/login-desktop-inactive-account.png) |
| P5-04 | [`screenshots/authentication/login-desktop-submitting.png`](screenshots/authentication/login-desktop-submitting.png) |
| P5-05 | [`screenshots/authentication/login-desktop-failure.png`](screenshots/authentication/login-desktop-failure.png) |
| P5-06 | [`screenshots/authentication/change-password-desktop-initial.png`](screenshots/authentication/change-password-desktop-initial.png), [`...-validation.png`](screenshots/authentication/change-password-desktop-validation.png), [`...-success.png`](screenshots/authentication/change-password-desktop-success.png) |
| P5-07 | [`screenshots/authentication/shell-desktop-requester.png`](screenshots/authentication/shell-desktop-requester.png) |
| P5-08 | [`screenshots/authentication/shell-desktop-it-staff.png`](screenshots/authentication/shell-desktop-it-staff.png), [`shell-desktop-administrator.png`](screenshots/authentication/shell-desktop-administrator.png) |
| P5-09 | [`screenshots/authentication/logout-desktop-signed-out.png`](screenshots/authentication/logout-desktop-signed-out.png) (extra) |
| P5-10 | [`screenshots/authentication/logout-desktop-blocked-after.png`](screenshots/authentication/logout-desktop-blocked-after.png) |
| P5-11 | [`screenshots/authentication/logout-desktop-back-button.png`](screenshots/authentication/logout-desktop-back-button.png) (extra) |
| P5-12 | [`evidence/issue-3/session-cookie-proof.txt`](evidence/issue-3/session-cookie-proof.txt) (tokens redacted) |
| P5-13 | [`evidence/issue-3/green-server.txt`](evidence/issue-3/green-server.txt), [`green-client.txt`](evidence/issue-3/green-client.txt), [`green-e2e.txt`](evidence/issue-3/green-e2e.txt) |
| P5-14 | [`screenshots/authentication/shell-desktop-requester.png`](screenshots/authentication/shell-desktop-requester.png) (re-captured, selector gone) |

## Answer Part 6

*Working IT Staff Ticket Queue UI.*

Final set regenerated in #44 against the freshly migrated and seeded evidence database.

| Row | Evidence |
|---|---|
| P6-01 | [`screenshots/staff-queue/queue-desktop-populated.png`](screenshots/staff-queue/queue-desktop-populated.png) |
| P6-02 | `screenshots/staff-queue/queue-<vp>-search.png`, all three viewports: [desktop](screenshots/staff-queue/queue-desktop-search.png), [tablet](screenshots/staff-queue/queue-tablet-search.png), [mobile](screenshots/staff-queue/queue-mobile-search.png) |
| P6-03 | `queue-<vp>-filters.png`: [desktop](screenshots/staff-queue/queue-desktop-filters.png), [tablet](screenshots/staff-queue/queue-tablet-filters.png), [mobile](screenshots/staff-queue/queue-mobile-filters.png) |
| P6-04 | `queue-<vp>-sorted.png`: [desktop](screenshots/staff-queue/queue-desktop-sorted.png), [tablet](screenshots/staff-queue/queue-tablet-sorted.png), [mobile](screenshots/staff-queue/queue-mobile-sorted.png) |
| P6-05 | `queue-<vp>-page-2.png`: [desktop](screenshots/staff-queue/queue-desktop-page-2.png), [tablet](screenshots/staff-queue/queue-tablet-page-2.png), [mobile](screenshots/staff-queue/queue-mobile-page-2.png) |
| P6-06 | `queue-<vp>-unassigned.png`: [desktop](screenshots/staff-queue/queue-desktop-unassigned.png), [tablet](screenshots/staff-queue/queue-tablet-unassigned.png), [mobile](screenshots/staff-queue/queue-mobile-unassigned.png); owned rows in P6-01 |
| P6-07 | [`screenshots/staff-queue/queue-desktop-open-detail.png`](screenshots/staff-queue/queue-desktop-open-detail.png) (extra) |
| P6-08 | No-results: [desktop](screenshots/staff-queue/queue-desktop-no-results.png)/[tablet](screenshots/staff-queue/queue-tablet-no-results.png)/[mobile](screenshots/staff-queue/queue-mobile-no-results.png); failure: [desktop](screenshots/staff-queue/queue-desktop-failure.png)/[tablet](screenshots/staff-queue/queue-tablet-failure.png)/[mobile](screenshots/staff-queue/queue-mobile-failure.png); loading: [desktop](screenshots/staff-queue/queue-desktop-loading.png)/[tablet](screenshots/staff-queue/queue-tablet-loading.png)/[mobile](screenshots/staff-queue/queue-mobile-loading.png); the genuinely-empty queue (mocked response, #44 fix): [desktop](screenshots/staff-queue/queue-desktop-empty.png)/[tablet](screenshots/staff-queue/queue-tablet-empty.png)/[mobile](screenshots/staff-queue/queue-mobile-empty.png) |
| P6-09 | `queue-<vp>-populated.png` at all three - see P6-01 and the tablet/mobile files alongside it |

## Answer Part 7

*Working IT Staff Ticket Detail UI.*

| Row | Evidence |
|---|---|
| P7-01 | [`screenshots/staff-ticket-detail/detail-desktop-unassigned.png`](screenshots/staff-ticket-detail/detail-desktop-unassigned.png), [`detail-desktop-owned.png`](screenshots/staff-ticket-detail/detail-desktop-owned.png) |
| P7-02 | [`screenshots/staff-ticket-detail/detail-desktop-claim-conflict.png`](screenshots/staff-ticket-detail/detail-desktop-claim-conflict.png) |
| P7-03 | [`screenshots/staff-ticket-detail/detail-desktop-reassigned.png`](screenshots/staff-ticket-detail/detail-desktop-reassigned.png) (extra) |
| P7-04 | [`screenshots/staff-ticket-detail/detail-desktop-it-priority.png`](screenshots/staff-ticket-detail/detail-desktop-it-priority.png) |
| P7-05 | [`screenshots/staff-ticket-detail/detail-desktop-status-menu.png`](screenshots/staff-ticket-detail/detail-desktop-status-menu.png), [`detail-desktop-status-confirm.png`](screenshots/staff-ticket-detail/detail-desktop-status-confirm.png) |
| P7-06 | [`screenshots/staff-ticket-detail/detail-desktop-status-refused.png`](screenshots/staff-ticket-detail/detail-desktop-status-refused.png) |
| P7-07 | [`screenshots/staff-ticket-detail/detail-desktop-comments-and-notes.png`](screenshots/staff-ticket-detail/detail-desktop-comments-and-notes.png) |
| P7-08 | [`screenshots/staff-ticket-detail/detail-desktop-attachments.png`](screenshots/staff-ticket-detail/detail-desktop-attachments.png) (extra) |
| P7-09 | [`screenshots/staff-ticket-detail/detail-desktop-requester-resolved.png`](screenshots/staff-ticket-detail/detail-desktop-requester-resolved.png) |
| P7-10 | [`screenshots/staff-ticket-detail/detail-desktop-inactive-owner.png`](screenshots/staff-ticket-detail/detail-desktop-inactive-owner.png), [`detail-desktop-terminal.png`](screenshots/staff-ticket-detail/detail-desktop-terminal.png) |
| P7-11 | `queue-<vp>-forbidden.png`: [desktop](screenshots/staff-queue/queue-desktop-forbidden.png), [tablet](screenshots/staff-queue/queue-tablet-forbidden.png), [mobile](screenshots/staff-queue/queue-mobile-forbidden.png); a Requester at the queue address: [`forbidden-desktop-requester-at-queue.png`](screenshots/authentication/forbidden-desktop-requester-at-queue.png) (extra) |
| P7-12 | [`screenshots/staff-ticket-detail/detail-desktop-empty-comment.png`](screenshots/staff-ticket-detail/detail-desktop-empty-comment.png) (extra) |
| P7-13 | [`screenshots/staff-ticket-detail/detail-desktop-failure.png`](screenshots/staff-ticket-detail/detail-desktop-failure.png) (extra) |
| P7-14 | [`evidence/issue-4/green-authorization.txt`](evidence/issue-4/green-authorization.txt) |
| P7-15 | [`evidence/issue-6/green-comments-notes.txt`](evidence/issue-6/green-comments-notes.txt) (red: [`red-staff-ticket-ops.txt`](evidence/issue-6/red-staff-ticket-ops.txt)) |

## Answer Part 8

*Working Administrator User Management UI.*

| Row | Evidence |
|---|---|
| P8-01 | [`screenshots/user-management/users-desktop-list.png`](screenshots/user-management/users-desktop-list.png) |
| P8-02 | [`screenshots/user-management/users-desktop-search.png`](screenshots/user-management/users-desktop-search.png) |
| P8-03 | [`screenshots/user-management/users-desktop-role-filter.png`](screenshots/user-management/users-desktop-role-filter.png) |
| P8-04 | [`screenshots/user-management/users-desktop-create-filled.png`](screenshots/user-management/users-desktop-create-filled.png), [`users-desktop-create-success.png`](screenshots/user-management/users-desktop-create-success.png) |
| P8-05 | [`screenshots/user-management/users-desktop-duplicate-email.png`](screenshots/user-management/users-desktop-duplicate-email.png) |
| P8-06 | [`screenshots/final/part8/users-invalid-input.png`](screenshots/final/part8/users-invalid-input.png) (a bad email and a short password, each message under its field); at all three widths [`screenshots/states/users-desktop-validation.png`](screenshots/states/users-desktop-validation.png), [`tablet`](screenshots/states/users-tablet-validation.png), [`mobile`](screenshots/states/users-mobile-validation.png) |
| P8-07 | [`screenshots/user-management/users-desktop-edit-success.png`](screenshots/user-management/users-desktop-edit-success.png) |
| P8-08 | [`screenshots/user-management/users-desktop-password-reset-success.png`](screenshots/user-management/users-desktop-password-reset-success.png) |
| P8-09 | [`screenshots/user-management/users-desktop-self-deactivation-disabled.png`](screenshots/user-management/users-desktop-self-deactivation-disabled.png) |
| P8-10 | [`screenshots/user-management/users-desktop-last-administrator.png`](screenshots/user-management/users-desktop-last-administrator.png) |
| P8-11 | [`screenshots/user-management/users-desktop-forbidden.png`](screenshots/user-management/users-desktop-forbidden.png) |
| P8-12 | [`evidence/issue-7/green-users-admin.txt`](evidence/issue-7/green-users-admin.txt) |
| P8-13 | [`screenshots/user-management/users-mobile-cards.png`](screenshots/user-management/users-mobile-cards.png) |
| P8-14 | [`screenshots/final/part8/users-failure.png`](screenshots/final/part8/users-failure.png) (the create request aborted in the browser; generic message, values kept); the list failure at all three widths [`screenshots/states/users-desktop-failure.png`](screenshots/states/users-desktop-failure.png), [`tablet`](screenshots/states/users-tablet-failure.png), [`mobile`](screenshots/states/users-mobile-failure.png) |

## Answer Part 9

*Zen Green UI and responsive evidence.*

| Row | Evidence |
|---|---|
| P9-01 | [`../../docs/lab-03/ui-spec.md`](../../docs/lab-03/ui-spec.md) rendered on `main`: title and Section 1 [`screenshots/github/2026-10-05-main-ui-spec.png`](screenshots/github/2026-10-05-main-ui-spec.png); Section 2 Color tokens [`b`](screenshots/github/2026-10-05-main-ui-spec-b.png); Section 9 Application shell [`c`](screenshots/github/2026-10-05-main-ui-spec-c.png). |
| P9-02 | Every major Lab 3 screen at 1280, 834 and 390 px: the `ui-spec.md` section 23 captures in [`screenshots/`](screenshots/)'s four Lab 3 folders, regenerated in Issue #12 on a freshly migrated and seeded `toktickit_evidence`, and every `Y` state of `ui-spec.md` section 20 at all three widths - IT Staff Ticket Detail and the Requester screens included - in [`screenshots/states/`](screenshots/states/) (map in `tests.md` section 5). |
| P9-03 | **Manual, 42 of 42.** [`../../docs/lab-03/ui-spec.md`](../../docs/lab-03/ui-spec.md) section 24 re-judged on 2026-10-06 at 1280, 834 and 390 px; each row names its proving file, and [`../../docs/lab-03/tests.md`](../../docs/lab-03/tests.md) section 5 holds the per-group totals and the section 20 cell map. The five UI defects of the 2026-10-05 judgement were fixed in [#60](https://github.com/Tammathorn/toktickit/pull/60) / [#61](https://github.com/Tammathorn/toktickit/pull/61), with four further gaps the new captures exposed, each red then green ([`evidence/issue-12/`](evidence/issue-12/)). Accessibility proof: [`a11y/`](a11y/) (ARIA snapshots, full Tab-cycle focus walks, `aria-current`, four modal traps); greyscale copies: [`screenshots/greyscale/`](screenshots/greyscale/). |

**P9-02 responsive set: every tablet (834 px) and mobile (390 px) capture, by folder** (desktop captures are in Parts 5 to 8).

- `authentication/` (32 files): [change-password-mobile-initial](screenshots/authentication/change-password-mobile-initial.png), [change-password-mobile-success](screenshots/authentication/change-password-mobile-success.png), [change-password-mobile-validation](screenshots/authentication/change-password-mobile-validation.png), [change-password-tablet-initial](screenshots/authentication/change-password-tablet-initial.png), [change-password-tablet-success](screenshots/authentication/change-password-tablet-success.png), [change-password-tablet-validation](screenshots/authentication/change-password-tablet-validation.png), [forbidden-mobile-requester-at-queue](screenshots/authentication/forbidden-mobile-requester-at-queue.png), [forbidden-tablet-requester-at-queue](screenshots/authentication/forbidden-tablet-requester-at-queue.png), [login-mobile-failure](screenshots/authentication/login-mobile-failure.png), [login-mobile-inactive-account](screenshots/authentication/login-mobile-inactive-account.png), [login-mobile-initial](screenshots/authentication/login-mobile-initial.png), [login-mobile-invalid-credentials](screenshots/authentication/login-mobile-invalid-credentials.png), [login-mobile-submitting](screenshots/authentication/login-mobile-submitting.png), [login-mobile-validation](screenshots/authentication/login-mobile-validation.png), [login-tablet-failure](screenshots/authentication/login-tablet-failure.png), [login-tablet-inactive-account](screenshots/authentication/login-tablet-inactive-account.png), [login-tablet-initial](screenshots/authentication/login-tablet-initial.png), [login-tablet-invalid-credentials](screenshots/authentication/login-tablet-invalid-credentials.png), [login-tablet-submitting](screenshots/authentication/login-tablet-submitting.png), [login-tablet-validation](screenshots/authentication/login-tablet-validation.png), [logout-mobile-back-button](screenshots/authentication/logout-mobile-back-button.png), [logout-mobile-blocked-after](screenshots/authentication/logout-mobile-blocked-after.png), [logout-mobile-signed-out](screenshots/authentication/logout-mobile-signed-out.png), [logout-tablet-back-button](screenshots/authentication/logout-tablet-back-button.png), [logout-tablet-blocked-after](screenshots/authentication/logout-tablet-blocked-after.png), [logout-tablet-signed-out](screenshots/authentication/logout-tablet-signed-out.png), [shell-mobile-administrator](screenshots/authentication/shell-mobile-administrator.png), [shell-mobile-it-staff](screenshots/authentication/shell-mobile-it-staff.png), [shell-mobile-requester](screenshots/authentication/shell-mobile-requester.png), [shell-tablet-administrator](screenshots/authentication/shell-tablet-administrator.png), [shell-tablet-it-staff](screenshots/authentication/shell-tablet-it-staff.png), [shell-tablet-requester](screenshots/authentication/shell-tablet-requester.png)
- `staff-queue/` (22 files): [queue-mobile-empty](screenshots/staff-queue/queue-mobile-empty.png), [queue-mobile-failure](screenshots/staff-queue/queue-mobile-failure.png), [queue-mobile-filters](screenshots/staff-queue/queue-mobile-filters.png), [queue-mobile-forbidden](screenshots/staff-queue/queue-mobile-forbidden.png), [queue-mobile-loading](screenshots/staff-queue/queue-mobile-loading.png), [queue-mobile-no-results](screenshots/staff-queue/queue-mobile-no-results.png), [queue-mobile-page-2](screenshots/staff-queue/queue-mobile-page-2.png), [queue-mobile-populated](screenshots/staff-queue/queue-mobile-populated.png), [queue-mobile-search](screenshots/staff-queue/queue-mobile-search.png), [queue-mobile-sorted](screenshots/staff-queue/queue-mobile-sorted.png), [queue-mobile-unassigned](screenshots/staff-queue/queue-mobile-unassigned.png), [queue-tablet-empty](screenshots/staff-queue/queue-tablet-empty.png), [queue-tablet-failure](screenshots/staff-queue/queue-tablet-failure.png), [queue-tablet-filters](screenshots/staff-queue/queue-tablet-filters.png), [queue-tablet-forbidden](screenshots/staff-queue/queue-tablet-forbidden.png), [queue-tablet-loading](screenshots/staff-queue/queue-tablet-loading.png), [queue-tablet-no-results](screenshots/staff-queue/queue-tablet-no-results.png), [queue-tablet-page-2](screenshots/staff-queue/queue-tablet-page-2.png), [queue-tablet-populated](screenshots/staff-queue/queue-tablet-populated.png), [queue-tablet-search](screenshots/staff-queue/queue-tablet-search.png), [queue-tablet-sorted](screenshots/staff-queue/queue-tablet-sorted.png), [queue-tablet-unassigned](screenshots/staff-queue/queue-tablet-unassigned.png)
- `staff-ticket-detail/`: the section 23 set is desktop only; the screen's every state at 834 and 390 px is in [`screenshots/states/`](screenshots/states/) (`staff-detail-<vp>-*.png`).
- `user-management/` (12 files): [users-mobile-cards](screenshots/user-management/users-mobile-cards.png), [users-mobile-duplicate-email](screenshots/user-management/users-mobile-duplicate-email.png), [users-mobile-forbidden](screenshots/user-management/users-mobile-forbidden.png), [users-tablet-duplicate-email](screenshots/user-management/users-tablet-duplicate-email.png), [users-tablet-edit-success](screenshots/user-management/users-tablet-edit-success.png), [users-tablet-forbidden](screenshots/user-management/users-tablet-forbidden.png), [users-tablet-last-administrator](screenshots/user-management/users-tablet-last-administrator.png), [users-tablet-list](screenshots/user-management/users-tablet-list.png), [users-tablet-password-reset-success](screenshots/user-management/users-tablet-password-reset-success.png), [users-tablet-role-filter](screenshots/user-management/users-tablet-role-filter.png), [users-tablet-search](screenshots/user-management/users-tablet-search.png), [users-tablet-self-deactivation-disabled](screenshots/user-management/users-tablet-self-deactivation-disabled.png)

`tests.md` rendered on `main` (Parts 3 and 9 reference it): [`screenshots/github/2026-10-05-main-tests.png`](screenshots/github/2026-10-05-main-tests.png), Section 3 traceability [`screenshots/github/2026-10-05-main-tests-b.png`](screenshots/github/2026-10-05-main-tests-b.png).

---

## Known gaps

- **P1-04** Fixing: no card ever entered Fixing (explained in Part 1), so there is nothing true to capture.
- **No CI.** The repository has no `.github/` directory and no GitHub Actions workflow or run; the passing output from `main` (P3-02) is local test output in `test-output/`, headed with the command, date and commit hash, the same as Lab 2.

Disclosures, not gaps: [#60](https://github.com/Tammathorn/toktickit/pull/60) and [#61](https://github.com/Tammathorn/toktickit/pull/61) were self-merged after the review period and not peer-reviewed; the Queue's and User Management's true Empty states are captured from a mocked empty response, as their `-mocked` file names say.
