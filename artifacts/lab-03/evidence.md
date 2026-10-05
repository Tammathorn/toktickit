# Lab 3 Evidence Index

TokTickIT - CPE 334 Individual Sprint 3.
Owner: Tammathorn Kananurak (67070503489).

Every requirement of labsheet section 14, Parts 1 to 9, mapped to the file that evidences it,
the Issue that produces it, and its status. The PDF is assembled from this table. The rules
that govern it are in `CLAUDE.md`, section "Evidence".

| Status | Meaning |
|---|---|
| `captured` | The file exists in the repository and shows the state the row names |
| `pending` | Not yet captured. The producing Issue's PR is not ready while its rows are pending |
| `manual` | Produced or judged by a person, not by a script - a checklist, a review, an approval |

Paths are relative to `artifacts/lab-03/` unless they start with `docs/`, `server/`, `client/`,
`e2e/` or a repository-root file name. `<vp>` is `desktop`, `tablet` or `mobile` (1280, 834 and
390 px, C-90). Screenshot names are the ones `docs/lab-03/ui-spec.md` section 23 fixes. A name
marked **(extra)** is not in section 23 and follows its pattern,
`<folder>/<screen>-<viewport>-<state>.png`.

Issues: #37 contract, #38 migration, #39 authentication, #40 authorization and Requester
regression, #41 IT Staff Ticket Queue, #42 IT Staff ticket operations, #43 user management,
#44 E2E and visual evidence, #45 release. In `evidence/issue-<N>/`, N is the Lab 3 Issue index
1 to 9 used in the branch names (`feature/lab3-N-slug`), not the GitHub number: Issue #39 writes
to `evidence/issue-3/`.

**Rows that only exist after a PR is opened or merged** - an approval, a merge time, a board
move to Done, a rendered document on `main` - are owned by the Issue named in the row and are
captured when the event happens. They are listed so they are not forgotten; they cannot be
captured before the PR they depend on.

**How failure and busy states are produced.** As in Lab 2, a Playwright spec produces a
failure state by aborting the request in the browser (`route.abort("connectionrefused")`), so
the screen meets a real network failure, and a busy state by holding the real request open
until the capture is taken, then letting it through to the real API. Neither edits the
response the API would have sent, and every such capture says so in its row.

---

## Part 1 - Git Use with Engineering Workflow (10)

| Row | Requirement | Evidence type | File | Issue | Status |
|---|---|---|---|---|---|
| P1-01 | Commit history: feature branches merged into `lab3-staging`, then `main` | GitHub capture, commit graph | `screenshots/github/<date>-commit-graph.png` | #45 | pending |
| P1-02 | Final GitHub Project board with every Issue in Done | GitHub capture, board | `screenshots/github/<date>-board-all-done.png` | #45 | pending |
| P1-03 | Board mid-sprint with cards in PR Review | GitHub capture, board | `screenshots/github/2026-10-02-board-pr-review.png` | #37, #38 | captured |
| P1-04 | Board mid-sprint with a card in Fixing. Captured by whichever Issue first moves to Fixing | GitHub capture, board | `screenshots/github/<date>-board-fixing.png` | #37 to #45 | pending |
| P1-05 | Board each time a card moves to PR Review, Fixing or Done. Captured so far: #39 to PR Review, `screenshots/github/2026-10-04-board-39-pr-review.png`; #40 to PR Review, `screenshots/github/2026-10-04-board-40-pr-review.png`; #41 to PR Review, `screenshots/github/2026-10-04-board-41-pr-review.png`; #42 to PR Review, `screenshots/github/2026-10-04-board-42-pr-review.png`; #38 to Done, `screenshots/github/2026-10-05-board-38-done.png`; #39 to Done, `screenshots/github/2026-10-05-board-39-done.png`; #40 to Done, `screenshots/github/2026-10-05-board-40-done.png`; #41 to Done, `screenshots/github/2026-10-05-board-41-done.png`; #42 to Done, `screenshots/github/2026-10-05-board-42-done.png`; #43 to Done, `screenshots/github/2026-10-05-board-43-done.png`; #44 to Done, `screenshots/github/2026-10-05-board-44-done.png`. The #37 card also moved to Done on 2026-10-05; its own board capture was taken while the public board page still showed the pre-move state, so it was discarded and not kept. #45 to Done is pending | GitHub capture, board | `screenshots/github/<date>-board-<state>.png` | every Issue | pending |
| P1-06 | Review thread while open: PR #46, the reviewer's comment and the author's reply | GitHub capture, PR conversation | `screenshots/github/2026-10-02-pr46-review-open.png` | #37 | captured |
| P1-07 | PR #47 open, before review | GitHub capture, PR conversation | `screenshots/github/2026-10-02-pr47-open.png` | #38 | captured |
| P1-08 | Approval on every Issue PR. The reviewer approves; the capture follows the approval | GitHub capture, PR conversation | `screenshots/github/<date>-pr<N>-approved.png`; for #46 to #53 the approval is visible in the merged-PR captures `screenshots/github/2026-10-05-pr<N>-merged.png`, taken after the batched approvals; no separate pre-merge capture exists | every Issue | pending |
| P1-09 | Rendered `reviewer.md`: reviewer identity, PR links both ways, comments, responses, approvals | Rendered document | `docs/lab-03/reviewer.md` | #37 onward, completed in #45 | captured - the document, the identities, PR #46's comment/reply and all nine PR links exist; the approvals column is honestly empty because PAKATO's batched review (C-110) has not happened yet, not because it was skipped in the writing |
| P1-10 | README and `.gitignore` | Repository files, rendered | `README.md`, `.gitignore` | #45 | captured |
| P1-11 | Repository directory structure | Terminal output | `evidence/issue-9/directory-tree.txt` | #45 | captured |
| P1-12 | The second release PR, #59 (`lab3-staging` into `main`, the E2E-07 fix), approved by the reviewer and merged with a merge commit (`347e25e`), the same method as #55. Headless Playwright, full page at 1280 px, taken after the merge: the "Merged" badge, the reviewer's approval, the commit line `merged commit 347e25e into main`, and "Checks 0" (the repository has no CI workflow, see P3-02) | GitHub capture, merged PR | `screenshots/github/2026-10-05-pr59-merged.png` | #56, #59 | captured |

## Part 2 - Spec DD (5)

| Row | Requirement | Evidence type | File | Issue | Status |
|---|---|---|---|---|---|
| P2-01 | Rendered `specification.md`: numbered FR, BR, authorization matrix, AC, migration decisions, Definition of Done. Written in #37; the rendered capture is taken on `main` | Rendered document | `docs/lab-03/specification.md` | #37, rendered in #45 | pending |
| P2-02 | The specification existed before the main implementation PRs completed: the merge time of #46 set beside the later merge times of the implementation PRs, and the commit graph | GitHub capture, merged PRs and graph | `screenshots/github/2026-10-05-pr46-merged.png`, `screenshots/github/2026-10-05-pr47-merged.png`, `screenshots/github/2026-10-05-pr48-merged.png`, `screenshots/github/2026-10-05-pr49-merged.png`, `screenshots/github/2026-10-05-pr50-merged.png`, `screenshots/github/2026-10-05-pr51-merged.png`, `screenshots/github/2026-10-05-pr52-merged.png`, `screenshots/github/2026-10-05-pr53-merged.png` captured; `screenshots/github/<date>-pr54-merged.png` and `screenshots/github/<date>-commit-graph.png` pending | #37, completed in #45 | pending |

## Part 3 - Test DD and Traceability (10)

| Row | Requirement | Evidence type | File | Issue | Status |
|---|---|---|---|---|---|
| P3-01 | Rendered `tests.md`: planned tests, AC traceability, real file paths, Final status | Rendered document | `docs/lab-03/tests.md` | #37, Final column in #45 | captured - every section 2 row's `Final` column filled, citing the real run and commit that produced it (`issue-9/server-green.txt`, `client-green.txt`, commit `43b737c`; e2e rows cite `issue-8/e2e-suite-final-green.txt`, commit `dc1d105`). Section 7's suite-totals table stays blank - its own text ties it to the release branch, a later milestone |
| P3-02 | Every suite passing on `main`: unit, API, UI, authorization, regression, E2E. **The repository has no CI** (no `.github/` directory, no GitHub Actions workflow or run, and the Lab 2 scaffold answered "GitHub Actions no"), so these are local runs on `main` at `347e25e`, the merge commit of #59, with the real commit hash and date at the top of each file. Results: server **297 passed**, client **119 passed**, e2e (`e2e/lab-03`, three viewports) **92 passed, 28 skipped, 0 failed**, E2E-07 passing at desktop, tablet and mobile. The 28 skips are the viewport-gated `test.skip` calls in the specs (desktop-only functional flows, single-viewport RESP checks), not disabled tests | Terminal output | `test-output/main-server.txt` - `cd server && npm test`, Vitest + Supertest against `toktickit_test`, 15 files, full per-file output; `test-output/main-client.txt` - `cd client && npm test`, Vitest + Testing Library, 10 files, full per-test output; `test-output/main-e2e.txt` - `npx playwright test e2e/lab-03 --project=desktop --project=tablet --project=mobile`, the Lab 3 Playwright specs plus the three role sign-ins of the `setup` project, list reporter; `test-output/main-e2e-full.txt` - `npm run test:e2e`, every spec under `e2e/` (Lab 2 and Lab 3), **200 passed, 28 skipped, 0 failed**, the Lab 2 specs adding the other 108 | #45, run again on `main` after #59 | captured |
| P3-09 | The two earlier release-day runs, kept as history. `evidence/main/` is `main` at `fc29ca4` (after #55, before the fix): server 297, client 118, e2e 89 passed / 28 skipped / **3 failed** (E2E-07, once per viewport) - the failing state the fix in #56 and #57 answers. `evidence/staging/` is `lab3-staging` at `f523f49` (after #57, before #59 merged): the same suites green. Each summary is the command, date and commit hash, then the totals (and for the failing run, the failure list). Neither is the passing-output-from-main evidence; P3-02 is | Terminal output | `evidence/main/server-summary.txt`, `client-summary.txt`, `e2e-summary.txt`, `directory-tree.txt` (tracked files at `fc29ca4`), `git-log-graph.txt` (`git log --graph --oneline --all` at `fc29ca4`); `evidence/staging/server-summary.txt`, `client-summary.txt`, `e2e-summary.txt` | #56, #57 | captured |
| P3-03 | Migration red run, written first. Captured before the header rule existed, so it carries no command/date/commit header | Terminal output | `migration/red-run-migration-tests.txt` | #38 | captured |
| P3-04 | Migration rehearsal before and after counts, zero-drift diff | Terminal output | `migration/rehearsal-before.txt`, `rehearsal-deploy.txt`, `rehearsal-after.txt`, `rehearsal-drift.txt`, `rehearsal-seed.txt`, `rehearsal-summary.md` | #38 | captured |
| P3-05 | Dev database before and after the migration | Terminal output | `migration/dev-before-counts.txt`, `migration/dev-after-counts.txt` | #38 | captured |
| P3-06 | Authentication red run, then green. The server and client tests were committed and run red before the code existed; the E2E spec was written after the screens, so its evidence is the green run only | Terminal output | `evidence/issue-3/red-server-auth.txt`, `evidence/issue-3/red-client-auth.txt`, `evidence/issue-3/green-server.txt`, `evidence/issue-3/green-client.txt`, `evidence/issue-3/green-e2e.txt` | #39 | captured |
| P3-07 | Red and green runs for each later Issue | Terminal output | `evidence/issue-<N>/red-*.txt`, `green-*.txt`. #42 API half: `evidence/issue-6/red-staff-ticket-ops.txt`, `green-staff-ticket-detail.txt`, `green-comments-notes.txt`, `green-server.txt`, `green-client.txt`; its client red and green follow with the screen. #44's share: `evidence/issue-8/server-suite-green.txt`, `client-suite-green.txt`, `e2e-suite-final-green.txt` (the full three-suite green run, post-implementation), and `e2e-evidence-db-run-red.txt` (the contention flake found and worked around while completing E2E-17/RESP-09, captured before the fix) | #40 to #44 | pending - #44's own share captured; #40..#43 unverified by this Issue |
| P3-08 | Regression: Lab 2 test counts per file, before and after, every drop matching a `tests.md` section 4.3 retirement row | Terminal output | `evidence/issue-4/lab2-inventory-before.txt`, `evidence/issue-4/lab2-inventory-after.txt` | #40 | captured |

## Part 4 - AI Use with Reflection (5)

| Row | Requirement | Evidence type | File | Issue | Status |
|---|---|---|---|---|---|
| P4-01 | Rendered `ai-use.md`: the LLM named, 6-10 key prompts, "My Reflection" on the specification agent and the coding agent | Rendered document | `docs/lab-03/ai-use.md` | every Issue adds prompts; #45 completes | captured, except "My Reflection" - the LLM and interface are named (section 1), seven prompts are marked key prompt across Phase 1 and the new Phase 2/3 section (section 2, 4), and "My Reflection" (section 5) is left as a heading only, with nothing under it, for the author to write |

## Part 5 - Working Login and Password Change UI (5)

| Row | Requirement | Evidence type | File | Issue | Status |
|---|---|---|---|---|---|
| P5-01 | Valid login: the Login screen, then the authenticated application | Playwright capture | `screenshots/authentication/login-desktop-initial.png`, `screenshots/authentication/shell-desktop-requester.png` | #39 | captured |
| P5-02 | Invalid login: field validation, and the generic invalid-credentials message | Playwright capture | `screenshots/authentication/login-desktop-validation.png`, `screenshots/authentication/login-desktop-invalid-credentials.png` | #39 | captured |
| P5-03 | Inactive account: the distinct inactive-account message | Playwright capture | `screenshots/authentication/login-desktop-inactive-account.png` | #39 | captured |
| P5-04 | Busy state: `Signing in…`, button and fields disabled. The real request is held open for the capture, then let through | Playwright capture | `screenshots/authentication/login-desktop-submitting.png` | #39 | captured |
| P5-05 | Safe failure: the `INTERNAL_ERROR` banner with `Retry`. Network failure produced by `route.abort("connectionrefused")` | Playwright capture | `screenshots/authentication/login-desktop-failure.png` | #39 | captured |
| P5-06 | Mandatory first-password change: the gate, the stated rules, a validation failure, success. The first-login account is reset by the temporary fixture in `e2e/support/auth.ts` before and after (tests.md 2.12) | Playwright capture | `screenshots/authentication/change-password-desktop-initial.png`, `change-password-desktop-validation.png`, `change-password-desktop-success.png` | #39 | captured |
| P5-07 | Authenticated user's name and Role badge in the shell, Requester. This capture still shows the Lab 2 "Development Requester" line beside the identity, because #40 removes the selector; P5-14 re-captures it | Playwright capture | `screenshots/authentication/shell-desktop-requester.png` | #39 | captured |
| P5-08 | Name and Role badge in the shell, IT Staff and Administrator. Owned by #40 because the shell for those roles has nothing to frame until role navigation and per-role landing arrive there (handoff Issue 4) | Playwright capture | `screenshots/authentication/shell-desktop-it-staff.png`, `shell-desktop-administrator.png` | #40 | captured |
| P5-09 | Logout returns to Login | Playwright capture | `screenshots/authentication/logout-desktop-signed-out.png` **(extra)** | #39 | captured |
| P5-10 | Direct URL blocked after logout. A screenshot cannot show the address bar: E2E-04 asserts the address was `/tickets` when Login rendered | Playwright capture | `screenshots/authentication/logout-desktop-blocked-after.png` | #39 | captured |
| P5-11 | Back button after logout returns to Login | Playwright capture | `screenshots/authentication/logout-desktop-back-button.png` **(extra)** | #39 | captured |
| P5-12 | API 401 with the same cookie after logout; the `Set-Cookie` flags; `/api/auth/me` 200 with the cookie. Tokens redacted | Terminal output | `evidence/issue-3/session-cookie-proof.txt` | #39 | captured |
| P5-13 | The authentication API and UI tests passing | Terminal output | `evidence/issue-3/green-server.txt`, `evidence/issue-3/green-client.txt`, `evidence/issue-3/green-e2e.txt` | #39 | captured |
| P5-14 | The Requester shell re-captured once the selector is gone: name, Role badge and Log Out only | Playwright capture | `screenshots/authentication/shell-desktop-requester.png` | #40 | captured |

## Part 6 - Working IT Staff Ticket Queue UI (5)

Captured in #41 while the states exist. The final set is regenerated in #44 on a freshly migrated
and seeded database (`CLAUDE.md`).

| Row | Requirement | Evidence type | File | Issue | Status |
|---|---|---|---|---|---|
| P6-01 | Realistic queue data, with status and priority badges | Playwright capture | `screenshots/staff-queue/queue-desktop-populated.png` | #41, final #44 | captured |
| P6-02 | Search | Playwright capture | `screenshots/staff-queue/queue-<vp>-search.png`, all three `<vp>` | #41, final #44 | captured |
| P6-03 | Filters | Playwright capture | `screenshots/staff-queue/queue-<vp>-filters.png`, all three `<vp>` | #41, final #44 | captured |
| P6-04 | Sorting | Playwright capture | `screenshots/staff-queue/queue-<vp>-sorted.png`, all three `<vp>` | #41, final #44 | captured |
| P6-05 | Pagination | Playwright capture | `screenshots/staff-queue/queue-<vp>-page-2.png`, all three `<vp>` | #41, final #44 | captured |
| P6-06 | Assigned and unassigned ownership | Playwright capture | `screenshots/staff-queue/queue-<vp>-unassigned.png`, all three `<vp>`, with owned rows in `queue-<vp>-populated.png` | #41, final #44 | captured |
| P6-07 | The open-detail action | Playwright capture | `screenshots/staff-queue/queue-desktop-open-detail.png` **(extra)** - the row link navigates to `/queue/:id`, which is the real IT Staff Ticket Detail screen (#42) as of this Issue; the Part 7 captures (P7-01..13) are that screen's own evidence | #41, final #44 | captured |
| P6-08 | No-results, failure, loading and the genuinely-empty queue | Playwright capture | `screenshots/staff-queue/queue-<vp>-no-results.png`, `queue-<vp>-failure.png`, `queue-<vp>-loading.png`, `queue-<vp>-empty.png`, all four at all three `<vp>`. The empty state is captured with a mocked zero-row response, the same technique the loading/failure captures already use, since neither the shared dev nor the evidence database ever holds zero Tickets (tests.md E2E-08, #44) | #41, final #44 | captured |
| P6-09 | Responsive behaviour: table at desktop, six columns at tablet, cards at mobile | Playwright capture | `screenshots/staff-queue/queue-<vp>-populated.png` at all three | #41, final #44 | captured |

## Part 7 - Working IT Staff Ticket Detail UI (10)

| Row | Requirement | Evidence type | File | Issue | Status |
|---|---|---|---|---|---|
| P7-01 | Claim, on an unassigned Ticket, and the owned result | Playwright capture | `screenshots/staff-ticket-detail/detail-desktop-unassigned.png`, `detail-desktop-owned.png` | #42 | captured |
| P7-02 | The lost claim race | Playwright capture | `screenshots/staff-ticket-detail/detail-desktop-claim-conflict.png` | #42 | captured |
| P7-03 | Reassign | Playwright capture | `screenshots/staff-ticket-detail/detail-desktop-reassigned.png` **(extra)** | #42 | captured |
| P7-04 | IT Priority | Playwright capture | `screenshots/staff-ticket-detail/detail-desktop-it-priority.png` | #42 | captured |
| P7-05 | Permitted status changes and the Resolved/Closed/Cancelled confirmation | Playwright capture | `screenshots/staff-ticket-detail/detail-desktop-status-menu.png`, `detail-desktop-status-confirm.png` | #42 | captured |
| P7-06 | A refused status change | Playwright capture | `screenshots/staff-ticket-detail/detail-desktop-status-refused.png` | #42 | captured |
| P7-07 | Public Comments and Internal Notes, visibly distinct, in one frame | Playwright capture | `screenshots/staff-ticket-detail/detail-desktop-comments-and-notes.png` | #42 | captured |
| P7-08 | Attachment continuity on staff detail | Playwright capture | `screenshots/staff-ticket-detail/detail-desktop-attachments.png` **(extra)** | #42 | captured |
| P7-09 | Requester resolution indication, seen by staff | Playwright capture | `screenshots/staff-ticket-detail/detail-desktop-requester-resolved.png` | #42 | captured |
| P7-10 | Inactive owner marker; terminal Ticket read-only | Playwright capture | `screenshots/staff-ticket-detail/detail-desktop-inactive-owner.png`, `detail-desktop-terminal.png` | #42 | captured |
| P7-11 | Role restrictions in the browser: a Requester refused the queue. The forbidden state arrives in #40; the queue it refuses exists from #41 | Playwright capture | `screenshots/staff-queue/queue-<vp>-forbidden.png`, all three `<vp>` (final #44) | #41, final #44 | captured |
| P7-12 | Validation: the composer's own character-limit feedback (the counter turns danger, Post Comment stays disabled) | Playwright capture | `screenshots/staff-ticket-detail/detail-desktop-empty-comment.png` **(extra)** | #42 | captured |
| P7-13 | Safe failure on staff detail | Playwright capture | `screenshots/staff-ticket-detail/detail-desktop-failure.png` **(extra)** | #42 | captured |
| P7-14 | Direct API authorization evidence: the SEC suite, route inventory included | Terminal output | `evidence/issue-4/green-authorization.txt` | #40 | captured |
| P7-15 | Direct API: `Requester GET /api/tickets/:id/internal-notes -> 403, no note content` | Terminal output | `evidence/issue-6/green-comments-notes.txt` - SEC-04..SEC-07 and the comments-notes suite; the red run before the routes existed is `evidence/issue-6/red-staff-ticket-ops.txt` | #42 | captured |

## Part 8 - Working Administrator User Management UI (5)

| Row | Requirement | Evidence type | File | Issue | Status |
|---|---|---|---|---|---|
| P8-01 | User list: Name, Email, Role, Status, Edit | Playwright capture | `screenshots/user-management/users-desktop-list.png` | #43 | captured |
| P8-02 | Search by name or email | Playwright capture | `screenshots/user-management/users-desktop-search.png` | #43 | captured |
| P8-03 | Optional role filter | Playwright capture | `screenshots/user-management/users-desktop-role-filter.png` | #43 | captured |
| P8-04 | Create a user with one permitted role and an initial password | Playwright capture | `screenshots/user-management/users-desktop-create-filled.png`, `users-desktop-create-success.png` | #43 | captured |
| P8-05 | Duplicate-email validation | Playwright capture | `screenshots/user-management/users-desktop-duplicate-email.png` | #43 | captured |
| P8-06 | Invalid-input validation | Playwright capture | `screenshots/user-management/users-desktop-invalid-input.png` **(extra)** | #43 | pending - optional extra, not yet captured |
| P8-07 | Edit name, email, role and activation state | Playwright capture | `screenshots/user-management/users-desktop-edit-success.png` | #43 | captured |
| P8-08 | Set a new initial password, then the required change at next login | Playwright capture | `screenshots/user-management/users-desktop-password-reset-success.png` | #43 | captured |
| P8-09 | Self-deactivation prevented | Playwright capture | `screenshots/user-management/users-desktop-self-deactivation-disabled.png` | #43 | captured |
| P8-10 | Removing the last active Administrator prevented | Playwright capture | `screenshots/user-management/users-desktop-last-administrator.png` | #43 | captured |
| P8-11 | Non-Administrator forbidden, in the UI | Playwright capture | `screenshots/user-management/users-desktop-forbidden.png` | #43 | captured |
| P8-12 | Non-Administrator forbidden, at the API | Terminal output | `evidence/issue-7/green-users-admin.txt` | #43 | captured |
| P8-13 | Responsive Zen Green presentation, mobile layout | Playwright capture | `screenshots/user-management/users-mobile-cards.png` | #43, final #44 | captured |
| P8-14 | Safe failure feedback | Playwright capture | `screenshots/user-management/users-desktop-failure.png` **(extra)** | #43 | pending - optional extra, not yet captured |

## Part 9 - Zen Green UI and Responsive Evidence (5)

| Row | Requirement | Evidence type | File | Issue | Status |
|---|---|---|---|---|---|
| P9-01 | Rendered `ui-spec.md`. Written in #37; the rendered capture is taken on `main` | Rendered document | `docs/lab-03/ui-spec.md` | #37, rendered in #45 | pending |
| P9-02 | Desktop, tablet and mobile screenshots of every major Lab 3 screen | Playwright capture | Every `ui-spec.md` section 23 file at all three `<vp>`, with no exception - including `queue-<vp>-empty.png`, regenerated at all three widths via a mocked response (see P6-08) since it does not depend on real database state. The rest are regenerated by the full `e2e/lab-03` suite against a freshly migrated and `graded-seed`-seeded `toktickit_evidence` database (11 users / 9 tickets at seed time) | #44, on a freshly migrated and seeded database | captured |
| P9-03 | The completed visual checklist: design consistency, role navigation, badges, editable and read-only fields, validation placement, focus, clipping, overlap, horizontal overflow | Checklist, measured in the browser | `docs/lab-03/tests.md` section 5 (VIS-01), against `ui-spec.md` section 24. The measurable parts (touch targets >= 44px, settled focus rings, clipping, overlap, horizontal overflow) were measured directly in the browser, not read from CSS, for all 8 Lab 3 screens at all 3 viewports: `evidence/issue-8/visual-measurements.json` (raw, 24 rows), `evidence/issue-8/visual-checklist-results.txt` (summary) - 0 real failures found by those measurements. The row itself stays `manual`: VIS-01 is deliberately a human judgement against the RESP-09 captures (`LS 8.8`). **Completed result, recorded 2026-10-05:** 27 of 42 rows pass at all three widths and 15 fail at one width or more (37 failing cells; D 11, T 14, M 12), per row and per width in `docs/lab-03/ui-spec.md` section 24, summarised per group in `docs/lab-03/tests.md` section 5. Five UI defects are **open**, not fixed: the Queue table clips Current Status, Ticket Owner and Last Updated at 1280 px; the User Management table has no Edit column and its header wraps at 834 px; My Tickets has no IT Priority column at 834 px; the closed / cancelled line renders twice on a terminal Ticket; Post Comment and Add Note look identical when disabled. The other failing rows could not be judged from any capture (accessible names, `aria-current`, modal focus) or the state was not captured at 834 / 390 px. The captures the rows were judged from are `screenshots/final/vis/` (28 files, taken 2026-10-05 on a freshly migrated and seeded `toktickit_evidence`) | #44, completed in #45 | manual |
