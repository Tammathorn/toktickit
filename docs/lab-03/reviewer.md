# Lab 3 - Peer Review Record

TokTickIT - CPE 334 Individual Sprint 3 (LS 14 Part 1).

| | |
|---|---|
| **Author** | Tammathorn Kananurak - 67070503489 - GitHub [@Tammathorn](https://github.com/Tammathorn) |
| **Peer reviewer** | Pattarapon Sribuathong - 67070503434 - GitHub [@PAKATO123](https://github.com/PAKATO123) |
| **Repository** | <https://github.com/Tammathorn/toktickit> |
| **Branch model** | `feature/lab3-N-slug` stacked per decision C-110 - PR #46 into `lab3-staging`, each later PR into the branch directly below it - then one release PR, `lab3-staging` into `main` |

This record is what the repository shows, read back with `gh` on 5 October 2026 rather than
written from memory. Timestamps are UTC as GitHub records them.

---

## 1. Summary

| PR | Issue | Review received (PAKATO123) | Approval status | Merged |
|---|---|---|---|---|
| [#46](https://github.com/Tammathorn/toktickit/pull/46) | #37 | One comment 2026-09-27 15:05:56 (C-109), answered; then `APPROVED` 2026-10-05 12:53:10 with a comment on `CLAUDE.md` | Approved | 2026-10-05 13:14:46 UTC (`090c7c8`) |
| [#47](https://github.com/Tammathorn/toktickit/pull/47) | #38 | Comment "Approved, cannot judge yet without seeing the future implementation"; `APPROVED` 2026-10-05 11:25:58 | Approved | 2026-10-05 13:15:42 UTC (`f45ad9c`) |
| [#48](https://github.com/Tammathorn/toktickit/pull/48) | #39 | `APPROVED` 2026-10-05 11:28:25 - "Pretty comprehensive series of screenshots, Approved" | Approved | 2026-10-05 13:17:35 UTC (`b569cd6`) |
| [#49](https://github.com/Tammathorn/toktickit/pull/49) | #40 | `APPROVED` 2026-10-05 11:41:37 - "Approved, but you probably should put agents.ts in this" | Approved | 2026-10-05 13:18:08 UTC (`4e19a59`) |
| [#50](https://github.com/Tammathorn/toktickit/pull/50) | #41 | `APPROVED` 2026-10-05 11:44:18 - "Approved but you should probably elaborate on what green staff queue.txt and red staff queue.txt is" | Approved | 2026-10-05 13:18:49 UTC (`73aad9c`) |
| [#51](https://github.com/Tammathorn/toktickit/pull/51) | #42 | `APPROVED` 2026-10-05 11:46:26 - "Approved the implementation but there seriously need to be elaboration on each evidence inside evidence/issue-6 on what do the names mean" | Approved | 2026-10-05 13:19:23 UTC (`6df8f97`) |
| [#52](https://github.com/Tammathorn/toktickit/pull/52) | #43 | `APPROVED` 2026-10-05 11:47:20 - "Approved, same problem on doccumentation like previous branch" | Approved | 2026-10-05 13:19:54 UTC (`2a1afbb`) |
| [#53](https://github.com/Tammathorn/toktickit/pull/53) | #44 | `APPROVED` 2026-10-05 11:48:10 - "Approved, but paging on same of the pages can definitely be better to be user friendly" | Approved | 2026-10-05 13:20:33 UTC (`e664ba7`) |
| [#54](https://github.com/Tammathorn/toktickit/pull/54) | #45 | `APPROVED` 2026-10-05 11:49:27 - "Approved, no problem aside from those already mentioned" | Approved | With the release-docs push; see PR page |
| Release | - | - | - | Opened after #54; see the PR list |
| [#60](https://github.com/Tammathorn/toktickit/pull/60) | Issue #12 (visual checklist) | None - **self-merged after the review period; not peer-reviewed** | Not reviewed | 2026-10-05 18:45:46 UTC (`12437b7`), into `lab3-staging` |
| [#61](https://github.com/Tammathorn/toktickit/pull/61) | Release of #60 | None - **self-merged after the review period; not peer-reviewed** | Not reviewed | 2026-10-05 18:46:03 UTC (`afac6dc`), into `main` |

The nine feature PRs were stacked per decision **C-110**, each into the branch directly below it, and #46 into `lab3-staging`. PAKATO reviewed them as one batch, 2026-10-05 11:24-12:53 UTC, after all nine existed; the only earlier comment was the one on #46 (2026-09-27). Each PR was then retargeted to `lab3-staging` and merged, in stack order, with a merge commit (`gh pr merge N --merge`). Before each merge the PR's commit count against `lab3-staging` was checked equal to its own commits above the previous branch. Review states, comment bodies and times in this record are read from `gh api` (`pulls/N/reviews`, `issues/N/comments`, `pulls/N/comments`); there are no inline review comments on any of #46-#54.

---

## 2. Pull Requests I authored

### PR #46 - Issue #37: Sprint 3 engineering contract

- **Link:** <https://github.com/Tammathorn/toktickit/pull/46>
- **Branch:** `feature/lab3-1-contract` -> `lab3-staging` · **Opened:** 2026-09-27 14:51
- **Contents** (16 commits): `CLAUDE.md` rewritten for Lab 3; `decisions.md` C-53..C-109;
  `phase1-analysis.md`; `specification.md`; `api-spec.md` (30 endpoints); `ui-spec.md` (25
  sections); `tests.md` (273 planned tests after five merges); `ai-use.md` opened.

**Comment received** - @PAKATO123, 2026-09-27 15:05:56 UTC:

> I recommend clarifying one edge case
> Comments on Terminal Tickets, The status transition matrix strictly defines CLOSED and
> CANCELLED as terminal states.
> but Business Rule 68 broadly allows the owning Requester, IT Staff, and Administrator to
> post Public Comments on a Ticket without mentioning status constraints.
> You should maybe clarify if the users are still allowed to write comments to a ticket
> still after the ticket is closed.

**My response** - 2026-09-28 07:55:06 UTC, in the PR conversation (the comment body begins with a quoted copy of the comment above it):

> > I recommend clarifying one edge case Comments on Terminal Tickets, The status transition matrix strictly defines CLOSED and CANCELLED as terminal states. but Business Rule 68 broadly allows the owning Requester, IT Staff, and Administrator to post Public Comments on a Ticket without mentioning status constraints. You should maybe clarify if the users are still allowed to write comments to a ticket still after the ticket is closed.
>
> Thanks, good catch. I've settled it as C-109: Closed and Cancelled tickets are read-only for everyone. No comments, notes, attachment changes, or owner/priority/status changes (409). Reading still works. Since C-98 makes both statuses terminal, the Requester opens a new ticket instead. Resolved can still take comments because it can be reopened.
>
> Fixed in bb27eb3. Could you approve if this answers it?

**What changed because of it** - commit `bb27eb3` (same day, same branch) added **C-109**
to `decisions.md`, **BR-108** to `specification.md`, narrowed BR-68 and BR-96, added a
terminal-write refusal to six cells of the `specification.md` 5.2 matrix and six
`api-spec.md` endpoints, hid the corresponding write controls in three `ui-spec.md`
screens, and added AC-118 with five planned tests. `docs/lab-03/ai-use.md` section 2.11
records this exchange in full.

**Review received** - @PAKATO123, `APPROVED`, 2026-10-05 12:53:10 UTC:

> I think CLAUDE.md should be included within either docs/lab-xx instead of changing every lab or not at all and list it under gitignore?
>
> But other than that approved

**My reply:** none on GitHub.

**Merged:** 2026-10-05 13:14:46 UTC into `lab3-staging` as `090c7c8`, after retargeting from its stack base to `lab3-staging`.

### PR #47 - Issue #38: User migration, schema and seed

- **Link:** <https://github.com/Tammathorn/toktickit/pull/47>
- **Branch:** `feature/lab3-2-data-migration` -> `feature/lab3-1-contract` · **Opened:** 2026-10-01 08:54
- **Contents** (9 commits): Vitest pointed at `toktickit_test`; the `RequesterUser` -> `User`
  rename with roles; the seed extended to all three roles with Tickets, comments and notes;
  Lab 2 assertions adapted for C-67/C-70/C-71; the C-83 migration rehearsal recorded; a kept
  Requester with zero Tickets; a mojibake-byte and empty-persona fix.
- **Review and comments:** see below. **Approval status:** approved by @PAKATO123.

**Comment received** - @PAKATO123, 2026-10-05 11:24:57 UTC:

> Approved, cannot judge yet without seeing the future implementation

**Review received** - @PAKATO123, `APPROVED`, 2026-10-05 11:25:58 UTC:

> _(empty review body)_

**My reply:** none on GitHub.

**Merged:** 2026-10-05 13:15:42 UTC into `lab3-staging` as `f45ad9c`, after retargeting from its stack base to `lab3-staging`.

### PR #48 - Issue #39: Authentication - login, sessions, the password-change gate

- **Link:** <https://github.com/Tammathorn/toktickit/pull/48>
- **Branch:** `feature/lab3-3-authentication` -> `feature/lab3-2-data-migration` · **Opened:** 2026-10-04 09:22
- **Contents** (20 commits): `evidence.md` opened, mapping every Part 1-9 row; the
  authentication API (scrypt verification, sessions, the auth chain) with its red run
  recorded first; Login and Change Password UI with their red run recorded first; the
  authentication E2E spec with the Part 5 captures; C-110 (stacked PRs while review is
  batched) and C-112 (the client takes identity from the login response) recorded.
- **Review and comments:** see below. **Approval status:** approved by @PAKATO123.

**Review received** - @PAKATO123, `APPROVED`, 2026-10-05 11:28:25 UTC:

> Pretty comprehensive series of screenshots, Approved

**My reply:** none on GitHub.

**Merged:** 2026-10-05 13:17:35 UTC into `lab3-staging` as `b569cd6`, after retargeting from its stack base to `lab3-staging`.

### PR #49 - Issue #40: Authorization and Requester regression

- **Link:** <https://github.com/Tammathorn/toktickit/pull/49>
- **Branch:** `feature/lab3-4-authz-regression` -> `feature/lab3-3-authentication` · **Opened:** 2026-10-04 10:01
- **Contents** (14 commits): every Ticket route moved behind the role chain, identity taken
  from the session; the Development Requester selector removed in favor of role navigation;
  authorization tests written first, red, then green; the Lab 2 server and client suites
  adapted to signed-in agents with the retirements `tests.md` records; a 403 renders
  Forbidden or Change Password depending on the gate.
- **Review and comments:** see below. **Approval status:** approved by @PAKATO123.

**Review received** - @PAKATO123, `APPROVED`, 2026-10-05 11:41:37 UTC:

> Approved, but you probably should put agents.ts in this

**My reply:** none on GitHub.

**Merged:** 2026-10-05 13:18:08 UTC into `lab3-staging` as `4e19a59`, after retargeting from its stack base to `lab3-staging`.

### PR #50 - Issue #41: IT Staff Ticket Queue

- **Link:** <https://github.com/Tammathorn/toktickit/pull/50>
- **Branch:** `feature/lab3-5-staff-queue` -> `feature/lab3-4-authz-regression` · **Opened:** 2026-10-04 12:20
- **Contents** (6 commits): `GET /api/staff/tickets` (`api-spec.md` 8.1); the Ticket Queue
  screen (`ui-spec.md` 15); C-111 (no "All statuses" option); an audit's own findings on
  the queue fixed in the same PR - a stuck Clear Filters control, the empty-versus-no-results
  distinction, and 500s from unparsed query values.
- **Review and comments:** see below. **Approval status:** approved by @PAKATO123.

**Review received** - @PAKATO123, `APPROVED`, 2026-10-05 11:44:18 UTC:

> Approved but you should probably elaborate on what green staff queue.txt and red staff queue.txt is

**My reply:** none on GitHub.

**Merged:** 2026-10-05 13:18:49 UTC into `lab3-staging` as `73aad9c`, after retargeting from its stack base to `lab3-staging`.

### PR #51 - Issue #42: IT Staff Ticket Detail UI and Requester additions

- **Link:** <https://github.com/Tammathorn/toktickit/pull/51>
- **Branch:** `feature/lab3-6-staff-ticket-ops` -> `feature/lab3-5-staff-queue` · **Opened:** 2026-10-04 16:01
- **Contents:** staff Ticket Detail (claim, assign, reassign, unassign, IT Priority, status
  transitions), Public Comments and Internal Notes as two append-only tables, the
  Requester's "Problem Appears Resolved" action, the assignable-users endpoint, and the
  matching UI for both the staff and Requester screens. Decisions **C-113** (a malformed
  path id is 400 `INVALID_QUERY_PARAM`, not `VALIDATION_FAILED`) and **C-114** (the
  Requester Ticket DTO's `owner` gains `isActive`, closing a gap between `api-spec.md` and
  `ui-spec.md` that neither document had named) were raised and resolved during this
  Issue's implementation, each by asking rather than guessing - `ai-use.md` section 4.3.
- **Review and comments:** see below. **Approval status:** approved by @PAKATO123.

**Review received** - @PAKATO123, `APPROVED`, 2026-10-05 11:46:26 UTC:

> Approved the implementation but there seriously need to be elaboration on each evidence inside evidence/issue-6 on what do the names mean

**My reply:** none on GitHub.

**Merged:** 2026-10-05 13:19:23 UTC into `lab3-staging` as `6df8f97`, after retargeting from its stack base to `lab3-staging`.

### PR #52 - Issue #43: Administrator User Management

- **Link:** <https://github.com/Tammathorn/toktickit/pull/52>
- **Branch:** `feature/lab3-7-user-admin` -> `feature/lab3-6-staff-ticket-ops` · **Opened:** 2026-10-05 03:13
- **Contents:** the Administrator user-management API (list, create, edit, set an initial
  password), the `LAST_ADMINISTRATOR` rule inside a row-locking transaction with a genuine
  concurrent-race test, and the User Management screen. Decision **C-115** (how to test
  "exactly one active Administrator" without deactivating the shared seeded account every
  other e2e spec's session depends on) was raised by this session's own review of a first
  attempt that had corrupted that shared session, and resolved by the self-demotion design
  `ai-use.md` section 4.3 quotes in full.
- **Review and comments:** see below. **Approval status:** approved by @PAKATO123.

**Review received** - @PAKATO123, `APPROVED`, 2026-10-05 11:47:20 UTC:

> Approved, same problem on doccumentation like previous branch

**My reply:** none on GitHub.

**Merged:** 2026-10-05 13:19:54 UTC into `lab3-staging` as `2a1afbb`, after retargeting from its stack base to `lab3-staging`.

### PR #53 - Issue #44: E2E and responsive/visual evidence

- **Link:** <https://github.com/Tammathorn/toktickit/pull/53>
- **Branch:** `feature/lab3-8-e2e-visual` -> `feature/lab3-7-user-admin` · **Opened:** 2026-10-05 03:57
- **Contents:** the remaining E2E and responsive gaps closed; the `toktickit_evidence`
  database created, migrated and seeded once to regenerate the final, authoritative Part 6
  and Part 9 screenshot sets; the visual checklist measured directly in the browser (0 real
  failures). A review of this PR's own diff found an unauthorized, factually incorrect
  carve-out one of its commits had written into `tests.md` and `evidence.md`
  (`queue-<vp>-empty.png` marked "not reproducible" when the adjacent test in the same file
  already mocks the same response) - fixed without a decision round, since there was no
  genuine conflict, only an unapplied technique (`ai-use.md` section 4.4).
- **Review and comments:** see below. **Approval status:** approved by @PAKATO123.

**Review received** - @PAKATO123, `APPROVED`, 2026-10-05 11:48:10 UTC:

> Approved, but paging on same of the pages can definitely be better to be user friendly

**My reply:** none on GitHub.

**Merged:** 2026-10-05 13:20:33 UTC into `lab3-staging` as `e664ba7`, after retargeting from its stack base to `lab3-staging`.

### PR #54 - Issue #45: Release documentation

- **Link:** <https://github.com/Tammathorn/toktickit/pull/54>
- **Branch:** `feature/lab3-9-release-docs` -> `feature/lab3-8-e2e-visual`
- **Contents:** this record; `tests.md` section 2's `Final` column; the Lab 3 `README.md`
  section; `ai-use.md` finalized; `artifacts/lab-03/report-lab03.md`.
- **Review and comments:** see below. **Approval status:** approved by @PAKATO123.

**Review received** - @PAKATO123, `APPROVED`, 2026-10-05 11:49:27 UTC:

> Approved, no problem aside from those already mentioned

**My reply:** none on GitHub.

**Merged:** by its own merge commit into `lab3-staging` after this record is pushed; the merge time is on the PR page, not in this file.

### Release PR - `lab3-staging` -> `main`

- **Status:** opened after #46-#54 merged into `lab3-staging` (C-110); its link is on the PR list, not recorded here because it did not exist when this file was written.

### PR #60 - Issue #12: the visual checklist to 42/42

- **Link:** <https://github.com/Tammathorn/toktickit/pull/60>
- **Branch:** `feature/lab3-12-ui-evidence` -> `lab3-staging` (fast-forwarded to `main` at `a6ab484` first) · **Merged:** 2026-10-05 18:45:46 UTC, merge commit `12437b7`
- **Contents** (2 commits): the five visual-checklist UI defects and four state gaps fixed test-first; decisions C-116..C-121; `e2e/lab-03/visual-evidence.spec.ts`; the re-judged `ui-spec.md` section 24 and its evidence.
- **Review:** none. **Self-merged after the review period; not peer-reviewed.** No reviewer was requested, and nobody was asked to review it.

### PR #61 - Release of #60, `lab3-staging` into `main`

- **Link:** <https://github.com/Tammathorn/toktickit/pull/61>
- **Merged:** 2026-10-05 18:46:03 UTC, merge commit `afac6dc`, the same method as #55 and #59
- **Review:** none. **Self-merged after the review period; not peer-reviewed.** No reviewer was requested.

---

## 3. Pull Requests I reviewed for my partner

Read back with `gh api repos/PAKATO123/toktickit/pulls/N/reviews` and `.../issues/N/comments`
on 5 October 2026. These are the eleven Lab 3 PRs in @PAKATO123's repository
(`PAKATO123/toktickit`) that I reviewed - the contract PR #39, the nine implementation PRs
#40-#48, and the cleanup PR #61. Each PR has exactly one review from me; none has an inline
or conversation comment from me. My review text is quoted verbatim, including its spacing.
Timestamps are UTC as GitHub records them.

| Partner's PR | Reviewed | My review (verbatim) | Partner's response | Outcome |
|---|---|---|---|---|
| [#39](https://github.com/PAKATO123/toktickit/pull/39) docs(lab-03): add Sprint 3 engineering contract and specification docs | 2026-09-27 14:37:18 | `APPROVED` - "approve " | None | Merged 2026-09-28 08:41:55 into `lab3-staging` |
| [#40](https://github.com/PAKATO123/toktickit/pull/40) Implemented Feature/lab03 01 schema and migration | 2026-09-24 06:22:37 | `APPROVED` - "Approve" | None | Merged 2026-09-28 08:42:11 into `main` |
| [#41](https://github.com/PAKATO123/toktickit/pull/41) Implemented Feature/lab03 02 auth backend | 2026-09-27 14:37:06 | `APPROVED` - "approve " | None | Merged 2026-09-28 08:42:25 into `lab3-staging` |
| [#42](https://github.com/PAKATO123/toktickit/pull/42) Implemented Feature/lab03 03 authorization and requester refactor | 2026-09-27 14:36:54 | `APPROVED` - "approve " | None | Merged 2026-09-28 08:42:42 into `lab3-staging` |
| [#43](https://github.com/PAKATO123/toktickit/pull/43) Implemented Feature/lab03 04 staff queue and workflow backend | 2026-09-27 14:36:34 | `COMMENTED` - "approve " | None | Merged 2026-09-28 08:46:47 into `lab3-staging` |
| [#44](https://github.com/PAKATO123/toktickit/pull/44) Implemented Feature/lab03 05 auth UI | 2026-09-27 14:36:22 | `APPROVED` - "approve " | None | Merged 2026-09-28 08:51:08 into `lab3-staging` |
| [#45](https://github.com/PAKATO123/toktickit/pull/45) Implemented Feature/lab03 06 requester resolution UI | 2026-09-27 14:35:49 | `APPROVED` - "approve " | None | Merged 2026-09-28 08:53:04 into `lab3-staging` |
| [#46](https://github.com/PAKATO123/toktickit/pull/46) Implemented Feature/lab03 07 staff queue UI | 2026-09-27 14:35:34 | `APPROVED` - "approve " | None | Merged 2026-09-28 08:53:30 into `lab3-staging` |
| [#47](https://github.com/PAKATO123/toktickit/pull/47) Implemented Feature/lab03 08 staff ticket detail UI | 2026-09-24 06:25:18 | `CHANGES_REQUESTED` - " Request changes — staff cannot open attachments" | @PAKATO123, 2026-09-28 08:05:02: "Will address this in clean up branch" | Merged 2026-09-28 08:55:46 into `lab3-staging`; my review state still reads `CHANGES_REQUESTED` - I did not re-review |
| [#48](https://github.com/PAKATO123/toktickit/pull/48) Implemented Feature/lab03 09 admin users | 2026-09-24 09:34:40 | `APPROVED` - "Approve" | None | Merged 2026-09-28 08:56:02 into `lab3-staging` |
| [#61](https://github.com/PAKATO123/toktickit/pull/61) Lab3 post implementation cleanup1 | 2026-09-27 14:36:06 | `APPROVED` - "approve " | None | Merged 2026-09-28 08:58:02 into `lab3-staging` |

Two entries are not what a quick read of the table would suggest:

- **#43** carries review state `COMMENTED`, not `APPROVED`, although the body says
  "approve ". GitHub does not count it as an approval.
- **#47** is the only review that asked for a change. The partner replied at 08:05:02 on
  2026-09-28 that the fix would go in a cleanup branch, and the PR merged at 08:55:46 the
  same day with my `CHANGES_REQUESTED` review still standing.

---

## 4. Honest assessment

- **PAKATO's reviews were approvals, several with a request in the approval text.** All nine
  PRs carry `APPROVED`. Four approvals ask for something: `CLAUDE.md` placement (#46),
  `agents.ts` in #49, explaining the `green`/`red staff queue` evidence files (#50), and
  explaining the names in `evidence/issue-6` (#51); #52 says the documentation problem is the
  same, and #53 says paging could be more user friendly. I have not replied to any of these on
  GitHub; the PRs were approved as they stood, so I am not recording any of them as resolved.
- **The one comment before the batch, on #46, was worth having.** It found a gap two
  internally consistent documents never mentioned, and it is recorded with my reply and the
  decision it produced (C-109), traced to commit `bb27eb3`. I asked him to approve if the reply
  answered it; his formal approval of #46 came in the batch, 2026-10-05 12:53:10 UTC.
- **What the batch could not do.** #47's comment says it "cannot judge yet without seeing the
  future implementation". Because the nine PRs were reviewed at once, each approval was given
  against the stack as it stood, not against the finished product.
