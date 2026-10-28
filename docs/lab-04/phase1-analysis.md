> Read-only Phase 1 analysis (prompt 1.1, Issue #62), saved verbatim; `docs/lab-04/decisions.md` cites it as "1.1 report".

# Lab 4 prompt 1.1 — read-only report

I wrote nothing in the repo and ran no git commands that change state. Poppler isn't installed, so I read the PDF with `pdftotext`. I pulled the two mock-up images (p5 staff, p6 Requester) into the scratchpad and looked at both. I read every file you listed. Of the Lab 3 docs, I read only `decisions.md` and spec §5.1, §5.2 and §7; I didn't open `api-spec.md`, `ui-spec.md` or `tests.md`.

## 1. Deliverables by PDF Part

| Part | Deliverable | Issue |
|---|---|---|
| 1 | Commit graph feature → `lab4-staging` → `main` | all; #71 release |
| 1 | Board with every Issue in Done; reviewer.md both ways; README; .gitignore; directory tree | #71 (board, reviewer.md, tree); #69 README; #62 ignores the PDF |
| 2 | specification.md (FR, BR, transitions, metrics, ACs, migration, DoD) + the merged PR page as proof it came first | #62 |
| 3 | tests.md (plan, traceability, file paths, Final) + full passing output **from main** | #62 plan, #71 Final |
| 4 | ai-use.md (LLM named, 6–10 prompts) + "My Reflection" | #71, plus a running log |
| 5 | Staff dashboard: metrics, current-user actions, recent/urgent, drill-down, all states, card-vs-psql evidence | #67; responsive in #70 |
| 6 | Actions Taken UI: list, create, assign, edit, transition, complete, cancel, validation, inactive assignee, roles, failures, several staff on one Ticket | #64 API, #65 UI, #63 seed, #70 viewports |
| 7 | Transitions, stable ordering, append-only, visibility | #66; #70 `ticket-resolution.spec` |
| 8 | Requester dashboard + regression screenshots across Labs 2–3 | #68, #69, #70 |
| 9 | ui-spec.md + three viewports for every Lab 4 screen + measured checklist | #62, #70 |

Gaps no Issue covers:

- **1.1** api-spec.md is required by §9 but feeds no Part directly. It is produced in #62; it should be named in that Issue's scope.
- **1.2 — "Output from main" has nowhere to live.** Part 3 is captured after the release PR merges. Committing it then means committing to `main` or opening a second release PR, and both are forbidden. You need a decision now, either:
  - (a) it lives only in the PDF, or
  - (b) the final run happens on the `lab4-staging` tip commit that becomes `main`, recorded with its hash, and is re-run on `main` for the PDF.
- **1.3** The PDF itself and "My Reflection" are manual work with no Issue. That's fine, but put them on the calendar (Sat 24).
- **1.4** Reviewing PAKATO's PRs (reviewer.md, "both ways") has no owner or date.
- **1.5** I did not check GitHub, so #62–#71 existing on the board is unverified.

## 2. What Lab 4 invalidates

### 2A. Confirmed from the handoff §1 table (with lines)

| # | Where | What changes |
|---|---|---|
| 2.1 | `roles.ts:9`, `:11-21`, `:42-52` | Destination type, `LANDING`, `LANDING_LABEL`, `NAV_ITEMS` |
| 2.2 | `staff.ts:294-327` | The silent 3-attempt retry; L327 even returns `INVALID_STATUS_TRANSITION` for what is really a race |
| 2.3 | `staff.ts:182-233` (owner), `:240-266` (priority) | No version check at all |
| 2.4 | `schema.prisma:137-174` | Ticket has no `version`, `lastActivityAt` or `resolvedAt` |
| 2.5 | `list-query.ts` | `:117` sort fields; `:72-78` single status only; `:181` queue sorts; `:253-271` no `requesterResolved` filter |
| 2.6 | `UserManagement.tsx:53` | Role filter is component state |
| 2.7 | `graded-seed.ts:131-310` | No actions. `:125-130` keeps nattapong.w at zero Tickets |

### 2B. What the handoff table missed or got wrong

- **2.8 — The handoff is wrong about My Tickets.** `MyTickets.tsx:63-91` and `:107`/`:172-174` already read and write the whole query through the URL. Only the `statusGroup` and `lastActivityAt` options are missing. That row should be corrected.
- **2.9 — The status matrix is duplicated in the client.** `StaffTicketDetail.tsx:39-53` (permitted moves, needs-owner, confirm targets) and `TicketDetail.tsx:24-25` copy server rules. That breaks your new rule 3 ("the server decides what the UI offers") and has to be replaced by `allowedTransitions`.
- **2.10 — "Last Updated" reads `updatedAt` on four screens:** `MyTickets.tsx:330`, `:389`; `StaffTicketDetail.tsx:254`; `TicketDetail.tsx:147`; the queue row (`staff.ts:64`). The DTOs feed it at `ticket-dto.ts:83`, `:126`. D-14 says these should show `lastActivityAt`.
- **2.11 — Write paths that must set `lastActivityAt`:**
  - `comments-notes.ts:71` (Public Comment; Internal Notes at `:108` must not)
  - `tickets.ts:218` (upload) and `:266-269` (Requester flag, which also bumps `version`)
  - `attachments.ts:142` (soft removal)
  - `staff.ts:152` (claim)
  - Missing any one of these is silent, so it needs one API test per path.
- **2.12 — Claim has no version.** `staff.ts:143-173`. D-12 bumps the version on claim but never says whether claim *sends* one. I recommend claim stays exempt, because it is already conditional (C-75).
- **2.13 — `LANDING` has three more consumers:** `Forbidden.tsx:17-18` ("Go to {LANDING_LABEL}"), `ChangePassword.tsx:56`, `AppShell.tsx:86` (brand link).
- **2.14 — The route-inventory claim is wrong.** Handoff §3 says a route missing from the authorization matrix fails a test. SEC-01 (`authorization.api.test.ts:115-128`) only checks that anonymous calls get 401. Nothing compares routes to a matrix; Lab 4 has to add that test if you want the claim to be true.
- **2.15 — Exact key-set tests break on any new DTO field.** Five places:
  - `my-tickets.api` L90
  - Requester DTO keys (`ticket-detail.api` ~L83)
  - SEC-26 (`authorization` L290)
  - API-48 (`staff-queue` L375)
  - API-49 (`staff-ticket-detail` L129)
- **2.16 — e2e fixtures move Tickets with raw PATCHes and never check the result:**
  - `staff-ticket-flow.spec.ts:179-181`, `:530`, `:565-567`
  - `visual-evidence.spec.ts:109-121` (`staffMoves`, which does assert 200)

  Under D-12 they get 400; under D-09 the RESOLVED step gets 409. The unchecked ones fail *silently*, and the test then asserts against the wrong state.
- **2.17 — Seed dates decay.** `graded-seed.ts:398` sets `createdAt` = now − daysAgo, once, at first run. Rolling 7-day metrics on the dev database empty out about a week after seeding, which would hit Issue 6/7 screenshots taken on the dev DB.
- **2.18 — Lab 3 decision rows to supersede or extend in `decisions.md`:**
  - C-75 (claim bumps version)
  - C-78 (queue filter and sorts)
  - C-88 (branches)
  - C-89 (8 → 10 test levels)
  - C-90 (screenshot folders)
  - C-93 (RESOLVED gains the gate)
  - C-100 (code catalogue: `STALE_UPDATE`, `RESOLUTION_GATE_NOT_MET`, `PLANNED_ACTIONS_OPEN`, `TICKET_RESOLVED`)
  - C-109 (extended)
  - C-110 (stacking rule rewritten)
  - C-119 (success messages for actions)
  - L2 C-26
  - Spec §5.1 L382-391 (mark the gate and cancel cells); §5.2 L421-447 (new rows)
- **2.19 — CLAUDE.md bans work Lab 4 requires.** In its "Scope" section: "Never add … Actions Taken … dashboards or KPI analytics beyond simple queue counts" and "Do not prepare for Lab 4". Its Git and Required-structure sections still say `lab3-staging` and `artifacts/lab-03`. The handoff already plans to rewrite it in prompt 1.3.

## 3. Existing tests Lab 4 changes

**Nothing has to be retired.** Every case below is an adaptation, so suite counts should not drop. No test asserts the retry-loop behavior itself.

### Server

**`staff-ticket-detail.api.test.ts` — 22 of 34 tests.**
- The `setOwner`, `setPriority` and `setStatus` helpers (L73-75) change once.
- Tests that call them (D-12): API-54, 55, 56, 57, 58, 59, 60, 61, 62, 64, 66, 67, 68, 69, 70, 71, the out-of-set currentStatus test (L415), API-72, 119, 121, 123.
- API-62, API-64 (the RESOLVED cells of the 64-cell walk) and API-70 also need a completed action first (D-09).
- API-49 is a key set (D-12, D-14, D-15, D-16).
- UNIT-12 does not change (D-11).

**`authorization.api.test.ts` — 3 of 28.**
- SEC-13: the Administrator succeeds on all eight operations (D-12).
- SEC-23: makes successful PATCHes (D-12).
- SEC-26: key set (D-14, D-16).
- SEC-17, SEC-18, the byte-identical 403 test and SEC-01 do not change, because the 403 comes before the body is read.

**`staff-queue.api.test.ts` — 1 of 23.** API-48 key set (D-14). The `updatedAt` sort test (L264) stays as long as that sort is kept.

**`lab-02/my-tickets.api.test.ts` — 1 of 15.** Row shape at L90 (D-14).

**`lab-02/ticket-detail.api.test.ts` — 1 of 5.** Requester DTO key set (D-14, D-16, and actions if they're embedded).

**Unchanged if `clientRequestId` is optional** (see 5.13): `comments-notes`, `create-ticket`, `migration.db`, `data-model`. Two seed constraints from these stay binding:
- `migration.db.test.ts:430-443` requires the third active Requester, and only that one, to have zero seeded Tickets.
- `lab-02` `my-tickets-screenshots.spec.ts` asserts that Requester's total is 0.

### Client

**`Login.test.tsx` — 2 of 18 (D-21).** UI-50 (nav exact per role, L222) and per-role landing (L242).

**`StaffTicketDetail.test.tsx` — 4 of 19, plus the shared fixture (~L30), which needs `version` and `allowedTransitions`:**
- UI-29 (L109): the offered moves come from `allowedTransitions` (rule 3).
- UI-31 (L146) and L173: the request body now carries `version` (D-12).
- L185: OWNER_REQUIRED inline, which interacts with D-09.

**`RequesterTicketDetail.test.tsx` — 1.** UI-25 (L188), the Last Updated value (D-14).

**Caution:** client Vitest does not type-check, so a stale fixture (UiDefects L48/L61, MyTickets L36) won't fail compilation. It renders blank or "Invalid Date" instead.

### e2e

**`authentication.spec.ts` — 4 of 11 (D-21).** E2E-03 (L136 → /dashboard), E2E-01 (L214), E2E-05 (L191-226 nav and landing table), the Forbidden test (L256, "Go to My Tickets").

**`staff-ticket-flow.spec.ts` — 4 of 20.** E2E-11 (resolve in the UI, so it needs an action first; D-09), E2E-12, E2E-15, E2E-26 (raw PATCH fixtures; D-12 + D-09).

**`visual-evidence.spec.ts` — 6 of 26.**
- `staffMoves` helper (D-12).
- E2E-32 (L391) and E2E-36 (L530) step through RESOLVED (D-09).
- E2E-46, 41, 49 use the helper only.
- E2E-48 (L840) checks aria-current per role nav (D-21).

**`lab-02 requester-ticket-flow` RESP-04 (L269)** still passes: it only checks visibility. Its title, "both nav items", goes stale.

**Total: 32 server, 7 client and 14 e2e tests are adapted; none retired.**

## 4. Labsheet conflicts

**4.1** I confirmed X-1 to X-6 against the text.
- X-1: §3, §4.1 and §8.3 give the field list; §9.1 AC-01 says "creator and approved assignee"; Part 6 asks for "assign … complete, cancel … inactive-assignee rejection"; Part 5 asks for "current-user Actions Taken".
- X-5: the mock-up shows "+N from yesterday" on all five cards.

Additional conflicts and ambiguities:

- **4.2 — The Requester mock-up (p6) has no Dashboard nav item.** "My Tickets" is highlighted while the dashboard is showing. Its cards are My Open Tickets, In Progress, Resolved and Closed, with **no "waiting for you" card**, while §4.6 and §8.2 ask for Tickets waiting for the Requester and "requiring attention". Follow §4.6 and §7 ("add role-appropriate Dashboard navigation").
- **4.3 — The staff mock-up (p5) has no Ticket Queue nav item.** Its Quick Actions are "Search Tickets" and "My Queue"; both mock-ups also show a Profile menu. §8.5 requires every earlier screen to stay reachable, so keep the Queue. I'd keep "Search Tickets" (→ /queue) and "My Queue" (→ `/queue?owner=me`) as staff Quick Actions.
- **4.4 — "The resolution rule" (§4.5) is never defined.** Neither is the "resolution gate" in the §9 BR list. D-09 is your own rule and has to be argued in the spec, not cited from the labsheet.
- **4.5 — Part 7 asks for "append-only behavior", but Part 6 asks for "edit".** Actions can't be fully append-only. State that append-only covers comments, notes, finished actions and history, while PLANNED actions are editable.
- **4.6 — "Status transition" in Part 6** could mean the action's own status or the Ticket's status. The spec should say which. Recommendation: the action's status, PLANNED → COMPLETED / CANCELLED.
- **4.7 — §8.5 adds "conflict" to the feedback states** that must be consistent. The Lab 3 state matrix has to gain a Conflict column for every screen.
- **4.8 — "Open" means two things.** The staff mock-up has an "Open" status card, while the handoff uses "open" for every non-terminal status. The staff "open" set also includes Resolved (the queue default), but the Requester's "Open tickets" excludes it. Name them differently, e.g. "Active" vs status "Open".
- **4.9 — §1 asks for the lifecycle tested "from creation through closure".** Under C-101 that has to be a two-role E2E: Requester creates, staff close.

## 5. Positions on D-01 to D-28

**5.1 D-01 — Agree with option B, with two changes.**
- "Performed by" for a CANCELLED action is undefined. Set `performedById` on complete *and* cancel, and label it "Cancelled by" when it's a cancel.
- An assignee is only a label, since any staff member may complete (D-02). Say so outright so "assign" isn't read as access control.

Option C is scope creep; A fails half of Part 6.

**5.2 D-02 — Agree.** Add: completing a PLANNED action whose assignee was deactivated later is allowed. The 422 applies only when assigning (on create or edit).

**5.3 D-03 — Agree that finished actions are final**, but the gate's "latest" has a hole. With D-07 ordering by `actionAt`, a corrective action back-dated to when the work actually happened is not the "latest". The gate then still blocks, or, the other way round, a follow-up flag gets buried.
- **Alternative:** the gate's "latest" means latest *recorded* (`createdAt, id`); the list still displays by `actionAt`.
- Using `result` to hold the cancel reason is fine if the UI labels it "Reason".

**5.4 D-04 — Agree, with three changes.**
- Use 2000 characters, not 1000, to reuse C-74's validator.
- The UI's `datetime-local` input has no offset, so the spec must say it is read as Asia/Bangkok.
- The "400 if a note is sent while follow-up is false" rule means the client must strip the note when the box is unticked. Specify that.

**5.5 D-05 — Agree.**

**5.6 D-06 — Agree.** The "Shown to the Requester" label is what makes the X-2 choice safe.

**5.7 D-07 — Agree for display.** See 5.3 for the gate.

**5.8 D-08 — Disagree with the `/api/staff/...` prefix for action writes.**
- Lab 3's precedent is resource paths with staff-only middleware (`comments-notes.ts:95`).
- **Alternative:** `POST /api/tickets/:id/actions`, `PATCH /api/actions/:id`, `POST /api/actions/:id/complete|cancel`.
- Also embed `actions` in both detail DTOs, and have every action write return the full staff Ticket DTO, as `staff.ts:115-121` already does. That gives §8.4's "refresh the summary" for free and saves a fetch.

**5.9 D-09 — Agree in principle; four corrections.**
- (a) Don't fold "has an owner" into `reasons`. Keep C-93's existing 409 OWNER_REQUIRED, checked first, so API-62 doesn't change.
- (b) "Same transaction" is not enough. At Prisma's default READ COMMITTED isolation, another user can add a PLANNED action between the gate's count and the status update. Every action write and the status change must first lock the Ticket row. A conditional `UPDATE Ticket … lastActivityAt` (or `SELECT … FOR UPDATE`) at the start of each transaction does that, and D-14 already writes that row.
- (c) Use latest-recorded, as in 5.3.
- (d) Reopened Tickets: as written, Resolved → Reopened → Resolved passes on the old actions. **Alternative:** require ≥1 action completed after the latest move to Reopened (that needs D-16). Question 7.4.

Reason codes should reuse `PLANNED_ACTIONS_OPEN` from D-10.

**5.10 D-10 — Agree.**

**5.11 D-11 — Agree.**

**5.12 D-12 — Agree on an integer `version` in the body. Three points to pin down.**
- (a) **Check order:** … ownership → TICKET_CLOSED → body 400, where a missing `version` is a body error → `STALE_UPDATE` → the operation's own refusals (SAME_STATUS, matrix, OWNER_REQUIRED, gate). A user with an old screen should be told to refresh before being refused on a state they haven't seen.
- (b) **Error envelope:** "409 with the current resource" breaks the Lab 3 `{error:{code,message,fields}}` envelope. Specify `error.current`, or have the client re-fetch the Ticket instead.
- (c) **Claim** sends no version (2.12). A Requester flag bumping the version is right: staff should see the flag before acting.

Replacing the loop at `staff.ts:294-327` is exactly what §6.1 asks.

**5.13 D-13 — Agree with the mechanism, but it has four gaps.**
- (a) **Make `clientRequestId` optional** (absent means no dedupe). Making it required breaks the Lab 1/2 create contract and around 13 test files.
- (b) **Use a new key after each success.** The comment and note composers stay open, so a key minted "when the form opens" would make a *second* legitimate comment return the first one.
- (c) **Two concurrent requests with the same key:** the loser hits Prisma's unique-constraint error (P2002). That must return the original row, or it becomes a 500. This needs a test.
- (d) **Attachment uploads** are retryable duplicates too. Leave them out explicitly, as an assumption: the UI disables the button, there is a five-file cap, and the Requester can remove a duplicate.

**5.14 D-14 — Agree.**
- Give `lastActivityAt` `@default(now())` (see 6.2).
- Include the attachment `removedAt` in the backfill.
- The queue's "Last updated" sort in the UI should map to `lastActivityAt`, while the API keeps `updatedAt` so Lab 3's sort test passes.

**5.15 D-15 — Agree.** "Recently resolved" = `resolvedAt` within 7 days, whether the Ticket is now Resolved or Closed. Say so.

**5.16 D-16 — Useful, but it's the second thing I'd cut** (see 5.29). Part 7's append-only and stable-ordering evidence is already covered by comments, notes and finished actions.

**5.17 D-17 — Agree.** Add: the boundary is inclusive (`>= now − 168h`), and metric functions take `now` as a parameter so tests can fix the clock (C-55 precedent).

**5.18 D-18 — Agree.**

**5.19 D-19 — Agree, except the Admin user-count cards break D-18.** `/users?role=IT_STAFF` lists inactive users too (4 IT Staff vs 3 active). Adding an "active" filter would mean multiple simultaneous filters, which CLAUDE.md's "Never add" list forbids.
- **Alternative:** count all accounts by role so the card matches the list, and show "3 active" as secondary text with no drill-down.

**5.20 D-20 — Agree.**

**5.21 D-21 — Agree** (see 4.3 for Quick Actions).

**5.22 D-22 — Agree, with three changes.**
- `lastActivityAt` NOT NULL needs `@default(now())`. Without it, every direct `prisma.ticket.create` in test helpers, `seed-demo.ts` and `createTicketWithNumber` fails.
- A separate enum migration isn't required. C-70 is about adding values to an existing enum (`ALTER TYPE … ADD VALUE`), not creating a new enum type. Keeping it separate is harmless.
- A CHECK constraint for "follow-up note iff follow-up" can't be expressed in Prisma. Keep the rule in code.

**5.23 D-23 — Agree.**
- Keep nattapong.w at zero Tickets (tests enforce it).
- Key seeded actions by (Ticket, description).
- Give the seeded Resolved and Closed Tickets completed actions so seed data obeys the gate.
- Set the seed's activity times relative to the run so the demo doesn't go empty (2.17).

**5.24 D-24 — Agree.**

**5.25 D-25 — Agree, but never keep password fields** after a failure (Change Password, Administrator create and reset). Limit the scope to the Lab 4 forms, Create Ticket and the two composers.

**5.26 D-26 — Disagree with "EXPLAIN shows an index."** At about 2,000 rows Postgres often prefers a sequential scan, so that assertion would be flaky. Keep the p95 timing and record EXPLAIN as information only.

**5.27 D-27 — Agree, but the console-error fixture needs an allowlist.** Chromium logs "Failed to load resource" for every expected 403, 404 and 409, so the Forbidden, Not found and Conflict state specs would all fail.

**5.28 D-28 — Agree.**

**5.29 Size.** About 27 h on weekdays plus about 22 h at weekends gives roughly 49 h, against 35–47 h of work plus review waits — almost no slack. Cut in this order:
1. D-26 down to a minimal perf script.
2. D-16.
3. D-13 on Ticket create only, keeping it for actions, comments and notes.
4. D-25 beyond the Lab 4 forms.
5. Fold the nav-walk spec into the console-error fixture.

Also, the Tue 13 contract day (5–7 h for prompts 1.3–1.7) is the most optimistic date on the calendar.

## 6. Technical risks to the calendar

- **6.1** Prisma 5.22 has no partial indexes, no CHECK constraints and no row locks without raw SQL, and runs READ COMMITTED (see 5.9b). Interactive transactions time out after 5 s by default.
- **6.2** A NOT NULL column without a default breaks every fixture that creates Tickets directly (5.22).
- **6.3** PowerShell 5.1 strips embedded `"` from arguments passed to native programs. `docker exec … psql -c 'SELECT … FROM "Ticket"'` breaks, which hits Part 5's psql evidence. Use the Bash tool or `psql -f file.sql`. `migrate diff --exit-code` needs a shadow database URL, and URLs with `?`/`&` also need careful quoting.
- **6.4** PowerShell's `>` writes UTF-8 with a BOM, so evidence files would get a BOM plus ANSI codes. Capture through Bash and strip them.
- **6.5** E2E runs on the **dev database** (C-83), `fullyParallel`. Dashboard specs must assert counts relative to their own fixtures, never absolute numbers. Part 5's psql comparison has to be captured with no E2E run in progress.
- **6.6** `toktickit_test` accumulates rows between runs, so count-equals-drill-down tests must compute both sides inside the same test.
- **6.7** Merging a fix upward through stacked branches with all three suites at each level is expensive. The server suite takes about 30 s; Playwright runs 278 tests across 3 projects. One fix in #64 can mean five full runs.
- **6.8** Client Vitest doesn't type-check, so fixture drift fails quietly (see Part 3).
- **6.9** The unchecked e2e fixture PATCHes (2.16) will fail silently: they need assertions added before any version or gate change lands.
- **6.10** Time-window tests need an injected `now`. Faking timers alongside Prisma is risky.

## 7. Questions only you can answer (priority order)

1. Adopt D-01 option B, with `performedById` also set on cancel and shown as "Cancelled by"? (yes/no)
2. Make `clientRequestId` optional (absent = no dedupe) and mint a new key after each success? (yes/no)
3. Should the gate's "latest action" mean latest *recorded* (`createdAt`), not latest `actionAt`? (yes/no)
4. After Reopened, require a newly completed action before resolving again (this keeps D-16)? (yes/no)
5. Keep "no owner" as the existing 409 OWNER_REQUIRED rather than a gate reason? (yes/no)
6. Action endpoint paths: (a) Lab 3 style `/api/tickets/:id/actions` + `/api/actions/:id`, or (b) the handoff's `/api/staff/...`?
7. Embed `actions` in both detail DTOs, with every action write returning the Ticket DTO? (yes/no)
8. Where does Part 3's output from main live: (a) PDF only, or (b) captured on the final `lab4-staging` commit and re-run on `main`?
9. Admin user cards count all accounts by role, with "N active" as secondary text? (yes/no)
10. Accept the cut order in 5.29, starting with D-26 and then D-16 if behind on Sun 18? (yes/no)
11. Use 2000 characters for action description and result, matching C-74? (yes/no)
12. Put `STALE_UPDATE` after body validation and before rule refusals, carried as `error.current`? (yes/no)
13. Should "Last Updated" show `lastActivityAt` everywhere, with the queue API keeping its `updatedAt` sort for Lab 3? (yes/no)
14. Leave attachment uploads out of D-13 as a documented assumption? (yes/no)
15. Correct the handoff's My Tickets row and route-inventory claim during prompt 1.2? (yes/no)