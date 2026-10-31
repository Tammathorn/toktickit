# Lab 4 - Peer Review Record

TokTickIT - CPE 334 Individual Sprint 4 (LS 14 Part 1).

| | |
|---|---|
| **Author** | Tammathorn Kananurak - 67070503489 - GitHub [@Tammathorn](https://github.com/Tammathorn) |
| **Peer reviewer** | Pattarapon Sribuathong - 67070503434 - GitHub [@PAKATO123](https://github.com/PAKATO123) |
| **Repository** | <https://github.com/Tammathorn/toktickit> |
| **Partner's repository** | <https://github.com/PAKATO123/toktickit> |
| **Branch model** | `feature/lab4-N-slug` into `lab4-staging` (C-130); PRs 2-9 stacked on the branch directly below while it awaits review, per `CLAUDE.md` (the Issue #71 documentation PR is stacked on #80 as its task directed); then one release PR, `lab4-staging` into `main`, opened only after every feature PR has merged |

This record is what GitHub shows, read back with `gh` on 31 October 2026 (about 14:40 UTC), not
written from memory. Timestamps are UTC as GitHub records them. Where a review has not happened
yet, this file says so; nothing here is filled in for a review that does not exist.

**Status in one line: nothing has been reviewed or merged on my side yet. All of my Lab 4
PRs (#72-#80 and the Issue #71 PR) are open with no review, no comment and no requested reviewer. I reviewed four of
@PAKATO123's Lab 4 PRs on 31 October; he replied to three of those reviews and has not
re-reviewed.**

---

## 1. Summary

### My PRs (author: Tammathorn), all targeting the stack

| PR | Issue | Branch -> base | Opened | Review received (PAKATO123) | Approval status | Merged |
|---|---|---|---|---|---|---|
| [#72](https://github.com/Tammathorn/toktickit/pull/72) | #62 contract | `feature/lab4-1-contract` -> `lab4-staging` | 2026-10-28 08:01:13 | None yet | Not reviewed | Not merged |
| [#73](https://github.com/Tammathorn/toktickit/pull/73) | #63 data model | `feature/lab4-2-data-model` -> `feature/lab4-1-contract` | 2026-10-28 08:35:49 | None yet | Not reviewed | Not merged |
| [#74](https://github.com/Tammathorn/toktickit/pull/74) | #64 Actions Taken API | `feature/lab4-3-actions-api` -> `feature/lab4-2-data-model` | 2026-10-30 10:32:09 | None yet | Not reviewed | Not merged |
| [#75](https://github.com/Tammathorn/toktickit/pull/75) | #65 Actions Taken UI | `feature/lab4-4-actions-ui` -> `feature/lab4-3-actions-api` | 2026-10-30 11:11:23 | None yet | Not reviewed | Not merged |
| [#76](https://github.com/Tammathorn/toktickit/pull/76) | #66 Ticket workflow | `feature/lab4-5-ticket-workflow` -> `feature/lab4-4-actions-ui` | 2026-10-31 04:36:43 | None yet | Not reviewed | Not merged |
| [#77](https://github.com/Tammathorn/toktickit/pull/77) | #67 staff dashboard | `feature/lab4-6-staff-dashboard` -> `feature/lab4-5-ticket-workflow` | 2026-10-31 05:01:17 | None yet | Not reviewed | Not merged |
| [#78](https://github.com/Tammathorn/toktickit/pull/78) | #68 Requester dashboard | `feature/lab4-7-requester-dashboard` -> `feature/lab4-6-staff-dashboard` | 2026-10-31 05:27:18 | None yet | Not reviewed | Not merged |
| [#79](https://github.com/Tammathorn/toktickit/pull/79) | #69 hardening | `feature/lab4-8-hardening` -> `feature/lab4-7-requester-dashboard` | 2026-10-31 05:41:41 | None yet | Not reviewed | Not merged |
| [#80](https://github.com/Tammathorn/toktickit/pull/80) | #70 E2E and visual | `feature/lab4-9-e2e-visual` -> `feature/lab4-8-hardening` | 2026-10-31 14:17:56 | None yet | Not reviewed | Not merged |
| This Issue's PR (see the PR list) | #71 release documentation | `feature/lab4-10-release-docs` -> `feature/lab4-9-e2e-visual` | opened with this file | None yet | Not reviewed | Not merged |
| Release | - | `lab4-staging` -> `main` | **Not opened.** It opens only after every feature PR has merged | - | - | - |

Read back for #72-#80 with `gh api repos/Tammathorn/toktickit/pulls/N/reviews`,
`.../pulls/N/comments` and `.../issues/N/comments`: **0 reviews, 0 inline comments and 0
conversation comments on each of the nine**, and `reviewRequests` is empty on each (no reviewer
was assigned through GitHub's reviewer field). PR #72 is the contract PR; it has not merged,
so **Part 2's "the specification existed before the code" is not yet shown by a merged PR
page**. The code PRs #73-#80 are stacked on it, as `CLAUDE.md` allows while a PR awaits review,
and each is to be retargeted to `lab4-staging` when the PR below it merges.

### Partner's PRs I reviewed (author: PAKATO123, repository `PAKATO123/toktickit`)

| Partner's PR | Reviewed (UTC) | My review | His response | Outcome |
|---|---|---|---|---|
| [#63](https://github.com/PAKATO123/toktickit/pull/63) docs(lab-04): add Sprint 4 specifications, implementation plan, test stubs | 2026-10-31 04:48:45 | `APPROVED` | None | Open, base `lab4-staging`; approved |
| [#64](https://github.com/PAKATO123/toktickit/pull/64) Implemented Feature/lab04 01 actions taken | 2026-10-31 04:55:35 | `APPROVED` with follow-up required | 2026-10-31 07:44:20: "Understood, i will follow up in Clean up branch along with other fixes" | Open; approved |
| [#65](https://github.com/PAKATO123/toktickit/pull/65) Implemented Feature/lab04 02 role dashboards | 2026-10-31 04:46:53 | `CHANGES_REQUESTED` | 2026-10-31 07:45:42: "Fix now have been published alongside other fixes in newest branch" | Open; my review still reads `CHANGES_REQUESTED` - I have not re-reviewed |
| [#70](https://github.com/PAKATO123/toktickit/pull/70) Implemented Feature/lab04 03 e2e and hardening | 2026-10-31 04:44:31 | `CHANGES_REQUESTED` | 2026-10-31 07:51:57: "Understood, i will fix all of it." | Open; my review still reads `CHANGES_REQUESTED` - I have not re-reviewed |

His four Lab 4 PRs are all based on `lab4-staging` (none merged; none stacked on another). Each has
exactly one review from me and no inline comment. These are all of his Lab 4 PRs: his repository has no PRs numbered #66 to #69,
and none after #70.

---

## 2. Pull Requests I authored

### PRs #72 to #80 - Issues #62 to #70

For every one of these, as of the read-back above:

- **Review received:** none.
- **Comments received:** none, on the conversation or inline.
- **My reply:** none, because there is nothing to reply to.
- **Approval status:** not reviewed.
- **Merged:** no.

The PR bodies state the stack and name the riskiest part of each PR (the row lock and replay
race in #74, the gate and stale check in #76, count-equals-drill-down in #77). I have not
recorded here that PAKATO123 has been sent these links: GitHub shows no reviewer request and no
conversation, and I can verify nothing outside it. When he reviews, each review, comment and
reply will be added to this file with its time, in the form of the Lab 3 record
(`docs/lab-03/reviewer.md` section 2): the comment, my reply on GitHub first, what changed
because of it, and the merge time.

### Fixing

No card has entered the **Fixing** column, because no review has asked for a change on any of my
PRs. A Fixing state will be captured only if one really happens.

---

## 3. Pull Requests I reviewed for my partner

Read back with `gh api repos/PAKATO123/toktickit/pulls/N/reviews` and `.../issues/N/comments`.
My review text is quoted verbatim.

### PAKATO123/toktickit#63 - docs(lab-04): add Sprint 4 specifications, implementation plan, test stubs

- **Link:** <https://github.com/PAKATO123/toktickit/pull/63> · **Base:** `lab4-staging` · **Head:** `feature/lab04-00-foundations` · **Opened:** 2026-09-28 10:43:51 · 1 commit
- **My review**, `APPROVED`, 2026-10-31 04:48:45 UTC:

> Docs and test stubs match the handout structure. approve

- **His response:** none. **State:** open.

### PAKATO123/toktickit#64 - Implemented Feature/lab04 01 actions taken

- **Link:** <https://github.com/PAKATO123/toktickit/pull/64> · **Base:** `lab4-staging` · **Head:** `feature/lab04-01-actions-taken` · **Opened:** 2026-09-28 16:12:46 · 2 commits
- **My review**, `APPROVED`, 2026-10-31 04:55:35 UTC:

> Approved with follow-up required. Before merging to main, please:
> 1. Commit the Prisma migration for ActionTaken (`npx prisma migrate dev --name add_actions_taken_lab04`).
> 2. Add stale-update detection (409) for PUT /actions-taken/:actionId and status updates, with an API test.
> These can land in a follow-up commit on this stack (#65/#70) since the PRs are stacked.

- **His response** - 2026-10-31 07:44:20 UTC, conversation comment:

> Understood, i will follow up in Clean up branch along with other fixes

- **State:** open. I have not re-checked whether the migration and the stale-update test were added.

### PAKATO123/toktickit#65 - Implemented Feature/lab04 02 role dashboards

- **Link:** <https://github.com/PAKATO123/toktickit/pull/65> · **Base:** `lab4-staging` · **Head:** `feature/lab04-02-role-dashboards` · **Opened:** 2026-09-30 12:53:19 · 3 commits
- **My review**, `CHANGES_REQUESTED`, 2026-10-31 04:46:53 UTC:

> Request changes — 1 major bug:
>
> "Followed up" is derived from `!followUpRequired && followUpNote`, and the note is still sent when the checkbox is unchecked (ActionsTakenSection.tsx ~L175). The server also keeps the old note on PUT.
>
> Repro: Edit a Follow-Up Required action → uncheck → Save → it shows "Followed up" without the confirmation modal.
>
> Fix: add `isFollowedUp Boolean @default(false)` (as spec §7.1 / BR-05 describe), set it only on "Mark done", and render the badge from it.

- **His response** - 2026-10-31 07:45:42 UTC, conversation comment:

> Fix now have been published alongside other fixes in newest branch

- **State:** open. My `CHANGES_REQUESTED` review still stands: I have not re-reviewed the fix, so I do not record it as verified.

### PAKATO123/toktickit#70 - Implemented Feature/lab04 03 e2e and hardening

- **Link:** <https://github.com/PAKATO123/toktickit/pull/70> · **Base:** `lab4-staging` · **Head:** `feature/lab04-03-e2e-and-hardening` · **Opened:** 2026-10-08 15:57:49 · 4 commits
- **My review**, `CHANGES_REQUESTED`, 2026-10-31 04:44:31 UTC:

> Request changes — 1 major issue:
>
> E2E tests can pass without testing anything. 11 assertions in e2e/lab-04 are wrapped in `if (await x.isVisible().catch(() => false))`, so they are silently skipped when the element is missing. Also, ticket-resolution.spec.ts:69 uses `locator('text=A, text=B')`, which Playwright reads as one literal string, so it fails whenever that block runs. Use `await expect(x).toBeVisible()` and `getByText(/Pending Verification|Requester consider/)`.
>
> Note: seed now sets mustChangePassword=false for every user (since #64), so no seeded account demonstrates the Lab 3 first-login password change. Please keep at least one user with `true` for regression evidence.

- **His response** - 2026-10-31 07:51:57 UTC, conversation comment:

> Understood, i will fix all of it.

- **State:** open. Not re-reviewed.

---

## 4. Honest assessment

- **Nothing of mine has been reviewed.** The Lab 3 record could show nine approvals; this one cannot
  show any. The PRs exist, are stacked and are described, but a review requires a reviewer,
  and GitHub shows none requested. The review is still to come and the release PR is not
  opened until it has happened and every feature PR has merged.
- **The reviews I gave were substantive, and two are unresolved.** #65 and #70 are
  `CHANGES_REQUESTED`; he answered both on GitHub within three hours and said the fix was made or
  would be made, and I have not looked again. His #64 follow-up (the migration and a stale-update
  test) is a promise in a comment, not a commit I have checked.
- **I answered review comments on GitHub first, in Lab 3, and this sprint's record has none to
  answer yet.** Rule 6 of `CLAUDE.md` ("review comments are answered on GitHub first, then
  recorded here") has not been exercised for my own PRs.
- **Stacking has a cost.** All of #73-#80 sit on an unmerged contract PR. If the contract changes
  in review, the change is made in #72 and merged upward with `git merge`, never a rebase, with
  all three suites run at each level (`CLAUDE.md`).
- **No self-merge.** Nothing has been merged on my side, and I will not repeat Lab 3's #60 and
  #61, which were merged without a review and are marked as such in `docs/lab-03/reviewer.md`.
