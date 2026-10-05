# Lab 3 Report - TokTickIT

CPE 334 Individual Sprint 3 (LS 14). Author: Tammathorn Kananurak (67070503489).

This report answers labsheet section 14, Parts 1 through 9, each row linking the evidence
file `artifacts/lab-03/evidence.md` maps to it. Paths are relative to this file
(`artifacts/lab-03/`). A row evidence.md marks `pending` is listed as pending here too,
never linked to a file that does not exist; a row marked `manual` links the checklist or
review it is a human judgement against. **Items marked "after merge to main" do not exist
yet and cannot** - the release PR (`lab3-staging` into `main`) opens only after every
feature PR has merged (decision C-110), and none has merged as of this report.

---

## Answer Part 1 - Git Use with Engineering Workflow

| Row | Evidence |
|---|---|
| P1-01 | **Pending - after merge to main.** The commit graph showing every feature branch merged into `lab3-staging` then `main` cannot exist before those merges happen. |
| P1-02 | **Pending - after merge to main.** The board with every Issue in Done depends on the same merges. |
| P1-03 | [`screenshots/github/2026-10-02-board-pr-review.png`](screenshots/github/2026-10-02-board-pr-review.png) |
| P1-04 | **Pending.** Captured by whichever Issue first moves a card to Fixing; none has yet. |
| P1-05 | Captured so far: [`screenshots/github/2026-10-04-board-39-pr-review.png`](screenshots/github/2026-10-04-board-39-pr-review.png), [`...-40-pr-review.png`](screenshots/github/2026-10-04-board-40-pr-review.png), [`...-41-pr-review.png`](screenshots/github/2026-10-04-board-41-pr-review.png), [`...-42-pr-review.png`](screenshots/github/2026-10-04-board-42-pr-review.png). **Pending** for every later card move. |
| P1-06 | [`screenshots/github/2026-10-02-pr46-review-open.png`](screenshots/github/2026-10-02-pr46-review-open.png) |
| P1-07 | [`screenshots/github/2026-10-02-pr47-open.png`](screenshots/github/2026-10-02-pr47-open.png) |
| P1-08 | **Pending - after PAKATO's batched review.** Decision C-110: the reviewer approves all nine feature PRs at the end of the batch, not one partway through; none has been approved yet. |
| P1-09 | [`../../docs/lab-03/reviewer.md`](../../docs/lab-03/reviewer.md) - identities, all nine PR links, PR #46's comment and reply, each quoted verbatim. The approvals column is empty because none exist yet (see P1-08), not because it was left out. |
| P1-10 | [`../../README.md`](../../README.md), [`../../.gitignore`](../../.gitignore) |
| P1-11 | [`evidence/issue-9/directory-tree.txt`](evidence/issue-9/directory-tree.txt) |

## Answer Part 2 - Spec DD

| Row | Evidence |
|---|---|
| P2-01 | **Pending - after merge to main.** `specification.md` exists now ([`../../docs/lab-03/specification.md`](../../docs/lab-03/specification.md)) and is the real contract every Issue was built against, but the *rendered-on-main* capture this row asks for needs the release merge. |
| P2-02 | **Pending - after merge to main.** Needs the merge times of PR #46 and the implementation PRs, none of which have merged. |

## Answer Part 3 - Test DD and Traceability

| Row | Evidence |
|---|---|
| P3-01 | [`../../docs/lab-03/tests.md`](../../docs/lab-03/tests.md) - every section 2 row's `Final` column filled from a real run (server/client: [`evidence/issue-9/server-green.txt`](evidence/issue-9/server-green.txt), [`client-green.txt`](evidence/issue-9/client-green.txt), commit `43b737c`; e2e: [`evidence/issue-8/e2e-suite-final-green.txt`](evidence/issue-8/e2e-suite-final-green.txt), commit `dc1d105`). |
| P3-02 | **Pending - after merge to main.** Every suite passing *on main* needs the release merge; the same suites pass now at the top of the stack (P3-01's citations). |
| P3-03 | [`migration/red-run-migration-tests.txt`](migration/red-run-migration-tests.txt) |
| P3-04 | [`migration/rehearsal-before.txt`](migration/rehearsal-before.txt), [`rehearsal-deploy.txt`](migration/rehearsal-deploy.txt), [`rehearsal-after.txt`](migration/rehearsal-after.txt), [`rehearsal-drift.txt`](migration/rehearsal-drift.txt), [`rehearsal-seed.txt`](migration/rehearsal-seed.txt), [`rehearsal-summary.md`](migration/rehearsal-summary.md) |
| P3-05 | [`migration/dev-before-counts.txt`](migration/dev-before-counts.txt), [`migration/dev-after-counts.txt`](migration/dev-after-counts.txt) |
| P3-06 | [`evidence/issue-3/red-server-auth.txt`](evidence/issue-3/red-server-auth.txt), [`red-client-auth.txt`](evidence/issue-3/red-client-auth.txt), [`green-server.txt`](evidence/issue-3/green-server.txt), [`green-client.txt`](evidence/issue-3/green-client.txt), [`green-e2e.txt`](evidence/issue-3/green-e2e.txt) |
| P3-07 | #44's share - [`evidence/issue-8/server-suite-green.txt`](evidence/issue-8/server-suite-green.txt), [`client-suite-green.txt`](evidence/issue-8/client-suite-green.txt), [`e2e-suite-final-green.txt`](evidence/issue-8/e2e-suite-final-green.txt), [`e2e-evidence-db-run-red.txt`](evidence/issue-8/e2e-evidence-db-run-red.txt) - captured. #42's API half - [`evidence/issue-6/red-staff-ticket-ops.txt`](evidence/issue-6/red-staff-ticket-ops.txt), [`green-staff-ticket-detail.txt`](evidence/issue-6/green-staff-ticket-detail.txt), [`green-comments-notes.txt`](evidence/issue-6/green-comments-notes.txt), [`green-server.txt`](evidence/issue-6/green-server.txt), [`green-client.txt`](evidence/issue-6/green-client.txt) - captured. **#40, #41 and #43's own red/green runs are not independently re-verified by this report** - evidence.md's own note on this row says so; this Issue did not re-run them, only cited what already exists ([`evidence/issue-4/`](evidence/issue-4/), [`evidence/issue-7/`](evidence/issue-7/)). |
| P3-08 | [`evidence/issue-4/lab2-inventory-before.txt`](evidence/issue-4/lab2-inventory-before.txt), [`lab2-inventory-after.txt`](evidence/issue-4/lab2-inventory-after.txt) |

## Answer Part 4 - AI Use with Reflection

| Row | Evidence |
|---|---|
| P4-01 | [`../../docs/lab-03/ai-use.md`](../../docs/lab-03/ai-use.md) - the LLM and interface named (section 1); seven entries marked **(key prompt)** across Phase 1 (2.6, 2.9, 2.10, 2.11) and the new Phase 2/3 section (4.1, 4.3, 4.4), within `LS 4`'s six-to-ten range. **"My Reflection" (section 5) is a heading only, with nothing written under it** - that is by design (`CLAUDE.md`: "I write it"), not a missing capture. |

## Answer Part 5 - Working Login and Password Change UI

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

## Answer Part 6 - Working IT Staff Ticket Queue UI

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

## Answer Part 7 - Working IT Staff Ticket Detail UI

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
| P7-11 | `queue-<vp>-forbidden.png`: [desktop](screenshots/staff-queue/queue-desktop-forbidden.png), [tablet](screenshots/staff-queue/queue-tablet-forbidden.png), [mobile](screenshots/staff-queue/queue-mobile-forbidden.png) |
| P7-12 | [`screenshots/staff-ticket-detail/detail-desktop-empty-comment.png`](screenshots/staff-ticket-detail/detail-desktop-empty-comment.png) (extra) |
| P7-13 | [`screenshots/staff-ticket-detail/detail-desktop-failure.png`](screenshots/staff-ticket-detail/detail-desktop-failure.png) (extra) |
| P7-14 | [`evidence/issue-4/green-authorization.txt`](evidence/issue-4/green-authorization.txt) |
| P7-15 | [`evidence/issue-6/green-comments-notes.txt`](evidence/issue-6/green-comments-notes.txt) (red: [`red-staff-ticket-ops.txt`](evidence/issue-6/red-staff-ticket-ops.txt)) |

## Answer Part 8 - Working Administrator User Management UI

| Row | Evidence |
|---|---|
| P8-01 | [`screenshots/user-management/users-desktop-list.png`](screenshots/user-management/users-desktop-list.png) |
| P8-02 | [`screenshots/user-management/users-desktop-search.png`](screenshots/user-management/users-desktop-search.png) |
| P8-03 | [`screenshots/user-management/users-desktop-role-filter.png`](screenshots/user-management/users-desktop-role-filter.png) |
| P8-04 | [`screenshots/user-management/users-desktop-create-filled.png`](screenshots/user-management/users-desktop-create-filled.png), [`users-desktop-create-success.png`](screenshots/user-management/users-desktop-create-success.png) |
| P8-05 | [`screenshots/user-management/users-desktop-duplicate-email.png`](screenshots/user-management/users-desktop-duplicate-email.png) |
| P8-06 | **Pending - optional extra, not yet captured.** |
| P8-07 | [`screenshots/user-management/users-desktop-edit-success.png`](screenshots/user-management/users-desktop-edit-success.png) |
| P8-08 | [`screenshots/user-management/users-desktop-password-reset-success.png`](screenshots/user-management/users-desktop-password-reset-success.png) |
| P8-09 | [`screenshots/user-management/users-desktop-self-deactivation-disabled.png`](screenshots/user-management/users-desktop-self-deactivation-disabled.png) |
| P8-10 | [`screenshots/user-management/users-desktop-last-administrator.png`](screenshots/user-management/users-desktop-last-administrator.png) |
| P8-11 | [`screenshots/user-management/users-desktop-forbidden.png`](screenshots/user-management/users-desktop-forbidden.png) |
| P8-12 | [`evidence/issue-7/green-users-admin.txt`](evidence/issue-7/green-users-admin.txt) |
| P8-13 | [`screenshots/user-management/users-mobile-cards.png`](screenshots/user-management/users-mobile-cards.png) |
| P8-14 | **Pending - optional extra, not yet captured.** |

## Answer Part 9 - Zen Green UI and Responsive Evidence

| Row | Evidence |
|---|---|
| P9-01 | **Pending - after merge to main.** `ui-spec.md` exists now ([`../../docs/lab-03/ui-spec.md`](../../docs/lab-03/ui-spec.md)) and is the real visual contract every screen was built against, but the rendered-on-main capture needs the release merge. |
| P9-02 | Every `ui-spec.md` section 23 file at all three viewports, with no exception - the full set under [`screenshots/`](screenshots/)'s four Lab 3 folders (`authentication/`, `staff-queue/`, `staff-ticket-detail/`, `user-management/`), regenerated against the freshly migrated and seeded `toktickit_evidence` database (11 users / 9 tickets at seed time) except `queue-<vp>-empty.png`, which does not depend on database state at all (P6-08). |
| P9-03 | **Manual.** [`../../docs/lab-03/tests.md`](../../docs/lab-03/tests.md) section 5 (VIS-01), against [`../../docs/lab-03/ui-spec.md`](../../docs/lab-03/ui-spec.md) section 24. Measured values: [`evidence/issue-8/visual-measurements.json`](evidence/issue-8/visual-measurements.json) (raw, 24 rows), [`evidence/issue-8/visual-checklist-results.txt`](evidence/issue-8/visual-checklist-results.txt) (summary) - 0 real failures found across touch targets, focus rings, clipping, overlap and horizontal overflow, measured directly in the browser at all three viewports for all eight Lab 3 screens. |

---

## What still only exists after the release merge

Decision C-110 fixes the order: all nine feature PRs merge into `lab3-staging` first, then
one release PR, `lab3-staging` into `main`, opens and merges. Until that happens, the
following rows above cannot be captured, no matter how complete everything else is:
**P1-01, P1-02, P1-04 (not yet triggered either way), P1-08 (needs the batched review,
which precedes the merges), P2-01, P2-02, P3-02, P9-01.** Everything else in this report is
captured now, at the top of the current stack (`feature/lab3-9-release-docs`), or is
honestly marked pending for a reason stated on its own row (P1-05's remaining board moves,
P8-06 and P8-14's optional extras).
