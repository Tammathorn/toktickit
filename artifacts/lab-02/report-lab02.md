# CPE 334 Lab 2 - Individual Sprint 2 Report

TokTickIT - Requester-facing ticketing MVP.
Tammathorn Kananurak - 67070503489 - GitHub @Tammathorn.
Repository: https://github.com/Tammathorn/toktickit - final branch `main` at `d48cbd2`
(release PR #26), evidence PRs #27, #30 and #__NEXTPR__ after it.

Every image slot below names a file in the repository. Paths beginning `screenshots/` are
under `artifacts/lab-02/screenshots/`; paths beginning `evidence/` are under
`artifacts/lab-02/evidence/`. `<vp>` means the `desktop`, `tablet` and `mobile` files.

---

# Answer Part 1

**Branch flow.** All work ran on eight feature branches, each opened as a pull request into
the integration branch `lab2-staging`, and one release PR took `lab2-staging` into `main`.
No commit went directly to `main` or `lab2-staging`.

| Issue | Branch | PR | Merged (UTC) |
|---|---|---|---|
| #10 Sprint specification and test plan | `feature/1-sprint-spec` | [#18](https://github.com/Tammathorn/toktickit/pull/18) | 2026-09-08 10:25 |
| #11 Data model, migration, seed | `feature/2-data-model` | [#19](https://github.com/Tammathorn/toktickit/pull/19) | 2026-09-13 16:58 |
| #12 Development Requester context | `feature/3-requester-context` | [#20](https://github.com/Tammathorn/toktickit/pull/20) | 2026-09-13 16:59 |
| #13 Create Ticket API and UI | `feature/4-create-ticket` | [#21](https://github.com/Tammathorn/toktickit/pull/21) | 2026-09-15 16:05 |
| #14 My Tickets | `feature/5-my-tickets` | [#22](https://github.com/Tammathorn/toktickit/pull/22) | 2026-09-15 16:05 |
| #15 Ticket Detail and attachments | `feature/6-ticket-detail` | [#23](https://github.com/Tammathorn/toktickit/pull/23) | 2026-09-15 16:26 |
| #16 E2E, responsive, visual checklist | `feature/7-e2e-visual` | [#24](https://github.com/Tammathorn/toktickit/pull/24) | 2026-09-15 16:51 |
| #17 Release integration and docs | `feature/8-release-docs` | [#25](https://github.com/Tammathorn/toktickit/pull/25) | 2026-09-15 21:50 |
| Release | `lab2-staging` -> `main` | [#26](https://github.com/Tammathorn/toktickit/pull/26) | 2026-09-16 |

[IMAGE: evidence/part1-commit-graph-main.png
 — caption: `git log --graph` on main: release merge d48cbd2 at the top, the eight feature merges into lab2-staging below it]

[IMAGE: evidence/part1-pr-list-closed.png
 — caption: GitHub Pull requests, closed: #18–#26 all merged; #18 carries the Changes-requested marker]

**Project board.** `TokTickIT Individual Sprints`, columns Backlog / Specified / Started /
PR Review / Fixing / Done. Issues #10–#17 all sit in Done; the Lab 1 Issues #2–#5 remain
there from Sprint 1.

[IMAGE: evidence/part1-board-backlog-2026-09-04.png
 — caption: Sprint start, 4 Sep: #10–#17 in Backlog]

[IMAGE: evidence/part1-board-issue10-pr-review.png
 — caption: Issue #10 in PR Review while PR #18 awaited its reviewer]

[IMAGE: evidence/part1-board-all-done.png
 — caption: Sprint end: Done = 12, every other column empty]

**Peer review - what actually happened.** `docs/lab-02/reviewer.md` is the record, read back
from GitHub with `gh` rather than written from memory. **One of the eight feature PRs
received a peer review.** PR #18 was reviewed by Pattarapon Sribuathong (67070503434,
@PAKATO123) with *Changes requested*: the C-11 comment asked how the Ticket Number could be
generated from an autoincremented id that does not exist until after the insert. My reply
settled it as a create-then-update inside one Prisma `$transaction`, recorded as decision
C-49 in the same PR before merge. The reviewer did not return, so GitHub still shows
*Changes requested*; reviewer.md does not mark #18 as approved. PRs #19–#25 were merged
without review, and reviewer.md says so for each, row by row. Section 3 of reviewer.md
(reviews I gave on my partner's PRs) is an empty table because I gave none.

reviewer.md was committed in PR #25, before the release PR existed, so its release row still
reads *"filled in when opened"*. What happened: the release PR was opened as #26 on
2026-09-15 21:51 UTC, received no review, and was merged to `main` on 2026-09-16. Two
follow-up PRs (#27, #30, #__NEXTPR__) added this report's evidence after the release; none was
reviewed either.

[IMAGE: evidence/part1-reviewer-md-rendered.png
 — caption: reviewer.md rendered on main: reviewer identity and the section 1 summary]

[IMAGE: evidence/part1-pr18-review-and-author-reply.png
 — caption: PR #18: the Changes-requested comment on C-11 and the reply that became C-49]

[IMAGE: evidence/part1-pr19-merged-no-review.png
 — caption: PR #19, representative of #19–#25: merged with Conversation 0, no review]

**README and .gitignore.** README.md covers stack, prerequisites, repository layout, setup
(Docker Postgres, `migrate deploy`, seeds), running, the three test commands, the API
endpoints and the document index. `.gitignore` keeps `node_modules/`, `.env` (with
`.env.example` allowed), `dist/`, `build/`, Playwright output, `server/uploads/` and the
course PDF out of the repository.

[IMAGE: evidence/part1-readme-page-1of6.png
 — caption: README.md rendered, page 1 of 6 (pages 2–6 follow the same naming; include as many as space allows)]

[IMAGE: evidence/part1-gitignore.png
 — caption: .gitignore, all 27 lines]

**Directory tree.** Labsheet section 12 is met as a minimum with additions: `client/tests/
lab-02/` holds the four named tests plus `RequesterSelection.test.tsx` (C-48);
`server/tests/lab-02/` holds the five named tests plus `data-model.db.test.ts`; `e2e/lab-02/`
holds `requester-ticket-flow.spec.ts` plus four screenshot specs; `artifacts/lab-02/` holds
the three screenshot folders plus `evidence/` and this report; `docs/lab-02/` holds the seven
named documents plus `handoff.md`.

[IMAGE: evidence/part1-tree-docs-lab-02.png — caption: docs/lab-02]
[IMAGE: evidence/part1-tree-client-tests-lab-02.png — caption: client/tests/lab-02]
[IMAGE: evidence/part1-tree-e2e-lab-02.png — caption: e2e/lab-02]
[IMAGE: evidence/part1-tree-artifacts-screenshots.png — caption: artifacts/lab-02/screenshots]
[IMAGE: (hand capture, still to take) VS Code Explorer: server/tests/lab-02 expanded — caption: server/tests/lab-02, six test files]
[IMAGE: (hand capture, still to take) server/.env.example open in the editor — caption: UPLOAD_DIR and MAX_UPLOAD_BYTES placeholders, no real values]

---

# Answer Part 2

`docs/lab-02/specification.md` (716 lines) is the binding document. Section 4 numbers 49
functional requirements FR-01..FR-49 with a trace column to the labsheet; section 5 numbers
65 business rules BR-01..BR-65 grouped by the eleven labsheet areas; section 9 numbers 67
acceptance criteria AC-01..AC-67 in Given/When/Then form, each naming the FR and BR it
covers; section 10 is the Definition of Done in three groups (Implementation, Tests, UI),
every item verifiable by a named file or command. The 52 approved decisions behind it are in
`decisions.md`; `api-spec.md` and `ui-spec.md` complete the contract.

**Written before implementation.** The four contract documents were added in commit
`b8b0c6a` on 2026-09-08 and merged through PR #18 on **2026-09-08 10:25 UTC**. The first
implementation PR, #19, was opened on **2026-09-13 16:40 UTC** - five days later. The
reviewer's C-11 comment was answered in the specification (C-49) before any code existed.

The Definition of Done boxes were ticked in PR #__NEXTPR__ after each item was re-verified against
the repository; two items stay unticked - peer review on every PR (Part 1 explains) and a
capture of the attachment preview open (Part 8 has the control, not the opened file).

[IMAGE: evidence/part2-spec-section4-fr.png — caption: Section 4, FR-01 onwards]
[IMAGE: evidence/part2-spec-section5-br.png — caption: Section 5, BR-01 onwards with the area column]
[IMAGE: evidence/part2-spec-section9-ac.png — caption: Section 9, AC-01 onwards]
[IMAGE: evidence/part2-spec-section10-dod.png — caption: "67 acceptance criteria" and section 10 Definition of Done]
[IMAGE: evidence/part1-pr18-review-and-author-reply.png — caption: PR #18 merged into lab2-staging before PR #19 (see also part1-pr19-merged-no-review.png)]

---

# Answer Part 3

`docs/lab-02/tests.md` was planned from the specification before implementation. Section 1
sets the six labsheet 9.2 levels by test-ID prefix - UNIT, API, UI, STYLE, RESP, E2E - plus
DB for the data model. Section 2 is the planned table: **111 tests**, each row naming its
level, the AC it covers, the check, and the real file path. Section 3 is the traceability
matrix: **67 of 67 acceptance criteria** map to at least one test.

| Level | Tool | Files |
|---|---|---|
| Unit | Vitest | `server/tests/lab-02/ticket-number.unit.test.ts` |
| API / integration | Supertest + Vitest | `server/tests/lab-02/{create-ticket,my-tickets,ticket-detail,attachments}.api.test.ts` |
| Data model | Vitest + Prisma | `server/tests/lab-02/data-model.db.test.ts` |
| UI component, UI style | Vitest + Testing Library | `client/tests/lab-02/{CreateTicket,MyTickets,RequesterTicketDetail,AttachmentSection,RequesterSelection}.test.tsx` |
| Responsive, E2E | Playwright | `e2e/lab-02/requester-ticket-flow.spec.ts` |

**AC-54 and the manual checklist.** 66 criteria are discharged by automated tests. AC-54 -
"each screen at 1280, 834 and 390 px satisfies every row of the visual checklist" - is
discharged by VIS-01, the manual checklist in tests.md section 4, because it asks whether a
rendered screen matches a visual specification, a judgement no assertion in this sprint
makes. RESP-05 produces the screenshots automatically at all three viewports, so the
evidence is reproducible even though the comparison is human. tests.md states this rather
than substituting an automated test that would assert something narrower.

**Passing output from `main`.** Run on 2026-09-16 at `d48cbd2` with the Postgres
container, the idempotent seeds and both dev servers up; nothing skipped or marked `.only`.
The Lab 1 tests (`health`, `categories`, `App`) still pass alongside.

| Suite | Command | Result |
|---|---|---|
| Server: unit + DB + API | `cd server && npm test` | 8 files, **86 passed** |
| Client: UI + style | `cd client && npm test` | 6 files, **48 passed** |
| Responsive + E2E | `npx playwright test e2e/lab-02` | **126 passed** (42 x 3 viewports) |

tests.md section 6 carries the same three outputs pasted in full from the pre-release run
on `feature/8-release-docs`; the `main` run is recorded verbatim in
`artifacts/lab-02/evidence.md` Appendix A.

[IMAGE: evidence/part3-tests-md-rendered.png — caption: tests.md on main: the six-level strategy and file inventory]
[IMAGE: evidence/part3-tests-section2-1-unit.png — caption: Section 2 planned tests: "111 planned tests" and 2.1 Unit, each row with its file path and Final = Pass]
[IMAGE: evidence/part3-tests-section2-2-api.png — caption: 2.2 API and integration (API-01 onwards)]
[IMAGE: evidence/part3-tests-section2-3-ui.png — caption: 2.3 UI component (UI-01 onwards), API-44 Lab 1 regression above it]
[IMAGE: evidence/part3-tests-section2-4-style.png — caption: 2.4 UI style (STYLE-01 onwards)]
[IMAGE: evidence/part3-tests-section2-5-responsive.png — caption: 2.5 Responsive RESP-01..06; RESP-05 is the AC-54 screenshot producer]
[IMAGE: evidence/part3-tests-section2-6-e2e.png — caption: 2.6 End to end E2E-01..06]
[IMAGE: evidence/part3-tests-section2-7-data-model.png — caption: 2.7 Data model DB-01 onwards]
[IMAGE: evidence/part3-tests-section3-traceability.png — caption: Section 3 traceability, "All 67 criteria": AC-01..23 and AC-35..57 in frame, AC-54 marked VIS-01 (manual); the remaining rows continue below]
[IMAGE: evidence/part3-terminal-e2e-126-passed.png — caption: Playwright tail: tests 100–126 and "126 passed"]
[IMAGE: (hand capture, still to take) terminal on main showing `git branch --show-current` and the server (86) and client (48) results — or paste evidence.md Appendix A as text]

---

# Answer Part 4

`docs/lab-02/ai-use.md`. Section 1 names the LLM: **Claude Opus 5** for every phase, through
Claude Code (CLI) as the primary interface and Claude in the browser for Phase 1 planning.
Section 2 is a ten-prompt table (the labsheet asks for six to ten), each with its phase, the
purpose, the prompt text and what it produced - from surfacing the decisions in the labsheet
before any file existed, through the audit from a memory-less session, the reviewer's C-11
comment, the working agreement that let the agent run git under two hard limits, to forcing
the visual checklist to be measured rather than ticked. Section 3 is the reflection: the
working agreement changed mid-sprint from "print the commands, I run them" to the agent
running git with explicit-path staging and `--base lab2-staging` on every PR, and why.

[IMAGE: evidence/part4-ai-use-md-rendered.png — caption: ai-use.md on main: the LLM and interface table]
[IMAGE: evidence/part4-ai-use-section2-prompts.png — caption: Section 2 key prompts, rows 1–4 of ten (phase, purpose, prompt, what it produced)]

---

# Answer Part 5

The Development Requester Selection screen replaces login for Lab 2 and says so on the
screen: *"Select a Development Requester to test requester-specific ticket behavior. This
is not a login screen. Authentication and role-based access will be introduced in Lab 3."*
(BR-03, AC-08). Only active Requesters are listed (BR-11); the selection persists in
`localStorage` and is re-validated at boot (C-32); Continue is disabled until a choice is
made. Four states are captured at all three viewports, plus the open dropdown and the shell
after Continue. Scored under Part 6.

[IMAGE: evidence/part5-selection-browser-localhost.png — caption: The Selection screen in the browser at localhost:5173]
[IMAGE: screenshots/create-ticket/selection-desktop-loading.png — caption: Loading state, controls disabled]
[IMAGE: screenshots/create-ticket/selection-desktop-dropdown.png — caption: Dropdown open, active Requesters only]
[IMAGE: screenshots/create-ticket/selection-desktop-selected.png — caption: After Continue: the shell shows the name and Change Requester]
[IMAGE: screenshots/create-ticket/selection-desktop-empty.png — caption: Empty state, no active Requester]
[IMAGE: screenshots/create-ticket/selection-desktop-failure.png — caption: Failure state with Retry, nothing stored]

---

# Answer Part 6

Create Ticket carries the read-only system fields (Ticket Number *Generated on submission*,
Ticket Date, Requester), the required Category, Related System, Requested Priority (Medium
preset), Ticket Summary 5–120 and Description 20–5000 characters with live counters, and up
to five attachments (JPG, PNG, WEBP, PDF, 5 MB each). Validation messages come from the
single catalogue in ui-spec.md section 6 that client and server both quote (BR-35). The
Ticket Number is assigned by the backend inside one transaction (C-49) in the form
`TKT-YYYY-NNNNNN`. All six states are captured at desktop, tablet and mobile; the desktop
set is placed here.

[IMAGE: evidence/part6-create-ticket-browser-localhost.png — caption: Create Ticket in the browser, initial state]
[IMAGE: screenshots/create-ticket/create-desktop-initial.png — caption: 1 Initial: reference data loaded, Medium preset]
[IMAGE: screenshots/create-ticket/create-desktop-validation.png — caption: 2 Validation failure: catalogue message under each field, no request sent]
[IMAGE: screenshots/create-ticket/create-desktop-submitting.png — caption: 3 Submitting: busy button, fields locked]
[IMAGE: screenshots/create-ticket/create-desktop-success.png — caption: 4 Success: backend-generated Ticket Number TKT-2026-000484]
[IMAGE: screenshots/create-ticket/create-desktop-api-failure.png — caption: 5 API failure: safe banner, every entered value kept]
[IMAGE: screenshots/create-ticket/create-desktop-invalid-attachment.png — caption: 6 Invalid attachment refused client-side before any request]

**requesterId matches the saved Ticket.** The success capture above was taken as Development
Requester Siriporn Chaiyo (id 4) and returned `TKT-2026-000484` at 15 Sep 2026 23:42.
`GET /api/tickets/484?requesterId=4` reads that row back with `"ticketNumber":
"TKT-2026-000484"`, `"requesterId": 4`, `"requester": {"id": 4, "name": "Siriporn Chaiyo"}`
and `createdAt 2026-09-15T16:42:43Z` (23:42 +07). The same id requested as Requester 1 is
refused with `403 TICKET_FORBIDDEN`, so the binding is enforced by the backend, not merely
displayed (BR-06, BR-21).

[IMAGE: evidence/part6-requesterid-proof.png — caption: The saved Ticket read back: Ticket Number, requesterId 4 and the Requester name together; 403 for another Requester]

Mobile evidence for the same screen: `screenshots/create-ticket/create-mobile-*.png` (six
files); the focus-ring capture `create-<vp>-focus.png` is used in Part 9.

---

# Answer Part 7

My Tickets lists only the selected Requester's Tickets, newest first, in a six-column table at
desktop and as cards at mobile (RESP-02/03). The toolbar offers search on Ticket Number or
Summary, Category, Related System and Current Status filters, a sort control, and page-size
pagination; every value lives in the address bar so a URL reproduces the view. Empty and
no-results are distinct states (C-28): *No tickets yet* with a Create Ticket action versus
*No matches* with Clear filters. The demo seed (`server/prisma/seed-demo.ts`, C-22, kept
out of the graded seed) gives Requester A 14 Tickets, B 3, C 0. Ownership is checked by the
backend on every request: B opening one of A's Tickets receives `403` (C-13).

[IMAGE: evidence/part7-my-tickets-browser-localhost.png — caption: My Tickets in the browser as Requester A]
[IMAGE: screenshots/my-tickets/list-desktop-populated.png — caption: Requester A, page 1, newest first]
[IMAGE: screenshots/my-tickets/list-desktop-switched.png — caption: After Change Requester A -> B: A's Tickets are gone, B's three are listed]
[IMAGE: screenshots/my-tickets/list-desktop-search.png — caption: Search narrows the list; Clear filters appears]
[IMAGE: screenshots/my-tickets/list-desktop-filters.png — caption: Category and Current Status filters active]
[IMAGE: screenshots/my-tickets/list-desktop-sorted.png — caption: Sorted by Ticket Number ascending]
[IMAGE: screenshots/my-tickets/list-desktop-page-2.png — caption: Page 2 of Requester A's list]
[IMAGE: screenshots/my-tickets/list-desktop-empty.png — caption: Requester C: "No tickets yet"]
[IMAGE: screenshots/my-tickets/list-desktop-no-results.png — caption: A search that excludes everything: "No matches"]
[IMAGE: screenshots/my-tickets/list-desktop-forbidden.png — caption: Requester B opening one of A's Tickets: 403 Access denied]
[IMAGE: screenshots/my-tickets/list-mobile-populated.png — caption: The same list as cards at 390 px]

---

# Answer Part 8

Requester Ticket Detail is read-only: Card 1 shows the header fields in read-only shading,
Card 2 the attachment lifecycle. Attachments can be added from the detail (same rules as
Create), downloaded or previewed through an ownership-checked route, and soft-removed with
a **required reason** (C-19). A removed attachment keeps its metadata and reason on screen
with no Download or Preview; a direct request for its file answers `410 Gone` to the owner
(C-20, C-46) and `403` to anyone else. Direct navigation to another Requester's Ticket is
refused with `403`.

[IMAGE: screenshots/ticket-detail/detail-desktop-active.png — caption: Owned Ticket with two active attachments]
[IMAGE: screenshots/ticket-detail/detail-desktop-add-attachment.png — caption: A file added from the detail joins the active group]
[IMAGE: screenshots/ticket-detail/detail-desktop-download.png — caption: Download served with Content-Disposition: attachment]
[IMAGE: screenshots/ticket-detail/detail-desktop-removal-dialog.png — caption: Removal dialog names the file; Remove is gated on a reason]
[IMAGE: screenshots/ticket-detail/detail-desktop-removed.png — caption: After removal and reload: metadata and reason retained, no Download]
[IMAGE: screenshots/ticket-detail/detail-desktop-blocked-download.png — caption: Direct request for the removed file: 410, row marked unavailable]
[IMAGE: screenshots/ticket-detail/detail-desktop-unauthorized.png — caption: Another Requester opening the Ticket: 403]

---

# Answer Part 9

`docs/lab-02/ui-spec.md` is the visual contract: Bootstrap's `lg` / `md` breakpoints for
the three labsheet bands (1280, 834, 390 px), the Zen Green tokens (`#006B3C` primary,
`#0B7A46` secondary, `#EAF6EF` pale, `#F5F7F6` page, white surface, charcoal-green text),
control states, required-marker and validation placement, the message catalogue, button
hierarchy, badges, each screen, the attachment states, the screenshot paths (section 15)
and the inspection checklist (section 16). A Playwright assertion checks that the built CSS
paints exactly those hex values.

**Three viewports.** Every screen is captured at 1280, 834 and 390 px - 31 names x 3 =
93 files - written by the specs themselves. RESP-01 asserts no horizontal scroll on any
screen at any width; RESP-04 asserts the collapsed navbar at 390 px; RESP-06 tabs every
control on every screen and checks for a visible focus ring.

[IMAGE: evidence/part9-ui-spec-md-rendered.png — caption: ui-spec.md on main: breakpoints]
[IMAGE: screenshots/my-tickets/list-desktop-populated.png — caption: My Tickets at 1280 px: six-column table]
[IMAGE: screenshots/my-tickets/list-tablet-populated.png — caption: My Tickets at 834 px]
[IMAGE: screenshots/my-tickets/list-mobile-populated.png — caption: My Tickets at 390 px: cards, collapsed navbar]
[IMAGE: screenshots/create-ticket/create-desktop-initial.png — caption: Create Ticket at 1280 px]
[IMAGE: screenshots/create-ticket/create-tablet-initial.png — caption: Create Ticket at 834 px]
[IMAGE: screenshots/create-ticket/create-mobile-initial.png — caption: Create Ticket at 390 px]
[IMAGE: screenshots/ticket-detail/detail-desktop-active.png — caption: Ticket Detail at 1280 px]
[IMAGE: screenshots/ticket-detail/detail-mobile-active.png — caption: Ticket Detail at 390 px]

**VIS-01 checklist.** tests.md section 4 is the completed checklist, six groups (colour and
tokens, fields, buttons and badges, states, layout, accessibility), ticked per viewport
against the captures - rows naming a colour, a height or a count were measured from
computed styles and bounding boxes, not assumed. Two rows did not pass on first reading:

- **Row 33 - touch targets at least 44 px at mobile - failed.** Every single-line control
  and button was 2.5 rem (40 px) at every band. `client/src/theme.css` now gives them
  2.75 rem (44 px) below `md`; ui-spec.md section 4 records the band rule; re-measured, no
  control under 44 px at 390 px on any screen (commit `2ed6643`).
- **Row 35 - visible focus ring - the first capture was wrong, not the UI.** The shot was
  taken before Bootstrap's 150 ms transition had painted the ring. RESP-06 now waits for the
  computed border and box-shadow before capturing `create-<vp>-focus.png`, and the same wait
  guards every Create Ticket capture.

[IMAGE: screenshots/create-ticket/create-mobile-focus.png — caption: Row 35: Ticket Summary focused at 390 px with the ring painted; controls at 44 px (row 33)]
[IMAGE: (hand capture, still to take) tests.md section 4 — caption: VIS-01 completed, all rows ticked D/T/M, rows 33 and 35 annotated]
