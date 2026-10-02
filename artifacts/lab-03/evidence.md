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
#44 E2E and visual evidence, #45 release.

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
| P1-04 | Board mid-sprint with a card in Fixing | GitHub capture, board | `screenshots/github/<date>-board-fixing.png` | the first Issue that moves to Fixing | pending |
| P1-05 | Board each time a card moves to PR Review, Fixing or Done | GitHub capture, board | `screenshots/github/<date>-board-<state>.png` | every Issue | pending |
| P1-06 | Review thread while open: PR #46, the reviewer's comment and the author's reply | GitHub capture, PR conversation | `screenshots/github/2026-10-02-pr46-review-open.png` | #37 | captured |
| P1-07 | PR #47 open, before review | GitHub capture, PR conversation | `screenshots/github/2026-10-02-pr47-open.png` | #38 | captured |
| P1-08 | Approval on every Issue PR | GitHub capture, PR conversation | `screenshots/github/<date>-pr<N>-approved.png` | every Issue | manual - the reviewer approves; the capture follows |
| P1-09 | Rendered `reviewer.md`: reviewer identity, PR links both ways, comments, responses, approvals | Rendered document | `docs/lab-03/reviewer.md` | #37 onward, completed in #45 | pending - waits for PAKATO's approval |
| P1-10 | README and `.gitignore` | Repository files, rendered | `README.md`, `.gitignore` | #45 | pending |
| P1-11 | Repository directory structure | Terminal output | `evidence/issue-9/directory-tree.txt` | #45 | pending |

## Part 2 - Spec DD (5)

| Row | Requirement | Evidence type | File | Issue | Status |
|---|---|---|---|---|---|
| P2-01 | Rendered `specification.md`: numbered FR, BR, authorization matrix, AC, migration decisions, Definition of Done | Rendered document | `docs/lab-03/specification.md` | #37 | pending - written; rendered capture after merge |
| P2-02 | The specification existed before the main implementation PRs completed: merged-PR time of #46 | GitHub capture, merged PR | `screenshots/github/<date>-pr46-merged.png` | #37 | pending - #46 not yet approved |

## Part 3 - Test DD and Traceability (10)

| Row | Requirement | Evidence type | File | Issue | Status |
|---|---|---|---|---|---|
| P3-01 | Rendered `tests.md`: planned tests, AC traceability, real file paths, Final status | Rendered document | `docs/lab-03/tests.md` | #37, Final column in #45 | pending |
| P3-02 | Every suite passing on `main`: unit, API, UI, authorization, regression, E2E | Terminal output | `evidence/issue-9/main-server.txt`, `main-client.txt`, `main-e2e.txt` | #45 | pending |
| P3-03 | Migration red run, written first | Terminal output | `migration/red-run-migration-tests.txt` | #38 | captured |
| P3-04 | Migration rehearsal before and after counts, zero-drift diff | Terminal output | `migration/rehearsal-before.txt`, `rehearsal-deploy.txt`, `rehearsal-after.txt`, `rehearsal-drift.txt`, `rehearsal-seed.txt`, `rehearsal-summary.md` | #38 | captured |
| P3-05 | Dev database before and after the migration | Terminal output | `migration/dev-before-counts.txt`, `migration/dev-after-counts.txt` | #38 | captured |
| P3-06 | Authentication red run, then green | Terminal output | `evidence/issue-3/red-*.txt`, `evidence/issue-3/green-*.txt` | #39 | pending |
| P3-07 | Red and green runs for each later Issue | Terminal output | `evidence/issue-<N>/red-*.txt`, `green-*.txt` | #40 to #44 | pending |

## Part 4 - AI Use with Reflection (5)

| Row | Requirement | Evidence type | File | Issue | Status |
|---|---|---|---|---|---|
| P4-01 | Rendered `ai-use.md`: the LLM named, 6-10 key prompts, "My Reflection" on the specification agent and the coding agent | Rendered document | `docs/lab-03/ai-use.md` | every Issue adds prompts; #45 completes | pending |

## Part 5 - Working Login and Password Change UI (5)

| Row | Requirement | Evidence type | File | Issue | Status |
|---|---|---|---|---|---|
| P5-01 | Valid login: the Login screen, then the authenticated application | Playwright capture | `screenshots/authentication/login-desktop-initial.png`, `screenshots/authentication/shell-desktop-requester.png` | #39 | pending |
| P5-02 | Invalid login: field validation, and the generic invalid-credentials message | Playwright capture | `screenshots/authentication/login-desktop-validation.png`, `screenshots/authentication/login-desktop-invalid-credentials.png` | #39 | pending |
| P5-03 | Inactive account: the distinct inactive-account message | Playwright capture | `screenshots/authentication/login-desktop-inactive-account.png` | #39 | pending |
| P5-04 | Busy state: `Signing in…`, button and fields disabled. The real request is held open for the capture | Playwright capture | `screenshots/authentication/login-desktop-submitting.png` | #39 | pending |
| P5-05 | Safe failure: the `INTERNAL_ERROR` banner with `Retry`. Network failure produced by `route.abort` | Playwright capture | `screenshots/authentication/login-desktop-failure.png` | #39 | pending |
| P5-06 | Mandatory first-password change: the gate, the stated rules, a validation failure, success | Playwright capture | `screenshots/authentication/change-password-desktop-initial.png`, `change-password-desktop-validation.png`, `change-password-desktop-success.png` | #39 | pending |
| P5-07 | Authenticated user's name and Role badge in the shell, Requester | Playwright capture | `screenshots/authentication/shell-desktop-requester.png` | #39 | pending |
| P5-08 | Name and Role badge in the shell, IT Staff and Administrator | Playwright capture | `screenshots/authentication/shell-desktop-it-staff.png`, `shell-desktop-administrator.png` | #40 - each role's landing screen arrives with role navigation | pending |
| P5-09 | Logout returns to Login | Playwright capture | `screenshots/authentication/logout-desktop-signed-out.png` **(extra)** | #39 | pending |
| P5-10 | Direct URL blocked after logout | Playwright capture | `screenshots/authentication/logout-desktop-blocked-after.png` | #39 | pending |
| P5-11 | Back button after logout returns to Login | Playwright capture | `screenshots/authentication/logout-desktop-back-button.png` **(extra)** | #39 | pending |
| P5-12 | API 401 with the same cookie after logout; the `Set-Cookie` flags; `/api/auth/me` 200 with the cookie | Terminal output | `evidence/issue-3/session-cookie-proof.txt` | #39 | pending |
| P5-13 | The authentication API and UI tests passing | Terminal output | `evidence/issue-3/green-server.txt`, `evidence/issue-3/green-client.txt`, `evidence/issue-3/green-e2e.txt` | #39 | pending |

## Part 6 - Working IT Staff Ticket Queue UI (5)

Captured in #41 while the states exist. The final set is regenerated in #44 on a freshly migrated
and seeded database (`CLAUDE.md`).

| Row | Requirement | Evidence type | File | Issue | Status |
|---|---|---|---|---|---|
| P6-01 | Realistic queue data, with status and priority badges | Playwright capture | `screenshots/staff-queue/queue-desktop-populated.png` | #41, final #44 | pending |
| P6-02 | Search | Playwright capture | `screenshots/staff-queue/queue-desktop-search.png` | #41, final #44 | pending |
| P6-03 | Filters | Playwright capture | `screenshots/staff-queue/queue-desktop-filters.png` | #41, final #44 | pending |
| P6-04 | Sorting | Playwright capture | `screenshots/staff-queue/queue-desktop-sorted.png` | #41, final #44 | pending |
| P6-05 | Pagination | Playwright capture | `screenshots/staff-queue/queue-desktop-page-2.png` | #41, final #44 | pending |
| P6-06 | Assigned and unassigned ownership | Playwright capture | `screenshots/staff-queue/queue-desktop-unassigned.png`, with owned rows in `queue-desktop-populated.png` | #41, final #44 | pending |
| P6-07 | The open-detail action | Playwright capture | `screenshots/staff-queue/queue-desktop-open-detail.png` **(extra)** | #41, final #44 | pending |
| P6-08 | Empty, no-results and failure feedback; loading | Playwright capture | `screenshots/staff-queue/queue-desktop-empty.png`, `queue-desktop-no-results.png`, `queue-desktop-failure.png`, `queue-desktop-loading.png` | #41, final #44 | pending |
| P6-09 | Responsive behaviour: table at desktop, six columns at tablet, cards at mobile | Playwright capture | `screenshots/staff-queue/queue-<vp>-populated.png` at all three | #41, final #44 | pending |

## Part 7 - Working IT Staff Ticket Detail UI (10)

| Row | Requirement | Evidence type | File | Issue | Status |
|---|---|---|---|---|---|
| P7-01 | Claim, on an unassigned Ticket, and the owned result | Playwright capture | `screenshots/staff-ticket-detail/detail-desktop-unassigned.png`, `detail-desktop-owned.png` | #42 | pending |
| P7-02 | The lost claim race | Playwright capture | `screenshots/staff-ticket-detail/detail-desktop-claim-conflict.png` | #42 | pending |
| P7-03 | Reassign | Playwright capture | `screenshots/staff-ticket-detail/detail-desktop-reassigned.png` **(extra)** | #42 | pending |
| P7-04 | IT Priority | Playwright capture | `screenshots/staff-ticket-detail/detail-desktop-it-priority.png` | #42 | pending |
| P7-05 | Permitted status changes and the Resolved/Closed/Cancelled confirmation | Playwright capture | `screenshots/staff-ticket-detail/detail-desktop-status-menu.png`, `detail-desktop-status-confirm.png` | #42 | pending |
| P7-06 | A refused status change | Playwright capture | `screenshots/staff-ticket-detail/detail-desktop-status-refused.png` | #42 | pending |
| P7-07 | Public Comments and Internal Notes, visibly distinct, in one frame | Playwright capture | `screenshots/staff-ticket-detail/detail-desktop-comments-and-notes.png` | #42 | pending |
| P7-08 | Attachment continuity on staff detail | Playwright capture | `screenshots/staff-ticket-detail/detail-desktop-attachments.png` **(extra)** | #42 | pending |
| P7-09 | Requester resolution indication, seen by staff | Playwright capture | `screenshots/staff-ticket-detail/detail-desktop-requester-resolved.png` | #42 | pending |
| P7-10 | Inactive owner marker; terminal Ticket read-only | Playwright capture | `screenshots/staff-ticket-detail/detail-desktop-inactive-owner.png`, `detail-desktop-terminal.png` | #42 | pending |
| P7-11 | Role restrictions in the browser: a Requester refused the queue | Playwright capture | `screenshots/staff-queue/queue-desktop-forbidden.png` | #40 builds the forbidden state, #41 the queue | pending |
| P7-12 | Validation: an empty comment refused | Playwright capture | `screenshots/staff-ticket-detail/detail-desktop-empty-comment.png` **(extra)** | #42 | pending |
| P7-13 | Safe failure on staff detail | Playwright capture | `screenshots/staff-ticket-detail/detail-desktop-failure.png` **(extra)** | #42 | pending |
| P7-14 | Direct API authorization evidence: the SEC suite, route inventory included | Terminal output | `evidence/issue-4/green-authorization.txt` | #40 | pending |
| P7-15 | Direct API: `Requester GET /api/tickets/:id/internal-notes -> 403, no note content` | Terminal output | `evidence/issue-6/green-comments-notes.txt` | #42 | pending |

## Part 8 - Working Administrator User Management UI (5)

| Row | Requirement | Evidence type | File | Issue | Status |
|---|---|---|---|---|---|
| P8-01 | User list: Name, Email, Role, Status, Edit | Playwright capture | `screenshots/user-management/users-desktop-populated.png` | #43 | pending |
| P8-02 | Search by name or email | Playwright capture | `screenshots/user-management/users-desktop-search.png` | #43 | pending |
| P8-03 | Optional role filter | Playwright capture | `screenshots/user-management/users-desktop-role-filter.png` | #43 | pending |
| P8-04 | Create a user with one permitted role and an initial password | Playwright capture | `screenshots/user-management/users-desktop-create.png` | #43 | pending |
| P8-05 | Duplicate-email validation | Playwright capture | `screenshots/user-management/users-desktop-duplicate-email.png` | #43 | pending |
| P8-06 | Invalid-input validation | Playwright capture | `screenshots/user-management/users-desktop-invalid-input.png` **(extra)** | #43 | pending |
| P8-07 | Edit name, email, role and activation state | Playwright capture | `screenshots/user-management/users-desktop-edit.png` | #43 | pending |
| P8-08 | Set a new initial password, then the required change at next login | Playwright capture | `screenshots/user-management/users-desktop-initial-password.png`, `screenshots/user-management/change-password-desktop-after-reset.png` **(extra)** | #43 | pending |
| P8-09 | Self-deactivation prevented | Playwright capture | `screenshots/user-management/users-desktop-self-deactivation.png` | #43 | pending |
| P8-10 | Removing the last active Administrator prevented | Playwright capture | `screenshots/user-management/users-desktop-last-administrator.png` | #43 | pending |
| P8-11 | Non-Administrator forbidden, in the UI | Playwright capture | `screenshots/user-management/users-desktop-forbidden.png` | #43 | pending |
| P8-12 | Non-Administrator forbidden, at the API | Terminal output | `evidence/issue-7/green-users-admin.txt` | #43 | pending |
| P8-13 | Responsive Zen Green presentation, mobile layout | Playwright capture | `screenshots/user-management/users-mobile-populated.png` | #43, final #44 | pending |
| P8-14 | Safe failure feedback | Playwright capture | `screenshots/user-management/users-desktop-failure.png` **(extra)** | #43 | pending |

## Part 9 - Zen Green UI and Responsive Evidence (5)

| Row | Requirement | Evidence type | File | Issue | Status |
|---|---|---|---|---|---|
| P9-01 | Rendered `ui-spec.md` | Rendered document | `docs/lab-03/ui-spec.md` | #37 | pending - written; rendered capture after merge |
| P9-02 | Desktop, tablet and mobile screenshots of every major Lab 3 screen | Playwright capture | every `ui-spec.md` section 23 file at all three `<vp>` | #44, on a freshly migrated and seeded database | pending |
| P9-03 | The completed visual checklist: design consistency, role navigation, badges, editable and read-only fields, validation placement, focus, clipping, overlap, horizontal overflow | Checklist, measured in the browser | `docs/lab-03/tests.md` section 5 (VIS-01), against `ui-spec.md` section 24 | #44 | manual |
