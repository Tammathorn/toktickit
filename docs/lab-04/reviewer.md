# Lab 4 - Peer Review Record

TokTickIT - CPE 334 Individual Sprint 4 (LS 14 Part 1).

| | |
|---|---|
| **Author** | Tammathorn Kananurak - 67070503489 - GitHub [@Tammathorn](https://github.com/Tammathorn) |
| **Peer reviewer** | Pattarapon Sribuathong - 67070503434 - GitHub [@PAKATO123](https://github.com/PAKATO123) |
| **Repository** | <https://github.com/Tammathorn/toktickit> |
| **Partner's repository** | <https://github.com/PAKATO123/toktickit> |
| **Branch model** | `feature/lab4-N-slug` into `lab4-staging` (C-130); PRs 2-9 stacked on the branch directly below while it awaits review, per `CLAUDE.md` (the Issue #71 documentation PR is stacked on #80 as its task directed); then one release PR, `lab4-staging` into `main`, opened only after every feature PR has merged |

This record is what GitHub shows, read back with `gh` on 31 October 2026 after PAKATO123's reviews
(15:03 to 15:41 UTC); timestamps are UTC as GitHub records them. Nothing here is filled in for a
review that does not exist.

**Status in one line: PAKATO123 reviewed all ten of my Lab 4 PRs (#72-#81) on 31 October. Eight
are `APPROVED` (#72, #73, #75-#80) and two are `CHANGES_REQUESTED` (#74, #81). Both requests are
fixed and pushed, and review is re-requested on both; nothing is merged yet. I also reviewed
four of his Lab 4 PRs; he replied to three of those reviews and I have not re-reviewed.**

---

## 1. Summary

### My PRs (author: Tammathorn), all targeting the stack

| PR | Issue | Branch -> base | Opened | Review received (PAKATO123) | Approval status | Merged |
|---|---|---|---|---|---|---|
| [#72](https://github.com/Tammathorn/toktickit/pull/72) | #62 contract | `feature/lab4-1-contract` -> `lab4-staging` | 2026-10-28 08:01:13 | `APPROVED` 15:04 | Approved | Not merged |
| [#73](https://github.com/Tammathorn/toktickit/pull/73) | #63 data model | `feature/lab4-2-data-model` -> `feature/lab4-1-contract` | 2026-10-28 08:35:49 | `APPROVED` 15:17 | Approved | Not merged |
| [#74](https://github.com/Tammathorn/toktickit/pull/74) | #64 Actions Taken API | `feature/lab4-3-actions-api` -> `feature/lab4-2-data-model` | 2026-10-30 10:32:09 | `CHANGES_REQUESTED` 15:26 | Changes requested; fixed (C-199) | Not merged |
| [#75](https://github.com/Tammathorn/toktickit/pull/75) | #65 Actions Taken UI | `feature/lab4-4-actions-ui` -> `feature/lab4-3-actions-api` | 2026-10-30 11:11:23 | `APPROVED` 15:28 | Approved | Not merged |
| [#76](https://github.com/Tammathorn/toktickit/pull/76) | #66 Ticket workflow | `feature/lab4-5-ticket-workflow` -> `feature/lab4-4-actions-ui` | 2026-10-31 04:36:43 | `APPROVED` 15:30 | Approved | Not merged |
| [#77](https://github.com/Tammathorn/toktickit/pull/77) | #67 staff dashboard | `feature/lab4-6-staff-dashboard` -> `feature/lab4-5-ticket-workflow` | 2026-10-31 05:01:17 | `APPROVED` 15:31 | Approved | Not merged |
| [#78](https://github.com/Tammathorn/toktickit/pull/78) | #68 Requester dashboard | `feature/lab4-7-requester-dashboard` -> `feature/lab4-6-staff-dashboard` | 2026-10-31 05:27:18 | `APPROVED` 15:32 | Approved | Not merged |
| [#79](https://github.com/Tammathorn/toktickit/pull/79) | #69 hardening | `feature/lab4-8-hardening` -> `feature/lab4-7-requester-dashboard` | 2026-10-31 05:41:41 | `APPROVED` 15:36 | Approved | Not merged |
| [#80](https://github.com/Tammathorn/toktickit/pull/80) | #70 E2E and visual | `feature/lab4-9-e2e-visual` -> `feature/lab4-8-hardening` | 2026-10-31 14:17:56 | `APPROVED` 15:37 | Approved | Not merged |
| [#81](https://github.com/Tammathorn/toktickit/pull/81) | #71 release documentation | `feature/lab4-10-release-docs` -> `feature/lab4-9-e2e-visual` | 2026-10-31 | `CHANGES_REQUESTED` 15:41 | Changes requested; fixed (reflection pointer, this file) | Not merged |
| Release | - | `lab4-staging` -> `main` | **Not opened.** It opens only after every feature PR has merged | - | - | - |

Read back with `gh pr view N --json reviews,comments` and `gh api repos/Tammathorn/toktickit/pulls/N/comments`.
Every one of the ten has exactly one review from PAKATO123; on #72-#80 the text is a conversation
comment posted a few seconds before the review, and there is no inline comment. PR #72 is the
contract PR; it has not merged, so **Part 2's "the specification existed before the code" is not
yet shown by a merged PR page**. The code PRs #73-#81 are stacked on it, as `CLAUDE.md` allows while
a PR awaits review, and each is to be retargeted to `lab4-staging` when the PR below it merges.

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

### Reviews received from PAKATO123

Every review he gave, quoted as GitHub shows it. My response was posted on GitHub first (rule 6 of
`CLAUDE.md`) and is summarised here.

| PR | State | His comment (quoted) | My response | Fix commit |
|---|---|---|---|---|
| #72 contract | `APPROVED` 2026-10-31 15:04 | "I recommend adding Claude to gitignore but regardless, approved, no problems" | Agreed. `.claude/` is now in `.gitignore`; `CLAUDE.md` stays tracked | `47c42b5` (on `feature/lab4-10-release-docs`) |
| #73 data model | `APPROVED` 15:17 | "All good, but this  branch is pretty hard to verify ithout looking at final product" | Noted. A data-model PR has no screen of its own; the seeded app and the #70 screenshots show it in use. No code change | None |
| #74 Actions Taken API | `CHANGES_REQUESTED` 15:26 | "There is potentially a Idempotency Key Cross-Ticket Collision. In POST /api/tickets/:id/actions, the replay lookup does not assert that the found action matches the ticket specified in the path ... the server returns 200 OK with the DTO for Ticket 1" | A real bug. A key found on another Ticket now returns 409 `IDEMPOTENCY_KEY_REUSED` with no write and no data from the other Ticket (decision C-199, which supersedes C-194). The same rule is applied to Public Comments and Internal Notes, including the P2002 race path. Tests API-125 to API-132 were written first and failed, then passed | Tests `5e29bd1`, fix `0e21ac8` (actions); tests `81147fe`, fix `21e5e0c` (comments and notes); docs `1129e6f` |
| #75 Actions Taken UI | `APPROVED` 15:28 | "No problems" | Thanks | None |
| #76 Ticket workflow | `APPROVED` 15:30 | "No glaring flaws from what ive seen" | Thanks | None |
| #77 staff dashboard | `APPROVED` 15:31 | "I dont understand why are you going back and changing lab 3 specs but alright, no problems" | Lab 4 changed the navigation and the landing screen, so some Lab 3 screens and specs had to change. Each edit cites the decision that required it (C-xxx) in `docs/lab-04/tests.md` section 4 | None |
| #78 Requester dashboard | `APPROVED` 15:32 | "Why is this even a seperate branch?" | One Issue per PR (#68): the board rule gives each Issue its own branch and PR | None |
| #79 hardening | `APPROVED` 15:36 | "In my opinion. overly detailed readme but no problems" | Acknowledged. The README stays detailed for the grader | None |
| #80 E2E and visual | `APPROVED` 15:37 | "The UI from screenshot can really use some touch ups but is serviceable" | Acknowledged. VIS-01 to VIS-32 pass; visual polish beyond them is out of scope for this sprint | None |
| #81 release documentation | `CHANGES_REQUESTED` 15:41 | "You are literally missing my reflection part in ai-use.md. And reviewer.md needs updating and fixing(on last part), dont forget to write down every review i gave!" | `reviewer.md` now records every review (this table) and its last section is rewritten. The reflection is not in `ai-use.md` by my decision: it is in the submitted Lab 4 PDF report, and `ai-use.md` says so under "My Reflection" | `47c42b5` (`ai-use.md`) and the commit that adds this file |

### Status of the two change requests

- **#74:** the fix commits above are pushed to `feature/lab4-3-actions-api` and `feature/lab4-5-ticket-workflow`. Review is re-requested from @PAKATO123 once the fix is pushed.
- **#81:** pushed on `feature/lab4-10-release-docs`; review re-requested from @PAKATO123.
- Neither request is closed until he re-reviews. I do not record them as accepted.

### Fixing

The Fixing column was used for #74 and #81, the only two change requests. A project-board capture of
that state is taken only if the card really sits there.

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

- **All ten of my PRs have a review: eight approvals and two change requests.** The approvals
  are short; two of them asked questions (#77, #78) and I answered both above. Nothing is merged
  yet, and the release PR is not opened until every feature PR has merged.
- **The one real defect came from review.** #74's replay lookup returned another Ticket's data for a
  reused key. My own audit had accepted that as a documented assumption (C-194); the reviewer was
  right that it leaks, and C-199 replaces it, with tests written first.
- **The reviews I gave were substantive, and two are unresolved.** #65 and #70 are
  `CHANGES_REQUESTED`; he answered both on GitHub within three hours and said the fix was made or
  would be made, and I have not looked again. His #64 follow-up (the migration and a stale-update
  test) is a promise in a comment, not a commit I have checked.
- **Review comments are answered on GitHub first, then recorded here.** Rule 6 of `CLAUDE.md` is now
  exercised for #72, #74 and #81, the three PRs where a change or a decision was involved.
- **Stacking has a cost.** All of #73-#81 sit on an unmerged contract PR. If the contract changes
  in review, the change is made in #72 and merged upward with `git merge`, never a rebase, with
  all three suites run at each level (`CLAUDE.md`).
- **No self-merge.** Nothing has been merged on my side, and I will not repeat Lab 3's #60 and
  #61, which were merged without a review and are marked as such in `docs/lab-03/reviewer.md`.
