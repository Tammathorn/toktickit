# Lab 2 - Report Evidence Map

TokTickIT - CPE 334 Individual Sprint 2. Report file `report_lab02_67070503489.pdf`,
headings `Answer Part 1` ... `Answer Part 9`.

Written on 2026-09-16 on `main` at `d48cbd2` (the merge of release PR #26), after the
three suites were run from that commit with both dev servers up. For each of the nine
parts this lists which repository files and committed screenshots satisfy it, and which
pieces can only come from the GitHub web UI or the IDE and must be captured by hand.

Updated 2026-09-17: `artifacts/lab-02/evidence/` now holds the README / `.gitignore`
renders, the Part 6 `requesterId` proof, and the sixteen hand captures of GitHub and VS Code
that were moved there from the root `screenshot/` folder (since removed) and renamed for
their content. Rows marked **[evidence]** point at them.

Screenshot paths are relative to `artifacts/lab-02/screenshots/`. `<vp>` means the three
files `desktop`, `tablet`, `mobile` (1280 / 834 / 390 px, C-10).

Legend: **[repo]** a tracked file, render or open it - **[png]** a committed capture -
**[evidence]** a PNG under `artifacts/lab-02/evidence/` - **[GitHub]** screenshot the web UI
by hand - **[IDE]** screenshot the editor by hand.

---

## Part 1 (10 pts) - Repository, workflow, review record

| Needs | Evidence | Source |
|---|---|---|
| Commit graph on `main` showing eight feature PRs into `lab2-staging` and one release PR into `main` | **[evidence]** `evidence/part1-commit-graph-main.png` (2105 x 1510) - `git log --graph` in the terminal from `d48cbd2 (HEAD -> main) Merge pull request #26` down through #25..#18 and the Lab 1 merges, branch labels visible | done; the **[GitHub]** `Pull requests > Closed` list is still outstanding (see below) |
| Project board with every Issue in Done | **[evidence]** `evidence/part1-board-done-partial.png` (Done = 12; cards #3 #4 #5 #2 #10 #11 #12 #13 #14 #15 visible, **#16 and #17 are below the fold**). Workflow progression for Issue #10: `part1-board-backlog-2026-09-04.png` (all eight in Backlog, four Lab 1 Issues Done), `part1-board-backlog-2026-09-08.png` (same state, 8 Sep), `part1-board-issue10-specified.png`, `part1-board-issue10-pr-review.png`, `part1-board-issue10-done.png` | **[GitHub]** retake the Done view so #16 and #17 are inside the frame (Recapture 1) |
| Rendered `reviewer.md` with both-direction comments | `docs/lab-02/reviewer.md` **[repo]** - sections 1, 2 and 4 are complete; section 3 (reviews given to the partner) is an empty table by design and says so. PR #18 review thread: **[evidence]** `evidence/part1-pr18-review-and-author-reply.png` (1095 x 1122, merged state, the *Changes requested* comment on C-11 by @PAKATO123 and the author's reply in one frame - the primary capture); `part1-pr18-open-changes-requested.png` (the PR while still Open, reviewer comment only) and `part1-pr18-merged-review-thread.png` (just after merge, reply below the fold) are earlier versions of the same thread | **[GitHub]** render of `reviewer.md` on `main` still outstanding |
| README | `README.md` **[repo]** | **[evidence]** `evidence/part1-readme.png` (full render, 1040 x 7564 px, GFM via the GitHub markdown API, header shows `main @ d48cbd2`) and the same content cut into six page-sized files `evidence/part1-readme-page-1of6.png` ... `part1-readme-page-6of6.png` (1040 x 1470 px each) for the PDF. No hand capture needed |
| `.gitignore` | `.gitignore` **[repo]** - `node_modules/`, `.env`, `dist/`, `build/`, `*.log`, `/test-results/`, `/playwright-report/`, `/blob-report/`, `server/uploads/`, `docs/lab-02/spec/*.pdf` | **[evidence]** `evidence/part1-gitignore.png` (all 27 lines, numbered, 900 x 900 px). No hand capture needed |
| `.env.example` with `UPLOAD_DIR` and `MAX_UPLOAD_BYTES` placeholders (C-38) | `server/.env.example` **[repo]** | **[IDE]** open the file |
| Directory tree matching labsheet section 12 | **[evidence]** VS Code Explorer, one subtree per file: `evidence/part1-tree-docs-lab-02.png` (`docs/lab-02/` with all seven named files plus `handoff.md` and `spec/`), `part1-tree-client-tests-lab-02.png` (`client/tests/lab-02/`, five `.test.tsx`), `part1-tree-e2e-lab-02.png` (`e2e/lab-02/`, five specs), `part1-tree-artifacts-screenshots.png` (`artifacts/lab-02/screenshots/`, three folders). `part1-tree-docs-lab-02-crop.png` is a tighter crop of the docs view that stops before `ui-spec.md` - redundant | **[IDE]** still missing: `server/tests/lab-02/` (six test files) and a collapsed root view (Recapture 2 and 3). Retake `part1-tree-artifacts-screenshots.png` after `feature/9-evidence` merges so `artifacts/lab-02/evidence/` and `evidence.md` appear |

Gaps to be aware of when writing Part 1: `reviewer.md` records one review in eight
(PR #18), the other seven merged without review, and section 3 is empty. It also leaves
the release PR link as "filled in when opened" - PR #26 (opened 2026-09-15 21:51 UTC,
merged 2026-09-16, no review) is not named in the file. State both plainly in the report
rather than around them.

## Part 2 (5 pts) - Specification, and proof it predates the implementation

| Needs | Evidence | Source |
|---|---|---|
| Rendered `specification.md` with numbered FR / BR / AC / DoD | `docs/lab-02/specification.md` **[repo]** - section 4 FR-01.., section 5 BR-01.., section 9 AC-01.., section 10 Definition of Done | **[GitHub]** open the file on `main` so the tables render; capture section 4, section 5, section 9 and section 10 |
| Proof the spec preceded the implementation PRs | `git log --format="%h %ci %s" -- docs/lab-02/specification.md` shows `b8b0c6a 2026-09-08 17:24 +0700` as the commit that added it; PR #18 merged 2026-09-08 10:25 UTC; the first implementation PR #19 opened 2026-09-13 16:40 UTC | **[GitHub]** PR #18 page showing its merge timestamp, next to PR #19's opened timestamp; or the commit page for `b8b0c6a`. `evidence/part1-pr18-merged-review-thread.png` shows *merged ... 2 minutes ago* - a relative time, not a date - so it does not settle this on its own |
| Supporting documents | `docs/lab-02/api-spec.md`, `docs/lab-02/decisions.md` (C-01..C-52) **[repo]** | optional **[GitHub]** render of the decisions table |

## Part 3 (10 pts) - Test plan, traceability, passing output from `main`

| Needs | Evidence | Source |
|---|---|---|
| Planned test table with real file paths | `docs/lab-02/tests.md` **[repo]** section 2 (2.1 unit ... 2.7 data model) | **[GitHub]** render of section 2 |
| AC traceability | `docs/lab-02/tests.md` section 3 | **[GitHub]** render of section 3 |
| Final pass status | `docs/lab-02/tests.md` section 6 - summary table 86 / 48 / 126, all passed | **[GitHub]** render of section 6 |
| Passing output from `main` | Appendix A of this file: the ANSI-stripped output of `cd server && npm test`, `cd client && npm test`, `npx playwright test e2e/lab-02` run on `main` at `d48cbd2` on 2026-09-16 (Start at 23:29:03, 23:30:08 and the 13.3 s Playwright run). Note that the paste in `tests.md` section 6 was made on `feature/8-release-docs` before the release merge; the `main` run is the one in Appendix A | **[IDE]** terminal panel showing the three commands with `git branch --show-current` printing `main` in the same panel |
| Test files exist where the plan says | `server/tests/lab-02/{create-ticket.api,my-tickets.api,ticket-detail.api,attachments.api,ticket-number.unit,data-model.db}.test.ts`, `client/tests/lab-02/{CreateTicket,MyTickets,RequesterTicketDetail,AttachmentSection,RequesterSelection}.test.tsx`, `e2e/lab-02/requester-ticket-flow.spec.ts` | **[IDE]** Explorer |

## Part 4 (5 pts) - AI use

| Needs | Evidence | Source |
|---|---|---|
| Rendered `ai-use.md`: LLM named, 6-10 key prompts, reflection | `docs/lab-02/ai-use.md` **[repo]** - section 1 names the LLM, section 2 has the ten-row prompt table, section 3 is the reflection | **[GitHub]** render of the file on `main` |

## Part 5 (0 pts) - Development Requester Selection

Scored inside Part 6. The captures live under `create-ticket/` with a `selection-`
prefix because labsheet section 12 fixes three folder names (ui-spec section 15).

| State | Files |
|---|---|
| Loading | `create-ticket/selection-<vp>-loading.png` |
| Populated, with the "not a login" wording | `create-ticket/selection-<vp>-populated.png` |
| Dropdown open, active Requesters only | `create-ticket/selection-<vp>-dropdown.png` |
| Selected: shell shows the Requester name and Change Requester | `create-ticket/selection-<vp>-selected.png` |
| Empty | `create-ticket/selection-<vp>-empty.png` |
| Failure with Retry | `create-ticket/selection-<vp>-failure.png` |

Nothing here needs a hand capture.

## Part 6 (10 pts) - Create Ticket in six states, plus the selector

| Needs | Files |
|---|---|
| Initial | `create-ticket/create-<vp>-initial.png` |
| Validation failure | `create-ticket/create-<vp>-validation.png` |
| Submitting | `create-ticket/create-<vp>-submitting.png` |
| Success with the generated Ticket Number | `create-ticket/create-<vp>-success.png` |
| API failure, values preserved | `create-ticket/create-<vp>-api-failure.png` |
| Invalid attachment | `create-ticket/create-<vp>-invalid-attachment.png` |
| Focused field (VIS-01 row 35) | `create-ticket/create-<vp>-focus.png` |
| Selector, dropdown, selected-user display, Change Requester, loading, failure | the six `selection-<vp>-*.png` listed under Part 5 |

`requesterId` proof - **[evidence]** `evidence/part6-requesterid-proof.png` (1100 x 1511 px):

- **Representation chosen:** `GET /api/tickets/:id?requesterId=` (api-spec 3.3), the
  detail endpoint. It is the one contract read path whose body carries `ticketNumber`,
  `requesterId` and `requester.name` together, so the Ticket Number and the Requester
  identity sit in one response with no join done by hand. A Prisma query would show the
  same row but only as raw ids, and the list endpoint omits `requesterId` altogether.
- **Chain from screen to database:** the committed
  `screenshots/create-ticket/create-desktop-success.png` shows the Create Ticket form,
  used as Development Requester Siriporn Chaiyo (the screenshot Requester, id 4, the last
  active one), returning `TKT-2026-000484` on 15 Sep 2026 23:42 +07. The capture then
  reads that saved row back on `main @ d48cbd2`:
  `GET /api/tickets/484?requesterId=4` -> 200 with `"ticketNumber": "TKT-2026-000484"`,
  `"requesterId": 4`, `"requester": { "id": 4, "name": "Siriporn Chaiyo" }`,
  `"createdAt": "2026-09-15T16:42:43.228Z"` (= 23:42 +07, matching the screenshot).
- **Paired refusal in the same image:** `GET /api/tickets/484?requesterId=1` -> 403
  `TICKET_FORBIDDEN`, so the binding is enforced by the backend (BR-21, C-13), not merely
  displayed. `GET /api/requesters` is printed above both so the id-to-name mapping is on
  the page.
- Place `create-desktop-success.png` and `part6-requesterid-proof.png` side by side in
  the report. No hand capture needed. `server/tests/lab-02/create-ticket.api.test.ts`
  asserts the same binding and its passing line is in Appendix A.

## Part 7 (10 pts) - My Tickets, switching, search, filters, sort, pagination, rejection

| Needs | Files |
|---|---|
| Requester A's list, newest first | `my-tickets/list-<vp>-populated.png` |
| Switch to B; A's Tickets are gone | `my-tickets/list-<vp>-switched.png` (with `create-ticket/selection-<vp>-selected.png` showing the switch control) |
| Search | `my-tickets/list-<vp>-search.png` |
| Filters (Category, Current Status) | `my-tickets/list-<vp>-filters.png` |
| Sort (Ticket Number ascending) | `my-tickets/list-<vp>-sorted.png` |
| Pagination (page 2) | `my-tickets/list-<vp>-page-2.png` |
| Empty (Requester C) | `my-tickets/list-<vp>-empty.png` |
| No results | `my-tickets/list-<vp>-no-results.png` |
| Loading | `my-tickets/list-<vp>-loading.png` |
| Failure with Retry | `my-tickets/list-<vp>-failure.png` |
| Cross-Requester rejection (403) | `my-tickets/list-<vp>-forbidden.png` |

Demo counts backing these captures: Requester A 14, B 3, C 0 (`server/prisma/seed-demo.ts`,
C-22; the seed printed "0 tickets created, 17 already present" before this run). Nothing
here needs a hand capture.

## Part 8 (5 pts) - Ticket Detail and the attachment lifecycle

| Needs | Files |
|---|---|
| Detail, read-only, two active attachments | `ticket-detail/detail-<vp>-active.png` |
| Add attachment from the detail | `ticket-detail/detail-<vp>-add-attachment.png` |
| Download | `ticket-detail/detail-<vp>-download.png` |
| Soft removal with reason (dialog) | `ticket-detail/detail-<vp>-removal-dialog.png` |
| Retained metadata and reason after removal | `ticket-detail/detail-<vp>-removed.png` |
| Blocked download of a removed file (410, C-46) | `ticket-detail/detail-<vp>-blocked-download.png` |
| Unauthorized access rejected (403) | `ticket-detail/detail-<vp>-unauthorized.png` |

Nothing here needs a hand capture. E2E-03 / E2E-04 / E2E-05 in
`e2e/lab-02/requester-ticket-flow.spec.ts` exercise the same flow and their passing lines
are in Appendix A.

## Part 9 (5 pts) - UI spec, three-viewport screenshots, visual checklist

| Needs | Evidence | Source |
|---|---|---|
| Rendered `ui-spec.md` | `docs/lab-02/ui-spec.md` **[repo]** - section 2 tokens, section 7 button hierarchy, section 15 screenshot paths, section 16 checklist | **[GitHub]** render of the file on `main` |
| Desktop / tablet / mobile of each screen | One state per screen at all three widths: `create-ticket/selection-<vp>-populated.png`, `create-ticket/create-<vp>-initial.png`, `my-tickets/list-<vp>-populated.png`, `ticket-detail/detail-<vp>-active.png` - 12 files that show the table-to-cards change at 390 px and the collapsed navbar | **[png]** |
| Completed visual checklist | `docs/lab-02/tests.md` section 4 (4.1 colour ... 4.6 accessibility), VIS-01 with every row ticked in the D / T / M columns and the two rows that needed a fix noted under the tables; section 2's planned-test table shows `Pass` on all 111 rows | **[GitHub]** render of section 4 |
| Responsive assertions ran | RESP-01..RESP-06 lines in Appendix A, for all three projects | terminal |

## Screenshot inventory (checked 2026-09-16)

| Folder | Files | Prefixes |
|---|---|---|
| `create-ticket/` | 39 | `selection-` 18 (6 states x 3), `create-` 21 (7 states x 3) |
| `my-tickets/` | 33 | `list-` 33 (11 states x 3) |
| `ticket-detail/` | 21 | `detail-` 21 (7 states x 3) |
| **Total** | **93** | 31 names per viewport x 3 viewports; 0 zero-byte files; smallest is 9 740 bytes (`list-mobile-forbidden.png`, `detail-mobile-unauthorized.png` - the 403 panel) |

The figure of 90 in earlier notes predates the three `create-<vp>-focus.png` captures
added with Issue #16; ui-spec section 15 lists all 31 names. The committed images were
captured on 15 Sep 2026 at 23:42 local, after the `theme.css` touch-target and focus-ring
change in the same commit (`2ed6643`, 23:43), and a full re-run on `main` today
reproduced the same layouts, differing only in run-specific dates and Ticket Numbers.

## `artifacts/lab-02/evidence/` (25 PNGs, untracked until `feature/9-evidence` is committed)

Generated on 2026-09-17 from `main @ d48cbd2`:

| File | Size (px) | Covers |
|---|---|---|
| `part1-readme.png` | 1040 x 7564 | Part 1 - rendered `README.md`, one image |
| `part1-readme-page-1of6.png` ... `-6of6.png` | 1040 x 1470 (last 1040 x 214) | Part 1 - the same render in page-sized slices |
| `part1-gitignore.png` | 900 x 900 | Part 1 - `.gitignore`, 27 numbered lines |
| `part6-requesterid-proof.png` | 1100 x 1511 | Part 6 - `TKT-2026-000484` / `requesterId` 4 / Siriporn Chaiyo, 200 vs 403 |

Hand-captured (GitHub web UI, VS Code, terminal), moved from the root `screenshot/` folder
on 2026-09-17 and renamed for what each shows. Four byte-identical duplicates of the tree
captures were dropped in the move.

| File | Size (px) | Taken | Shows | Use |
|---|---|---|---|---|
| `part1-commit-graph-main.png` | 2105 x 1510 | 16 Sep | `git log --graph` on `main`: #26 -> #25 ... #18 with branch labels, then the Lab 1 history | **Part 1 primary** |
| `part1-board-done-partial.png` | 2812 x 1400 | 16 Sep | Board, Done = 12; #2 #3 #4 #5 #10..#15 visible, #16 #17 below the fold | Part 1 - **retake** |
| `part1-board-backlog-2026-09-04.png` | 2867 x 1390 | 4 Sep | Board at sprint start: #10..#17 in Backlog, Lab 1 #2..#5 Done | Part 1 - sprint start |
| `part1-board-backlog-2026-09-08.png` | 2877 x 1320 | 8 Sep | Same state as above, four days later | redundant with the 4 Sep capture |
| `part1-board-issue10-specified.png` | 2877 x 1335 | 4 Sep | #10 in Specified | Part 1 - workflow |
| `part1-board-issue10-pr-review.png` | 2875 x 1112 | 8 Sep | #10 in PR Review | Part 1 - workflow |
| `part1-board-issue10-done.png` | 2865 x 1310 | 8 Sep | #10 in Done, Done = 5 | Part 1 - workflow |
| `part1-pr18-review-and-author-reply.png` | 1095 x 1122 | 16 Sep | PR #18 merged; the *Changes requested* comment by @PAKATO123 and the author's C-49 reply in one frame | **Part 1 primary** for the review record |
| `part1-pr18-open-changes-requested.png` | 2437 x 1360 | 8 Sep | PR #18 while Open: reviewer requested, review comment, no reply yet | Part 1 - optional |
| `part1-pr18-merged-review-thread.png` | 2855 x 1407 | 8 Sep | PR #18 *merged 2 minutes ago*, review comment; reply cut off | Part 1 - optional |
| `part1-tree-docs-lab-02.png` | 680 x 1197 | 16 Sep | Explorer: `docs/lab-02/` with `spec/`, `ai-use.md` ... `ui-spec.md` | **Part 1 tree** |
| `part1-tree-docs-lab-02-crop.png` | 667 x 597 | 16 Sep | Same subtree, tighter crop, stops at `tests.md` | redundant |
| `part1-tree-client-tests-lab-02.png` | 722 x 722 | 16 Sep | Explorer: `client/tests/lab-02/`, five `.test.tsx` | **Part 1 tree** |
| `part1-tree-e2e-lab-02.png` | 665 x 360 | 16 Sep | Explorer: `e2e/lab-02/`, five specs | **Part 1 tree** |
| `part1-tree-artifacts-screenshots.png` | 715 x 432 | 16 Sep | Explorer: `artifacts/lab-02/screenshots/`, three folders | Part 1 tree - **retake after merge** (no `evidence/` yet) |
| `part1-terminal-git-status-main-restore.png` | 1065 x 1440 | 16 Sep | PowerShell: `git status` on `main` listing 51 regenerated screenshots, then `git checkout --` and a clean status | not needed for any part; leave out of the PDF |

Readability: the GitHub board and PR captures are full-screen at about 2850 px wide with
13-14 px UI text. They read at 100 % but will shrink to roughly 40 % on an A4 page; crop
each to the columns or thread that matters before placing it, or retake at browser zoom
150 %. The terminal, Explorer and 1095 px PR capture are fine as they are.

## Recapture list

1. **Board, all Lab 2 Issues Done** - `part1-board-done-partial.png` stops at #15. Scroll
   the Done column (or switch the view to table layout, or zoom the browser out) so
   #10..#17 are all inside the frame with the `Done` header count.
2. **`server/tests/lab-02/`** in the Explorer - no capture exists. Six files:
   `attachments.api`, `create-ticket.api`, `data-model.db`, `my-tickets.api`,
   `ticket-detail.api`, `ticket-number.unit`.
3. **Root tree, collapsed** - one Explorer view with `artifacts client docs e2e server`
   and `.gitignore CLAUDE.md package.json playwright.config.ts README.md` at the root.
   Take it after `feature/9-evidence` is merged so `artifacts/lab-02/` shows `evidence/`,
   `evidence.md` and `screenshots/`. That retake supersedes
   `part1-tree-artifacts-screenshots.png`.
4. **Part 2 timestamps** - PR #18 merged date beside PR #19 opened date (hover the relative
   time, or use the commit page for `b8b0c6a`).

The existing tree captures do **not** need retaking because of the removed `screenshot/`
folder: each is scoped to a subtree (`docs/lab-02`, `client/tests/lab-02`, `e2e/lab-02`,
`artifacts/lab-02/screenshots`) and none shows the repository root, so the folder never
appeared in them.

## Still missing - hand list

1. **[GitHub]** Board with #10..#17 all in Done, inside one frame (Recapture 1).
2. **[GitHub]** `Pull requests > Closed`: PRs #18-#26 merged, bases visible (#18-#25 into
   `lab2-staging`, #26 into `main`).
3. **[GitHub]** PR #18 merged timestamp beside PR #19 opened timestamp (Part 2 proof).
4. **[GitHub]** Rendered `specification.md`, `tests.md`, `ai-use.md`, `ui-spec.md`,
   `reviewer.md` on `main`.
5. **[IDE]** `server/tests/lab-02/` expanded (Recapture 2); collapsed root tree after the
   evidence merge (Recapture 3); `server/.env.example` open.
6. **[IDE]** Terminal with `git branch --show-current` = `main` and the three test commands,
   or use Appendix A.

Done and in `evidence/`: commit graph, PR #18 review thread, README, `.gitignore`,
Issue #10 board progression, the `docs/lab-02` / `client/tests/lab-02` / `e2e/lab-02` /
`artifacts/lab-02/screenshots` trees, Part 6 `requesterId` proof.

---

## Appendix A - Test output from `main` (`d48cbd2`), 2026-09-16

Preconditions: `docker start toktickit-db`; `npx prisma migrate deploy` -> "No pending
migrations to apply"; `npm run prisma:seed` -> "Seeded 4 categories, 7 related systems,
4 active and 1 inactive Development Requesters."; `npx tsx prisma/seed-demo.ts` ->
"Demo seed complete: 0 tickets created, 17 already present."; `npm run dev` in `server/`
and in `client/` (health check returned `{"status":"ok","service":"TokTickIT API"}`).

### `cd server && npm test`

```
> toktickit-server@1.0.0 test
> vitest run

 RUN  v2.1.9 C:/Downloads/Lab1_Starter_Scaffold/toktickit/server

 ✓ tests/lab-02/attachments.api.test.ts (17 tests) 750ms
   ✓ GET /api/attachments/:id/download and DELETE /api/attachments/:id > API-37 refuses a whitespace-only reason with 422 and a missing key with 400 (AC-35, BR-47) 319ms
 ✓ tests/lab-02/my-tickets.api.test.ts (15 tests) 325ms
 ✓ tests/lab-02/create-ticket.api.test.ts (15 tests) 287ms
 ✓ tests/lab-02/data-model.db.test.ts (18 tests) 148ms
 ✓ tests/lab-02/ticket-detail.api.test.ts (6 tests) 178ms
 ✓ tests/lab-02/ticket-number.unit.test.ts (13 tests) 3ms
 ✓ tests/lab-01/categories.test.ts (1 test) 38ms
 ✓ tests/lab-01/health.test.ts (1 test) 13ms

 Test Files  8 passed (8)
      Tests  86 passed (86)
   Start at  23:29:03
   Duration  5.94s (transform 137ms, setup 0ms, collect 2.20s, tests 1.74s, environment 1ms, prepare 961ms)
```

### `cd client && npm test`

```
> toktickit-client@1.0.0 test
> vitest run

 RUN  v2.1.9 C:/Downloads/Lab1_Starter_Scaffold/toktickit/client

 ✓ tests/lab-02/RequesterTicketDetail.test.tsx (5 tests) 171ms
 ✓ tests/lab-01/App.test.tsx (3 tests) 172ms
 ✓ tests/lab-02/RequesterSelection.test.tsx (10 tests) 404ms
 ✓ tests/lab-02/MyTickets.test.tsx (11 tests) 1169ms
   ✓ My Tickets > debounces the search box into the request and resets to page 1 431ms
 ✓ tests/lab-02/AttachmentSection.test.tsx (7 tests) 2076ms
   ✓ Attachment section > UI-27 / UI-28 removal dialog: Cancel issues no request; Remove is gated on a reason and then removes (AC-33) 1403ms
 ✓ tests/lab-02/CreateTicket.test.tsx (12 tests) 11614ms
   ✓ Create Ticket > UI-12 blocks submit on an empty Ticket Summary and makes no API call (AC-17) 689ms
   ✓ Create Ticket > UI-13 renders exactly the ui-spec.md catalogue string for each BR-31..BR-34 violation (AC-23) 2516ms
   ✓ Create Ticket > UI-14 / STYLE-03 prevents a double submit and shows the busy state (AC-21, BR-36) 2011ms
   ✓ Create Ticket > UI-15 shows the safe banner and keeps every value and the attachment selection on failure (AC-22, BR-37) 2061ms
   ✓ Create Ticket > UI-17 / STYLE-05 shows the Ticket Number, per-file outcomes and next actions on success (AC-01, AC-59) 2022ms
   ✓ Create Ticket > STYLE-03 (hierarchy) keeps one primary action and the ui-spec 7 levels on Create Ticket 1958ms

 Test Files  6 passed (6)
      Tests  48 passed (48)
   Start at  23:30:08
   Duration  25.63s (transform 482ms, setup 11.49s, collect 13.83s, tests 15.61s, environment 54.32s, prepare 1.63s)
```

### `npx playwright test e2e/lab-02`

```
Running 126 tests using 11 workers

  ✓    8 [desktop] › e2e\lab-02\my-tickets-screenshots.spec.ts:60:7 › My Tickets › populated: Requester A's first page, newest first (1.2s)
  ✓    6 [desktop] › e2e\lab-02\my-tickets-screenshots.spec.ts:126:7 › My Tickets › sorted: Ticket Number ascending (1.2s)
  ✓    2 [desktop] › e2e\lab-02\my-tickets-screenshots.spec.ts:108:7 › My Tickets › filters: Category and Current Status filters active (1.2s)
  ✓    1 [desktop] › e2e\lab-02\create-ticket-screenshots.spec.ts:67:7 › Create Ticket › initial: reference data loaded, Medium preset, Submit enabled (1.3s)
  ✓    4 [desktop] › e2e\lab-02\my-tickets-screenshots.spec.ts:73:7 › My Tickets › switched: after changing A to B, A's Tickets are gone and B's are listed (1.4s)
  ✓    7 [desktop] › e2e\lab-02\create-ticket-screenshots.spec.ts:155:7 › Create Ticket › invalid-attachment: the client marks a refused file before any request (1.3s)
  ✓    9 [desktop] › e2e\lab-02\create-ticket-screenshots.spec.ts:95:7 › Create Ticket › submitting: busy button, fields locked (1.4s)
  ✓    3 [desktop] › e2e\lab-02\create-ticket-screenshots.spec.ts:75:7 › Create Ticket › validation: catalogue messages under each field, no request sent (1.4s)
  ✓   10 [desktop] › e2e\lab-02\my-tickets-screenshots.spec.ts:93:7 › My Tickets › search: the search box narrows the list and Clear filters appears (1.3s)
  ✓    5 [desktop] › e2e\lab-02\create-ticket-screenshots.spec.ts:112:7 › Create Ticket › success: the generated Ticket Number and the next actions (1.6s)
  ✓   11 [desktop] › e2e\lab-02\create-ticket-screenshots.spec.ts:125:7 › Create Ticket › api-failure: safe banner, every entered value preserved (1.6s)
  ✓   13 [desktop] › e2e\lab-02\my-tickets-screenshots.spec.ts:159:7 › My Tickets › loading: skeleton while the list request is in flight (436ms)
  ✓   14 [desktop] › e2e\lab-02\my-tickets-screenshots.spec.ts:172:7 › My Tickets › empty: Requester C owns nothing (488ms)
  ✓   12 [desktop] › e2e\lab-02\my-tickets-screenshots.spec.ts:143:7 › My Tickets › page-2: the second page of Requester A's list (573ms)
  ✓   24 [desktop] › e2e\lab-02\requester-ticket-flow.spec.ts:296:7 › Responsive › RESP-05 every screenshot ui-spec.md 15 names exists at this viewport (AC-54) (8ms)
  ✓   15 [desktop] › e2e\lab-02\my-tickets-screenshots.spec.ts:184:7 › My Tickets › no-results: a search that excludes every Ticket (477ms)
  ✓   16 [desktop] › e2e\lab-02\my-tickets-screenshots.spec.ts:195:7 › My Tickets › failure: safe panel with Retry, toolbar kept (463ms)
  ✓   17 [desktop] › e2e\lab-02\my-tickets-screenshots.spec.ts:208:7 › My Tickets › forbidden: Requester B opening one of A's Tickets is refused with 403 (493ms)
  ✓   23 [desktop] › e2e\lab-02\requester-ticket-flow.spec.ts:269:7 › Responsive › RESP-04 at 390 px the toggler opens a panel with both nav items and Change Requester (ui-spec 9) (460ms)
  ✓   21 [desktop] › e2e\lab-02\requester-ticket-flow.spec.ts:247:7 › Responsive › RESP-02 / RESP-03 My Tickets is cards at 390 px and a six-column table at 1280 px (511ms)
  ✓   20 [desktop] › e2e\lab-02\requester-ticket-flow.spec.ts:205:5 › E2E-06 a Requester with no Tickets sees `No tickets yet`; a filter that excludes everything shows `No matches` (AC-49, AC-50) (747ms)
  ✓   19 [desktop] › e2e\lab-02\requester-ticket-flow.spec.ts:185:5 › E2E-02 switching from Requester A to B makes A's Tickets disappear and lists B's (AC-11, AC-03) (789ms)
  ✓   27 [desktop] › e2e\lab-02\selection-screenshots.spec.ts:34:7 › Development Requester Selection › populated: active Requesters listed, not a login screen (485ms)
  ✓   28 [desktop] › e2e\lab-02\selection-screenshots.spec.ts:44:7 › Development Requester Selection › dropdown: only active Requesters are offered (532ms)
  ✓   29 [desktop] › e2e\lab-02\selection-screenshots.spec.ts:64:7 › Development Requester Selection › loading: spinner with select and Continue disabled (463ms)
  ✓   25 [desktop] › e2e\lab-02\requester-ticket-flow.spec.ts:370:7 › Responsive › the Zen Green tokens are what the built CSS paints (ui-spec 2, VIS-01 rows 1-6) (762ms)
  ✓   30 [desktop] › e2e\lab-02\selection-screenshots.spec.ts:76:7 › Development Requester Selection › empty: no select, explanatory message, Continue disabled (401ms)
  ✓   31 [desktop] › e2e\lab-02\selection-screenshots.spec.ts:89:7 › Development Requester Selection › failure: safe message with Retry, nothing stored (453ms)
  ✓   22 [desktop] › e2e\lab-02\requester-ticket-flow.spec.ts:223:7 › Responsive › RESP-01 no horizontal page scroll on any of the four screens (AC-55) (995ms)
  ✓   33 [desktop] › e2e\lab-02\ticket-detail-screenshots.spec.ts:73:7 › Requester Ticket Detail › active: the owned detail with two active attachments (563ms)
  ✓   32 [desktop] › e2e\lab-02\selection-screenshots.spec.ts:102:7 › Development Requester Selection › selected: the shell shows the Requester name and Change Requester (623ms)
  ✓   34 [desktop] › e2e\lab-02\ticket-detail-screenshots.spec.ts:88:7 › Requester Ticket Detail › add-attachment: a file added from the detail appears in the active group (609ms)
  ✓   35 [desktop] › e2e\lab-02\ticket-detail-screenshots.spec.ts:103:7 › Requester Ticket Detail › download: an active attachment is served with Content-Disposition attachment (646ms)
  ✓   18 [desktop] › e2e\lab-02\requester-ticket-flow.spec.ts:66:7 › The Requester flow › E2E-01 selects a Requester, creates a Ticket with an attachment, finds it in My Tickets and opens its detail (AC-01, AC-08, AC-09) (1.6s)
  ✓   39 [desktop] › e2e\lab-02\ticket-detail-screenshots.spec.ts:189:7 › Requester Ticket Detail › unauthorized: another Requester opening the Ticket is refused with 403 (471ms)
  ✓   38 [desktop] › e2e\lab-02\ticket-detail-screenshots.spec.ts:165:7 › Requester Ticket Detail › blocked-download: a removed file answers 410 and the row turns unavailable (C-46) (609ms)
  ✓   36 [desktop] › e2e\lab-02\ticket-detail-screenshots.spec.ts:121:7 › Requester Ticket Detail › removal-dialog: names the file, requires a reason, Remove gated on it (828ms)
  ✓   37 [desktop] › e2e\lab-02\ticket-detail-screenshots.spec.ts:141:7 › Requester Ticket Detail › removed: metadata and reason stay visible after reload; no Download, no Preview (798ms)
  ✓   26 [desktop] › e2e\lab-02\requester-ticket-flow.spec.ts:308:7 › Responsive › RESP-06 tabbing each screen reaches every control, each named and with a visible focus ring (AC-56) (1.8s)
  ✓   40 [desktop] › e2e\lab-02\requester-ticket-flow.spec.ts:114:7 › The Requester flow › E2E-03 adds, downloads and soft-removes an attachment; metadata and reason remain (AC-32, AC-30, AC-34) (637ms)
  ✓   41 [tablet] › e2e\lab-02\create-ticket-screenshots.spec.ts:67:7 › Create Ticket › initial: reference data loaded, Medium preset, Submit enabled (658ms)
  ✓   45 [desktop] › e2e\lab-02\requester-ticket-flow.spec.ts:143:7 › The Requester flow › E2E-04 the removed attachment offers no download, and a direct request returns 410 (AC-36) (503ms)
  ✓   42 [tablet] › e2e\lab-02\create-ticket-screenshots.spec.ts:75:7 › Create Ticket › validation: catalogue messages under each field, no request sent (945ms)
  ✓   51 [desktop] › e2e\lab-02\requester-ticket-flow.spec.ts:161:7 › The Requester flow › E2E-05 another Requester is refused: direct navigation to the Ticket and a direct attachment request both give 403 (AC-03, AC-39) (512ms)
  ✓   44 [tablet] › e2e\lab-02\create-ticket-screenshots.spec.ts:95:7 › Create Ticket › submitting: busy button, fields locked (991ms)
  ✓   50 [tablet] › e2e\lab-02\my-tickets-screenshots.spec.ts:126:7 › My Tickets › sorted: Ticket Number ascending (614ms)
  ✓   47 [tablet] › e2e\lab-02\my-tickets-screenshots.spec.ts:60:7 › My Tickets › populated: Requester A's first page, newest first (687ms)
  ✓   43 [tablet] › e2e\lab-02\create-ticket-screenshots.spec.ts:112:7 › Create Ticket › success: the generated Ticket Number and the next actions (1.1s)
  ✓   46 [tablet] › e2e\lab-02\create-ticket-screenshots.spec.ts:155:7 › Create Ticket › invalid-attachment: the client marks a refused file before any request (1.0s)
  ✓   48 [tablet] › e2e\lab-02\my-tickets-screenshots.spec.ts:73:7 › My Tickets › switched: after changing A to B, A's Tickets are gone and B's are listed (764ms)
  ✓   54 [tablet] › e2e\lab-02\my-tickets-screenshots.spec.ts:143:7 › My Tickets › page-2: the second page of Requester A's list (564ms)
  ✓   55 [tablet] › e2e\lab-02\my-tickets-screenshots.spec.ts:172:7 › My Tickets › empty: Requester C owns nothing (430ms)
  ✓   56 [tablet] › e2e\lab-02\my-tickets-screenshots.spec.ts:184:7 › My Tickets › no-results: a search that excludes every Ticket (465ms)
  ✓   49 [tablet] › e2e\lab-02\my-tickets-screenshots.spec.ts:93:7 › My Tickets › search: the search box narrows the list and Clear filters appears (965ms)
  ✓   53 [tablet] › e2e\lab-02\my-tickets-screenshots.spec.ts:108:7 › My Tickets › filters: Category and Current Status filters active (637ms)
  ✓   58 [tablet] › e2e\lab-02\my-tickets-screenshots.spec.ts:208:7 › My Tickets › forbidden: Requester B opening one of A's Tickets is refused with 403 (450ms)
  ✓   57 [tablet] › e2e\lab-02\my-tickets-screenshots.spec.ts:195:7 › My Tickets › failure: safe panel with Retry, toolbar kept (506ms)
  ✓   65 [tablet] › e2e\lab-02\requester-ticket-flow.spec.ts:296:7 › Responsive › RESP-05 every screenshot ui-spec.md 15 names exists at this viewport (AC-54) (9ms)
  ✓   52 [tablet] › e2e\lab-02\create-ticket-screenshots.spec.ts:125:7 › Create Ticket › api-failure: safe banner, every entered value preserved (1.1s)
  ✓   64 [tablet] › e2e\lab-02\requester-ticket-flow.spec.ts:269:7 › Responsive › RESP-04 at 390 px the toggler opens a panel with both nav items and Change Requester (ui-spec 9) (391ms)
  ✓   60 [tablet] › e2e\lab-02\requester-ticket-flow.spec.ts:185:5 › E2E-02 switching from Requester A to B makes A's Tickets disappear and lists B's (AC-11, AC-03) (634ms)
  ✓   63 [tablet] › e2e\lab-02\requester-ticket-flow.spec.ts:247:7 › Responsive › RESP-02 / RESP-03 My Tickets is cards at 390 px and a six-column table at 1280 px (440ms)
  ✓   61 [tablet] › e2e\lab-02\requester-ticket-flow.spec.ts:205:5 › E2E-06 a Requester with no Tickets sees `No tickets yet`; a filter that excludes everything shows `No matches` (AC-49, AC-50) (501ms)
  ✓   68 [tablet] › e2e\lab-02\selection-screenshots.spec.ts:34:7 › Development Requester Selection › populated: active Requesters listed, not a login screen (428ms)
  ✓   67 [tablet] › e2e\lab-02\requester-ticket-flow.spec.ts:370:7 › Responsive › the Zen Green tokens are what the built CSS paints (ui-spec 2, VIS-01 rows 1-6) (675ms)
  ✓   62 [tablet] › e2e\lab-02\requester-ticket-flow.spec.ts:223:7 › Responsive › RESP-01 no horizontal page scroll on any of the four screens (AC-55) (837ms)
  ✓   69 [tablet] › e2e\lab-02\selection-screenshots.spec.ts:44:7 › Development Requester Selection › dropdown: only active Requesters are offered (420ms)
  ✓   71 [tablet] › e2e\lab-02\selection-screenshots.spec.ts:76:7 › Development Requester Selection › empty: no select, explanatory message, Continue disabled (407ms)
  ✓   70 [tablet] › e2e\lab-02\selection-screenshots.spec.ts:64:7 › Development Requester Selection › loading: spinner with select and Continue disabled (413ms)
  ✓   72 [tablet] › e2e\lab-02\selection-screenshots.spec.ts:89:7 › Development Requester Selection › failure: safe message with Retry, nothing stored (414ms)
  ✓   73 [tablet] › e2e\lab-02\selection-screenshots.spec.ts:102:7 › Development Requester Selection › selected: the shell shows the Requester name and Change Requester (541ms)
  ✓   74 [tablet] › e2e\lab-02\ticket-detail-screenshots.spec.ts:73:7 › Requester Ticket Detail › active: the owned detail with two active attachments (620ms)
  ✓   59 [tablet] › e2e\lab-02\requester-ticket-flow.spec.ts:66:7 › The Requester flow › E2E-01 selects a Requester, creates a Ticket with an attachment, finds it in My Tickets and opens its detail (AC-01, AC-08, AC-09) (1.5s)
  ✓   77 [tablet] › e2e\lab-02\ticket-detail-screenshots.spec.ts:103:7 › Requester Ticket Detail › download: an active attachment is served with Content-Disposition attachment (548ms)
  ✓   75 [tablet] › e2e\lab-02\ticket-detail-screenshots.spec.ts:88:7 › Requester Ticket Detail › add-attachment: a file added from the detail appears in the active group (586ms)
  ✓   81 [tablet] › e2e\lab-02\ticket-detail-screenshots.spec.ts:189:7 › Requester Ticket Detail › unauthorized: another Requester opening the Ticket is refused with 403 (502ms)
  ✓   76 [tablet] › e2e\lab-02\my-tickets-screenshots.spec.ts:159:7 › My Tickets › loading: skeleton while the list request is in flight (499ms)
  ✓   80 [tablet] › e2e\lab-02\ticket-detail-screenshots.spec.ts:165:7 › Requester Ticket Detail › blocked-download: a removed file answers 410 and the row turns unavailable (C-46) (620ms)
  ✓   78 [tablet] › e2e\lab-02\ticket-detail-screenshots.spec.ts:121:7 › Requester Ticket Detail › removal-dialog: names the file, requires a reason, Remove gated on it (812ms)
  ✓   66 [tablet] › e2e\lab-02\requester-ticket-flow.spec.ts:308:7 › Responsive › RESP-06 tabbing each screen reaches every control, each named and with a visible focus ring (AC-56) (1.7s)
  ✓   79 [tablet] › e2e\lab-02\ticket-detail-screenshots.spec.ts:141:7 › Requester Ticket Detail › removed: metadata and reason stay visible after reload; no Download, no Preview (852ms)
  ✓   82 [tablet] › e2e\lab-02\requester-ticket-flow.spec.ts:114:7 › The Requester flow › E2E-03 adds, downloads and soft-removes an attachment; metadata and reason remain (AC-32, AC-30, AC-34) (584ms)
  ✓   85 [tablet] › e2e\lab-02\requester-ticket-flow.spec.ts:143:7 › The Requester flow › E2E-04 the removed attachment offers no download, and a direct request returns 410 (AC-36) (438ms)
  ✓   83 [mobile] › e2e\lab-02\create-ticket-screenshots.spec.ts:67:7 › Create Ticket › initial: reference data loaded, Medium preset, Submit enabled (688ms)
  ✓   91 [tablet] › e2e\lab-02\requester-ticket-flow.spec.ts:161:7 › The Requester flow › E2E-05 another Requester is refused: direct navigation to the Ticket and a direct attachment request both give 403 (AC-03, AC-39) (531ms)
  ✓   84 [mobile] › e2e\lab-02\create-ticket-screenshots.spec.ts:75:7 › Create Ticket › validation: catalogue messages under each field, no request sent (981ms)
  ✓   90 [mobile] › e2e\lab-02\my-tickets-screenshots.spec.ts:60:7 › My Tickets › populated: Requester A's first page, newest first (652ms)
  ✓   95 [mobile] › e2e\lab-02\my-tickets-screenshots.spec.ts:126:7 › My Tickets › sorted: Ticket Number ascending (547ms)
  ✓   89 [mobile] › e2e\lab-02\create-ticket-screenshots.spec.ts:155:7 › Create Ticket › invalid-attachment: the client marks a refused file before any request (851ms)
  ✓   96 [mobile] › e2e\lab-02\my-tickets-screenshots.spec.ts:159:7 › My Tickets › loading: skeleton while the list request is in flight (372ms)
  ✓   94 [mobile] › e2e\lab-02\my-tickets-screenshots.spec.ts:108:7 › My Tickets › filters: Category and Current Status filters active (572ms)
  ✓   92 [mobile] › e2e\lab-02\my-tickets-screenshots.spec.ts:73:7 › My Tickets › switched: after changing A to B, A's Tickets are gone and B's are listed (814ms)
  ✓   98 [mobile] › e2e\lab-02\my-tickets-screenshots.spec.ts:184:7 › My Tickets › no-results: a search that excludes every Ticket (343ms)
  ✓   97 [mobile] › e2e\lab-02\my-tickets-screenshots.spec.ts:172:7 › My Tickets › empty: Requester C owns nothing (384ms)
  ✓   99 [mobile] › e2e\lab-02\my-tickets-screenshots.spec.ts:195:7 › My Tickets › failure: safe panel with Retry, toolbar kept (332ms)
  ✓   93 [mobile] › e2e\lab-02\my-tickets-screenshots.spec.ts:93:7 › My Tickets › search: the search box narrows the list and Clear filters appears (902ms)
  ✓  100 [mobile] › e2e\lab-02\my-tickets-screenshots.spec.ts:208:7 › My Tickets › forbidden: Requester B opening one of A's Tickets is refused with 403 (337ms)
  ✓  108 [mobile] › e2e\lab-02\requester-ticket-flow.spec.ts:296:7 › Responsive › RESP-05 every screenshot ui-spec.md 15 names exists at this viewport (AC-54) (8ms)
  ✓  105 [mobile] › e2e\lab-02\requester-ticket-flow.spec.ts:247:7 › Responsive › RESP-02 / RESP-03 My Tickets is cards at 390 px and a six-column table at 1280 px (343ms)
  ✓   86 [mobile] › e2e\lab-02\create-ticket-screenshots.spec.ts:112:7 › Create Ticket › success: the generated Ticket Number and the next actions (1.7s)
  ✓  103 [mobile] › e2e\lab-02\requester-ticket-flow.spec.ts:205:5 › E2E-06 a Requester with no Tickets sees `No tickets yet`; a filter that excludes everything shows `No matches` (AC-49, AC-50) (507ms)
  ✓  106 [mobile] › e2e\lab-02\requester-ticket-flow.spec.ts:269:7 › Responsive › RESP-04 at 390 px the toggler opens a panel with both nav items and Change Requester (ui-spec 9) (447ms)
  ✓   87 [mobile] › e2e\lab-02\create-ticket-screenshots.spec.ts:95:7 › Create Ticket › submitting: busy button, fields locked (1.9s)
  ✓  102 [mobile] › e2e\lab-02\requester-ticket-flow.spec.ts:185:5 › E2E-02 switching from Requester A to B makes A's Tickets disappear and lists B's (AC-11, AC-03) (629ms)
  ✓  104 [mobile] › e2e\lab-02\requester-ticket-flow.spec.ts:223:7 › Responsive › RESP-01 no horizontal page scroll on any of the four screens (AC-55) (763ms)
  ✓  111 [mobile] › e2e\lab-02\selection-screenshots.spec.ts:34:7 › Development Requester Selection › populated: active Requesters listed, not a login screen (386ms)
  ✓   88 [mobile] › e2e\lab-02\create-ticket-screenshots.spec.ts:125:7 › Create Ticket › api-failure: safe banner, every entered value preserved (2.0s)
  ✓  112 [mobile] › e2e\lab-02\selection-screenshots.spec.ts:44:7 › Development Requester Selection › dropdown: only active Requesters are offered (388ms)
  ✓  113 [mobile] › e2e\lab-02\selection-screenshots.spec.ts:64:7 › Development Requester Selection › loading: spinner with select and Continue disabled (375ms)
  ✓  114 [mobile] › e2e\lab-02\selection-screenshots.spec.ts:76:7 › Development Requester Selection › empty: no select, explanatory message, Continue disabled (360ms)
  ✓  107 [mobile] › e2e\lab-02\my-tickets-screenshots.spec.ts:143:7 › My Tickets › page-2: the second page of Requester A's list (636ms)
  ✓  115 [mobile] › e2e\lab-02\selection-screenshots.spec.ts:89:7 › Development Requester Selection › failure: safe message with Retry, nothing stored (367ms)
  ✓  110 [mobile] › e2e\lab-02\requester-ticket-flow.spec.ts:370:7 › Responsive › the Zen Green tokens are what the built CSS paints (ui-spec 2, VIS-01 rows 1-6) (655ms)
  ✓  117 [mobile] › e2e\lab-02\ticket-detail-screenshots.spec.ts:73:7 › Requester Ticket Detail › active: the owned detail with two active attachments (514ms)
  ✓  116 [mobile] › e2e\lab-02\selection-screenshots.spec.ts:102:7 › Development Requester Selection › selected: the shell shows the Requester name and Change Requester (596ms)
  ✓  118 [mobile] › e2e\lab-02\ticket-detail-screenshots.spec.ts:88:7 › Requester Ticket Detail › add-attachment: a file added from the detail appears in the active group (524ms)
  ✓  123 [mobile] › e2e\lab-02\ticket-detail-screenshots.spec.ts:189:7 › Requester Ticket Detail › unauthorized: another Requester opening the Ticket is refused with 403 (480ms)
  ✓  119 [mobile] › e2e\lab-02\ticket-detail-screenshots.spec.ts:103:7 › Requester Ticket Detail › download: an active attachment is served with Content-Disposition attachment (584ms)
  ✓  122 [mobile] › e2e\lab-02\ticket-detail-screenshots.spec.ts:165:7 › Requester Ticket Detail › blocked-download: a removed file answers 410 and the row turns unavailable (C-46) (608ms)
  ✓  120 [mobile] › e2e\lab-02\ticket-detail-screenshots.spec.ts:121:7 › Requester Ticket Detail › removal-dialog: names the file, requires a reason, Remove gated on it (729ms)
  ✓  121 [mobile] › e2e\lab-02\ticket-detail-screenshots.spec.ts:141:7 › Requester Ticket Detail › removed: metadata and reason stay visible after reload; no Download, no Preview (760ms)
  ✓  101 [mobile] › e2e\lab-02\requester-ticket-flow.spec.ts:66:7 › The Requester flow › E2E-01 selects a Requester, creates a Ticket with an attachment, finds it in My Tickets and opens its detail (AC-01, AC-08, AC-09) (1.8s)
  ✓  109 [mobile] › e2e\lab-02\requester-ticket-flow.spec.ts:308:7 › Responsive › RESP-06 tabbing each screen reaches every control, each named and with a visible focus ring (AC-56) (1.5s)
  ✓  124 [mobile] › e2e\lab-02\requester-ticket-flow.spec.ts:114:7 › The Requester flow › E2E-03 adds, downloads and soft-removes an attachment; metadata and reason remain (AC-32, AC-30, AC-34) (427ms)
  ✓  125 [mobile] › e2e\lab-02\requester-ticket-flow.spec.ts:143:7 › The Requester flow › E2E-04 the removed attachment offers no download, and a direct request returns 410 (AC-36) (195ms)
  ✓  126 [mobile] › e2e\lab-02\requester-ticket-flow.spec.ts:161:7 › The Requester flow › E2E-05 another Requester is refused: direct navigation to the Ticket and a direct attachment request both give 403 (AC-03, AC-39) (171ms)

  126 passed (13.3s)
```
