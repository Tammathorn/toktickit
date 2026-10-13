# TokTickIT Lab 4 - Approved Decision Log

Status: **Approved**. These decisions are settled and binding on
`specification.md`, `api-spec.md`, `ui-spec.md` and `tests.md`. Where the labsheet
leaves a choice open, the decision below is the choice. Where the labsheet
contradicts itself, the decision below is the resolution.

Owner: Tammathorn Kananurak (67070503489). Lab 4, Sprint 4.

Labsheet references (`§`) are to `docs/lab-04/spec/Lab_4_sheet.pdf`. Numbering continues the
Lab 3 log (C-53..C-121), so decision IDs stay unique across labs. FR, BR and AC numbering
restarts at 01. Earlier rules are cited as `L3 BR-48` or `L2 C-26`; a bare `C-nn` below
C-122 is a Lab 3 row in `docs/lab-03/decisions.md`.

The recommendations in `docs/lab-04/handoff.md` section 4 are superseded by this file. The
Source column names where each decision came from: a handoff row (`D-xx`), a labsheet
section, or an item of the Phase 1 prompt 1.1 read-only report (`1.1 report 2.11`). That
report was produced in the Issue #62 session and is not a file in this repository.

## D-xx to C-number mapping

| Handoff row | Decision | Disposition | | Handoff row | Decision | Disposition |
|---|---|---|---|---|---|---|
| D-01 | C-131 | Changed | | D-15 | C-126 | As handoff |
| D-02 | C-132 | Changed | | D-16 | C-141 | Changed |
| D-03 | C-133 | Changed | | D-17 | C-142 | Changed |
| D-04 | C-134 | Changed | | D-18 | C-127 | As handoff |
| D-05 | C-122 | As handoff | | D-19 | C-143 | Changed |
| D-06 | C-123 | As handoff | | D-20 | C-128 | As handoff |
| D-07 | C-135 | Changed | | D-21 | C-144 | Changed |
| D-08 | C-136 | Changed | | D-22 | C-145 | Changed |
| D-09 | C-137 | Changed | | D-23 | C-146 | Changed |
| D-10 | C-124 | As handoff | | D-24 | C-129 | As handoff |
| D-11 | C-125 | As handoff | | D-25 | C-147 | Changed |
| D-12 | C-138 | Changed | | D-26 | C-148 | Changed |
| D-13 | C-139 | Changed | | D-27 | C-149 | Changed |
| D-14 | C-140 | Changed | | D-28 | C-130 | As handoff |

C-150..C-160 are new decisions with no handoff row: C-150..C-158 come from the 1.1 report,
and C-159 and C-160 close gaps in C-122 and C-131. C-161..C-171 answer the questions the
prompt 1.4 specification draft raised; their Source is "1.4 question N".

## Decision table

### Accepted as the handoff recommends

| ID | Topic | Source | Decision | Reason | Supersedes / extends |
|---|---|---|---|---|---|
| C-122 | Ticket statuses that accept action writes | Handoff D-05 | Action writes (create, edit, complete, cancel) are accepted on `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER` and `REOPENED`. On `RESOLVED` they are refused 409 `TICKET_RESOLVED` ("Reopen it first"). On `CLOSED` and `CANCELLED` they are refused 409 `TICKET_CLOSED`. | Work on a Resolved Ticket without reopening it would bypass the gate. | Extends C-109 to Actions Taken; adds `TICKET_RESOLVED` to C-100 |
| C-123 | What the Requester sees of Actions Taken | Handoff D-06; §8.3 over §4.3 (handoff X-2) | Every action on the Requester's own Tickets, every field, read-only; names only, never email (C-95). A non-owned Ticket is 404. The staff composer carries a visible "Shown to the Requester" label; Internal Notes remain the private channel. | §8.3 (X-2). The label makes "private versus shared content" (§7) visible. | - |
| C-124 | Cancelling a Ticket with planned actions | Handoff D-10 | Blocked: 409 `PLANNED_ACTIONS_OPEN`. The planned actions are cancelled first. | No hidden side effects; easy to test and to explain. | Adds `PLANNED_ACTIONS_OPEN` to C-100; marks the `CANCELLED` column of `specification.md` 5.1 |
| C-125 | The final transition matrix | Handoff D-11; §4.5 | Lab 3's matrix in `server/src/lib/status-transitions.ts`, unchanged, plus C-137 on `-> RESOLVED` and C-124 on `-> CANCELLED`. No automatic transitions: creating or completing an action never moves the Ticket, and a Requester comment never leaves Waiting. Requesters never change status (L3 BR-05). | §4.5 asks to "refine and document", not to redesign. Automatic moves would bypass the confirmations. | - |
| C-126 | "Recently resolved" | Handoff D-15; §5.2 | `Ticket.resolvedAt`: set on `-> RESOLVED`, cleared on `-> REOPENED`, kept on `-> CLOSED`. Legacy rows stay NULL, because no record says when they were resolved; they count in status counts but never in "recently resolved". The seed sets it for its own Tickets. | Answers 5.2 ("how dashboard calculations treat existing records") without inventing dates. | - |
| C-127 | Count equals drill-down | Handoff D-18; Part 5 | Every count card has exactly one drill-down URL, and that list's `meta.total` equals the card. Lists are top 5 (activity desc, id desc); each item links to its Ticket, with a "View all". | Part 5's "metrics match database queries" becomes one test per card. | - |
| C-128 | Dashboard refresh | Handoff D-20 | Load on open, plus a manual Refresh button. No polling. | The mock-up shows Refresh; polling adds flaky tests. | - |
| C-129 | Recovery | Handoff D-24; §5.2 | `pg_dump -Fc` before migrating. Rehearse on a restored copy, `toktickit_rehearsal`, as C-83. Recovery is restoring the dump, tested once in the rehearsal and recorded. No down-migration: Prisma has none, and every change is additive. | "Documented and tested" - the restore test is the evidence. | - |
| C-130 | Branches and decision IDs | Handoff D-28 | Integration branch `lab4-staging`; feature branches `feature/lab4-N-slug`; decisions continue at C-122. | The Lab 2 and Lab 3 branch names still exist on origin. | Supersedes C-88 for Lab 4 |

### Accepted with changes

| ID | Topic | Source | Decision | Reason | Supersedes / extends |
|---|---|---|---|---|---|
| C-131 | What an Action Taken is | Handoff D-01, option B; X-1 (§3, §8.3, §9.1 AC-01, Parts 5-6); 1.1 report 5.1 | Planned work plus a log. Fields: `actionAt`, `description`, `result`, `followUpRequired`, `followUpNote`, `attachmentNotes`, `assigneeId` (chosen, default the caller), `performedById`, `finishedAt`, `createdById`, `createdAt`, `status` (`PLANNED`, `COMPLETED`, `CANCELLED`) and `version`. An action may be created already `COMPLETED` or as `PLANNED`. The server sets `performedById` and `finishedAt` on complete **and** on cancel; the UI labels them "Completed by" and "Cancelled by". The assignee says who is expected to do the work; it is **not** access control - any active IT Staff or Administrator may complete or cancel any action. | A pure work log cannot show the assign, complete, cancel and inactive-assignee states Part 6 grades, and a full task system is scope the labsheet does not ask for. | - |
| C-132 | Who writes Actions Taken | Handoff D-02; 1.1 report 5.2 | Any active IT Staff or Administrator, on any Ticket they can see (C-93). A Requester gets 403 before the Ticket is loaded. An assignee must be an active IT Staff or Administrator, else 422 `ASSIGNEE_NOT_ELIGIBLE` (L3 BR-48's code). That 422 applies only when an assignee is set (create, edit). Completing or cancelling a planned action whose assignee was deactivated later is allowed. | Deactivating a user must not freeze work on a Ticket. | - |
| C-133 | What can change after creation | Handoff D-03; 1.1 report 5.3 | A `PLANNED` action is editable: `description`, `actionAt`, assignee, `attachmentNotes`. **Complete** sets `result`, `followUpRequired`, `followUpNote`, `performedById` and `finishedAt`. **Cancel** needs a `result` that states why; it is stored in `result` and labelled "Reason" in the UI. `COMPLETED` and `CANCELLED` are final; a correction is a new action. | An auditable record (learning outcome). Gives Part 6 its edit, complete and cancel without letting history be rewritten. | - |
| C-134 | Action field rules | Handoff D-04; X-3 (§3 vs §8.3); 1.1 report 5.4 | `description` and `result` trimmed, 1-2000 characters (C-74's validator). `followUpNote` 1-1000, required if and only if `followUpRequired`; the client clears it when the box is unticked, and the server answers 400 if it arrives with `followUpRequired` false. `attachmentNotes` 0-500, optional, plain text. `actionAt` comes from a `datetime-local` input read as Asia/Bangkok and is sent as ISO 8601 with offset; it must be >= the Ticket's `createdAt`, and for `COMPLETED` also <= now + 5 minutes. `createdAt` (the "Action create date/time") and `finishedAt` are server time. Displayed in Asia/Bangkok (L2 C-39); rendered as plain text, `pre-wrap`. | One validator for every long text field, and a date with no offset is ambiguous. | - |
| C-135 | Action display order | Handoff D-07; Part 7 | `actionAt desc, id desc` in the Actions Taken list and in the embedded arrays (C-136). The resolution gate uses its own order (C-137). | "Stable ordering" (Part 7): ties never reorder between loads. | - |
| C-136 | Action endpoints | Handoff D-08; 1.1 report 5.8 | Lab 3-style paths with staff-only middleware, as `comments-notes.ts`: `POST /api/tickets/:id/actions`, `PATCH /api/actions/:id`, `POST /api/actions/:id/complete`, `POST /api/actions/:id/cancel`. No separate GET: actions are embedded in both Ticket Detail DTOs (Requester: own Tickets only, names never emails), and every action write returns the full staff Ticket DTO. | Lab 3 precedent, one fewer route to secure, and the summary refresh labsheet 8.4 asks for comes free. | - |
| C-137 | The resolution gate | Handoff D-09; §4.5; 1.1 report 4.4, 5.9 | A move to `RESOLVED` is checked in this order. (1) 409 `OWNER_REQUIRED` first, unchanged from C-93, with its own code. (2) Then 409 `RESOLUTION_GATE_NOT_MET` with a `reasons` array drawn from: `NO_COMPLETED_ACTION`; `PLANNED_ACTIONS_OPEN`; `FOLLOW_UP_REQUIRED` (the latest `COMPLETED` action by `finishedAt desc, id desc` has `followUpRequired` true); `NO_ACTION_SINCE_REOPEN` (the Ticket has been reopened and no action was completed after the latest status change into `REOPENED`). Every action write and every Ticket status change starts its transaction with a conditional UPDATE of the Ticket row, so concurrent writes serialize on that row under READ COMMITTED. Legacy Resolved and Closed Tickets are never re-validated. The labsheet never defines its "resolution rule" (§4.5); this is our definition, and `specification.md` argues it. | Follow-up needed means the work is not finished, a reopened problem needs new work recorded, and a count followed by an update is a race without the row lock. | Extends C-93 (`-> RESOLVED` gains the gate); adds `RESOLUTION_GATE_NOT_MET` to C-100; marks the `RESOLVED` column of `specification.md` 5.1 |
| C-138 | Stale-update detection | Handoff D-12; §6.1; 1.1 report 2.12, 5.12 | An integer `version` on `Ticket` and `ActionTaken`. Every PATCH and transition sends `version`, and the update is conditional on it. Check order: session -> password gate -> role -> params -> load -> ownership -> `TICKET_CLOSED` -> body validation (a missing `version` is 400) -> 409 `STALE_UPDATE` -> the operation's own refusals (`SAME_STATUS`, the matrix, `OWNER_REQUIRED`, the gate). The error envelope is unchanged; on `STALE_UPDATE` the client re-fetches the Ticket and keeps the user's draft. Ticket `version` moves on status, owner, IT Priority, claim and the Requester flag - not on comments, notes, attachments or actions. Claim sends no version, because it is already conditional (C-75), but bumps it. Replaces the retry loop in `staff.ts:294-327`. | A user with an old screen must be told to refresh before being refused on a state they have not seen, and the Lab 3 envelope stays one shape. | Extends C-63 (check order), C-75 (claim bumps `version`), C-76 (the flag bumps `version`); adds `STALE_UPDATE` to C-100 |
| C-139 | Duplicate submission | Handoff D-13; §8.5; 1.1 report 5.13 | `clientRequestId` (UUID) is optional; absent means no dedupe, so the Lab 1-3 create contracts are unchanged. Unique per (author, `clientRequestId`). The client mints a new UUID when a form opens and again after every success. A repeat returns 200 with the original row; a concurrent duplicate that hits the unique constraint (P2002) also returns 200 with the original row, and a test proves it. Applies to Ticket, Action Taken, Public Comment and Internal Note. The UI keeps disabling the button. Attachment uploads are excluded, as a documented assumption: the button is disabled in flight, the five-file cap holds, and the Requester can remove a duplicate. | Labsheet 8.5's "network retry" cannot be stopped in the UI, and append-only rows can never be removed. | **Supersedes L2 C-26** |
| C-140 | "Recently updated" and "Last updated" | Handoff D-14; 1.1 report 2.10, 2.11, 5.14 | `Ticket.lastActivityAt`, NOT NULL, `@default(now())`. Backfill: the greatest of `updatedAt`, the latest Public Comment, and the latest Attachment `uploadedAt` and `removedAt`. Set on create, every workflow change, every action write and on every path in 1.1 report item 2.11: Public Comment (`comments-notes.ts:71`), Attachment upload (`tickets.ts:218`), the Requester flag (`tickets.ts:266-269`), Attachment soft removal (`attachments.ts:142`) and claim (`staff.ts:152`). Never on Internal Notes. One API test per path. "Last updated" on every screen shows it. The queue API keeps its `updatedAt` sort for the Lab 3 test and adds `lastActivityAt`; the queue UI's "Last updated" sort uses `lastActivityAt`. | `updatedAt` misses comments, and a Requester's list must not reveal that a private note was added. | Extends C-78 (a `lastActivityAt` sort) and C-76 (the flag sets it) |
| C-141 | Status history | Handoff D-16; Part 7; 1.1 report 5.16 | Kept, and not on the cut list (C-158). Append-only `TicketStatusChange`: `ticketId`, `fromStatus`, `toStatus`, `changedById`, `changedAt`, written in the same transaction as the change, with no update or delete path. Shown on both detail screens oldest first (`changedAt, id`). Legacy Tickets show "History is recorded from <migration date>". | C-137's reopen rule reads it, and it is Part 7's append-only and stable-ordering evidence. | - |
| C-142 | Dashboard time rules | Handoff D-17; X-5; §6.2; 1.1 report 5.17 | The server computes everything at request time. "Recent" is a rolling 7 days, and the boundary is inclusive (`>= now - 168 h`). Metric functions take `now` as a parameter. Displayed in Asia/Bangkok. No "from yesterday" deltas (X-5). If a "today" metric is ever added, it is the Asia/Bangkok calendar day. | Testable without faking timers next to Prisma. | - |
| C-143 | Dashboard API shape and user cards | Handoff D-19 and the section 4.4 catalogues; §6.2; 1.1 report 5.19 | `GET /api/dashboard/requester` (Requester only) and `GET /api/dashboard/staff` (IT Staff and Administrator; the Administrator also gets `userCounts`). Body: `{ generatedAt, timeZone, cards: [{ key, label, count, drillDown }], lists: {...} }`. Other roles get 403 before any query. The Administrator user cards count **all** accounts by role, so each matches `/users?role=`, with "N active" as secondary text and no drill-down. The "Requester says resolved" card drills down to the new queue filter `requesterResolved=true`. | An active filter would be a second simultaneous filter, which Lab 3 forbids. | Extends C-78 (the `requesterResolved` filter) |
| C-144 | Navigation and landing | Handoff D-21; X-4; §7; §8.5; 1.1 report 4.2, 4.3 | "Dashboard" is first in the nav and the landing screen for every role. Requester nav: Dashboard, My Tickets, Create Ticket - the mock-up's missing Dashboard item is not followed (§7). Staff keep Ticket Queue (§8.5), plus User Management for the Administrator. Staff Quick Actions: "Search Tickets" -> `/queue` and "My Queue" -> `/queue?owner=me`, with no Create Ticket (C-101); the Requester's Quick Action is Create Ticket. No Profile menu; Logout stays where it is. | Labsheet text overrides the illustration, and every earlier screen must stay reachable. | - (reaffirms C-101) |
| C-145 | Migration shape | Handoff D-22; §5.1; 1.1 report 5.22 | Additive only: new enum `ActionStatus`; new tables `ActionTaken` and `TicketStatusChange`; new Ticket columns `version` (default 0), `lastActivityAt` (backfilled, NOT NULL, `@default(now())`) and `resolvedAt` (NULL); nullable `clientRequestId` columns with a plain composite `@@unique([authorOrRequesterId, clientRequestId])`. Indexes: `ActionTaken(ticketId, actionAt, id)`, `ActionTaken(assigneeId, status)`, `Ticket(requesterId, lastActivityAt)`, `Ticket(resolvedAt)`, `TicketStatusChange(ticketId, changedAt, id)`. The enum keeps its own migration, though C-70 does not strictly require it. The follow-up-note rule lives in code, not a CHECK constraint. | Without the default every direct `ticket.create` in fixtures and seeds fails, and Prisma cannot express a CHECK. | - |
| C-146 | Seed | Handoff D-23; §5.3; 1.1 report 2.7, 2.17, 5.23 | Idempotent as before. Tickets with zero, one and several actions; one Ticket with actions by three different staff (BR-02, Part 6); planned, completed, cancelled and follow-up-required actions; one Ticket that passes the gate and one that fails it; `resolvedAt` on the seed's own Resolved and Closed Tickets; the two zero-metric accounts kept. nattapong.w keeps zero Tickets (tests enforce it). Seeded actions are keyed by (Ticket, description). Every seeded Resolved and Closed Ticket has completed actions that satisfy the gate. Seeded activity times are relative to the run. | Seed data must obey the rules it demonstrates, and rolling metrics must not go empty a week after seeding. | Extends C-91 |
| C-147 | Form protection | Handoff D-25; §8.5; 1.1 report 5.25 | Applies only to the Lab 4 forms, Create Ticket and the two composers: each keeps the user's input after 400, 409, 422, 500 and a network failure; on `STALE_UPDATE` the draft is kept, the fresh server values are shown, and the user chooses to re-apply. Password fields are always cleared after a failure. | Scope, and a password must never be kept. | - |
| C-148 | Performance smoke | Handoff D-26; §10; 1.1 report 5.26 | A minimal perf-smoke script (`npm run test:perf`, its own script so Supertest counts stay stable) against `toktickit_perf` with about 2,000 Tickets: p95 under 500 ms per dashboard endpoint. `EXPLAIN` is recorded as information, never asserted. | At 2,000 rows Postgres may correctly prefer a sequential scan. | - |
| C-149 | Hardening scope | Handoff D-27; §7; §8.5; 1.1 report 5.27 | A Playwright console-error fixture fails a test on `console.error`, `pageerror` or a same-origin 5xx, with an allowlist for the browser's "Failed to load resource" lines that match a 401, 403, 404, 409 or 422 the test itself expects. The nav-walk is folded into that fixture's per-role walk. Anything obsolete the audit finds is removed; `/system-check` is kept (C-87); PAKATO's Lab 3 paging comment (#53) is answered. | Otherwise every Forbidden, Not found and Conflict test fails on the browser's own log. | Extends C-90 (the fixture) |

### New decisions from the 1.1 report

The 1.1 report raised these; none has a handoff row. C-159 and C-160 close two gaps the
first draft of this log left open.

| ID | Topic | Source | Decision | Reason | Supersedes / extends |
|---|---|---|---|---|---|
| C-150 | "Active" versus "Open" | 1.1 report 4.8 | "Active" means not Closed and not Cancelled - the queue default. C-111's "Open tickets" label on the queue filter stays. The Requester's "Open tickets" card is New, Open, In Progress, Waiting for Requester and Reopened - not Resolved. The glossary is updated with both terms. | The queue and the Requester count "open" differently, and one word for two sets would make a card and its drill-down disagree. | Extends C-92 (glossary) |
| C-151 | Append-only scope | 1.1 report 4.5 (Part 6 "edit" vs Part 7 "append-only") | Append-only covers Public Comments, Internal Notes, completed and cancelled actions, and status history. Planned actions are editable (C-133). | Part 6 needs editing and Part 7 needs append-only, so the line has to be drawn explicitly: finished work is history, planned work is not. | - |
| C-152 | Part 6 "status transition" | 1.1 report 4.6 | It means the action's status, `PLANNED -> COMPLETED` or `CANCELLED`. Ticket status transitions are Part 7. | Part 6 is the Actions Taken screen; the Ticket's own transitions are graded in Part 7. | - |
| C-153 | Conflict as a feedback state | 1.1 report 4.7; §8.5 | Conflict is a feedback state on every screen with a write, and `ui-spec.md`'s state matrix carries it. | Labsheet 8.5 names conflict as a feedback state, and Lab 4 is the first lab where a write can be refused for being stale. | - |
| C-154 | "Creation through closure" | 1.1 report 4.9; §1 | A two-role E2E: a Requester creates the Ticket, staff close it (C-101). | C-101 means staff cannot create a Ticket, so one role cannot walk the whole lifecycle. | - |
| C-155 | Routes versus the authorization matrix | 1.1 report 2.14 | A Lab 4 test compares every registered route with the authorization matrix. It lands in Issue #64. | The Lab 3 inventory test only checks anonymous 401; a route missing from the matrix would pass silently. | - |
| C-156 | Unchecked e2e fixture PATCHes | 1.1 report 2.16, 6.9 | The first step of Issue #66 adds status assertions to the e2e fixture PATCHes listed in 2.16, before any version or gate change lands. | An unchecked PATCH that starts failing leaves the test asserting against the wrong state without any error. | - |
| C-157 | Part 3 "output from main" | 1.1 report 1.2 | `tests.md` Final is filled from the final `lab4-staging` commit, with its hash. After the release merge, all suites re-run on `main` and `git diff lab4-staging main` is shown empty; that output goes in the PDF only. Nothing is committed to `main`. | Committing to main is forbidden, and the tree on main is identical to the final lab4-staging commit. | - |
| C-158 | Cut order | 1.1 report 5.29 | If Issue #66 is not open by Sun 18 Oct: first cut C-139 (D-13) from Ticket create, keeping it on Action Taken, Public Comment and Internal Note; then cut C-147 (D-25) down to the Lab 4 forms. C-141 (D-16) and the C-137 (D-09) rules are not cut. | A duplicate Ticket can be cancelled by staff; an append-only row can never be removed. | - |
| C-159 | Where `TICKET_RESOLVED` sits in the check order | Gap in C-122 | 409 `TICKET_RESOLVED` takes the same check-order slot as `TICKET_CLOSED`: after ownership, before body validation. | It is a refusal on the Ticket's state, not on the request body. | Extends C-122 and C-138's check order |
| C-160 | `finishedAt` for an action created already `COMPLETED` | Gap in C-131 | An action created already `COMPLETED` gets `finishedAt = createdAt` (server time); `actionAt` stays the user's time the work happened. | The gate orders by when the work was recorded as finished, which only the server can vouch for. | Extends C-131 and C-137 |

### Decisions from the 1.4 specification questions

| ID | Topic | Source | Decision | Reason | Supersedes / extends |
|---|---|---|---|---|---|
| C-161 | Dashboard list order | 1.4 question 0 (correction to C-127) | Each dashboard list uses the same order as its drill-down, so its rows are the first rows of that list. "Recently updated" (both dashboards): `lastActivityAt desc, id desc`, as `/queue?sort=lastActivityAt:desc` and `/tickets?sort=lastActivityAt:desc` return it. "Urgent": active, IT Priority High, `createdAt asc, id desc` - exactly what `/queue?itPriority=HIGH` returns, keeping L2 C-29's `id desc` tie-break. "Recently resolved": `resolvedAt desc, id desc`. Lists stay top 5, except the C-169 panel. | The oldest High Ticket is the most urgent, and a card that shows the same rows as its drill-down can be checked by eye. | Supersedes C-127's "(activity desc, id desc)" clause |
| C-162 | Writing to a finished action | 1.4 question 1 | Edit, complete or cancel on an action that is not `PLANNED` -> 409 `ACTION_NOT_PLANNED`, in the operation-refusal slot after `STALE_UPDATE`. | A finished action is history (C-133); with a stale version the client is told to refresh first, and the refresh shows it finished. | Extends C-133 and C-138; adds `ACTION_NOT_PLANNED` to C-100 |
| C-163 | `version` on "Problem Appears Resolved" | 1.4 question 2 | The Requester's flag sends no `version`, like claim. It still bumps the Ticket `version`. | It is a flag, already conditional on the Ticket's status (C-76), and setting it twice changes nothing. | Extends C-138 |
| C-164 | The status route's refusal order | 1.4 question 3 | `PATCH /api/staff/tickets/:id/status`, after session -> password gate -> role -> params -> load: (1) target not one of the eight statuses -> 400 `VALIDATION_FAILED`; (2) target equals the current status -> 400 `SAME_STATUS` (C-77); (3) current status `CLOSED` or `CANCELLED` -> 409 `INVALID_STATUS_TRANSITION` (C-109); (4) `version` missing or not an integer -> 400; (5) `version` stale -> 409 `STALE_UPDATE`; (6) move outside the matrix -> 409 `INVALID_STATUS_TRANSITION`; (7) `OWNER_REQUIRED`, then `RESOLUTION_GATE_NOT_MET`, then `PLANNED_ACTIONS_OPEN` on a move to Cancelled. Steps 1, 2, 3 and 6 are Lab 3's order unchanged; 4-5 are inserted. Every other write keeps C-138's general order, with `TICKET_CLOSED` and `TICKET_RESOLVED` before body validation. API-64, API-66, API-67, API-69, API-119 and API-121 keep their assertions; only their request bodies gain `version` (C-138), and the `RESOLVED` cells gain a completed action (C-137). | A terminal Ticket is refused whatever version the client holds, and C-77 and the Lab 3 tests stay unchanged. | Extends C-138 for the status route; keeps C-77 and C-109 |
| C-165 | The body of a replayed create | 1.4 question 4 | A replay returns 200 with the same body shape as a first success: the staff Ticket DTO for an action, the Ticket DTO for a Ticket, the comment or note for a Public Comment or Internal Note. | The client handles one response shape per endpoint. | Extends C-139 (resolves it against C-136) |
| C-166 | Where the replay lookup runs | 1.4 question 5 | The `clientRequestId` lookup runs after ownership and before `TICKET_CLOSED` / `TICKET_RESOLVED` and body validation. A replay returns 200 with the original even if the Ticket has since closed. The body is not compared: a key reused with a different body is treated as a replay, as a documented assumption. | The retry is of a request that already succeeded, and keys are random UUIDs the client mints, so a collision means a client bug. | Extends C-139 and C-138's check order |
| C-167 | Creation history and gate reason order | 1.4 question 6 | Creating a Ticket writes a `TicketStatusChange` with `fromStatus` NULL and `toStatus` `NEW`; `fromStatus` is nullable. Legacy Tickets get no such row. Gate reasons are returned all at once, in this fixed order: `NO_COMPLETED_ACTION`, `PLANNED_ACTIONS_OPEN`, `FOLLOW_UP_REQUIRED`, `NO_ACTION_SINCE_REOPEN`. | New Tickets get a complete history, and a fixed order keeps the UI and the tests stable. | Extends C-141, C-145 and C-137 |
| C-168 | `actionAt` on complete | 1.4 question 7 | Complete may send `actionAt`. The final `actionAt` (sent, or the stored one) must be <= now + 5 minutes, else 400 at `actionAt` asking for the time the work was done. C-134's lower bound still applies. | A `COMPLETED` action records work that happened, so it cannot be in the future. | Extends C-133 and C-134 |
| C-169 | "My planned actions" drill-down | 1.4 question 8a | The card drills down to `/dashboard#my-actions`, a panel listing every `PLANNED` action assigned to the caller on a non-terminal Ticket, with no top-5 cap and no pagination, ordered `actionAt asc, id asc`. The card count equals the panel's row count. It is the one uncapped dashboard list. | Soonest work first, and a list with no cap is the drill-down. | Extends C-127 and C-143 |
| C-170 | `statusGroup` with `currentStatus` | 1.4 question 8b | Both together on My Tickets -> 400 `INVALID_QUERY_PARAM`. | One status filter at a time, as in Lab 3. | Extends C-143 and L2 C-43 |
| C-171 | The gate in the staff DTO | 1.4 question 8c | `allowedTransitions` keeps listing every move the matrix allows. The staff Ticket DTO adds `resolutionGate: { met, reasons }`. When `met` is false the UI shows Resolved disabled, with the reasons listed beneath. The server still enforces the gate. | The user learns why they cannot resolve, and the gate is visible in a screenshot for Part 7. | Extends C-137 |

---

## Lab 3 and Lab 2 decisions superseded or extended

Every row in 1.1 report item 2.18, then the four further rows this log extends.

| Row | Lab 3 / Lab 2 decision | Status in Lab 4 | By |
|---|---|---|---|
| C-75 | Claim, assign and reassign | Extended: claim sends no `version` but bumps it | C-138 |
| C-78 | Queue query | Extended: a `lastActivityAt` sort (the UI's "Last updated"; the `updatedAt` sort stays) and a `requesterResolved=true` filter | C-140, C-143 |
| C-88 | Branches and decision IDs | Superseded for Lab 4: `lab4-staging`, `feature/lab4-N-slug`, C-122 onward | C-130 |
| C-89 | Test levels | Superseded for Lab 4: eight levels become ten (§10 adds workflow and performance-smoke) | §10; C-148 |
| C-90 | Playwright configuration | Extended: Lab 4 screenshot folders under `artifacts/lab-04/screenshots/` (§12) and the console-error fixture | §12; C-149 |
| C-93 | Acting on a Ticket, owner requirement | Extended: `-> RESOLVED` also passes the gate; `OWNER_REQUIRED` stays first with its own code | C-137 |
| C-100 | Refusal codes | Extended: 409 `STALE_UPDATE`, `RESOLUTION_GATE_NOT_MET`, `PLANNED_ACTIONS_OPEN`, `TICKET_RESOLVED`, `ACTION_NOT_PLANNED` | C-122, C-124, C-137, C-138, C-162 |
| C-109 | Writing to a terminal Ticket | Extended to Actions Taken | C-122 |
| C-110 | Stacked PRs while review is batched | Superseded for Lab 4: review is no longer batched; the Lab 4 stacking rule is restated in `CLAUDE.md` (prompt 1.3) | Handoff sections 1 and 5 |
| C-119 | Success on the two Ticket Detail screens | Extended: success messages for action create, edit, complete and cancel, with copy fixed in `ui-spec.md` | C-136 |
| L2 C-26 | Duplicate submission, UI only | **Superseded**: server-side `clientRequestId` | C-139 |
| `specification.md` 5.1 | Status transition matrix | The `RESOLVED` column's cells gain the gate; the `CANCELLED` column's cells gain `PLANNED_ACTIONS_OPEN`. No cell changes between `Y` and `-` | C-125, C-137, C-124 |
| `specification.md` 5.2 | Authorization matrix | New rows for the action writes and both dashboards; the status, owner and IT Priority cells gain 409 `STALE_UPDATE`; the status cell gains the gate | C-136, C-138, C-137, C-143 |
| C-63 | Check order | Extended: replay lookup -> `TICKET_CLOSED` -> body validation -> `STALE_UPDATE` -> the operation's own refusals; the status route has its own seven-step order | C-138, C-164, C-166 |
| C-76 | "Problem Appears Resolved" | Extended: the flag sends no `version`, bumps it, and sets `lastActivityAt` | C-138, C-140, C-163 |
| C-91 | Seed composition | Extended: actions, `resolvedAt`, run-relative activity times | C-146 |
| C-92 | Terminology | Extended: "active" and the Requester's "Open tickets" | C-150 |

## Carried from Lab 3 unchanged

C-53 password hashing - C-54 session mechanism - C-55 session lifetime and revocation -
C-56 same-origin cookie transport - C-57 cookie port scope - C-58 CSRF - C-59 login
failures - C-60 password policy - C-61 password-change gate and current user - C-62 public
endpoints - C-64 client-supplied `requesterId` ignored - C-65 404 versus 403 - C-66
Administrator ticket powers - C-67 `RequesterUser` -> `User` - C-68 `Ticket.requesterId`
column name - C-69 role storage - C-70 enum migration order - C-71 IT Priority - C-72
seeded passwords and personas - C-73 comments versus notes storage - C-74 comment and note
content - C-77 same-status move - C-79 initial password - C-80 last active Administrator -
C-81 self-protection - C-82 duplicate email - C-83 test data isolation and migration
rehearsal - C-84 test file names - C-85 client routing - C-86 migration commands - C-87
the Lab 1 Check System screen (reaffirmed by C-149) - C-94 name and email bounds - C-95
owner disclosure to the Requester (applied by C-123, C-136) - C-96 expired session rows -
C-97 sessions after a self-service password change - C-98 terminal statuses - C-99 the
password-change gate's status code - C-101 Tickets raised by staff (reaffirmed by C-144) -
C-102 claiming and status - C-103 attachments and staff - C-104 unassigning a worked Ticket
- C-105 the assignable-users endpoint - C-106 a wrong current password - C-107 the user
list's order - C-108 the queue at tablet width - C-111 the queue's Current Status filter
(label kept by C-150) - C-112 how the client learns who signed in - C-113 a malformed path
`:id` - C-114 the owner's activation state on the Requester DTO - C-115 E2E-23's single
active Administrator - C-116 the IT Priority badge on My Tickets at `md` - C-117 the
terminal line on IT Staff Ticket Detail - C-118 a disabled button keeps its level - C-120
User Management's Not found cell - C-121 User Management's Empty and No results.

Lab 2 decisions keep the status `docs/lab-03/decisions.md` gives them, except L2 C-26, which
C-139 supersedes.
