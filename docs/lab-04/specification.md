# Lab 4 Sprint Engineering Specification

TokTickIT - CPE 334 Individual Sprint 4.
Owner: Tammathorn Kananurak (67070503489).

Sources: `docs/lab-04/spec/Lab_4_sheet.pdf` (cited `LS x.y`), `docs/lab-04/decisions.md`
(C-122..C-171, approved) and `docs/lab-04/phase1-analysis.md` (the codebase survey, cited
`1.1 report x.y`; reference, not contract). A bare `C-nn` from C-122 up is a Lab 4 decision.
Earlier rules are cited `L3 BR-nn`, `L3 C-nn`, `L2 C-nn`, and keep their meaning inside
`docs/lab-03/` and `docs/lab-02/`.

FR, BR and AC numbering restarts at 01. The exact endpoint contract lives in `api-spec.md`,
the visual contract in `ui-spec.md` and the test plan in `tests.md`. Where this document and
any of those disagree, the disagreement is a defect to report, not to resolve locally.

---

## 1. Sprint Goal

Sprint 4 lets IT Staff plan and record the actual work on a Ticket as Actions Taken, makes
the Ticket's resolution depend on that recorded work, protects every workflow write against
stale screens and duplicate submissions, and gives each role a concise Dashboard that opens
onto the existing detailed screens - while every Lab 1 to Lab 3 behavior and test keeps
working on the final `main`.

## 2. Stakeholder Request Interpretation

The service desk can already receive Tickets and talk to Requesters, but the work itself is
invisible: there is no record of what was tried, by whom, with what result, or what is still
to be done. This sprint reads the request as five commitments.

1. **A work record under each Ticket.** An Action Taken is one line of planned or finished
   work. It may be planned ahead and assigned to someone, then completed or cancelled; or it
   may be recorded already completed. Finished lines are history and are never rewritten
   (C-131, C-133, C-151).
2. **The Ticket Owner coordinates; anyone on staff may act.** Ownership does not limit who
   records work (`LS 4.4` BR-02, C-132). The assignee of an action says who is expected to do
   it; it is not a permission.
3. **Resolution means the work is finished.** IT Staff still formally resolve the Ticket,
   and the Requester's "Problem Appears Resolved" stays advisory (`LS 4.5`). The backend
   refuses a resolution the recorded work does not support (C-137).
4. **Dashboards are doorways, not reports.** Each card is a count the database can prove,
   and each opens the list it counts (C-127, C-143).
5. **Polish without regression.** Duplicate clicks and retries, stale screens, console
   errors and lost form input are fixed across the product; nothing earlier stops working.

The Requester sees every Action Taken on their own Tickets (`LS 8.3`, C-123), so private
working remarks belong in Internal Notes, which remain staff-only.

## 3. Scope

### Included

| Area | Work | Trace |
|---|---|---|
| Actions Taken | Model, migration, seed, four write endpoints, embedded read on both Ticket Detail DTOs, the staff Actions Taken area (list, create, view/edit, complete, cancel) and the Requester's read-only list | `LS 3`, `LS 8.3`, C-131..C-136 |
| Ticket workflow | Lab 3 matrix unchanged, plus the resolution gate, the cancel rule, `TICKET_RESOLVED`, `version` and 409 `STALE_UPDATE`, the row lock, status history, `resolvedAt`, `lastActivityAt`, and `allowedTransitions` from the server | `LS 4.5`, `LS 6.1`, C-122, C-124..C-126, C-137..C-141 |
| Dashboards | `GET /api/dashboard/requester`, `GET /api/dashboard/staff` (with `userCounts` for the Administrator), the two Dashboard screens, the new drill-down parameters, Dashboard navigation and landing | `LS 4.6`, `LS 6.2`, `LS 8.1`, `LS 8.2`, C-127, C-128, C-142..C-144, C-150 |
| Hardening | `clientRequestId` on four creates, form protection on the Lab 4 forms, the Conflict feedback state, the console-error fixture, the route-versus-matrix test, removal of obsolete UI, README | `LS 7`, `LS 8.5`, C-139, C-147, C-149, C-153, C-155 |
| Evidence | Ten test levels including workflow and performance-smoke, three viewports, the evidence index | `LS 10`, C-148, L3 C-89 superseded |

### Excluded

Everything in `LS 4.2`, and the Lab 3 exclusions that still apply, as listed in `CLAUDE.md`
"Never add". Named here because a Lab 4 screen could tempt them:

- SLA clocks, escalation, notifications of any kind; inventory, costing, time sheets.
- Uploads on Actions Taken - `attachmentNotes` is plain text naming where to look (C-134).
- A Profile menu, extended profiles, Ticket creation by staff (C-144, L3 C-101).
- Auto-polling or live dashboards (C-128); "from yesterday" deltas (C-142, X-5).
- BI tools, report builders, export; multi-column sorting; multiple simultaneous filters
  (C-143 counts all accounts by role for that reason).
- Administrator management of Categories and Related Systems; user deletion, bulk
  operations, user-list pagination.
- An action task system beyond `PLANNED`, `COMPLETED`, `CANCELLED` - no due dates, no
  priorities, no In Progress (C-131).

## 4. Functional Requirements

### 4.1 Actions Taken

| ID | Requirement | Trace |
|---|---|---|
| FR-01 | IT Staff Ticket Detail has an Actions Taken area that lists every action on the Ticket with its status, Action Date/Time, Description, Result, Assignee, Follow-Up Required?, Follow-up Note, Attachment Notes, Created by, Action create date/time, and Completed by / Cancelled by with its time. | `LS 8.3`, C-131 |
| FR-02 | An IT Staff or Administrator user creates an action on a Ticket, either as `PLANNED` (work to do) or as `COMPLETED` (work done). | C-131 |
| FR-03 | The creator chooses the assignee from the active IT Staff and Administrator users; the default is the creator. | C-131, C-132 |
| FR-04 | A `PLANNED` action can be opened in view/edit mode and its Description, Action Date/Time, assignee and Attachment Notes changed. | C-133 |
| FR-05 | A `PLANNED` action can be completed, recording Result, Follow-Up Required? and Follow-up Note. | C-133 |
| FR-06 | A `PLANNED` action can be cancelled with a stated reason. | C-133 |
| FR-07 | Requester Ticket Detail shows the same Actions Taken, every field, read-only, with names and never email addresses. | `LS 8.3`, C-123 |
| FR-08 | Every action write returns the full staff Ticket DTO, and the screen refreshes the Ticket summary from it. | `LS 8.4`, C-136 |
| FR-09 | Which operations a given action currently offers comes from the API, not from a rule copied into the client. | `CLAUDE.md` rule 3 |

### 4.2 Ticket workflow

| ID | Requirement | Trace |
|---|---|---|
| FR-10 | The status control on IT Staff Ticket Detail offers exactly the targets the server returns in `allowedTransitions`; the client holds no copy of the matrix. | `LS 8.4`, `CLAUDE.md` rule 3, 1.1 report 2.9 |
| FR-11 | A move to Resolved is refused by the server when the resolution gate is not met, and the screen shows each reason. | `LS 4.5`, C-137 |
| FR-12 | A move to Cancelled is refused while the Ticket has planned actions. | C-124 |
| FR-13 | Every Ticket and action update carries the `version` the user saw; a stale one is refused, and the screen re-fetches the Ticket while keeping the user's draft. | `LS 6.1`, C-138, C-147 |
| FR-14 | Every Ticket status change is recorded in an append-only status history shown, oldest first, on both Ticket Detail screens. | C-141 |
| FR-15 | "Last updated" on every screen shows the Ticket's `lastActivityAt`. | C-140 |
| FR-16 | The Ticket Queue gains a `lastActivityAt` sort and a `requesterResolved=true` filter; the queue's "Last updated" sort in the UI uses `lastActivityAt`. | C-140, C-143 |
| FR-17 | My Tickets gains the `statusGroup=open` filter and the `lastActivityAt` sort that the Requester Dashboard drills down to. | C-143 (the 4.4 catalogue) |

### 4.3 Dashboards

| ID | Requirement | Trace |
|---|---|---|
| FR-18 | An IT Staff Dashboard shows the staff cards, the "My planned actions" panel and the "Recently updated" and "Urgent" lists of section 5.3. | `LS 4.6`, `LS 8.1`, C-143 |
| FR-19 | The Administrator sees the IT Staff Dashboard plus three user-count cards. | `LS 4.6`, C-143 |
| FR-20 | A Requester Dashboard shows the Requester cards and the "Recently updated" and "Recently resolved" lists of section 5.3, for the signed-in Requester's Tickets only. | `LS 4.6`, `LS 8.2`, C-143 |
| FR-21 | Every card is an accessible link to its drill-down; every list item links to its Ticket; every list has a "View all" where section 5.3 names one. | `LS 7`, C-127 |
| FR-22 | A Dashboard loads when opened and again when the user presses Refresh, and at no other time. | C-128 |
| FR-23 | "Dashboard" is the first navigation item and the landing screen for every role, with active-page indication. | `LS 7`, C-144 |
| FR-24 | User Management reads its role filter from the URL (`/users?role=`), so the Administrator's user cards can open it filtered. | C-143, 1.1 report 2.6 |

### 4.4 Hardening and regression

| ID | Requirement | Trace |
|---|---|---|
| FR-25 | Create Ticket, Action Taken, Public Comment and Internal Note accept an optional `clientRequestId`, and a repeat with the same key creates nothing new. | `LS 8.5`, C-139 |
| FR-26 | Create Ticket and the action, comment and note composers keep the user's input after a recoverable failure. | `LS 8.5`, C-147 |
| FR-27 | Every screen with a write has a Conflict feedback state. | `LS 8.5`, C-153 |
| FR-28 | The e2e suite fails a test on a console error, a page error or a same-origin 5xx, and walks every navigation destination per role. | `LS 8.5`, C-149 |
| FR-29 | Temporary, duplicate, obsolete or inconsistent UI from earlier labs is removed; `/system-check` is kept. | `LS 7`, C-149, L3 C-87 |
| FR-30 | Every Lab 1, Lab 2 and Lab 3 screen remains reachable by its permitted users, and every earlier suite keeps passing. | `LS 8.5`, `CLAUDE.md` |
| FR-31 | A test compares every registered route with the authorization matrix of section 5.2. | C-155 |
| FR-32 | A performance-smoke script times both dashboard endpoints against a large database. | `LS 10`, C-148 |
| FR-33 | Every Lab 4 screen works at desktop, tablet and mobile width with visible focus, keyboard operation, semantic labels and non-color cues, and no clipping, overlap or horizontal page scroll. | `LS 7`, `LS 8.6` |
| FR-34 | README setup, migration, seed, test and demonstration instructions are current. | `LS 8.5` |
| FR-35 | The database is extended additively, rehearsed on a restored copy, and seeded with data that demonstrates every Lab 4 rule. | `LS 5`, C-145, C-146, C-129 |

## 5. Business Rules

BR-01 and BR-02 are the two mandatory rules of `LS 4.4` in its own words. Every rule names
the decision it comes from. The Area column is the grouping key used for coverage.

| ID | Area | Rule | Trace |
|---|---|---|---|
| BR-01 | Action structure | Action Taken belongs to exactly one Ticket. | `LS 4.4` BR-01, C-131 |
| BR-02 | Action structure | The Ticket Owner coordinates the Ticket, but an Action Taken may be by a different IT Staff member. | `LS 4.4` BR-02, C-132 |
| BR-03 | Action fields | An action holds `actionAt` (Action Date/Time), `description`, `result`, `followUpRequired`, `followUpNote`, `attachmentNotes`, `assigneeId`, `performedById`, `finishedAt`, `createdById`, `createdAt`, `status` and `version`. The server alone sets `createdById` (from the session), `createdAt`, `performedById`, `finishedAt` and `version`; a client-supplied value for any of them is ignored. | C-131, L3 C-64 |
| BR-04 | Action fields | `description` and `result` are trimmed and 1 to 2000 characters, using the Public Comment validator. | C-134, L3 C-74 |
| BR-05 | Action fields | `followUpNote` is 1 to 1000 characters and is required if and only if `followUpRequired` is true. A `followUpNote` sent with `followUpRequired` false is refused 400; the client clears the note when the box is unticked. | C-134 |
| BR-06 | Action fields | `attachmentNotes` is optional, 0 to 500 characters, plain text. It names where to look; nothing is uploaded to an action. | C-134 |
| BR-07 | Action dates | `actionAt` is entered in a `datetime-local` input read as Asia/Bangkok and sent as ISO 8601 with an offset; a value without an offset is refused 400. It must be >= the Ticket's `createdAt`, and for a `COMPLETED` action also <= server now + 5 minutes. On complete, the final `actionAt` - the one sent with the complete, else the stored one - must meet the same upper bound, else 400 at `actionAt` asking for the time the work was done. | C-134, C-168 |
| BR-08 | Action dates | `createdAt` (the "Action create date/time") and `finishedAt` are server time. All action times are displayed in Asia/Bangkok, and all action text is rendered as plain text with `white-space: pre-wrap`. | C-134, L2 C-39 |
| BR-09 | Action lifecycle | An action's status is `PLANNED`, `COMPLETED` or `CANCELLED`. It is created as `PLANNED` or as `COMPLETED`, never as `CANCELLED`. | C-131 |
| BR-10 | Action lifecycle | While `PLANNED`, an action's `description`, `actionAt`, assignee and `attachmentNotes` may be edited. No other field changes by edit. | C-133 |
| BR-11 | Action lifecycle | Complete moves `PLANNED` to `COMPLETED`, records `result`, `followUpRequired`, `followUpNote` and optionally a new `actionAt` (BR-07), and sets `performedById` to the caller and `finishedAt` to server now. The UI labels `performedById` "Completed by". | C-131, C-133, C-168 |
| BR-12 | Action lifecycle | Cancel moves `PLANNED` to `CANCELLED` and requires a `result` stating why, labelled "Reason" in the UI. It sets `performedById` to the caller and `finishedAt` to server now; the UI labels them "Cancelled by". | C-131, C-133 |
| BR-13 | Action lifecycle | An action created already `COMPLETED` gets `performedById` = the creator and `finishedAt` = its `createdAt`; `actionAt` stays the user's time the work happened. | C-131, C-160 |
| BR-14 | Action lifecycle | `COMPLETED` and `CANCELLED` are final. Edit, complete and cancel on an action that is not `PLANNED` are refused 409 `ACTION_NOT_PLANNED`, in the operation-refusal slot after `STALE_UPDATE` (BR-40), and the action is unchanged. A correction is a new action. | C-133, C-162 |
| BR-15 | Append-only | Public Comments, Internal Notes, completed and cancelled actions, and status history are append-only: no route edits or deletes them. Planned actions are editable (BR-10). | C-151, L3 BR-63 |
| BR-16 | Action lifecycle | Part 6's "status transition" is the action's own `PLANNED -> COMPLETED` or `PLANNED -> CANCELLED`. No action write changes the Ticket's status. | C-152, C-125 |
| BR-17 | Who may write | Any active IT Staff or Administrator user may create, edit, complete and cancel actions on any Ticket they can see. A Requester calling any action write is refused 403 before the Ticket or action is loaded. | C-132, L3 C-93, L3 C-65 |
| BR-18 | Assignee eligibility | An assignee must be an active IT Staff or Administrator user, else 422 `ASSIGNEE_NOT_ELIGIBLE`. This check applies only where an assignee is set - on create and on edit. A create without an assignee assigns the caller. | C-132, C-131, L3 BR-48 |
| BR-19 | Assignee eligibility | The assignee is not access control: any active IT Staff or Administrator may complete or cancel any planned action. Completing or cancelling a planned action whose assignee has since been deactivated is allowed. | C-131, C-132 |
| BR-20 | Requester visibility | A Requester sees every action on their own Tickets, every field, read-only, with people shown by name and never by email address. A Ticket that is not theirs answers 404. | C-123, L3 C-95, L3 C-65 |
| BR-21 | Requester visibility | The staff action composer carries a visible "Shown to the Requester" label. Internal Notes remain the private channel. | C-123 |
| BR-22 | Ordering | Actions are listed `actionAt desc, id desc`, in the Actions Taken area and in the embedded DTO arrays, so ties never reorder between loads. | C-135 |
| BR-23 | Ordering | Status history is listed oldest first, `changedAt, id`. Public Comments and Internal Notes keep their Lab 3 newest-first order. | C-141, L3 BR-67 |
| BR-24 | Ticket status gates on actions | Action writes are accepted while the Ticket is `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER` or `REOPENED`. On `RESOLVED` they are refused 409 `TICKET_RESOLVED` ("Reopen it first"); on `CLOSED` or `CANCELLED`, 409 `TICKET_CLOSED`. | C-122, L3 C-109 |
| BR-25 | Ticket workflow | The eight Ticket statuses are unchanged, and the permitted transitions are exactly the Lab 3 matrix (section 5.1), with the gate on `-> RESOLVED` and the cancel rule on `-> CANCELLED` added. | C-125, `LS 4.5` |
| BR-26 | Ticket workflow | There are no automatic transitions: creating or completing an action never moves the Ticket, and a Requester comment never leaves Waiting for Requester. Only IT Staff and Administrator users change status. The Requester's "Problem Appears Resolved" is advisory and never itself moves the Ticket to Resolved. | C-125, `LS 4.5`, L3 BR-05, L3 BR-59 |
| BR-27 | Ticket workflow | The staff Ticket DTO carries `allowedTransitions`, every target the matrix permits from the current status, and `resolutionGate: { met, reasons }`. The UI offers exactly those targets; when `met` is false it shows Resolved disabled, with the reasons listed beneath. The server still enforces every rule on every request. | `CLAUDE.md` rule 3, C-125, C-171 |
| BR-28 | Resolution gate | A move to `RESOLVED` is checked first for an owner: without one it is refused 409 `OWNER_REQUIRED`, unchanged from Lab 3, with its own code. | C-137, L3 C-93 |
| BR-29 | Resolution gate | With an owner, a move to `RESOLVED` is refused 409 `RESOLUTION_GATE_NOT_MET` with a `reasons` array drawn from: `NO_COMPLETED_ACTION` (no `COMPLETED` action); `PLANNED_ACTIONS_OPEN` (a `PLANNED` action exists); `FOLLOW_UP_REQUIRED` (the latest `COMPLETED` action has `followUpRequired` true); `NO_ACTION_SINCE_REOPEN` (BR-31). Every reason that applies is returned at once, in exactly that order. | C-137, C-167 |
| BR-30 | Resolution gate | "Latest `COMPLETED` action" means latest by `finishedAt desc, id desc` - when the work was recorded as finished - not by `actionAt`. | C-137, C-160 |
| BR-31 | Resolution gate | `NO_ACTION_SINCE_REOPEN` applies when the Ticket has been reopened and no action has a `finishedAt` after the latest status-history row into `REOPENED`. | C-137, C-141 |
| BR-32 | Resolution gate | The backend enforces the gate on every request, whatever the client did. Legacy Resolved and Closed Tickets are never re-validated: an existing row keeps its status and may still move along the matrix. | C-137, `LS 4.5` |
| BR-33 | Cancellation | A move to `CANCELLED` while the Ticket has a `PLANNED` action is refused 409 `PLANNED_ACTIONS_OPEN`, and nothing changes. The planned actions are cancelled first. | C-124 |
| BR-34 | Row lock | Every action write and every Ticket status change begins its transaction with a conditional UPDATE of the Ticket row, so concurrent writes on one Ticket serialize on that row under READ COMMITTED. | C-137 |
| BR-35 | Stale update | `Ticket` and `ActionTaken` each carry an integer `version`, starting at 0. | C-138, C-145 |
| BR-36 | Stale update | Every Ticket PATCH (status, owner, IT Priority) and every action edit, complete and cancel sends the `version` the user saw, and the update is conditional on it. A missing `version` is 400; a mismatch is 409 `STALE_UPDATE`, and nothing changes. | C-138 |
| BR-37 | Stale update | The Ticket `version` increases on a status, owner, IT Priority or claim change and on the Requester's flag - not on a Public Comment, Internal Note, Attachment or action write. An action's `version` increases on each edit, complete and cancel. | C-138, L3 C-76 |
| BR-38 | Stale update | Claim and the Requester's "Problem Appears Resolved" send no `version`, because each is already conditional - claim on the Ticket being unowned, the flag on its status - but each increases the Ticket `version`. | C-138, C-163, L3 C-75, L3 C-76 |
| BR-39 | Stale update | `STALE_UPDATE` uses the unchanged Lab 3 error envelope. On it the client re-fetches the Ticket, shows the fresh values and keeps the user's draft. | C-138, C-147 |
| BR-40 | Check order | Every protected operation except the status change checks, in this fixed order: session -> password-change gate -> role -> path parameters -> resource load -> ownership -> the `clientRequestId` replay lookup (creates only, BR-43) -> `TICKET_CLOSED` / `TICKET_RESOLVED` -> body validation (a missing `version` is 400 here) -> `STALE_UPDATE` -> the operation's own refusals (for example `ACTION_NOT_PLANNED`, `ASSIGNEE_NOT_ELIGIBLE`). The status change has its own order, BR-89. | C-138, C-159, C-162, C-164, C-166, L3 C-63 |
| BR-41 | Check order | `TICKET_RESOLVED` takes the same slot as `TICKET_CLOSED`: after ownership, before body validation. | C-159 |
| BR-42 | Duplicate submission | Create Ticket, Action Taken, Public Comment and Internal Note accept an optional UUID `clientRequestId`, unique per (author, `clientRequestId`). Absent means no de-duplication, so the Lab 1-3 create contracts are unchanged. | C-139 |
| BR-43 | Duplicate submission | A repeat with a key already used by the same author returns 200 and creates nothing, with the same body shape as a first success: the staff Ticket DTO for an action, the Ticket DTO for a Ticket, the comment or note for a Public Comment or Internal Note. A concurrent duplicate that hits the unique constraint (Prisma P2002) answers the same, never 500. The lookup runs after ownership and before `TICKET_CLOSED` / `TICKET_RESOLVED` and body validation, so a replay succeeds even if the Ticket has since closed. The body is not compared: a reused key is a replay (A-05). | C-139, C-165, C-166 |
| BR-44 | Duplicate submission | The client mints a new `clientRequestId` when a form opens and again after every success, and keeps disabling the submit button while a request is in flight. | C-139, L2 C-26 superseded |
| BR-45 | Duplicate submission | Attachment uploads are outside `clientRequestId`: the button is disabled in flight, the five-file cap holds, and the Requester can remove a duplicate. | C-139 |
| BR-46 | Activity time | `Ticket.lastActivityAt` is set to server now on Ticket create, every status, owner and IT Priority change, claim, every action write, every Public Comment, every Attachment upload and soft removal, and the Requester's flag. | C-140, 1.1 report 2.11 |
| BR-47 | Activity time | An Internal Note never writes `lastActivityAt`, so no Requester screen reveals that a private note was added. | C-140 |
| BR-48 | Activity time | "Last updated" on every screen shows `lastActivityAt`. The queue API keeps its `updatedAt` sort for the Lab 3 test and adds a `lastActivityAt` sort; the queue UI's "Last updated" sort uses `lastActivityAt`. | C-140, L3 C-78 |
| BR-49 | Resolution time | `Ticket.resolvedAt` is set to server now on `-> RESOLVED`, cleared on `-> REOPENED` and kept on `-> CLOSED`. Legacy rows keep NULL. | C-126 |
| BR-50 | Status history | Every Ticket status change appends one `TicketStatusChange` (`ticketId`, `fromStatus`, `toStatus`, `changedById`, `changedAt`) in the same transaction as the change. Creating a Ticket appends one with `fromStatus` NULL and `toStatus` `NEW`. No route updates or deletes one. | C-141, C-167 |
| BR-51 | Status history | A Ticket that existed before the migration shows "History is recorded from <migration date>" above its history. | C-141 |
| BR-52 | Dashboard time | The server computes every metric at request time. Metric functions take `now` as a parameter. The response carries `generatedAt` and `timeZone: "Asia/Bangkok"`, and times are displayed in Asia/Bangkok. | C-142, C-143 |
| BR-53 | Dashboard time | "Recent" is a rolling 7 days with an inclusive boundary: `>= now - 168 h`. No "from yesterday" delta is shown. If a "today" metric is ever added, it is the Asia/Bangkok calendar day. | C-142 |
| BR-54 | Terms | "Active" means not `CLOSED` and not `CANCELLED` - the queue's default set, which includes `RESOLVED`. The queue filter's "Open tickets" label is unchanged. | C-150, L3 C-111 |
| BR-55 | Terms | The Requester's "Open tickets" means `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER` and `REOPENED` - not `RESOLVED`. | C-150 |
| BR-56 | Drill-down | Every count card has exactly one drill-down, and the drill-down list's total (`meta.total`, or the row count of an unpaginated list) equals the card. Each dashboard list uses the same order as its drill-down, so its rows are the first rows of that list (section 5.3). Lists show at most 5 items, each linking to its Ticket, with a "View all" - except the uncapped "My planned actions" panel (BR-84). | C-127, C-161, C-169 |
| BR-57 | Empty behavior | A card whose count is zero shows `0`; it is not an empty state. A list with no rows shows the Lab 2 empty component. Every card is always present. | C-143 (the 4.4 catalogue) |
| BR-58 | Refresh | A Dashboard loads when opened and on a manual Refresh. It never polls. | C-128 |
| BR-59 | Dashboard access | `GET /api/dashboard/requester` is Requester-only and scopes every query to the session's user before any other condition. Any other role is refused 403 before any query. | C-143, L3 C-64 |
| BR-60 | Dashboard access | `GET /api/dashboard/staff` is IT Staff and Administrator only; a Requester is refused 403 before any query. Only the Administrator's response carries `userCounts`. | C-143 |
| BR-61 | Navigation | "Dashboard" is the first navigation item and the landing screen for every role. Requester navigation is Dashboard, My Tickets, Create Ticket; IT Staff is Dashboard, Ticket Queue; Administrator is Dashboard, Ticket Queue, User Management. There is no Profile menu and Logout stays where it is. | C-144, L3 C-101 |
| BR-62 | Navigation | Staff Quick Actions are "Search Tickets" (`/queue`) and "My Queue" (`/queue?owner=me`), with no Create Ticket. The Requester's Quick Action is Create Ticket. | C-144, L3 C-101 |
| BR-63 | Form protection | Create Ticket and the action, comment and note composers keep the user's input after a 400, 409, 422 or 500 and after a network failure. On `STALE_UPDATE` the draft is kept, the fresh server values are shown, and the user chooses whether to re-apply. | C-147 |
| BR-64 | Form protection | Password fields are always cleared after a failure. | C-147 |
| BR-65 | Feedback | Conflict is a feedback state on every screen with a write, alongside loading, validation, success, empty/no-results, forbidden, not-found and safe failure. | C-153, `LS 8.5` |
| BR-66 | Hardening | An e2e test fails on `console.error`, `pageerror` or a same-origin 5xx. The only allowlisted lines are the browser's "Failed to load resource" lines matching a 401, 403, 404, 409 or 422 the test itself expects. | C-149 |
| BR-67 | Migration | The Lab 4 migration is additive only; no existing row, column or table is dropped or rewritten except the backfill of new columns. `prisma migrate reset` is never run. | C-145, L2 C-37 |
| BR-68 | Recovery | Before migrating, the database is dumped with `pg_dump -Fc`. Recovery is restoring that dump; there is no down-migration. The restore is tested once in the rehearsal and recorded. | C-129, L3 C-83 |
| BR-69 | Seed | The seed is idempotent, never overwrites a changed password, and holds the composition of section 7.9. Seeded actions are keyed by (Ticket, description); seeded activity times are relative to the run. | C-146, L3 C-91, L3 C-72 |
| BR-70 | Regression | Every Lab 1-3 behavior and test keeps passing on the final commit. No test is deleted or skipped; a test is adapted where a decision changed what it asserts, and retired only where a decision row names its replacement. | `CLAUDE.md`, L3 BR-95 |
| BR-71 | Regression | Every registered route appears in the authorization matrix (section 5.2), and a test fails if one does not or if one answers otherwise. | C-155 |
| BR-72 | Performance | Against `toktickit_perf` with about 2,000 Tickets, each dashboard endpoint answers with p95 under 500 ms. `EXPLAIN` output is recorded as information, never asserted. | C-148 |
| BR-88 | Queries | `statusGroup` and `currentStatus` together on My Tickets are refused 400 `INVALID_QUERY_PARAM`: one status filter at a time. | C-170, L2 C-43 |
| BR-89 | Check order | `PATCH /api/staff/tickets/:id/status`, after session -> password-change gate -> role -> path parameters -> resource load, checks exactly: (1) target not one of the eight statuses -> 400 `VALIDATION_FAILED`; (2) target equals the current status -> 400 `SAME_STATUS`; (3) current status `CLOSED` or `CANCELLED` -> 409 `INVALID_STATUS_TRANSITION`; (4) `version` missing or not an integer -> 400; (5) `version` stale -> 409 `STALE_UPDATE`; (6) move outside the matrix -> 409 `INVALID_STATUS_TRANSITION`; (7) `OWNER_REQUIRED`, then `RESOLUTION_GATE_NOT_MET`, then `PLANNED_ACTIONS_OPEN` on a move to Cancelled. Steps 1, 2, 3 and 6 are Lab 3's order unchanged; a terminal Ticket is refused whatever `version` the client holds. | C-164, L3 C-77, L3 C-109 |

BR-73 to BR-87 are the dashboard metrics, in section 5.3. BR-88 and BR-89 were appended after
C-161..C-171 settled the first draft's open questions, so earlier IDs stay stable.

### 5.1 Status transition matrix

Rows are the current status, columns the target. Unchanged from Lab 3 (`docs/lab-03/
specification.md` 5.1, `server/src/lib/status-transitions.ts`): no cell moves between `Y` and
`-` (C-125). `Y` is permitted to IT Staff and Administrator users only (BR-26); `-` is
refused 409 `INVALID_STATUS_TRANSITION`; the diagonal is refused 400 `SAME_STATUS`. `(C)`
needs a UI confirmation; `*` needs a Ticket Owner (L3 BR-97). **[G]** marks the gate cells
and **[P]** the cancel cells.

| From \ To | NEW | OPEN | IN_PROGRESS | WAITING_FOR_REQUESTER | RESOLVED | CLOSED | REOPENED | CANCELLED |
|---|---|---|---|---|---|---|---|---|
| **NEW** | - | Y | Y* | - | - | - | - | Y (C) **[P]** |
| **OPEN** | - | - | Y* | Y* | Y* (C) **[G]** | - | - | Y (C) **[P]** |
| **IN_PROGRESS** | - | Y | - | Y* | Y* (C) **[G]** | - | - | Y (C) **[P]** |
| **WAITING_FOR_REQUESTER** | - | - | Y* | - | Y* (C) **[G]** | - | - | Y (C) **[P]** |
| **RESOLVED** | - | - | - | - | - | Y (C) | Y | - |
| **CLOSED** | - | - | - | - | - | - | - | - |
| **REOPENED** | - | - | Y* | Y* | Y* (C) **[G]** | - | - | Y (C) **[P]** |
| **CANCELLED** | - | - | - | - | - | - | - | - |

**[G] The resolution gate** (C-137; BR-28 to BR-32). After the matrix permits the move: no
owner is 409 `OWNER_REQUIRED`; then 409 `RESOLUTION_GATE_NOT_MET` with `reasons` from
`NO_COMPLETED_ACTION`, `PLANNED_ACTIONS_OPEN`, `FOLLOW_UP_REQUIRED`,
`NO_ACTION_SINCE_REOPEN`, every applicable reason at once in that fixed order (C-167). The
staff DTO's `resolutionGate` reports the same answer in advance, and the UI shows Resolved
disabled with its reasons when it is not met (BR-27, C-171). On success `resolvedAt` is set
(BR-49) and the Requester's flag cleared (L3 BR-61).

**[P] The cancel rule** (C-124; BR-33). After the matrix permits the move, a Ticket with a
`PLANNED` action is refused 409 `PLANNED_ACTIONS_OPEN`.

The order in which the status route checks the refusals of this matrix is BR-89: a `-` cell
in the `CLOSED` and `CANCELLED` rows is refused before `version` is read, and every other `-`
cell after it.

Every permitted move, in any cell, also: locks the Ticket row first (BR-34), checks
`version` (BR-36), increases it (BR-37), sets `lastActivityAt` (BR-46), appends a
`TicketStatusChange` (BR-50), and, on `RESOLVED -> REOPENED`, clears `resolvedAt` (BR-49).

Why the gate is defined this way. `LS 4.5` requires "the resolution rule" but never defines
it, so the rule is ours (C-137). Resolving claims the work is finished. A Ticket with no
completed work, with work still planned, whose last finished work says follow-up is needed,
or that was reopened and has had no new work, has not finished, and the backend refuses to
say otherwise. "Latest" is when the work was recorded as finished (`finishedAt`), which only
the server can vouch for; ordering by the user-entered `actionAt` would let a back-dated
correction bury a follow-up flag (C-160). Because the gate reads several rows and then
writes one, it runs after the Ticket row is locked, so a planned action cannot slip in
between the check and the update (BR-34).

### 5.2 Authorization matrix

Every route the server registers, Labs 1 to 4. **Lab** is the lab that introduced it; `4Δ`
marks a Lab 3 route whose cells Lab 4 changes. Columns are the caller: **Anon** (no session
or an expired one), **MustChange** (a valid session whose user must change their password),
then the three roles. Cells give the status for a well-formed request and the refusals
specific to that row.

| Lab | Method and path | Anon | MustChange | Requester | IT Staff | Administrator |
|---|---|---|---|---|---|---|
| 1 | `GET /api/health` | 200 | 200 | 200 | 200 | 200 |
| 1 | `GET /api/categories` | 200 | 200 | 200 | 200 | 200 |
| 1 | `GET /api/related-systems` | 200 | 200 | 200 | 200 | 200 |
| 3 | `POST /api/auth/login` | 200 / 401 / inactive 403 | 200 | 200 | 200 | 200 |
| 3 | `GET /api/auth/me` | 401 | 200 | 200 | 200 | 200 |
| 3 | `POST /api/auth/change-password` | 401 | 200 / wrong current 422 | 200 / 422 | 200 / 422 | 200 / 422 |
| 3 | `POST /api/auth/logout` | 401 | 204 | 204 | 204 | 204 |
| 2 · 4Δ | `POST /api/tickets` | 401 | 403 | 201 / **repeat key 200** | **403** | **403** |
| 2 · 4Δ | `GET /api/tickets` (**`statusGroup`, `lastActivityAt` sort**) | 401 | 403 | 200 / bad or **conflicting status filters 400** | **403** | **403** |
| 2 · 4Δ | `GET /api/tickets/:id` (Requester DTO, **now with actions and status history**) | 401 | 403 | own 200 / other 404 | **403** | **403** |
| 2 | `GET /api/tickets/:id/attachments` | 401 | 403 | own 200 / other 404 | 200 / missing 404 | 200 / missing 404 |
| 2 | `POST /api/tickets/:id/attachments` | 401 | 403 | own 201 / terminal 409 / other 404 | **403** | **403** |
| 3 · 4Δ | `POST /api/tickets/:id/requester-resolved` (**sends no `version`, bumps it**) | 401 | 403 | own 200 / wrong status 409 / other 404 | **403** | **403** |
| 2 | `GET /api/attachments/:id/download` | 401 | 403 | own 200, removed 410 / other 404 | 200, removed 410 | 200, removed 410 |
| 2 | `DELETE /api/attachments/:id` | 401 | 403 | own 200 / terminal 409 / other 404 | **403** | **403** |
| 3 · 4Δ | `GET /api/staff/tickets` (**`lastActivityAt` sort, `requesterResolved` filter**) | 401 | 403 | **403** | 200 | 200 |
| 3 · 4Δ | `GET /api/staff/tickets/:id` (**now with actions, history, `allowedTransitions`, `resolutionGate`**) | 401 | 403 | **403** | 200 / missing 404 | 200 / missing 404 |
| 3 · 4Δ | `POST /api/staff/tickets/:id/claim` (**bumps `version`**) | 401 | 403 | **403** | 200 / owned 409 / terminal 409 | same as IT Staff |
| 3 · 4Δ | `PATCH /api/staff/tickets/:id/owner` | 401 | 403 | **403** | 200 / **no version 400** / ineligible 422 / **stale 409** / unassign in a worked status 409 / terminal 409 | same as IT Staff |
| 3 · 4Δ | `PATCH /api/staff/tickets/:id/it-priority` | 401 | 403 | **403** | 200 / **no version 400** / **stale 409** / terminal 409 | same as IT Staff |
| 3 · 4Δ | `PATCH /api/staff/tickets/:id/status` | 401 | 403 | **403** | 200 / invalid target or same 400 / terminal 409 / **no version 400** / **stale 409** / not permitted 409 / no owner 409 / **gate 409** / **planned actions 409**, in that order (BR-89) | same as IT Staff |
| 3 | `GET /api/staff/assignable-users` | 401 | 403 | **403** | 200 | 200 |
| 3 | `GET /api/tickets/:id/public-comments` | 401 | 403 | own 200 / other 404 | 200 / missing 404 | 200 / missing 404 |
| 3 · 4Δ | `POST /api/tickets/:id/public-comments` | 401 | 403 | own 201 / **repeat key 200** / terminal 409 / other 404 | 201 / **repeat key 200** / terminal 409 | same as IT Staff |
| 3 | `GET /api/tickets/:id/internal-notes` | 401 | 403 | **403** | 200 / missing 404 | 200 / missing 404 |
| 3 · 4Δ | `POST /api/tickets/:id/internal-notes` | 401 | 403 | **403** | 201 / **repeat key 200** / terminal 409 | same as IT Staff |
| 3 | `GET /api/users` | 401 | 403 | **403** | **403** | 200 |
| 3 | `POST /api/users` | 401 | 403 | **403** | **403** | 201 / duplicate 409 |
| 3 | `PATCH /api/users/:id` | 401 | 403 | **403** | **403** | 200 / duplicate 409 / last Administrator 409 / self-deactivation 422 |
| 3 | `POST /api/users/:id/initial-password` | 401 | 403 | **403** | **403** | 200 |
| **4** | `POST /api/tickets/:id/actions` | 401 | 403 | **403** | 201 / repeat key 200 / invalid 400 / ineligible 422 / Resolved 409 / terminal 409 / missing 404 | same as IT Staff |
| **4** | `PATCH /api/actions/:id` | 401 | 403 | **403** | 200 / invalid or no version 400 / ineligible 422 / stale 409 / final action 409 / Resolved 409 / terminal 409 / missing 404 | same as IT Staff |
| **4** | `POST /api/actions/:id/complete` | 401 | 403 | **403** | 200 / invalid or no version 400 / stale 409 / final action 409 / Resolved 409 / terminal 409 / missing 404 | same as IT Staff |
| **4** | `POST /api/actions/:id/cancel` | 401 | 403 | **403** | 200 / invalid or no version 400 / stale 409 / final action 409 / Resolved 409 / terminal 409 / missing 404 | same as IT Staff |
| **4** | `GET /api/dashboard/requester` | 401 | 403 | 200 (own data only) | **403** | **403** |
| **4** | `GET /api/dashboard/staff` | 401 | 403 | **403** | 200 | 200 with `userCounts` |

Rules the matrix encodes:

- Every 401 is the same body. Every **bold 403** is returned before the addressed resource is
  loaded (BR-40), so it is identical whether or not the resource exists (L3 C-65).
- MustChange is 403 `PASSWORD_CHANGE_REQUIRED` everywhere except the public routes, login,
  current user, change-password and logout (L3 C-61, C-99).
- A Requester 404 means the resource is not theirs or does not exist, and never says which.
- "terminal 409" is `TICKET_CLOSED` (L3 BR-108, C-122), except on the status route, where it
  is `INVALID_STATUS_TRANSITION` (BR-89, C-164); "Resolved 409" is `TICKET_RESOLVED` (C-122);
  "stale 409" is `STALE_UPDATE` (C-138); "gate 409" is `RESOLUTION_GATE_NOT_MET` and "no owner
  409" `OWNER_REQUIRED` (C-137); "planned actions 409" is `PLANNED_ACTIONS_OPEN` (C-124);
  "final action 409" is `ACTION_NOT_PLANNED` (BR-14, C-162).
- "repeat key 200" is a replay (BR-43): it is answered before the terminal and Resolved
  refusals, so a replay on a Ticket that has since closed is still 200 (C-166).
- Every write returns the full staff Ticket DTO on the four action routes (C-136).
- Administrator equals IT Staff on every Ticket and action row (L3 C-66); only the
  Administrator holds the user rows and `userCounts`.
- `/system-check` is a public client screen, not an API route, and stays outside the
  navigation (L3 C-87, C-149).

### 5.3 Dashboard metric catalogue

Every metric is computed by the backend from authoritative rows at request time (BR-52), with
`now` injected. "Recent" is `>= now - 168 h` (BR-53). "Active" is BR-54. Every Requester
query begins with `requesterId = session user` (BR-59). A zero count shows `0`; an empty
list shows the empty component (BR-57). Every count equals the total of its drill-down
(BR-56). Drill-downs are client URLs; the count equals the total that URL's API query
returns.

**Requester Dashboard** (`GET /api/dashboard/requester`)

| ID | Metric (label) | Kind | Exact definition | Drill-down | Trace |
|---|---|---|---|---|---|
| BR-73 | Open tickets | Card | own Tickets with `currentStatus` in `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `REOPENED` (BR-55) | `/tickets?statusGroup=open` | C-143, C-150 |
| BR-74 | Waiting for you | Card | own Tickets with `currentStatus = WAITING_FOR_REQUESTER` | `/tickets?currentStatus=WAITING_FOR_REQUESTER` | C-143 |
| BR-75 | Resolved - awaiting closure | Card | own Tickets with `currentStatus = RESOLVED` | `/tickets?currentStatus=RESOLVED` | C-143 |
| BR-76 | Closed | Card | own Tickets with `currentStatus = CLOSED` | `/tickets?currentStatus=CLOSED` | C-143 |
| BR-77 | Recently updated | List, 5 | own Tickets with `lastActivityAt >= now - 168 h`, `lastActivityAt desc, id desc` | each row -> Ticket Detail; View all -> `/tickets?sort=lastActivityAt:desc` | C-143, C-140, C-161 |
| BR-78 | Recently resolved | List, 5 | own Tickets with `resolvedAt >= now - 168 h`, whether now Resolved or Closed; `resolvedAt desc, id desc`. A NULL `resolvedAt` never qualifies | each row -> Ticket Detail | C-143, C-126, C-161 |

**IT Staff Dashboard** (`GET /api/dashboard/staff`; the Administrator sees it too)

| ID | Metric (label) | Kind | Exact definition | Drill-down | Trace |
|---|---|---|---|---|---|
| BR-79 | Unassigned | Card | active Tickets with `ownerId IS NULL` | `/queue?owner=unassigned` | C-143, C-150 |
| BR-80 | Mine | Card | active Tickets with `ownerId = session user` | `/queue?owner=me` | C-143 |
| BR-81 | New · Open · In Progress · Waiting for Requester · Reopened · Resolved | Six cards | active Tickets with `currentStatus` equal to that one status | `/queue?currentStatus=<STATUS>` | C-143 |
| BR-82 | High IT Priority | Card | active Tickets with `itPriority = HIGH` | `/queue?itPriority=HIGH` | C-143 |
| BR-83 | Requester says resolved | Card | active Tickets with `requesterResolvedAt IS NOT NULL` | `/queue?requesterResolved=true` | C-143, L3 C-76 |
| BR-84 | My planned actions | Card + panel | `ActionTaken` rows with `status = PLANNED`, `assigneeId = session user`, on a non-terminal (active) Ticket | `/dashboard#my-actions`: a panel listing **every** such action, no cap and no pagination, `actionAt asc, id asc`; the card equals its row count | C-143, C-169 |
| BR-85 | Recently updated | List, 5 | active Tickets with `lastActivityAt >= now - 168 h`, `lastActivityAt desc, id desc` | each row -> Ticket Detail; View all -> `/queue?sort=lastActivityAt:desc` | C-143, C-140, C-161 |
| BR-86 | Urgent | List, 5 | active Tickets with `itPriority = HIGH`, `createdAt asc, id desc` - oldest first, exactly the order `/queue?itPriority=HIGH` returns | each row -> Ticket Detail; View all -> `/queue?itPriority=HIGH` | C-143, C-161, L2 C-29 |
| BR-87 | Requesters · IT Staff · Administrators (Administrator only, `userCounts`) | Three cards | **all** `User` rows with that `role`, active or not; secondary text "N active" counts those with `isActive = true` and has no drill-down | `/users?role=REQUESTER` · `IT_STAFF` · `ADMINISTRATOR` | C-143 |

Each list's order is its drill-down's order (C-161), so a list's rows are the first rows of
its "View all": both "Recently updated" lists and their drill-downs break ties on `id desc`
(`queueOrderBy`, `listOrderBy`), and "Urgent" is the queue's default order under the High
filter. "Recently resolved" has no "View all".

The queue's default status set is the active set, and naming a `currentStatus` replaces it
(`server/src/lib/list-query.ts` `queueWhere`), so each staff drill-down lists exactly the
rows its card counts. The user cards count all accounts because `/users?role=` lists
inactive users too, and an "active" filter would be a second simultaneous filter (C-143).

**How legacy rows behave in every metric** (rows that existed before the migration):

| Metric | Legacy behavior |
|---|---|
| Status cards, Open tickets, Unassigned, Mine, High IT Priority, Requester says resolved | Counted exactly like new rows: they read only Lab 3 columns |
| Recently updated (both) | Counted when the backfilled `lastActivityAt` (section 7.7) is within 7 days |
| Recently resolved | Never counted: `resolvedAt` stays NULL, because no record says when they were resolved (C-126) |
| My planned actions | Never counted: legacy Tickets have no actions |
| User cards | Every existing user counted by role |

## 6. UI Specification Summary

`ui-spec.md` is the visual contract: exact copy, states per screen, the measured checklist and
the screenshot names. This section fixes structure and behavior.

| Screen | Structure and modes | Role behavior |
|---|---|---|
| IT Staff Dashboard (`/dashboard`) | Heading, `generatedAt` in Asia/Bangkok and a Refresh button; a card grid (BR-79 to BR-83, BR-87 for the Administrator); the uncapped "My planned actions" panel at `#my-actions`; "Recently updated" and "Urgent" lists; Quick Actions "Search Tickets" and "My Queue" | IT Staff and Administrator; the Administrator also sees the three user cards |
| Requester Dashboard (`/dashboard`) | Same shell; four cards (BR-73 to BR-76); "Recently updated" and "Recently resolved" lists; Quick Action "Create Ticket" | Requester only; never duplicates the My Tickets table |
| Actions Taken area (IT Staff Ticket Detail) | A list or table (BR-22) with status badges; create mode (status `PLANNED` or `COMPLETED`, assignee picker defaulting to me, the "Shown to the Requester" label); view/edit mode for a `PLANNED` action; Complete and Cancel each with their own fields; finished actions read-only with "Completed by" or "Cancelled by" and "Reason" | IT Staff and Administrator; operations offered as the API returns them (FR-09) |
| Actions Taken (Requester Ticket Detail) | The same list, read-only, no controls | Requester, own Tickets only |
| Ticket workflow (IT Staff Ticket Detail) | Status control listing only `allowedTransitions`; confirmation for Resolved, Closed, Cancelled (L3 BR-57); Resolved shown disabled with the `resolutionGate` reasons beneath when the gate is not met, and a server gate refusal shown the same way; status history oldest first; "Last updated" from `lastActivityAt` | IT Staff and Administrator; the Requester sees status and history read-only |
| Navigation | "Dashboard" first, active page marked with `aria-current`, per BR-61 | Per role |

Feedback states, consistent on every Lab 4 screen: loading, validation (message directly
below the field, dark red), success (never color alone), empty/no-results, forbidden,
**conflict** (C-153: `STALE_UPDATE` shows the fresh values and keeps the draft; a gate or
cancel refusal names what to do), not-found and safe failure with retry. Public Comments,
Internal Notes and Actions Taken are visually distinct. Zen Green tokens as `CLAUDE.md` fixes
them; read-only fields soft gray-green or warm ivory.

Responsive: every Lab 4 screen at desktop, tablet and mobile width (L3 C-90), cards
reflowing to fewer columns and the action list to stacked rows, with no clipping, overlap or
horizontal page scroll; keyboard operation, visible focus, semantic labels, and modal dialogs
that trap and return focus (`LS 7`, `LS 8.6`).

## 7. Data Changes

PostgreSQL via Prisma, Prisma's default naming kept. Created with
`npx prisma migrate dev --create-only`, the SQL read, then applied with
`npx prisma migrate deploy`. Additive only (C-145).

### 7.1 Enum

| Enum | Values | Note |
|---|---|---|
| `ActionStatus` | `PLANNED`, `COMPLETED`, `CANCELLED` | New, in its own migration (C-145) |

`TicketStatus`, `RequestedPriority` and `UserRole` are unchanged.

### 7.2 `ActionTaken` - new

| Field | Type | Notes |
|---|---|---|
| `id` | `Int` | PK, autoincrement |
| `ticketId` | `Int` | FK to `Ticket`, NOT NULL - exactly one Ticket (BR-01) |
| `status` | `ActionStatus` | BR-09 |
| `actionAt` | `DateTime` | The user's Action Date/Time (BR-07) |
| `description` | `String @db.Text` | 1-2000 after trim (BR-04) |
| `result` | `String? @db.Text` | NULL while `PLANNED`; the result, or the cancel reason (BR-11, BR-12) |
| `followUpRequired` | `Boolean` | `@default(false)` |
| `followUpNote` | `String?` | 1-1000, iff `followUpRequired` (BR-05) - enforced in code, not a CHECK (C-145) |
| `attachmentNotes` | `String?` | 0-500 (BR-06) |
| `assigneeId` | `Int` | FK to `User`; the caller by default (BR-18) |
| `performedById` | `Int?` | FK to `User`; set on complete and cancel (BR-11 to BR-13) |
| `finishedAt` | `DateTime?` | Set on complete and cancel; `createdAt` for a created-completed action (BR-13) |
| `createdById` | `Int` | FK to `User`, from the session |
| `createdAt` | `DateTime` | `@default(now())`, the "Action create date/time" |
| `version` | `Int` | `@default(0)` (BR-35) |
| `clientRequestId` | `String?` | UUID; `@@unique([createdById, clientRequestId])` (BR-42) |

There is no delete path, and no edit path once `COMPLETED` or `CANCELLED` (BR-14, BR-15).

### 7.3 `TicketStatusChange` - new

`id` (PK), `ticketId` (FK `Ticket`), `fromStatus` (`TicketStatus?` - NULL only on the
creation row, C-167) and `toStatus` (`TicketStatus`),
`changedById` (FK `User`), `changedAt` (`@default(now())`). No `updatedAt`, no update or
delete path (BR-50).

### 7.4 `Ticket` - new columns

| Field | Type | Notes |
|---|---|---|
| `version` | `Int` | `@default(0)` (BR-35) |
| `lastActivityAt` | `DateTime` | NOT NULL, `@default(now())`, backfilled (BR-46, section 7.7) |
| `resolvedAt` | `DateTime?` | NULL for legacy rows (BR-49) |
| `clientRequestId` | `String?` | `@@unique([requesterId, clientRequestId])` (BR-42) |

`PublicComment` and `InternalNote` each gain `clientRequestId String?` with
`@@unique([authorId, clientRequestId])`. PostgreSQL allows repeated NULLs in a unique
constraint, so legacy rows need no value, and no partial index is needed - Prisma cannot
express one, and it would show as drift (C-145).

Relationships: one `Ticket` has many `ActionTaken` and many `TicketStatusChange` rows; each
action references up to four `User` rows (assignee, creator, performer); each status change
references the `User` who made it.

### 7.5 Indexes - justified

| Index | Serves |
|---|---|
| `ActionTaken(ticketId, actionAt, id)` | The embedded action list per Ticket in display order (BR-22), and every gate count, which starts from `ticketId` |
| `ActionTaken(assigneeId, status)` | "My planned actions" (BR-84): `assigneeId = me AND status = PLANNED` |
| `Ticket(requesterId, lastActivityAt)` | The Requester's "Recently updated" (BR-77) and My Tickets' `lastActivityAt` sort, both scoped by Requester first |
| `Ticket(resolvedAt)` | "Recently resolved" (BR-78), a range scan on `resolvedAt` |
| `TicketStatusChange(ticketId, changedAt, id)` | History display order (BR-23), and the latest change into `REOPENED` (BR-31) |
| The three `clientRequestId` uniques and the one on `ActionTaken` | The duplicate lookup (BR-43); they are constraints first, indexes as a consequence |

C-145 names no other index. The staff status-led counts reuse Lab 3's
`[currentStatus, ...]` indexes; whether any dashboard query needs more is a question C-148's
smoke answers with timings, with `EXPLAIN` recorded but not asserted.

### 7.6 Design decisions - justified

1. **An integer `version` column for stale updates (C-138).** One integer compared in a
   conditional UPDATE is exact and trivially testable; a timestamp comparison depends on
   precision, and an ETag header is more machinery for a student client. Making it required
   means a client that skips it is refused, not trusted.
2. **A denormalized `lastActivityAt` (C-140).** `updatedAt` misses Public Comments and
   Attachments, and computing the latest activity across three tables per row would make
   every list and dashboard query a join with aggregates. One column, written on a known
   list of paths (BR-46), indexes cleanly - and leaving Internal Notes out of it keeps a
   private note from showing on the Requester's screens.
3. **A separate, append-only `TicketStatusChange` table (C-141).** The reopen rule
   (BR-31) needs to know when the Ticket last entered `REOPENED`, which no column on
   `Ticket` can hold over several reopenings. A separate table with no update path is also
   the append-only and stable-ordering evidence Part 7 asks for.
4. **A `resolvedAt` column, NULL for legacy rows (C-126).** "Recently resolved" needs a
   resolution time; deriving it for old rows would invent dates.
5. **Composite uniques, not partial indexes, for `clientRequestId` (C-145).** Repeated NULLs
   are allowed, so the constraint is exact without anything Prisma cannot express.

### 7.7 Migration - ordered steps

1. `pg_dump -Fc` the dev database to a file outside the repository (BR-68).
2. **M1** - `CREATE TYPE "ActionStatus"`. Nothing else (C-145).
3. **Ticket columns** - add `version INT NOT NULL DEFAULT 0`, `resolvedAt` NULL, and
   `lastActivityAt` nullable; run the backfill below; then set its default to `now()` and
   `NOT NULL`. Add `clientRequestId` to `Ticket`, `PublicComment` and `InternalNote` with
   their unique constraints.
4. **New tables** - `ActionTaken` and `TicketStatusChange`, with their foreign keys and
   indexes; then `Ticket(requesterId, lastActivityAt)` and `Ticket(resolvedAt)`.
5. **Rehearse first** (C-129, L3 C-83): restore `lab3-final.dump` into
   `toktickit_rehearsal`; capture row counts per table and Tickets per Requester email; run
   `npx prisma migrate deploy`; capture the same figures again plus
   `npx prisma migrate diff ... --exit-code`. Pass: every count unchanged, every
   `lastActivityAt` non-NULL and `>= updatedAt`, every `version` 0, every `resolvedAt` NULL,
   zero `ActionTaken` and `TicketStatusChange` rows, and no drift.
6. **Restore test**: restore the dump into a fresh database and show the same row counts.
   This is the recovery evidence (BR-68).
7. Only then: `migrate deploy` on the dev database, then the seed. `toktickit_test` is
   migrated and seeded by the Vitest global setup.
8. Captures go under `artifacts/lab-04/evidence/issue-2/`. If Prisma offers a reset, the
   answer is no and work stops.

**Backfill rules.**

- `lastActivityAt` = the greatest of `Ticket.updatedAt`, the latest `PublicComment.createdAt`,
  the latest `Attachment.uploadedAt` and the latest `Attachment.removedAt` for that Ticket
  (NULLs ignored). Internal Notes are not read (BR-47).
- `version` = 0; `resolvedAt` = NULL (C-126); `clientRequestId` = NULL.
- No `ActionTaken` and no `TicketStatusChange` row is invented - not even the creation row
  that new Tickets get (C-167). Legacy Tickets show
  "History is recorded from <migration date>" (BR-51), and legacy Resolved and Closed Tickets
  are never re-validated against the gate (BR-32). An open legacy Ticket needs a completed
  action before it can be resolved, like any other.

### 7.8 Recovery

There is no down-migration: Prisma has none, and every change is additive (C-129). Recovery
is restoring the step-1 dump with `pg_restore`; step 6 proves it works. The safety copy of the
final Lab 3 database is `C:\Users\Tamat\Downloads\lab3-final.dump`.

### 7.9 Seed composition (C-146)

Idempotent, extending L3 C-91: users, Categories and Related Systems by `upsert`; Tickets by
(Requester email, summary); comments and notes by Ticket plus body; actions by (Ticket,
description). It never overwrites a changed password (L3 C-72). It holds:

- Tickets with **zero, one and several** actions, and **one Ticket with actions by three
  different staff users** (BR-02).
- `PLANNED`, `COMPLETED`, `CANCELLED` and follow-up-required actions.
- One open Ticket that passes the gate and one that fails it.
- `resolvedAt` set on the seed's own Resolved and Closed Tickets, each of which has completed
  actions that satisfy the gate.
- Activity times relative to the run, so the 7-day metrics are non-empty on a fresh seed.
- The two zero-metric accounts kept: the active Requester nattapong.w with zero Tickets
  (enforced by existing tests), and the Administrator who owns nothing.
- Every Lab 3 status, priority and ownership case, unchanged.

## 8. API Contract

Summary only; `api-spec.md` holds paths, shapes, validation messages and examples. The Lab 3
error envelope `{ error: { code, message, fields? } }` is unchanged (C-138).

| Endpoint | Request | Success | Trace |
|---|---|---|---|
| `POST /api/tickets/:id/actions` | `status` (`PLANNED` or `COMPLETED`), `actionAt`, `description`, optional `assigneeId`, `attachmentNotes`; when `COMPLETED` also `result`, `followUpRequired`, `followUpNote`; optional `clientRequestId` | 201 staff Ticket DTO; repeat key 200 | C-136, C-139 |
| `PATCH /api/actions/:id` | `version` plus any of `description`, `actionAt`, `assigneeId`, `attachmentNotes` | 200 staff Ticket DTO | C-133, C-136 |
| `POST /api/actions/:id/complete` | `version`, `result`, `followUpRequired`, `followUpNote`, optional `actionAt` | 200 staff Ticket DTO | C-133, C-168 |
| `POST /api/actions/:id/cancel` | `version`, `result` (the reason) | 200 staff Ticket DTO | C-133 |
| `GET /api/dashboard/requester` | none | 200 `{ generatedAt, timeZone, cards: [{ key, label, count, drillDown }], lists: { recentlyUpdated, recentlyResolved } }` | C-143 |
| `GET /api/dashboard/staff` | none | 200, same shape with the staff cards and lists, the "My planned actions" panel, and `userCounts` for the Administrator only | C-143 |
| Status, owner, IT Priority PATCHes | gain a required `version` | unchanged | C-138 |
| Create Ticket, Public Comment, Internal Note | gain an optional `clientRequestId` | unchanged; repeat key 200 | C-139 |
| `GET /api/staff/tickets` | gains `sort=lastActivityAt:<dir>` and `requesterResolved=true` | rows gain `lastActivityAt` | C-140, C-143 |
| `GET /api/tickets` | gains `statusGroup=open` (never with `currentStatus`: 400) and `sort=lastActivityAt:<dir>` | rows gain `lastActivityAt` | C-143, C-170 |

**DTO additions.** Both Ticket Detail DTOs gain `version`, `lastActivityAt`, `resolvedAt`,
`actions` (BR-22 order) and `statusHistory` (BR-23 order); the Requester DTO carries names and
never email addresses (C-123). The staff DTO also gains `allowedTransitions` and
`resolutionGate: { met, reasons }` (BR-27, C-171). A replayed create answers 200 with the
same body shape as its first success (BR-43, C-165). The
five exact key-set tests that break on new fields are adapted, not retired
(1.1 report 2.15).

**New refusal codes** (extending L3 C-100): 409 `STALE_UPDATE` (C-138), 409
`RESOLUTION_GATE_NOT_MET` with `reasons` (C-137), 409 `PLANNED_ACTIONS_OPEN` (C-124), 409
`TICKET_RESOLVED` (C-122), 409 `ACTION_NOT_PLANNED` (C-162). Reused: 409 `TICKET_CLOSED`, 409 `OWNER_REQUIRED`, 422
`ASSIGNEE_NOT_ELIGIBLE`, 400 `SAME_STATUS`, 409 `INVALID_STATUS_TRANSITION`.

**Concurrency.** `version` on every Ticket PATCH and action update (BR-36), the row lock on
every action write and status change (BR-34), and `clientRequestId` on the four creates
(BR-42). The silent three-attempt retry in `staff.ts` is replaced (C-138).

**Safe errors.** No response or log line carries a password, a hash or a session token; a
500 carries no stack, SQL or path (L3 BR-88, BR-89).

## 9. Acceptance Criteria

AC-01 and AC-02 are `LS 9.1` verbatim. Each criterion is one observable behavior; the Trace
column names the rules it covers. Every BR is covered by at least one AC.

| ID | Given | When | Then | Trace |
|---|---|---|---|---|
| AC-01 | Given a permitted IT Staff user and valid data, | when an Actions Taken is created, | then it is saved under the correct Ticket with the authenticated creator and approved assignee. | BR-01, BR-03, BR-17, BR-18, FR-02 |
| AC-02 | Given an authenticated Requester, | when dashboard data is retrieved, | then only metrics and recent Tickets owned by that Requester are returned. | BR-59, FR-20 |
| AC-03 | Given a Requester session | when the Requester calls `POST /api/tickets/:id/actions` for a Ticket that exists and for one that does not | then both answer the identical 403 and no action is created | BR-17, BR-40 |
| AC-04 | Given a Ticket owned by IT Staff A | when IT Staff B creates an action on it | then the action is saved with `createdById` B and the Ticket Owner is still A | BR-02 |
| AC-05 | Given a create request whose `createdById`, `createdAt` and `performedById` name other values | when it is submitted | then the server stores the session user and server time and ignores the client values | BR-03 |
| AC-06 | Given an action form | when the description is whitespace only or 2001 characters | then 400 is returned with a message at the description field and nothing is saved | BR-04 |
| AC-07 | Given `followUpRequired` true | when no `followUpNote` is sent | then 400 is returned at the follow-up note field | BR-05 |
| AC-08 | Given `followUpRequired` false | when a `followUpNote` is sent | then 400 is returned and nothing is saved | BR-05 |
| AC-09 | Given the action form with a follow-up note typed | when the user unticks Follow-Up Required? | then the note is cleared and not sent | BR-05 |
| AC-10 | Given an action | when `attachmentNotes` is 501 characters | then 400 is returned at that field | BR-06 |
| AC-11 | Given a Ticket created at time T | when an action is submitted with `actionAt` before T | then 400 is returned at the date field | BR-07 |
| AC-12 | Given a `COMPLETED` create | when `actionAt` is later than server now + 5 minutes | then 400 is returned at the date field | BR-07 |
| AC-13 | Given an `actionAt` string with no offset | when it is submitted | then 400 is returned | BR-07 |
| AC-14 | Given the user enters 09:00 in the `datetime-local` input | when the form is sent | then `actionAt` is sent as 09:00 with offset +07:00 | BR-07 |
| AC-15 | Given a saved action | when it is displayed | then its Action Date/Time, create date/time and finish time are shown in Asia/Bangkok | BR-08 |
| AC-16 | Given an action whose description contains `<b>x</b>` and a line break | when it is displayed | then the markup shows as literal text and the line break is preserved | BR-08 |
| AC-17 | Given a create request with `status` `CANCELLED` | when it is submitted | then 400 is returned and nothing is saved | BR-09 |
| AC-18 | Given a `PLANNED` action | when its description, `actionAt`, assignee and attachment notes are edited with the current `version` | then 200 is returned with the new values and the action `version` increased by one | BR-10, BR-37 |
| AC-19 | Given a `PLANNED` action | when IT Staff C completes it with a result | then it is `COMPLETED` with `performedById` C, `finishedAt` server now, and the UI shows "Completed by" C | BR-11 |
| AC-20 | Given a `PLANNED` action | when cancel is sent without a `result` | then 400 is returned and the action stays `PLANNED` | BR-12 |
| AC-21 | Given a `PLANNED` action | when IT Staff C cancels it with a reason | then it is `CANCELLED` with the reason in `result`, `performedById` C and `finishedAt` set, shown as "Cancelled by" C and "Reason" | BR-12 |
| AC-22 | Given IT Staff C | when C creates an action already `COMPLETED` | then `performedById` is C, `finishedAt` equals `createdAt`, and `actionAt` is the submitted value | BR-13 |
| AC-23 | Given a `COMPLETED` action | when edit, complete or cancel is sent for it with its current `version` | then 409 `ACTION_NOT_PLANNED` is returned and the action is unchanged | BR-14 |
| AC-24 | Given the registered route list | when it is inspected | then no route updates or deletes a Public Comment, Internal Note, finished action or status-history row | BR-15, BR-50 |
| AC-25 | Given an `IN_PROGRESS` Ticket | when an action on it is created and then completed | then the Ticket's status is still `IN_PROGRESS` | BR-16, BR-26 |
| AC-26 | Given an action whose assignee is IT Staff A | when IT Staff B, who neither owns the Ticket nor is the assignee, completes it | then 200 is returned | BR-19 |
| AC-27 | Given a create or edit naming a Requester as assignee | when it is submitted | then 422 `ASSIGNEE_NOT_ELIGIBLE` is returned and nothing changes | BR-18 |
| AC-28 | Given a create or edit naming an inactive IT Staff user as assignee | when it is submitted | then 422 `ASSIGNEE_NOT_ELIGIBLE` is returned | BR-18 |
| AC-29 | Given a create with no assignee | when it is submitted | then the action's assignee is the caller | BR-18 |
| AC-30 | Given a `PLANNED` action whose assignee was deactivated after assignment | when another staff user completes or cancels it | then 200 is returned | BR-19 |
| AC-31 | Given a Requester's own Ticket with actions | when the Requester opens Ticket Detail | then every action is shown with every field, people by name, and no email key appears anywhere in the response | BR-20 |
| AC-32 | Given another Requester's Ticket | when the Requester requests it | then 404 is returned and no action data is disclosed | BR-20 |
| AC-33 | Given the Requester Ticket Detail | when it renders the Actions Taken list | then no create, edit, complete or cancel control is present | BR-20 |
| AC-34 | Given the staff action composer | when it is open | then the label "Shown to the Requester" is visible | BR-21 |
| AC-35 | Given two actions with the same `actionAt` | when the Ticket is loaded twice | then both loads list them in the same order, higher `id` first | BR-22 |
| AC-36 | Given a Ticket moved through three statuses | when either Ticket Detail is loaded | then its history lists the creation row and the three changes, oldest first | BR-23, BR-50 |
| AC-37 | Given a `RESOLVED` Ticket | when any action write is sent | then 409 `TICKET_RESOLVED` is returned and nothing changes | BR-24 |
| AC-38 | Given a `CLOSED` or `CANCELLED` Ticket | when any action write is sent | then 409 `TICKET_CLOSED` is returned and nothing changes | BR-24 |
| AC-39 | Given a Ticket in each of `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `REOPENED` | when an action is created | then 201 is returned | BR-24 |
| AC-40 | Given all 64 from-to pairs | when each is attempted by IT Staff with the gate satisfied | then exactly the section 5.1 `Y` cells succeed and the others answer as 5.1 says | BR-25 |
| AC-41 | Given a Requester's Ticket in Open | when the Requester sets "Problem Appears Resolved" | then the status is unchanged | BR-26 |
| AC-42 | Given a Ticket in each status | when the staff Ticket DTO is read | then `allowedTransitions` equals that status's `Y` targets in 5.1, and the status control offers exactly those | BR-27, FR-10 |
| AC-43 | Given an unowned `OPEN` Ticket with no completed action | when a move to `RESOLVED` is sent | then 409 `OWNER_REQUIRED` is returned, not the gate code | BR-28 |
| AC-44 | Given an owned Ticket with no `COMPLETED` action | when a move to `RESOLVED` is sent directly to the API | then 409 `RESOLUTION_GATE_NOT_MET` with `NO_COMPLETED_ACTION` in `reasons` is returned and the status is unchanged | BR-29, BR-32 |
| AC-45 | Given an owned Ticket with a completed action and a `PLANNED` one | when a move to `RESOLVED` is sent | then the gate refuses it with `PLANNED_ACTIONS_OPEN` in `reasons` | BR-29 |
| AC-46 | Given an owned Ticket whose latest completed action has follow-up required | when a move to `RESOLVED` is sent | then the gate refuses it with `FOLLOW_UP_REQUIRED` in `reasons` | BR-29 |
| AC-47 | Given a follow-up-required action finished first, then a no-follow-up action finished later but with an earlier `actionAt` | when a move to `RESOLVED` is sent | then `FOLLOW_UP_REQUIRED` is not a reason | BR-30 |
| AC-48 | Given a Ticket resolved, reopened, and with no action finished since | when a move to `RESOLVED` is sent | then the gate refuses it with `NO_ACTION_SINCE_REOPEN` in `reasons` | BR-31 |
| AC-49 | Given an owned Ticket that meets the gate | when a move to `RESOLVED` is sent | then 200 is returned and the Ticket is `RESOLVED` | BR-29 |
| AC-50 | Given a legacy `RESOLVED` Ticket with no actions | when it is moved to `CLOSED` | then 200 is returned | BR-32 |
| AC-51 | Given a Ticket with a `PLANNED` action | when a move to `CANCELLED` is sent | then 409 `PLANNED_ACTIONS_OPEN` is returned and nothing changes | BR-33 |
| AC-52 | Given an owned Ticket that meets the gate | when a planned-action create and a move to `RESOLVED` are sent concurrently, repeatedly | then no run ends with a `RESOLVED` Ticket holding a `PLANNED` action | BR-34 |
| AC-53 | Given a status, owner or IT Priority PATCH without `version` | when it is sent | then 400 is returned | BR-36 |
| AC-54 | Given a Ticket changed by another user after it was read | when a PATCH is sent with the old `version` | then 409 `STALE_UPDATE` is returned and nothing changes | BR-36 |
| AC-55 | Given an action edited by another user after it was read | when an edit, complete or cancel is sent with the old `version` | then 409 `STALE_UPDATE` is returned and nothing changes | BR-35, BR-36 |
| AC-56 | Given a Ticket at `version` v | when a Public Comment, Internal Note, Attachment or action write is made | then its `version` is still v | BR-37 |
| AC-57 | Given a Ticket at `version` v | when its status, owner or IT Priority is changed or the Requester sets the flag | then its `version` is v + 1 | BR-37 |
| AC-58 | Given an unowned Ticket at `version` v | when it is claimed with no `version` in the body | then 200 is returned and its `version` is v + 1 | BR-38 |
| AC-59 | Given a stale PATCH | when 409 `STALE_UPDATE` is returned | then the body has the Lab 3 envelope `{ error: { code, message } }` | BR-39 |
| AC-60 | Given a user with an unsaved change on a screen that has gone stale | when the save returns `STALE_UPDATE` | then the screen shows the fresh server values and the user's draft is still present | BR-39, BR-63 |
| AC-61 | Given a non-terminal Ticket, a stale `version` and a target the matrix forbids | when the status PATCH is sent | then 409 `STALE_UPDATE` is returned, not `INVALID_STATUS_TRANSITION` | BR-89 |
| AC-62 | Given a `RESOLVED` Ticket and an invalid action body | when an action create is sent | then 409 `TICKET_RESOLVED` is returned, not 400 | BR-41 |
| AC-63 | Given a Public Comment posted with key K | when the same author posts again with K | then 200 is returned with the original comment and only one row exists | BR-42, BR-43 |
| AC-64 | Given two concurrent action creates with the same author and key | when both complete | then one row exists and both responses carry it, neither a 500 | BR-43 |
| AC-65 | Given two identical Internal Notes with no `clientRequestId` | when both are posted | then two rows exist | BR-42 |
| AC-66 | Given two authors using the same key | when each creates a Ticket or note | then each gets its own row | BR-42 |
| AC-67 | Given a composer that has just succeeded | when the user submits again | then the request carries a new `clientRequestId` | BR-44 |
| AC-68 | Given any Lab 4 create form | when the request is in flight | then its submit button is disabled | BR-44 |
| AC-69 | Given the Attachment upload control | when an upload is in flight | then the button is disabled and the five-file cap still applies | BR-45 |
| AC-70 | Given a Ticket | when each write path of BR-46 runs, one test per path | then `lastActivityAt` advances to the write's time | BR-46 |
| AC-71 | Given a Ticket | when an Internal Note is added | then `lastActivityAt` is unchanged | BR-47 |
| AC-72 | Given a Ticket with a recent Public Comment | when My Tickets, the queue or either Ticket Detail shows "Last updated" | then it shows `lastActivityAt` | BR-48 |
| AC-73 | Given the queue | when `sort=lastActivityAt:desc` is requested | then rows come in `lastActivityAt desc, id desc` order, and `sort=updatedAt:desc` still answers 200 | BR-48, FR-16 |
| AC-74 | Given a `RESOLVED` Ticket with `resolvedAt` set | when it is moved to `CLOSED` | then `resolvedAt` is kept | BR-49 |
| AC-75 | Given a `RESOLVED` Ticket | when it is moved to `REOPENED` | then `resolvedAt` is NULL | BR-49 |
| AC-76 | Given a status change whose transaction fails | when the change is attempted | then neither the status nor a history row is written | BR-50 |
| AC-77 | Given a Ticket that existed before the migration | when either Ticket Detail shows its history | then "History is recorded from <migration date>" is shown | BR-51 |
| AC-78 | Given a dashboard request | when it is answered | then the body carries `generatedAt` and `timeZone` `Asia/Bangkok` | BR-52 |
| AC-79 | Given an injected `now` and Tickets with `lastActivityAt` exactly `now - 168 h` and 1 ms earlier | when "Recently updated" is computed | then the first is included and the second is not | BR-53 |
| AC-80 | Given either Dashboard | when it renders | then no "from yesterday" or other delta text is shown | BR-53 |
| AC-81 | Given each count card | when its drill-down query is run in the same test | then its total equals the card's count (one test per card) | BR-56 |
| AC-82 | Given more than five qualifying Tickets | when a dashboard list is returned | then it holds five, each linking to its Ticket, and they are the first five rows its drill-down returns, in the same order | BR-56 |
| AC-83 | Given a user for whom a card counts nothing | when the Dashboard renders | then that card shows `0`, and a list with no rows shows the empty component | BR-57 |
| AC-84 | Given an open Dashboard | when the user presses Refresh | then the dashboard endpoint is requested again, and it is not requested at any other time while the screen stays open | BR-58 |
| AC-85 | Given an IT Staff or Administrator session | when `GET /api/dashboard/requester` is called | then 403 is returned | BR-59 |
| AC-86 | Given a Requester session | when `GET /api/dashboard/staff` is called | then 403 is returned before any query | BR-60 |
| AC-87 | Given the staff dashboard | when IT Staff and an Administrator each request it | then only the Administrator's response contains `userCounts` | BR-60, FR-19 |
| AC-88 | Given any role | when the user logs in | then the Dashboard is shown and "Dashboard" is the first navigation item, marked current | BR-61, FR-23 |
| AC-89 | Given each role | when the navigation renders | then it lists exactly the items BR-61 names for that role | BR-61 |
| AC-90 | Given the staff Dashboard | when Quick Actions render | then they are "Search Tickets" to `/queue` and "My Queue" to `/queue?owner=me`, with no Create Ticket | BR-62 |
| AC-91 | Given Create Ticket filled in | when the submit fails with 500 or a network error | then every entered value is still in the form | BR-63 |
| AC-92 | Given the action composer filled in | when the submit fails with 400, 409 or 422 | then every entered value is still in the form | BR-63 |
| AC-93 | Given a password form | when the submit fails | then every password field is empty | BR-64 |
| AC-94 | Given each Lab 4 screen with a write | when the server answers a conflict | then the Conflict state defined in `ui-spec.md` is shown | BR-65, FR-27 |
| AC-95 | Given an e2e test whose page logs `console.error` | when the test runs | then it fails; a "Failed to load resource" line for a status the test expects does not fail it | BR-66 |
| AC-96 | Given `toktickit_rehearsal` restored from `lab3-final.dump` | when the migration is deployed | then every table's row count is unchanged, the backfill holds and `migrate diff --exit-code` reports no drift | BR-67 |
| AC-97 | Given the pre-migration dump | when it is restored into a fresh database | then its row counts equal the source's | BR-68 |
| AC-98 | Given a seeded database | when the seed runs again | then no row is duplicated and no changed password is overwritten | BR-69 |
| AC-99 | Given a fresh seed | when its Tickets are inspected | then it holds Tickets with zero, one and several actions, one with actions by three staff users, one passing and one failing the gate, and nattapong.w with zero Tickets | BR-69, BR-02 |
| AC-100 | Given the final `lab4-staging` commit | when the server, client and e2e suites run | then every Lab 1-3 test passes, and any count drop matches a retirement row in `tests.md` | BR-70, FR-30 |
| AC-101 | Given every route registered on the Express app | when compared with section 5.2 | then each appears there and answers each column as the matrix states | BR-71, FR-31 |
| AC-102 | Given `toktickit_perf` with about 2,000 Tickets | when `npm run test:perf` runs | then each dashboard endpoint's p95 is under 500 ms | BR-72 |
| AC-103 | Given a Requester's Tickets in every status | when the Requester Dashboard is retrieved | then "Open tickets" counts those in `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `REOPENED` and not `RESOLVED`, and `/tickets?statusGroup=open` lists the same Tickets | BR-55, BR-73 |
| AC-104 | Given the same Tickets | when the Requester Dashboard is retrieved | then "Waiting for you" counts only `WAITING_FOR_REQUESTER` | BR-74 |
| AC-105 | Given the same Tickets | when the Requester Dashboard is retrieved | then "Resolved - awaiting closure" counts only `RESOLVED` | BR-75 |
| AC-106 | Given the same Tickets | when the Requester Dashboard is retrieved | then "Closed" counts only `CLOSED` | BR-76 |
| AC-107 | Given own and another Requester's recently active Tickets | when the Requester Dashboard is retrieved | then "Recently updated" lists only own Tickets active in the last 7 days | BR-77 |
| AC-108 | Given an own Ticket resolved 2 days ago and since closed, and a legacy Closed Ticket with NULL `resolvedAt` | when the Requester Dashboard is retrieved | then "Recently resolved" lists the first and not the second | BR-78 |
| AC-109 | Given unowned Tickets in `OPEN` and in `CLOSED` | when the staff dashboard is retrieved | then "Unassigned" counts the `OPEN` one and not the `CLOSED` one | BR-54, BR-79 |
| AC-110 | Given Tickets owned by the caller and by another user | when the staff dashboard is retrieved | then "Mine" counts only the caller's active Tickets | BR-80 |
| AC-111 | Given active Tickets in each of the six active statuses | when the staff dashboard is retrieved | then each status card counts only its own status | BR-81 |
| AC-112 | Given active and closed High IT Priority Tickets | when the staff dashboard is retrieved | then "High IT Priority" counts only the active ones | BR-82 |
| AC-113 | Given a Ticket with the Requester's flag set | when the staff dashboard is retrieved | then "Requester says resolved" counts it and `/queue?requesterResolved=true` lists it | BR-83 |
| AC-114 | Given `PLANNED` actions assigned to the caller and to another user | when the staff dashboard is retrieved | then "My planned actions" counts only the caller's, and the panel's total equals the card | BR-84 |
| AC-115 | Given an active and a closed Ticket both updated today | when the staff dashboard is retrieved | then "Recently updated" lists only the active one | BR-85 |
| AC-116 | Given active High and Medium IT Priority Tickets | when the staff dashboard is retrieved | then "Urgent" lists only High ones, at most five | BR-86 |
| AC-117 | Given active and inactive IT Staff users | when the Administrator's dashboard is retrieved | then the IT Staff card counts all of them, shows "N active" for the active ones, and `/users?role=IT_STAFF` lists the same number | BR-87, FR-24 |
| AC-118 | Given an action write | when it succeeds | then the response is the full staff Ticket DTO and the Ticket summary on screen shows its values | FR-08 |
| AC-119 | Given a Requester and an IT Staff user | when the Requester creates a Ticket and staff record actions, resolve and close it | then each step succeeds through the UI and the Requester sees the final state | FR-02, FR-11, C-154 |
| AC-120 | Given each Lab 4 screen | when rendered at desktop, tablet and mobile width | then there is no horizontal page scroll, no clipped or overlapping control, and focus is visible on every control | FR-33 |
| AC-121 | Given a `COMPLETED` action whose `version` has moved on | when an edit is sent with the old `version` | then 409 `STALE_UPDATE` is returned, not `ACTION_NOT_PLANNED` | BR-14, BR-40 |
| AC-122 | Given the Requester's own Open Ticket at `version` v | when "Problem Appears Resolved" is sent with no `version` | then 200 is returned and the Ticket `version` is v + 1 | BR-38 |
| AC-123 | Given a `CLOSED` or `CANCELLED` Ticket | when a status PATCH to `OPEN` is sent with a stale or missing `version` | then 409 `INVALID_STATUS_TRANSITION` is returned, not 400 or `STALE_UPDATE` | BR-89 |
| AC-124 | Given a `CLOSED` or `CANCELLED` Ticket | when a status PATCH targets its current status | then 400 `SAME_STATUS` is returned | BR-89 |
| AC-125 | Given a `CLOSED` Ticket | when a status PATCH names a target that is not one of the eight statuses | then 400 `VALIDATION_FAILED` is returned | BR-89 |
| AC-126 | Given an action created with key K | when the same author replays it with K | then 200 is returned with the staff Ticket DTO, the same shape as the first 201 | BR-43 |
| AC-127 | Given a Public Comment created with key K on a Ticket since moved to `CLOSED` | when the same author replays it with K | then 200 is returned with the original comment, not `TICKET_CLOSED` | BR-43, BR-40 |
| AC-128 | Given an Internal Note created with key K | when the same author sends K with a different body | then 200 is returned with the original note and no row is created | BR-43 |
| AC-129 | Given a Requester | when the Requester creates a Ticket | then its status history holds one row, `fromStatus` NULL to `NEW` | BR-50 |
| AC-130 | Given an owned Ticket with no completed action and a `PLANNED` one | when a move to `RESOLVED` is sent | then `reasons` is exactly `["NO_COMPLETED_ACTION", "PLANNED_ACTIONS_OPEN"]`, in that order | BR-29 |
| AC-131 | Given a `PLANNED` action | when complete is sent with an `actionAt` later than now + 5 minutes | then 400 is returned at `actionAt` and the action stays `PLANNED` | BR-07, BR-11 |
| AC-132 | Given a `PLANNED` action whose stored `actionAt` is tomorrow | when complete is sent without `actionAt` | then 400 is returned at `actionAt` asking for the time the work was done | BR-07 |
| AC-133 | Given seven `PLANNED` actions assigned to the caller | when the staff Dashboard renders `#my-actions` | then all seven are listed, `actionAt asc, id asc`, and the card shows 7 | BR-84 |
| AC-134 | Given My Tickets | when `statusGroup=open` and `currentStatus=NEW` are sent together | then 400 `INVALID_QUERY_PARAM` is returned | BR-88 |
| AC-135 | Given an owned Ticket that fails the gate | when the staff Ticket DTO is read | then `resolutionGate.met` is false and its `reasons` equal those a move to `RESOLVED` would return, while `allowedTransitions` still lists `RESOLVED` | BR-27 |
| AC-136 | Given `resolutionGate.met` false | when IT Staff Ticket Detail renders | then Resolved is shown disabled with each reason listed beneath it | BR-27 |
| AC-137 | Given active High IT Priority Tickets, two sharing a `createdAt` | when the staff Dashboard is retrieved | then "Urgent" lists them `createdAt asc, id desc`, the first rows of `/queue?itPriority=HIGH` | BR-86, BR-56 |
| AC-138 | Given own Tickets resolved at different times in the last 7 days | when the Requester Dashboard is retrieved | then "Recently resolved" lists them `resolvedAt desc, id desc` | BR-78 |

## 10. Definition of Done

The Product Definition of Done for Sprint 4. Every item is checkable; the release PR is not
opened while one is open.

**Contract**
- [ ] `specification.md`, `api-spec.md`, `ui-spec.md`, `tests.md` and `decisions.md` merged
      into `lab4-staging` before the first implementation PR; the merged PR page captured.
- [ ] No contradiction between the five contract files; any found is a decision row.

**Behavior**
- [ ] Every FR is implemented; every BR is enforced by the server where it is a server rule.
- [ ] Every AC maps to at least one test in `tests.md` naming its real file path, and passes.
- [ ] Every count card has an API test proving count equals drill-down total (C-127).
- [ ] The section 5.2 matrix test and the route-inventory test pass (C-155).
- [ ] The two-role lifecycle E2E, creation through closure, passes (C-154).

**Tests**
- [ ] Ten levels present: unit, API/integration, UI component, UI style, responsive,
      authorization, workflow, migration/regression, performance-smoke, E2E (`LS 10`).
- [ ] The failing (red) run was captured before each implementation, and the green run after.
- [ ] Server, client and e2e suites pass on the final `lab4-staging` commit; `tests.md`
      Final is filled from it with its hash; after the release merge, all suites re-run on
      `main` and `git diff lab4-staging main` is empty (C-157).
- [ ] Labs 1-3 regression: every earlier test passes; adapted tests are listed in
      `tests.md`; any count drop matches a retirement row; nothing deleted or skipped.
- [ ] `npm run test:perf` passes against `toktickit_perf` (C-148).
- [ ] The e2e console-error fixture is active on every spec (C-149).

**Data**
- [ ] Migration rehearsed on `toktickit_rehearsal`; row counts, backfill checks, the restore
      test and zero drift captured under `artifacts/lab-04/evidence/issue-2/`.
- [ ] `prisma migrate diff --exit-code` shows zero drift on the dev database.
- [ ] The seed runs twice with no duplicates and holds the section 7.9 composition.

**UI and accessibility**
- [ ] Every Lab 4 screen captured at desktop, tablet and mobile under
      `artifacts/lab-04/screenshots/`, by the Playwright specs, under the names `ui-spec.md`
      fixes, from the real running app.
- [ ] The `ui-spec.md` visual and accessibility checklist is completed with measurements.
- [ ] No console errors, broken links, placeholder text or unfinished controls; `/system-check`
      still public.

**Security**
- [ ] Every role check runs in server middleware; no identity is taken from a request.
- [ ] No response or log carries a password, a hash or a session token, on any path.
- [ ] No banned dependency added; no dependency beyond the approved list in `CLAUDE.md`.

**Evidence and process**
- [ ] `artifacts/lab-04/evidence.md` maps every Part requirement to a file, an Issue and a
      status, with no row `pending`.
- [ ] Every evidence folder has a `README.md` naming each file and what it proves.
- [ ] Every PR peer-reviewed, comments answered on GitHub first and recorded in
      `reviewer.md`; `ai-use.md` current; README setup, migration, seed, test and demo steps
      current; every Issue in Done.

## 11. Assumptions and Decisions

The reasoning behind every settled choice is recorded once, in `docs/lab-04/decisions.md`
(C-122..C-171), and is cited in the rules above rather than repeated here.

### Assumptions

1. **A-01. Attachment uploads are not de-duplicated by key** (C-139). The disabled button, the
   five-file cap and the Requester's soft removal make a duplicate harmless and recoverable.
2. **A-02. Asia/Bangkok has no daylight saving**, so `now - 168 h` and "7 days" are the same
   interval, and a `datetime-local` value maps to exactly one instant (C-134, C-142).
3. **A-03. The client clock is within 5 minutes of the server's.** The `<= now + 5 min`
   allowance on a completed action's `actionAt` absorbs that skew (C-134).
4. **A-04. Ticket volume stays near the 2,000-row perf database**, so the C-145 indexes and the
   Lab 3 status-led indexes suffice; C-148's smoke is the check, not an `EXPLAIN` assertion.
5. **A-05. A reused `clientRequestId` is a replay, whatever its body** (C-166). Keys are random
   UUIDs the client mints, so the same key with a different body means a client bug, and the
   server answers with the original rather than comparing bodies.

### Gaps closed

| Gap | Closed by | Answer |
|---|---|---|
| Where `TICKET_RESOLVED` sits in the check order | C-159 | The `TICKET_CLOSED` slot |
| `finishedAt` for an action created already `COMPLETED` | C-160 | `createdAt` |
| Whether claim sends a `version` | C-138 | No; it bumps it |
| Duplicate keys under concurrency (P2002) | C-139 | 200 with the original row |
| Which "latest" the gate reads | C-137 | `finishedAt desc, id desc` |
| Resolve again after a reopen on old work | C-137 | Refused: `NO_ACTION_SINCE_REOPEN` |
| Dashboard list order, and Urgent's order | C-161 | Each list in its drill-down's order; Urgent `createdAt asc, id desc` |
| The code for a write to a finished action | C-162 | 409 `ACTION_NOT_PLANNED`, after `STALE_UPDATE` |
| Whether the Requester's flag sends a `version` | C-163 | No; it bumps it |
| A status change on a terminal Ticket versus `SAME_STATUS` and `STALE_UPDATE` | C-164 | The seven-step status order, BR-89 |
| The body of a replayed action create | C-165 | The same shape as a first success |
| Where the replay lookup runs; a reused key with a different body | C-166 | After ownership, before the terminal refusals; treated as a replay (A-05) |
| A creation row in status history; the order of gate reasons | C-167 | `NULL -> NEW`; all at once, fixed order |
| A future `actionAt` on a planned action being completed | C-168 | Complete may send `actionAt`; the final one must be <= now + 5 min |
| "My planned actions" drill-down | C-169 | `/dashboard#my-actions`, uncapped, `actionAt asc, id asc` |
| `statusGroup` with `currentStatus` | C-170 | 400 `INVALID_QUERY_PARAM` |
| Whether `allowedTransitions` hides an unmet gate | C-171 | No; `resolutionGate` explains it and Resolved shows disabled |

### Labsheet conflicts X-1 to X-6

| ID | Conflict | Resolved by | Resolution |
|---|---|---|---|
| X-1 | `LS 3`/`LS 8.3` give a work log ("Performed by (auto)"); AC-01 and Parts 5-6 need an assignee and complete/cancel | C-131 | Planned work plus a log: assignee, `PLANNED`/`COMPLETED`/`CANCELLED`, `performedById` set by the server |
| X-2 | `LS 4.3` "where approved"; `LS 8.3` "all Actions Taken" | C-123 | `LS 8.3`: every action on own Tickets, labelled "Shown to the Requester" |
| X-3 | "Action Date/Time" (`LS 3`) vs "Action create date/time" (`LS 8.3`) | C-134 | Two fields: user-entered `actionAt`, server `createdAt` |
| X-4 | Mock-up shows staff Create Ticket | C-144, L3 C-101 | Not followed: staff do not raise Tickets |
| X-5 | Mock-up shows "+N from yesterday" | C-142 | Not shown: no daily snapshot exists |
| X-6 | Mock-ups say "TikTockIT" | L2 C-41 | Typo; TokTickIT everywhere |

### Phase 1 analysis items 4.2 to 4.9

| Item | Issue | Resolved by | Resolution |
|---|---|---|---|
| 4.2 | Requester mock-up has no Dashboard nav item and no "waiting for you" card | C-144, C-143 | Dashboard first in nav; "Waiting for you" card (BR-74) |
| 4.3 | Staff mock-up has no Ticket Queue nav; shows a Profile menu | C-144 | Queue kept; Quick Actions "Search Tickets" and "My Queue"; no Profile menu |
| 4.4 | "The resolution rule" is never defined | C-137 | Our rule, argued under section 5.1 |
| 4.5 | Part 6 "edit" vs Part 7 "append-only" | C-151 | Finished work is append-only; planned actions are editable |
| 4.6 | Part 6 "status transition" ambiguous | C-152 | The action's own status |
| 4.7 | `LS 8.5` adds "conflict" to feedback states | C-153 | Conflict state on every screen with a write |
| 4.8 | "Open" means two sets | C-150 | "Active" for the staff set; the Requester's "Open tickets" excludes Resolved |
| 4.9 | "Creation through closure" vs staff not creating Tickets | C-154 | A two-role E2E |

### Where `decisions.md` overrides the handoff

The handoff section 4 drafts are superseded by `decisions.md` (its preamble). Differences
that change this document: action text bounds are 2000 and 1000, not 1000 and 500 (C-134);
the action endpoints are Lab 3-style paths with no separate GET (C-136); the gate's "latest"
is by `finishedAt` (C-137, C-160); `clientRequestId` is optional (C-139); the
user cards count all accounts (C-143); every dashboard list follows its drill-down's order,
which keeps the catalogue's "oldest first" for "Urgent" and replaces C-127's single list
order (C-161); `EXPLAIN` is not asserted (C-148).

### Glossary additions (C-150, extending L3 C-92)

| Term | Field | Meaning |
|---|---|---|
| Action Taken | `ActionTaken` | One line of planned or finished work under exactly one Ticket. |
| Assignee | `assigneeId` | Who is expected to do a planned action. Not the Ticket Owner and not a permission. |
| Planned · Completed · Cancelled | `ActionStatus` | An action's status; the last two are final. |
| Completed by · Cancelled by | `performedById` | Who finished the action. |
| Active | - | Not Closed and not Cancelled; the queue's default set, including Resolved. |
| Open tickets (Requester Dashboard) | - | New, Open, In Progress, Waiting for Requester and Reopened; not Resolved. |
| Last updated | `lastActivityAt` | The latest activity visible to the Requester; never an Internal Note. |
| Dashboard | - | The landing screen for every role. |
