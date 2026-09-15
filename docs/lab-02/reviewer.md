# Lab 2 - Peer Review Record

TokTickIT - CPE 334 Individual Sprint 2 (LS 14 Part 1).

| | |
|---|---|
| **Author** | Tammathorn Kananurak - 67070503489 - GitHub [@Tammathorn](https://github.com/Tammathorn) |
| **Peer reviewer** | Pattarapon Sribuathong - 67070503434 - GitHub [@PAKATO123](https://github.com/PAKATO123) |
| **Repository** | <https://github.com/Tammathorn/toktickit> |
| **Branch model** | `feature/*` -> `lab2-staging` (eight PRs) -> `main` (one release PR) |

This record is what the repository shows, read back with `gh` on 15 September 2026 rather
than written from memory. Timestamps are UTC as GitHub records them. Where a PR was merged
without a review, that is stated as such.

---

## 1. Summary

| PR | Branch | Issue | Review received | Approval status | Merged |
|---|---|---|---|---|---|
| [#18](https://github.com/Tammathorn/toktickit/pull/18) | `feature/1-sprint-spec` | #10 | One review by @PAKATO123, **Changes requested**, one substantive comment on C-11 | Changes requested; never re-reviewed after the response. Merged by the author with the change request still standing, the fix landing in the same PR as C-49 | 2026-09-08 10:25 |
| [#19](https://github.com/Tammathorn/toktickit/pull/19) | `feature/2-data-model` | #11 | None | **Merged without review** | 2026-09-13 16:58 |
| [#20](https://github.com/Tammathorn/toktickit/pull/20) | `feature/3-requester-context` | #12 | None | **Merged without review** | 2026-09-13 16:59 |
| [#21](https://github.com/Tammathorn/toktickit/pull/21) | `feature/4-create-ticket` | #13 | None | **Merged without review** | 2026-09-15 16:05 |
| [#22](https://github.com/Tammathorn/toktickit/pull/22) | `feature/5-my-tickets` | #14 | None | **Merged without review** | 2026-09-15 16:05 |
| [#23](https://github.com/Tammathorn/toktickit/pull/23) | `feature/6-ticket-detail` | #15 | None | **Merged without review** | 2026-09-15 16:26 |
| [#24](https://github.com/Tammathorn/toktickit/pull/24) | `feature/7-e2e-visual` | #16 | None | **Merged without review** | 2026-09-15 16:51 |
| [#25](https://github.com/Tammathorn/toktickit/pull/25) | `feature/8-release-docs` | #17 | See section 3 | See section 3 | See section 3 |
| Release | `lab2-staging` -> `main` | - | See section 3 | Open for the author's own inspection before merge | - |

One of eight feature PRs received a peer review. The other seven were merged by the author
without a review because the implementation work ran up against the sprint deadline; the
labsheet requires peer review on every PR, and this record does not claim that requirement
was met. Section 4 says what that cost.

---

## 2. Pull Requests I authored

### PR #18 - Issue #10: Lab 2 sprint specification and test plan

- **Link:** <https://github.com/Tammathorn/toktickit/pull/18>
- **Branch:** `feature/1-sprint-spec` -> `lab2-staging`
- **Opened:** 2026-09-06 13:01 · **Merged:** 2026-09-08 10:25
- **Contents:** `specification.md`, `api-spec.md`, `ui-spec.md`, `tests.md`, `decisions.md`
  C-01..C-49, the Lab 2 `CLAUDE.md`, the `ai-use.md` draft.

**Review received** - @PAKATO123, 2026-09-06 13:20, verdict **Changes requested**:

> The doc is solid and have no contradiction. The only real technical red flag to address
> before writing code (if havent already, in that case clarify) is C-11: explain how
> ticketNumber gets generated if it depends on the autoincremented id (e.g. inside a
> database transaction, a Prisma transaction, or a DB sequence), especially since C-30
> expects it to be indexed.

**My response** - 2026-09-08 10:18, in the PR conversation:

> Good catch. The id only exists after the insert, so it's a two-step inside one
> $transaction - create the row, then update it with
> `TKT-${year}-${String(id).padStart(6,"0")}`. Column stays unique, so the index C-30
> wants comes from that constraint. No sequence table, no collision retry.
>
> I'll write it into specification.md §7 and api-spec.md before Issue #13, and add a
> decision row so C-11 isn't ambiguous anymore. Thanks.

**What changed because of it** - commit `b8b0c6a` (2026-09-08 10:24, on the same branch,
before the merge) added **C-49** to `decisions.md`: the Ticket Number is assigned inside
one `prisma.$transaction`, create then update, so `ticketNumber` is nullable in the schema
but never null outside the transaction, and the `@unique` constraint supplies the index
C-30 relies on. `specification.md` section 7 and `api-spec.md` 3.1 carry the same
mechanism. Issue #11 implemented it as `server/src/lib/ticket-repository.ts` and DB-06
tests it.

**Approval status** - the reviewer did not return to the PR after the response, so
GitHub's recorded decision stayed *Changes requested*. I merged seven minutes after
replying, with C-49 in the branch. The comment was answered in substance; it was not
formally re-approved, and I am not recording it as approved.

### PR #19 - Issue #11: Data model, migration, and idempotent seed

- **Link:** <https://github.com/Tammathorn/toktickit/pull/19>
- **Branch:** `feature/2-data-model` -> `lab2-staging` · **Opened:** 2026-09-13 16:40 · **Merged:** 2026-09-13 16:58
- **Contents:** the five Prisma models with every section 7 index, the additive migration
  `20260908120000_lab02_data_model`, the idempotent graded seed and the demo seed (C-22),
  `createTicketWithNumber` (C-49), DB-01..DB-08 and UNIT-01..05, C-50, the corrected
  `POST /api/tickets` example.
- **Comments given:** none. **Comments received:** none. **Approval status:** merged without review.

### PR #20 - Issue #12: Development Requester context and Selection screen

- **Link:** <https://github.com/Tammathorn/toktickit/pull/20>
- **Branch:** `feature/3-requester-context` -> `lab2-staging` · **Opened:** 2026-09-13 16:54 · **Merged:** 2026-09-13 16:59
- **Contents:** `GET /api/requesters`, the error envelope, the Requester context with
  `localStorage` persistence and boot re-validation (C-32), the Selection screen's four
  states, the app shell, the in-repo router (C-51), the Playwright configuration (C-10),
  18 selection screenshots, API-11, UI-01..UI-09.
- **Comments given:** none. **Comments received:** none. **Approval status:** merged without review.

### PR #21 - Issue #13: Create Ticket API and UI

- **Link:** <https://github.com/Tammathorn/toktickit/pull/21>
- **Branch:** `feature/4-create-ticket` -> `lab2-staging` · **Opened:** 2026-09-13 17:14 · **Merged:** 2026-09-15 16:05
- **Contents:** `POST /api/tickets` with the 1.4 check order and catalogue validation,
  `GET /api/related-systems`, attachment upload via multer (C-16) with 415/413/422 and the
  BR-41 compensation, the Create Ticket form with its six states, 18 create screenshots,
  API-01..API-12, API-14, API-30..32, API-43, API-44, UI-11..UI-17, STYLE-01..05, STYLE-10.
  A second commit catalogued the system-generated-field message (BR-35) and moved the
  screenshot Ticket to a Requester the demo seed does not use.
- **Comments given:** none. **Comments received:** none. **Approval status:** merged without review.

### PR #22 - Issue #14: My Tickets list with search, filters, sort and pagination

- **Link:** <https://github.com/Tammathorn/toktickit/pull/22>
- **Branch:** `feature/5-my-tickets` -> `lab2-staging` (branched from `feature/4-create-ticket`; merged after #21) · **Opened:** 2026-09-15 16:01 · **Merged:** 2026-09-15 16:05
- **Contents:** `GET /api/tickets` (C-27, C-29, C-30, C-43) and `GET /api/tickets/:id`,
  the My Tickets screen bound to the address bar with table / card layouts, badges,
  pagination, empty versus no-results (C-28), the detail's load states and Card 1, 33 list
  screenshots, API-15..API-25, UI-10, UI-18..UI-23, STYLE-06, STYLE-08.
- **Comments given:** none. **Comments received:** none. **Approval status:** merged without review.

### PR #23 - Issue #15: Ticket Detail attachments and the attachment lifecycle

- **Link:** <https://github.com/Tammathorn/toktickit/pull/23>
- **Branch:** `feature/6-ticket-detail` -> `lab2-staging` · **Opened:** 2026-09-15 16:24 · **Merged:** 2026-09-15 16:26
- **Contents:** attachment metadata, the ownership-checked download / preview route with
  ownership before removal state (C-13, C-20, C-44, C-52), soft removal with a required
  reason, Card 2 with the five attachment states and the removal dialog, 21 detail
  screenshots, API-13, API-26..API-29, API-33..API-42, UI-24..UI-31, STYLE-07, STYLE-09.
- **Comments given:** none. **Comments received:** none. **Approval status:** merged without review.

### PR #24 - Issue #16: E2E flow, responsive checks and the completed visual checklist

- **Link:** <https://github.com/Tammathorn/toktickit/pull/24>
- **Branch:** `feature/7-e2e-visual` -> `lab2-staging` · **Opened:** 2026-09-15 16:43 · **Merged:** 2026-09-15 16:51
- **Contents:** `e2e/lab-02/requester-ticket-flow.spec.ts` (E2E-01..06, RESP-01..06), the
  hierarchy and shading style assertions, VIS-01 completed against measured captures with
  row 33 fixed in the UI, `Final = Pass` on all 111 planned tests.
- **Comments given:** none. **Comments received:** none. **Approval status:** merged without review.

### PR #25 - Issue #17: Release integration and documentation

- **Link:** <https://github.com/Tammathorn/toktickit/pull/25>
- **Branch:** `feature/8-release-docs` -> `lab2-staging`
- **Contents:** this record, the finished `ai-use.md`, the current `README.md`,
  `tests.md` section 6 filled from the final run.
- **Comments given / received, approval status:** filled in below if a review arrives
  before submission; otherwise merged without review, as the PRs above were.

> **PR #25 review, if any:** _(none at the time of writing)_

### Release PR - `lab2-staging` -> `main`

- **Link:** filled in when opened (see section 3).
- **Status:** opened for the author's own inspection; not merged by the agent.

---

## 3. Pull Requests I reviewed for my partner

> **To be filled by the author.** No review I gave on a PR in @PAKATO123's repository is
> recorded here yet. If I review one before submission, each entry needs: the PR link, my
> comment verbatim, my partner's response, and the outcome. **Do not invent entries** - an
> empty section is the accurate state on 15 September 2026.

| Partner's PR | My comment | Partner's response | Outcome |
|---|---|---|---|
| _none yet_ | | | |

---

## 4. Honest assessment

- **One review in eight** is the number a grader will see, and it is the number this
  record reports. The seven unreviewed PRs were merged because the implementation of
  Issues #11 to #16 landed on 13 and 15 September against the sprint deadline, and I
  chose to keep the branch model and the per-Issue PRs rather than collapse the work into
  one branch. That choice preserved the commit graph the labsheet asks for; it did not
  produce reviews.
- **The one review was worth having.** The C-11 comment found a gap two AI audit passes
  had walked past - the format was fixed, the moment the id exists was not - and it forced
  a real design decision (C-49) that shaped the schema (`ticketNumber` nullable), the
  repository function, DB-06, and later C-50. That is the case for peer review in one
  paragraph, and it is also why section 1 does not mark #18 as approved: the reviewer
  never returned to say the answer was acceptable.
- **What I would do differently:** open each feature PR the day its tests went green and
  ask for the review while the next Issue was in progress, instead of finishing the work
  first and reviewing never. The two-day gap between PR #21 opening (13 September) and
  merging (15 September) was a window a review could have used.
