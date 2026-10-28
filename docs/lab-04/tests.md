# Lab 4 Test Plan and Results

TokTickIT - CPE 334 Individual Sprint 4.
Owner: Tammathorn Kananurak (67070503489).

Planned from `specification.md` **before implementation** (`LS 10`). Tests are written first,
run first, and their failing output captured before the code that satisfies them exists
(`CLAUDE.md`). Sources: `specification.md` (AC-01..AC-148, binding), `api-spec.md`,
`ui-spec.md`, `decisions.md` (C-122..C-180), and `phase1-analysis.md` section 3 for the Lab 1-3
disposition. `docs/lab-03/tests.md` is the template.

**C-158's cut order is applied in this plan, now:**

1. **C-139 (D-13) is not applied to Ticket create.** `clientRequestId` de-duplication is planned
   and tested on Action Taken, Public Comment and Internal Note only. On `POST /api/tickets` the
   field is ignored and every create is a 201, as `api-spec.md` 5.1 states for the cut; WF-64
   asserts exactly that, so the Lab 2 create contract is visibly unchanged.
2. **C-147 (D-25) covers the Lab 4 forms only** - Create Ticket and the composers. No Lab 1-3
   form gains new form-protection tests; the password-clearing rule (BR-64) is already proven by
   the Lab 3 tests cited for AC-93.
3. **C-148 (D-26) is the minimal perf-smoke script**: two timings (PERF-01, PERF-02), `EXPLAIN`
   recorded, never asserted.

C-141 (status history) and the C-137 gate rules are not on the cut list and are planned in full.

The `Final` column is blank until the final run on `lab4-staging` (C-157). A row whose `Final`
is blank is a planned test, not a passing one, and no claim is made for it. The open points of the first draft are settled by C-181 to C-189 (section 7).

---

## 1. Test Strategy

`LS 10` requires **ten** levels for Lab 4 (C-89 superseded): the eight of Lab 3 plus workflow
and performance-smoke. As in Lab 3, the level is carried by the **Test ID prefix**, not the file
name. Lab 4 test IDs restart at 01, like FR, BR and AC; a Lab 2 or Lab 3 test is cited with its
lab, `L3 API-64` or `L2 UI-15`, plus its file where two labs reuse an ID.

| Prefix | Level | Tool | Where it lives |
|---|---|---|---|
| `UNIT` | Unit | Vitest | Server: inside the `server/tests/lab-04/*.api.test.ts` files; client: `client/tests/lab-04/ActionsTaken.test.tsx` |
| `API` | API / integration | Supertest + Vitest | `actions-taken`, `requester-dashboard`, `staff-dashboard` `.api.test.ts` |
| `SEC` | Authorization | Supertest | Role and matrix tests inside the four API files |
| `WF` | **Workflow** (new) | Supertest + Vitest | `server/tests/lab-04/ticket-workflow.api.test.ts` |
| `MIG` | Migration / regression | Vitest + Prisma against real Postgres | `server/tests/lab-04/migration.db.test.ts`, plus the C-129 rehearsal artifacts |
| `PERF` | **Performance-smoke** (new) | Node script, `npm run test:perf` | The perf-smoke script in `server/tests/lab-04/` (C-148) |
| `UI` | UI component | Vitest + Testing Library | The four `client/tests/lab-04/*.test.tsx` files |
| `STYLE` | UI style | Vitest + Testing Library | The same client files |
| `RESP` | Responsive | Playwright, three viewport projects | The three `e2e/lab-04/*.spec.ts` files |
| `E2E` | End to end | Playwright | The three `e2e/lab-04/*.spec.ts` files |

`VIS-01`..`VIS-32` are the **manual** visual and accessibility checklist of `ui-spec.md` section
16, completed by a person against the section 15 captures. They are not automated tests, are not
counted below, and are cited in section 3 only where an AC rests partly on them.

### 1.1 Test file inventory

Only the `CLAUDE.md` required structure. **No file is added.**

```
server/tests/lab-04/actions-taken.api.test.ts         UNIT, API, SEC
server/tests/lab-04/ticket-workflow.api.test.ts       UNIT, WF
server/tests/lab-04/requester-dashboard.api.test.ts   UNIT, API, SEC
server/tests/lab-04/staff-dashboard.api.test.ts       API, SEC
server/tests/lab-04/migration.db.test.ts              MIG
server/tests/lab-04/perf-smoke.ts                     PERF   (C-183, npm run test:perf)
client/tests/lab-04/StaffDashboard.test.tsx           UI, STYLE
client/tests/lab-04/RequesterDashboard.test.tsx       UI
client/tests/lab-04/ActionsTaken.test.tsx             UNIT, UI, STYLE
client/tests/lab-04/TicketWorkflow.test.tsx           UI, STYLE
e2e/lab-04/actions-taken-flow.spec.ts                 E2E, RESP
e2e/lab-04/ticket-resolution.spec.ts                  E2E, RESP
e2e/lab-04/dashboards.spec.ts                         E2E, RESP
server/tests/lab-04/authorization.api.test.ts         SEC    (C-184)
e2e/lab-04/regression.spec.ts                         E2E    (C-185)
```

- `server/vitest.config.ts` collects `tests/**/*.test.ts`, so the perf-smoke script must **not**
  end in `.test.ts`; that keeps it out of the Supertest count (C-148).
- `client/vite.config.ts` collects only `tests/**/*.test.tsx`; the four client files are in
  `client/tests/lab-04/`, checked before the first test is written.
- Two files are added to the section 12 minimum: `authorization.api.test.ts` (C-184) and
  `regression.spec.ts` (C-185).

### 1.2 Approach

- **API, workflow and migration tests** run against `toktickit_test`, created, migrated and
  seeded by the Vitest global setup (L3 C-83). Authenticated calls use a logged-in Supertest
  agent; no test sends an identity except those that assert it is ignored (L3 C-64).
- **Fixtures** may write through Prisma to build states the API cannot reach (a legacy Ticket
  with no history row, a three-reason gate state), as Lab 3 did. Every such fixture is named in
  its row.
- **Concurrency tests** fire the competing requests with `Promise.all` from separate agents and
  assert the final database state, not just the statuses. WF-32 repeats 20 times.
- **Time** is injected: metric functions take `now` (C-142), so boundaries are asserted to the
  millisecond without fake timers next to Prisma.
- **Client tests** mock `fetch` at the module boundary, render inside the Lab 3 `AuthContext`
  wrapper, and assert rendered output. Dashboard drill-down landings (My Tickets, Ticket Queue,
  User Management reading the URL) are tested in the dashboard files, because the landing is
  the drill-down's half of the contract.
- **Playwright** runs every Lab 4 spec at desktop 1280, tablet 834 and mobile 390 (L3 C-90),
  under the C-149 console-error fixture (E2E-28..E2E-32 prove the fixture itself). C-156's
  status assertions on the Lab 3 fixture PATCHes land before any version or gate change.
- **Nothing is skipped, `.only`, deleted or weakened to make a suite green** (BR-70). A
  viewport-gated `test.skip` is a planned skip and is counted as one in section 4.4.

---

## 2. Planned Tests

**304 planned tests**, of which 298 are automated assertions and 6 are artifact rows (MIG-09 to
MIG-13 and MIG-22), stated as such.

| Level | Prefix | Planned | Suite |
|---|---|---|---|
| Unit | `UNIT` | 11 | 8 server, 3 client |
| API / integration | `API` | 81 | server |
| Authorization | `SEC` | 14 | server |
| Workflow | `WF` | 64 | server |
| Migration / regression | `MIG` | 22 (16 automated, 6 artifact) | server |
| Performance-smoke | `PERF` | 2 | `npm run test:perf` |
| UI component | `UI` | 52 | client |
| UI style | `STYLE` | 12 | client |
| Responsive | `RESP` | 11 | Playwright |
| End to end | `E2E` | 35 | Playwright |
| **Total** | | **304** | |

### 2.1 Unit

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| UNIT-01 | Unit | BR-04, BR-05, BR-06; AC-06, AC-07, AC-08, AC-10 | Action text validators, after trim | `description`/`result`: whitespace-only and 2001 fail, 1 and 2000 pass, and the validator is the L3 C-74 function by identity; `followUpNote` 1-1000 required iff `followUpRequired`; `attachmentNotes` 500 passes, 501 fails | `server/tests/lab-04/actions-taken.api.test.ts` | |
| UNIT-02 | Unit | BR-07; AC-11, AC-12, AC-13 | `actionAt` parsing and bounds, `now` injected | A string with no offset fails; `+07:00` and `Z` parse; before the Ticket's `createdAt` fails; for `COMPLETED`, exactly now + 5 min passes and 1 ms later fails | `server/tests/lab-04/actions-taken.api.test.ts` | |
| UNIT-03 | Unit | BR-90, C-175 | Accepted-field sets per operation | Planned create, completed create, edit, complete and cancel each accept exactly their `api-spec.md` 3.1-3.4 fields; BR-03 server-set and identity fields are classed "ignored"; any other name is classed "refused" | `server/tests/lab-04/actions-taken.api.test.ts` | |
| UNIT-04 | Unit | FR-09, C-174, BR-24 | `allowedOperations(actionStatus, ticketStatus)` over 3 x 8 inputs | `["EDIT","COMPLETE","CANCEL"]` only for `PLANNED` on the five writable statuses; `[]` everywhere else | `server/tests/lab-04/actions-taken.api.test.ts` | |
| UNIT-05 | Unit | BR-29, C-167 | Gate reasons as a pure function over all 16 combinations of its four conditions | Every reason that applies, in the fixed order `NO_COMPLETED_ACTION`, `PLANNED_ACTIONS_OPEN`, `FOLLOW_UP_REQUIRED`, `NO_ACTION_SINCE_REOPEN`; `NO_COMPLETED_ACTION` and `FOLLOW_UP_REQUIRED` never together | `server/tests/lab-04/ticket-workflow.api.test.ts` | |
| UNIT-06 | Unit | BR-30; AC-47 | "Latest completed action" selection | Chosen by `finishedAt desc, id desc`; a later `actionAt` on an earlier-finished action does not win; ties on `finishedAt` go to the higher `id` | `server/tests/lab-04/ticket-workflow.api.test.ts` | |
| UNIT-07 | Unit | BR-27, C-125; AC-40, AC-42 | `allowedTransitions(status)` for all eight statuses | Equals the section 5.1 `Y` targets row by row, `[]` for `CLOSED` and `CANCELLED`, read from the same matrix L3 UNIT-12 asserts | `server/tests/lab-04/ticket-workflow.api.test.ts` | |
| UNIT-08 | Unit | BR-53; AC-79 | The "recent" predicate, `now` injected | A time exactly `now - 168 h` is recent; 1 ms earlier is not | `server/tests/lab-04/requester-dashboard.api.test.ts` | |
| UNIT-09 | Unit | BR-07; AC-14 | Client `datetime-local` -> ISO conversion | `2026-10-16T09:00` becomes `2026-10-16T09:00:00+07:00`, independent of the machine's time zone | `client/tests/lab-04/ActionsTaken.test.tsx` | |
| UNIT-10 | Unit | BR-08, L2 C-39; AC-15 | Client time formatter | `2026-10-15T17:30:00Z` renders `16 Oct 2026 00:30` (Asia/Bangkok, `DD MMM YYYY HH:mm`) | `client/tests/lab-04/ActionsTaken.test.tsx` | |
| UNIT-11 | Unit | BR-44 | Client `clientRequestId` minting | Returns an RFC 4122 UUID; two calls never return the same value | `client/tests/lab-04/ActionsTaken.test.tsx` | |

### 2.2 API and integration - Actions Taken

All in `server/tests/lab-04/actions-taken.api.test.ts`. "Nothing changes" means the action
rows, the Ticket's `version`, `lastActivityAt` and status are re-read and equal the before
values.

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| API-01 | API | AC-01; BR-01, BR-03, BR-17, BR-18, FR-02 | IT Staff A creates a `PLANNED` action assigned to IT Staff B | 201 staff Ticket DTO; one row with that `ticketId`, `createdById` A, `assigneeId` B, `status` `PLANNED`, `version` 0, `performedById` and `finishedAt` null | `server/tests/lab-04/actions-taken.api.test.ts` | |
| API-02 | API | AC-22; BR-13, C-160 | IT Staff C creates an action already `COMPLETED` | `performedById` C, `finishedAt` equal to `createdAt`, `actionAt` the submitted value | `server/tests/lab-04/actions-taken.api.test.ts` | |
| API-03 | API | AC-04; BR-02 | IT Staff B creates an action on a Ticket owned by IT Staff A | 201; `createdById` B; the Ticket's `ownerId` is still A | `server/tests/lab-04/actions-taken.api.test.ts` | |
| API-04 | API | AC-05; BR-03 | Body carries `createdById`, `createdAt`, `performedById`, `finishedAt`, `version` naming other values | 201; the row holds the session user, server times and `version` 0; every client value ignored, no 400 | `server/tests/lab-04/actions-taken.api.test.ts` | |
| API-05 | API | AC-141; BR-90, L3 C-64 | Body carries `requesterId` and `createdById` | Both ignored; the action is created by the session user | `server/tests/lab-04/actions-taken.api.test.ts` | |
| API-06 | API | AC-29; BR-18 | Create with no `assigneeId` | The action's assignee is the caller | `server/tests/lab-04/actions-taken.api.test.ts` | |
| API-07 | API | AC-27; BR-18 | A Requester named as assignee, on create and on edit | Each 422 `ASSIGNEE_NOT_ELIGIBLE` at `fields.assigneeId`; nothing changes | `server/tests/lab-04/actions-taken.api.test.ts` | |
| API-08 | API | AC-28; BR-18, C-177 | An inactive IT Staff user and an unknown id as assignee, on create and on an edit that changes the assignee | Each 422 `ASSIGNEE_NOT_ELIGIBLE`; nothing changes | `server/tests/lab-04/actions-taken.api.test.ts` | |
| API-09 | API | AC-06; BR-04 | `description` whitespace-only and 2001 characters | 400 `VALIDATION_FAILED` with `fields.description` as `ui-spec.md` 3; nothing saved; 2000 accepted | `server/tests/lab-04/actions-taken.api.test.ts` | |
| API-10 | API | BR-04, BR-11 | `result` missing and 2001 characters on a completed create and on complete | 400 with `fields.result`; nothing saved; the action stays `PLANNED` | `server/tests/lab-04/actions-taken.api.test.ts` | |
| API-11 | API | AC-07; BR-05 | `followUpRequired` true with no `followUpNote`, and with 1001 characters | 400 with `fields.followUpNote`; nothing saved | `server/tests/lab-04/actions-taken.api.test.ts` | |
| API-12 | API | AC-08; BR-05 | `followUpNote` sent with `followUpRequired` false | 400 with `fields.followUpNote`; nothing saved | `server/tests/lab-04/actions-taken.api.test.ts` | |
| API-13 | API | AC-10; BR-06 | `attachmentNotes` 501 characters | 400 with `fields.attachmentNotes`; 500 accepted | `server/tests/lab-04/actions-taken.api.test.ts` | |
| API-14 | API | AC-11; BR-07 | `actionAt` 1 minute before the Ticket's `createdAt` | 400 with `fields.actionAt`, the "cannot be before the ticket was created" message | `server/tests/lab-04/actions-taken.api.test.ts` | |
| API-15 | API | AC-12; BR-07 | `COMPLETED` create with `actionAt` now + 10 min; `PLANNED` create with tomorrow | Completed: 400 at `actionAt`; planned: 201 | `server/tests/lab-04/actions-taken.api.test.ts` | |
| API-16 | API | AC-13; BR-07 | `actionAt` `2026-10-16T10:00` with no offset | 400 with `fields.actionAt` | `server/tests/lab-04/actions-taken.api.test.ts` | |
| API-17 | API | AC-17; BR-09 | `status` `CANCELLED`, and `status` absent | 400 with `fields.status`; nothing saved | `server/tests/lab-04/actions-taken.api.test.ts` | |
| API-18 | API | AC-39; BR-24 | Create on a Ticket in each of `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `REOPENED` | 201 on each of the five | `server/tests/lab-04/actions-taken.api.test.ts` | |
| API-19 | API | AC-18; BR-10, BR-37 | Edit description, `actionAt`, assignee and attachment notes with the current `version` | 200; the four new values stored; action `version` + 1; Ticket `version` unchanged | `server/tests/lab-04/actions-taken.api.test.ts` | |
| API-20 | API | AC-19; BR-11 | IT Staff C completes a planned action with a result | 200; `COMPLETED`, `performedById` C, `finishedAt` within 2 s of server now, result stored, `version` + 1 | `server/tests/lab-04/actions-taken.api.test.ts` | |
| API-21 | API | AC-131; BR-07, BR-11, C-168 | Complete sending `actionAt` now + 10 min | 400 at `actionAt`; the action stays `PLANNED` | `server/tests/lab-04/actions-taken.api.test.ts` | |
| API-22 | API | AC-132; C-168 | Complete without `actionAt` on an action whose stored `actionAt` is tomorrow; then complete sending a past `actionAt` | First 400 at `actionAt` with `Enter the time the work was done. It cannot be in the future.`; second 200 | `server/tests/lab-04/actions-taken.api.test.ts` | |
| API-23 | API | AC-20; BR-12 | Cancel with no `result` | 400 with `fields.result`; the action stays `PLANNED` | `server/tests/lab-04/actions-taken.api.test.ts` | |
| API-24 | API | AC-21; BR-12 | IT Staff C cancels with a reason | 200; `CANCELLED`, the reason in `result`, `performedById` C, `finishedAt` set | `server/tests/lab-04/actions-taken.api.test.ts` | |
| API-25 | API | AC-23; BR-14, C-162 | Edit, complete and cancel on a `COMPLETED` action and on a `CANCELLED` one, each with the current `version` | Each 409 `ACTION_NOT_PLANNED`; the action unchanged | `server/tests/lab-04/actions-taken.api.test.ts` | |
| API-26 | API | AC-26; BR-19 | IT Staff B, neither owner nor assignee, completes an action assigned to IT Staff A | 200 | `server/tests/lab-04/actions-taken.api.test.ts` | |
| API-27 | API | AC-30; BR-19, C-132 | Two planned actions whose assignee is deactivated afterwards; another staff user completes one and cancels the other | Both 200 | `server/tests/lab-04/actions-taken.api.test.ts` | |
| API-28 | API | AC-145; BR-18, C-177 | Edit changing only the description and re-sending the stored, since-deactivated `assigneeId` | 200; the description changes, the assignee is kept | `server/tests/lab-04/actions-taken.api.test.ts` | |
| API-29 | API | AC-144; BR-40, C-176 | Edit of a `COMPLETED` action naming an inactive assignee, current `version` | 409 `ACTION_NOT_PLANNED`, not 422 | `server/tests/lab-04/actions-taken.api.test.ts` | |
| API-30 | API | AC-121; BR-14, BR-40 | Edit of a `COMPLETED` action with a `version` older than its current one | 409 `STALE_UPDATE`, not `ACTION_NOT_PLANNED` | `server/tests/lab-04/actions-taken.api.test.ts` | |
| API-31 | API | AC-139; BR-90, C-175 | A known field the operation does not accept: `result` on an edit, `result` on a planned create, `assigneeId` on complete | Each 400 `VALIDATION_FAILED` with `fields.<name>` = `<name> is not accepted here.`; nothing changes | `server/tests/lab-04/actions-taken.api.test.ts` | |
| API-32 | API | AC-140; BR-90, C-175 | An undefined field (`priority`) on create and on edit | Each 400 naming `priority`; nothing created or changed | `server/tests/lab-04/actions-taken.api.test.ts` | |
| API-33 | API | AC-142; BR-90 | Edit carrying only `version` | 400 `VALIDATION_FAILED` | `server/tests/lab-04/actions-taken.api.test.ts` | |
| API-34 | API | AC-143; BR-90, C-175 | Edit re-sending every stored value unchanged | 200; action `version` and the Ticket's `lastActivityAt` unchanged | `server/tests/lab-04/actions-taken.api.test.ts` | |
| API-35 | API | AC-37; BR-24, C-122 | Create, edit, complete and cancel on a `RESOLVED` Ticket | Each 409 `TICKET_RESOLVED`; nothing changes | `server/tests/lab-04/actions-taken.api.test.ts` | |
| API-36 | API | AC-38; BR-24, L3 C-109 | The four writes on a `CLOSED` and on a `CANCELLED` Ticket | Each 409 `TICKET_CLOSED`; nothing changes | `server/tests/lab-04/actions-taken.api.test.ts` | |
| API-37 | API | AC-62; BR-41, C-159 | Create on a `RESOLVED` Ticket with an empty description | 409 `TICKET_RESOLVED`, not 400 | `server/tests/lab-04/actions-taken.api.test.ts` | |
| API-38 | API | AC-148; C-172, L3 C-113 | Staff PATCH, complete and cancel on a missing action id; create on a missing Ticket; `abc` as `:id` | 404 `ACTION_NOT_FOUND` x 3; 404 `TICKET_NOT_FOUND`; 400 `INVALID_QUERY_PARAM` | `server/tests/lab-04/actions-taken.api.test.ts` | |
| API-39 | API | AC-118; FR-08, C-136 | The body of each of the four writes | Exactly the `api-spec.md` 6.2 staff Ticket DTO key set, with the written action reflected in `actions` | `server/tests/lab-04/actions-taken.api.test.ts` | |
| API-40 | API | AC-35; BR-22 | Two actions with the same `actionAt`, Ticket loaded twice through each DTO | Same order both times, higher `id` first, on the staff and the Requester DTO | `server/tests/lab-04/actions-taken.api.test.ts` | |
| API-41 | API | AC-25; BR-16, BR-26 | Create and complete an action on an `IN_PROGRESS` Ticket | The Ticket is still `IN_PROGRESS`; its `version` unchanged | `server/tests/lab-04/actions-taken.api.test.ts` | |
| API-42 | API | AC-31; BR-20, C-123 | Requester reads their own Ticket with actions by three staff | Every action, every field; people as `{ name }` only; a recursive scan finds no `email` key and no `@` in any value; no `version` on an action | `server/tests/lab-04/actions-taken.api.test.ts` | |
| API-43 | API | AC-32; BR-20, L3 C-65 | Requester reads another Requester's Ticket that has actions | 404 `TICKET_NOT_FOUND`, byte-identical to a missing Ticket; no action data | `server/tests/lab-04/actions-taken.api.test.ts` | |
| API-44 | API | FR-09, C-174 | `allowedOperations` in the staff DTO | `["EDIT","COMPLETE","CANCEL"]` on a planned action of an `OPEN` Ticket; `[]` on finished actions and on a planned action of a `RESOLVED` Ticket | `server/tests/lab-04/actions-taken.api.test.ts` | |
| API-45 | API | AC-126; BR-43, C-165 | The same author replays a create with key K | 200 with the staff Ticket DTO, the same key set as the first 201; one row for K | `server/tests/lab-04/actions-taken.api.test.ts` | |
| API-46 | API | AC-64; BR-43, C-139 | Five concurrent creates by one author with the same K (P2002 path) | Exactly one row; every response 200 or 201 carrying that row; none 500 | `server/tests/lab-04/actions-taken.api.test.ts` | |
| API-47 | API | BR-43, C-166 | Replay of K after the Ticket has moved to `CLOSED` | 200 with the original action, not `TICKET_CLOSED`; no new row | `server/tests/lab-04/actions-taken.api.test.ts` | |
| API-48 | API | BR-42, `api-spec.md` 1.3 | `clientRequestId` `not-a-uuid` | 400 with `fields.clientRequestId`; nothing created | `server/tests/lab-04/actions-taken.api.test.ts` | |

### 2.3 API and integration - Dashboards

**Count equals drill-down (C-127, BR-56).** Each card test builds its own fixture rows,
including rows the card must **not** count, then in one test calls the dashboard and the
drill-down's API query and asserts the card's `count` equals the drill-down's `meta.total` (or
row count) and equals the fixture's expected number. One test per card: 4 Requester, 11 staff,
3 Administrator user cards.

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| API-49 | API | AC-78; BR-52, BR-57, C-143 | Requester dashboard shape | 200; `generatedAt` ISO, `timeZone` `Asia/Bangkok`; four cards in the `api-spec.md` 4.1 order with exact `key`, `label`, `drillDown`; `lists.recentlyUpdated.viewAll` set, `recentlyResolved.viewAll` null | `server/tests/lab-04/requester-dashboard.api.test.ts` | |
| API-50 | API | AC-81, AC-103; BR-55, BR-73 | Card `openTickets` = `GET /api/tickets?statusGroup=open` | Own Tickets in all eight statuses: count = the five open statuses, `RESOLVED` excluded; `meta.total` equal; the same ids | `server/tests/lab-04/requester-dashboard.api.test.ts` | |
| API-51 | API | AC-81, AC-104; BR-74 | Card `waitingForYou` = `?currentStatus=WAITING_FOR_REQUESTER` | Count only `WAITING_FOR_REQUESTER`; equals `meta.total` | `server/tests/lab-04/requester-dashboard.api.test.ts` | |
| API-52 | API | AC-81, AC-105; BR-75 | Card `resolvedAwaitingClosure` = `?currentStatus=RESOLVED` | Count only `RESOLVED`; equals `meta.total` | `server/tests/lab-04/requester-dashboard.api.test.ts` | |
| API-53 | API | AC-81, AC-106; BR-76 | Card `closed` = `?currentStatus=CLOSED` | Count only `CLOSED`; equals `meta.total` | `server/tests/lab-04/requester-dashboard.api.test.ts` | |
| API-54 | API | AC-82, AC-107; BR-77, C-161 | `recentlyUpdated` with seven own recent Tickets, one own Ticket active 8 days ago and another Requester's recent Ticket | Five items, all own, all within 7 days, in `lastActivityAt desc, id desc`, equal to the first five rows of `GET /api/tickets?sort=lastActivityAt:desc` | `server/tests/lab-04/requester-dashboard.api.test.ts` | |
| API-55 | API | AC-108, AC-138; BR-78, C-126 | `recentlyResolved` with own Tickets resolved at different times (one since closed) and a legacy Closed Ticket with NULL `resolvedAt` | Resolved and closed-after-resolve both listed, `resolvedAt desc, id desc`; the NULL one never | `server/tests/lab-04/requester-dashboard.api.test.ts` | |
| API-56 | API | AC-79; BR-53 | Both Requester lists with `now` injected and rows at exactly `now - 168 h` and 1 ms earlier | The boundary row included, the earlier one excluded, in each list | `server/tests/lab-04/requester-dashboard.api.test.ts` | |
| API-57 | API | AC-83; BR-57 | nattapong.w, who has zero Tickets | Four cards present, each `count` 0; both lists `items: []` | `server/tests/lab-04/requester-dashboard.api.test.ts` | |
| API-58 | API | AC-134; BR-88, C-170 | `GET /api/tickets?statusGroup=open&currentStatus=NEW`, and `statusGroup=closed` | Each 400 `INVALID_QUERY_PARAM` with `fields.statusGroup` | `server/tests/lab-04/requester-dashboard.api.test.ts` | |
| API-59 | API | AC-72; FR-17, BR-48 | My Tickets `sort=lastActivityAt:desc` and the row shape | Rows in `lastActivityAt desc, id desc`; each row carries `lastActivityAt` | `server/tests/lab-04/requester-dashboard.api.test.ts` | |
| API-60 | API | AC-78; BR-52, C-143 | Staff dashboard shape | 200; `generatedAt`, `timeZone`; eleven cards in `api-spec.md` 4.2 order with exact keys, labels and drill-downs; lists `myPlannedActions`, `recentlyUpdated`, `urgent` | `server/tests/lab-04/staff-dashboard.api.test.ts` | |
| API-61 | API | AC-81, AC-109; BR-54, BR-79 | Card `unassigned` = `GET /api/staff/tickets?owner=unassigned` | An unowned `OPEN` counted, an unowned `CLOSED` not; equals `meta.total` | `server/tests/lab-04/staff-dashboard.api.test.ts` | |
| API-62 | API | AC-81, AC-110; BR-80 | Card `mine` = `?owner=me` | Only the caller's active Tickets; another user's and the caller's `CLOSED` excluded; equals `meta.total` | `server/tests/lab-04/staff-dashboard.api.test.ts` | |
| API-63 | API | AC-81, AC-111; BR-81 | Card `statusNew` = `?currentStatus=NEW` | Only `NEW`; equals `meta.total` | `server/tests/lab-04/staff-dashboard.api.test.ts` | |
| API-64 | API | AC-81, AC-111; BR-81 | Card `statusOpen` = `?currentStatus=OPEN` | Only `OPEN`; equals `meta.total` | `server/tests/lab-04/staff-dashboard.api.test.ts` | |
| API-65 | API | AC-81, AC-111; BR-81 | Card `statusInProgress` = `?currentStatus=IN_PROGRESS` | Only `IN_PROGRESS`; equals `meta.total` | `server/tests/lab-04/staff-dashboard.api.test.ts` | |
| API-66 | API | AC-81, AC-111; BR-81 | Card `statusWaitingForRequester` = `?currentStatus=WAITING_FOR_REQUESTER` | Only that status; equals `meta.total` | `server/tests/lab-04/staff-dashboard.api.test.ts` | |
| API-67 | API | AC-81, AC-111; BR-81 | Card `statusReopened` = `?currentStatus=REOPENED` | Only `REOPENED`; equals `meta.total` | `server/tests/lab-04/staff-dashboard.api.test.ts` | |
| API-68 | API | AC-81, AC-111; BR-81 | Card `statusResolved` = `?currentStatus=RESOLVED` | Only `RESOLVED`; equals `meta.total` | `server/tests/lab-04/staff-dashboard.api.test.ts` | |
| API-69 | API | AC-81, AC-112; BR-82 | Card `highItPriority` = `?itPriority=HIGH` | Active High counted, a `CLOSED` High not; equals `meta.total` | `server/tests/lab-04/staff-dashboard.api.test.ts` | |
| API-70 | API | AC-81, AC-113; BR-83 | Card `requesterSaysResolved` = `?requesterResolved=true` | A flagged active Ticket counted and listed; an unflagged one not; equals `meta.total` | `server/tests/lab-04/staff-dashboard.api.test.ts` | |
| API-71 | API | AC-81, AC-114; BR-84 | Card `myPlannedActions` = the panel's row count | The caller's `PLANNED` actions on active Tickets counted; another assignee's, a `COMPLETED` one and one on a `CLOSED` Ticket excluded; card = `lists.myPlannedActions.items.length` | `server/tests/lab-04/staff-dashboard.api.test.ts` | |
| API-72 | API | AC-81; BR-87 | Administrator card `requesters` = `GET /api/users?role=REQUESTER` | `count` = that list's length, inactive included; `activeCount` = the active ones | `server/tests/lab-04/staff-dashboard.api.test.ts` | |
| API-73 | API | AC-81, AC-117; BR-87 | Administrator card `itStaff` = `GET /api/users?role=IT_STAFF` | As API-72, with active and inactive IT Staff | `server/tests/lab-04/staff-dashboard.api.test.ts` | |
| API-74 | API | AC-81; BR-87 | Administrator card `administrators` = `GET /api/users?role=ADMINISTRATOR` | As API-72 | `server/tests/lab-04/staff-dashboard.api.test.ts` | |
| API-75 | API | AC-133; BR-84, C-169 | Seven `PLANNED` actions assigned to the caller | All seven in the panel, `actionAt asc, id asc`, no cap; card 7 | `server/tests/lab-04/staff-dashboard.api.test.ts` | |
| API-76 | API | AC-82, AC-115; BR-85, C-161 | `recentlyUpdated` with seven recent active Tickets and a `CLOSED` one updated today | Five items, the `CLOSED` one absent, equal to the first five rows of `GET /api/staff/tickets?sort=lastActivityAt:desc` | `server/tests/lab-04/staff-dashboard.api.test.ts` | |
| API-77 | API | AC-116, AC-137; BR-86, C-161, L2 C-29 | `urgent` with seven active High Tickets (two sharing `createdAt`), Medium ones and a `CLOSED` High | Five High items, `createdAt asc, id desc`, equal to the first five rows of `?itPriority=HIGH` | `server/tests/lab-04/staff-dashboard.api.test.ts` | |
| API-78 | API | AC-79; BR-53 | Staff `recentlyUpdated` with `now` injected and rows at `now - 168 h` and 1 ms earlier | The boundary row included, the earlier one excluded | `server/tests/lab-04/staff-dashboard.api.test.ts` | |
| API-79 | API | AC-83; BR-57 | The Administrator who owns nothing | `mine` 0 and `myPlannedActions` 0, both present; panel `items: []` | `server/tests/lab-04/staff-dashboard.api.test.ts` | |
| API-80 | API | AC-73; BR-48, FR-16 | Queue `sort=lastActivityAt:desc`, and `sort=updatedAt:desc` | First in `lastActivityAt desc, id desc` with `lastActivityAt` on each row; second still 200 | `server/tests/lab-04/staff-dashboard.api.test.ts` | |
| API-81 | API | FR-16, C-143 | Queue `requesterResolved=true`, `=false`, `=yes` | `true` filters to flagged rows within the default status set; the other two 400 `INVALID_QUERY_PARAM` | `server/tests/lab-04/staff-dashboard.api.test.ts` | |

### 2.4 Authorization

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| SEC-01 | Authorization | AC-03; BR-17, BR-40, L3 C-65 | Requester `POST /api/tickets/:id/actions` on their own Ticket and on a missing id | Both 403 `FORBIDDEN_ROLE`, byte-identical; no action created; no action content in either body | `server/tests/lab-04/actions-taken.api.test.ts` | |
| SEC-02 | Authorization | AC-148; BR-17 | Requester `PATCH /api/actions/:id` on an existing and a missing action | Both 403, byte-identical; the action unchanged | `server/tests/lab-04/actions-taken.api.test.ts` | |
| SEC-03 | Authorization | BR-17 | Requester `POST /api/actions/:id/complete`, existing and missing | Both 403, byte-identical; the action still `PLANNED`; no action content | `server/tests/lab-04/actions-taken.api.test.ts` | |
| SEC-04 | Authorization | BR-17 | Requester `POST /api/actions/:id/cancel`, existing and missing | Both 403, byte-identical; the action still `PLANNED`; no action content | `server/tests/lab-04/actions-taken.api.test.ts` | |
| SEC-05 | Authorization | AC-86; BR-60, C-180 | Requester `GET /api/dashboard/staff` | 403 `FORBIDDEN_ROLE`; the body is exactly `{ error: { code, message } }` - no `cards`, `lists`, `userCounts` or any count. Saved as Part 5 terminal evidence | `server/tests/lab-04/staff-dashboard.api.test.ts` | |
| SEC-06 | Authorization | AC-85; BR-59 | IT Staff and Administrator `GET /api/dashboard/requester` | Each 403 `FORBIDDEN_ROLE`, no metric content | `server/tests/lab-04/requester-dashboard.api.test.ts` | |
| SEC-07 | Authorization | AC-87; BR-60, FR-19 | IT Staff and Administrator `GET /api/dashboard/staff` | Only the Administrator's body has `userCounts`; on IT Staff's the key is absent, not null | `server/tests/lab-04/staff-dashboard.api.test.ts` | |
| SEC-08 | Authorization | AC-02, AC-107; BR-59, L3 C-64 | Requester A's dashboard with Requester B holding Tickets in every status, recent and resolved | A's counts equal A's own fixture; no B Ticket id or number anywhere in A's body; `?requesterId=<B>` changes nothing; adding Tickets to B leaves A's response identical | `server/tests/lab-04/requester-dashboard.api.test.ts` | |
| SEC-09 | Authorization | AC-101; BR-71, FR-31, C-155 | Route inventory versus `specification.md` 5.2 | Every method and path registered on the Express app appears in the matrix table and every matrix row is registered: 36 rows, none missing either way. Lands in Issue #68 (C-184). | `server/tests/lab-04/authorization.api.test.ts` | |
| SEC-10 | Authorization | AC-101; BR-71, L3 C-61 | Each matrix row's Anon, MustChange and bold-403 cells, driven from the same table | Non-public routes: 401 anonymous, 403 `PASSWORD_CHANGE_REQUIRED` for MustChange; every bold 403 answered with a missing id, so before any load | `server/tests/lab-04/authorization.api.test.ts` | |
| SEC-11 | Authorization | AC-24; BR-15, BR-50, C-151 | Registered routes against the append-only records | No `PUT`, `PATCH` or `DELETE` addresses a Public Comment, Internal Note or status-history row; no `DELETE` on `/api/actions/:id`; the only action edit refuses finished actions (API-25) | `server/tests/lab-04/authorization.api.test.ts` | |
| SEC-12 | Authorization | `CLAUDE.md` security rules, L3 BR-88 | Every Lab 4 response, success and error, across the six new routes | No body carries `password`, `passwordHash`, a `scrypt$` string or the session token | `server/tests/lab-04/authorization.api.test.ts` | |
| SEC-13 | Authorization | AC-02; C-123, `api-spec.md` 4.1 | Requester dashboard list items | Items carry only the `api-spec.md` 4.1 keys: no requester, owner, email, description or note key | `server/tests/lab-04/requester-dashboard.api.test.ts` | |
| SEC-14 | Authorization | L3 C-58 | The four action writes with a foreign `Origin` | Each 403 `ORIGIN_NOT_ALLOWED`; nothing written | `server/tests/lab-04/actions-taken.api.test.ts` | |

### 2.5 Workflow

All in `server/tests/lab-04/ticket-workflow.api.test.ts`. Gate tests use owned Tickets unless
the row says otherwise; each refusal also asserts the Ticket's status and `version` unchanged.

**Resolution gate and cancel rule**

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| WF-01 | Workflow | AC-43; BR-28, C-137 | Unowned `OPEN` Ticket with no completed action -> `RESOLVED` | 409 `OWNER_REQUIRED`, not the gate code; no `reasons` key | `server/tests/lab-04/ticket-workflow.api.test.ts` | |
| WF-02 | Workflow | AC-44; BR-29, BR-32 | Reason alone: no actions at all | 409 `RESOLUTION_GATE_NOT_MET`, `reasons` exactly `["NO_COMPLETED_ACTION"]` | `server/tests/lab-04/ticket-workflow.api.test.ts` | |
| WF-03 | Workflow | AC-45; BR-29 | Reason alone: a completed action without follow-up, plus a `PLANNED` one | `reasons` exactly `["PLANNED_ACTIONS_OPEN"]` | `server/tests/lab-04/ticket-workflow.api.test.ts` | |
| WF-04 | Workflow | AC-46; BR-29 | Reason alone: the latest completed action has follow-up required | `reasons` exactly `["FOLLOW_UP_REQUIRED"]` | `server/tests/lab-04/ticket-workflow.api.test.ts` | |
| WF-05 | Workflow | AC-48; BR-31 | Reason alone: resolved, reopened, no action finished since; then one completed | First `reasons` exactly `["NO_ACTION_SINCE_REOPEN"]`; after a new completed action, 200 | `server/tests/lab-04/ticket-workflow.api.test.ts` | |
| WF-06 | Workflow | AC-130; BR-29, C-167 | Two combined: no completed action and a `PLANNED` one | `reasons` exactly `["NO_COMPLETED_ACTION", "PLANNED_ACTIONS_OPEN"]` | `server/tests/lab-04/ticket-workflow.api.test.ts` | |
| WF-07 | Workflow | BR-29, C-167 | The fixed order with three reasons, both possible triples (Prisma fixtures: a reopened legacy Ticket with only a planned action; a reopened Ticket whose latest completed action, finished before the reopen, has follow-up, plus a planned one) | `["NO_COMPLETED_ACTION","PLANNED_ACTIONS_OPEN","NO_ACTION_SINCE_REOPEN"]` and `["PLANNED_ACTIONS_OPEN","FOLLOW_UP_REQUIRED","NO_ACTION_SINCE_REOPEN"]`; all four can never co-occur (UNIT-05) | `server/tests/lab-04/ticket-workflow.api.test.ts` | |
| WF-08 | Workflow | AC-47; BR-30, C-160 | A follow-up action finished first, then a no-follow-up action finished later with an earlier `actionAt` | `FOLLOW_UP_REQUIRED` not a reason; 200 | `server/tests/lab-04/ticket-workflow.api.test.ts` | |
| WF-09 | Workflow | BR-31, C-137 | Reopened Ticket whose only post-reopen action is `CANCELLED` (it has a `finishedAt`) | Gate still refuses with `NO_ACTION_SINCE_REOPEN`: a cancelled action does not count (C-186) | `server/tests/lab-04/ticket-workflow.api.test.ts` | |
| WF-10 | Workflow | AC-49; BR-29, BR-49, L3 BR-61 | Owned Ticket meeting the gate -> `RESOLVED` | 200; `RESOLVED`; `resolvedAt` set; Requester flag cleared; one history row; `version` + 1 | `server/tests/lab-04/ticket-workflow.api.test.ts` | |
| WF-11 | Workflow | AC-135; BR-27, C-171 | Staff DTO of a Ticket failing the gate | `resolutionGate.met` false, `reasons` equal to the refusal's; `allowedTransitions` still lists `RESOLVED` | `server/tests/lab-04/ticket-workflow.api.test.ts` | |
| WF-12 | Workflow | AC-50; BR-32 | Legacy `RESOLVED` Ticket with no actions (Prisma fixture) -> `CLOSED` | 200: never re-validated | `server/tests/lab-04/ticket-workflow.api.test.ts` | |
| WF-13 | Workflow | AC-51; BR-33, C-124 | `-> CANCELLED` with a `PLANNED` action; then after that action is cancelled | First 409 `PLANNED_ACTIONS_OPEN`, nothing changes; then 200 | `server/tests/lab-04/ticket-workflow.api.test.ts` | |
| WF-14 | Workflow | AC-42; BR-27 | `allowedTransitions` over HTTP for a Ticket in each of the eight statuses | Equals that status's section 5.1 `Y` targets; `[]` on `CLOSED`, `CANCELLED` | `server/tests/lab-04/ticket-workflow.api.test.ts` | |

**The status route's seven-step order (BR-89, C-164)** - one test per step. Each request also
violates every later step, so the test proves the step wins.

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| WF-15 | Workflow | AC-125; BR-89 step 1 | Target `DONE`, and target absent, on a `CLOSED` Ticket with no `version` | 400 `VALIDATION_FAILED` naming `currentStatus`, not `version` | `server/tests/lab-04/ticket-workflow.api.test.ts` | |
| WF-16 | Workflow | AC-124; BR-89 step 2, L3 C-77 | Target equal to the current status, stale `version`, on `OPEN`, `CLOSED` and `CANCELLED` | 400 `SAME_STATUS` each | `server/tests/lab-04/ticket-workflow.api.test.ts` | |
| WF-17 | Workflow | AC-123; BR-89 step 3 | `CLOSED` and `CANCELLED` -> `OPEN`, `version` missing and stale | 409 `INVALID_STATUS_TRANSITION`, not 400 and not `STALE_UPDATE` | `server/tests/lab-04/ticket-workflow.api.test.ts` | |
| WF-18 | Workflow | AC-53; BR-89 step 4 | Non-terminal Ticket, permitted target, `version` missing, `"3"` and `1.5` | 400 `VALIDATION_FAILED` with `fields.version` | `server/tests/lab-04/ticket-workflow.api.test.ts` | |
| WF-19 | Workflow | AC-61; BR-89 step 5 | Non-terminal, stale `version`, a target the matrix forbids | 409 `STALE_UPDATE`, not `INVALID_STATUS_TRANSITION` | `server/tests/lab-04/ticket-workflow.api.test.ts` | |
| WF-20 | Workflow | BR-89 step 6 | Current `version`, a forbidden target on an unowned Ticket failing the gate | 409 `INVALID_STATUS_TRANSITION` | `server/tests/lab-04/ticket-workflow.api.test.ts` | |
| WF-21 | Workflow | AC-43, AC-51; BR-89 step 7 | Current `version`: unowned -> `RESOLVED` failing the gate; owned -> `RESOLVED` failing it; -> `CANCELLED` with a planned action | `OWNER_REQUIRED`, then `RESOLUTION_GATE_NOT_MET`, then `PLANNED_ACTIONS_OPEN` | `server/tests/lab-04/ticket-workflow.api.test.ts` | |

**Stale updates (C-138)**

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| WF-22 | Workflow | AC-53; BR-36 | Owner PATCH without `version` | 400 `fields.version`; owner unchanged | `server/tests/lab-04/ticket-workflow.api.test.ts` | |
| WF-23 | Workflow | AC-53; BR-36 | IT Priority PATCH without `version` | 400 `fields.version`; priority unchanged | `server/tests/lab-04/ticket-workflow.api.test.ts` | |
| WF-24 | Workflow | AC-54; BR-36 | Status PATCH with the `version` read before another user's change | 409 `STALE_UPDATE`; nothing changes | `server/tests/lab-04/ticket-workflow.api.test.ts` | |
| WF-25 | Workflow | AC-54; BR-36 | Owner PATCH with an old `version` | 409 `STALE_UPDATE`; nothing changes | `server/tests/lab-04/ticket-workflow.api.test.ts` | |
| WF-26 | Workflow | AC-54; BR-36 | IT Priority PATCH with an old `version` | 409 `STALE_UPDATE`; nothing changes | `server/tests/lab-04/ticket-workflow.api.test.ts` | |
| WF-27 | Workflow | AC-55; BR-35, BR-36 | Edit, complete and cancel with an action `version` older than another user's edit | Each 409 `STALE_UPDATE`; the action unchanged | `server/tests/lab-04/ticket-workflow.api.test.ts` | |
| WF-28 | Workflow | AC-59; BR-39, C-173 | The `STALE_UPDATE` body | Exactly `{ error: { code, message } }`: no `fields`, no `reasons` | `server/tests/lab-04/ticket-workflow.api.test.ts` | |
| WF-29 | Workflow | BR-34, BR-36, C-138 | **Race on status**: two agents read `version` v, then send `OPEN -> IN_PROGRESS` and `OPEN -> WAITING_FOR_REQUESTER` concurrently | Exactly one 200, the other 409 `STALE_UPDATE` (never `INVALID_STATUS_TRANSITION`); `version` v + 1; one new history row | `server/tests/lab-04/ticket-workflow.api.test.ts` | |
| WF-30 | Workflow | BR-36 | **Race on owner**: two concurrent owner PATCHes with v, to different users | One 200, one `STALE_UPDATE`; the owner is the winner's choice; `version` v + 1 | `server/tests/lab-04/ticket-workflow.api.test.ts` | |
| WF-31 | Workflow | AC-55; BR-36 | **Race on an action edit**: two concurrent edits with action `version` v | One 200, one `STALE_UPDATE`; the description is the winner's; action `version` v + 1 | `server/tests/lab-04/ticket-workflow.api.test.ts` | |
| WF-32 | Workflow | AC-52; BR-34 | Planned-action create and `-> RESOLVED` sent concurrently on a gate-met Ticket, 20 runs | No run ends `RESOLVED` with a `PLANNED` action; each run is "resolved, then create 409 `TICKET_RESOLVED`" or "created, then gate 409" | `server/tests/lab-04/ticket-workflow.api.test.ts` | |
| WF-33 | Workflow | BR-40 | Action edit with a 2001-character description and a stale `version` | 400 `VALIDATION_FAILED`: body before stale | `server/tests/lab-04/ticket-workflow.api.test.ts` | |
| WF-34 | Workflow | BR-40, `api-spec.md` 5.11 | Owner PATCH order: `CLOSED` + no `version`; then stale `version` + a Requester as owner | First 409 `TICKET_CLOSED` (not 400); second 409 `STALE_UPDATE` (not 422) | `server/tests/lab-04/ticket-workflow.api.test.ts` | |

**Activity time and version per write path (BR-46, BR-37)** - one test per path. Each reads
`lastActivityAt` and `version` before, performs the write, and asserts both after.

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| WF-35 | Workflow | AC-70; BR-46 | Ticket create | `lastActivityAt` = create time within 2 s; `version` 0 | `server/tests/lab-04/ticket-workflow.api.test.ts` | |
| WF-36 | Workflow | AC-70, AC-57 | Status change | `lastActivityAt` advances; `version` + 1 | `server/tests/lab-04/ticket-workflow.api.test.ts` | |
| WF-37 | Workflow | AC-70, AC-57 | Owner change | Advances; `version` + 1 | `server/tests/lab-04/ticket-workflow.api.test.ts` | |
| WF-38 | Workflow | AC-70, AC-57 | IT Priority change to a new value | Advances; `version` + 1. Re-sending the current value: 200, `version` and `lastActivityAt` unchanged (C-187) | `server/tests/lab-04/ticket-workflow.api.test.ts` | |
| WF-39 | Workflow | AC-70, AC-58; BR-38 | Claim with no body | 200; advances; `version` + 1 | `server/tests/lab-04/ticket-workflow.api.test.ts` | |
| WF-40 | Workflow | AC-70, AC-56 | Action create | Advances; Ticket `version` unchanged | `server/tests/lab-04/ticket-workflow.api.test.ts` | |
| WF-41 | Workflow | AC-70, AC-56 | Action edit | Advances; Ticket `version` unchanged | `server/tests/lab-04/ticket-workflow.api.test.ts` | |
| WF-42 | Workflow | AC-70, AC-56 | Action complete | Advances; Ticket `version` unchanged | `server/tests/lab-04/ticket-workflow.api.test.ts` | |
| WF-43 | Workflow | AC-70, AC-56 | Action cancel | Advances; Ticket `version` unchanged | `server/tests/lab-04/ticket-workflow.api.test.ts` | |
| WF-44 | Workflow | AC-70, AC-56 | Public Comment (`comments-notes.ts:71`) | Advances; `version` unchanged | `server/tests/lab-04/ticket-workflow.api.test.ts` | |
| WF-45 | Workflow | AC-70, AC-56 | Attachment upload (`tickets.ts:218`) | Advances; `version` unchanged | `server/tests/lab-04/ticket-workflow.api.test.ts` | |
| WF-46 | Workflow | AC-70, AC-56 | Attachment soft removal (`attachments.ts:142`) | Advances; `version` unchanged | `server/tests/lab-04/ticket-workflow.api.test.ts` | |
| WF-47 | Workflow | AC-70, AC-57, AC-122; BR-38 | Requester's "Problem Appears Resolved", no `version` sent | 200; advances; `version` + 1 | `server/tests/lab-04/ticket-workflow.api.test.ts` | |
| WF-48 | Workflow | AC-71, AC-56; BR-47 | **Internal Note** | `lastActivityAt` and `version` both unchanged; the Requester's My Tickets row shows the same `lastActivityAt` as before | `server/tests/lab-04/ticket-workflow.api.test.ts` | |
| WF-49 | Workflow | AC-146; BR-38, C-178 | The flag set a second time | 200; `requesterResolvedAt` overwritten; `version` and `lastActivityAt` move again | `server/tests/lab-04/ticket-workflow.api.test.ts` | |

**Resolution time and status history**

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| WF-50 | Workflow | AC-74; BR-49 | `RESOLVED -> CLOSED` | `resolvedAt` kept, unchanged | `server/tests/lab-04/ticket-workflow.api.test.ts` | |
| WF-51 | Workflow | AC-75; BR-49 | `RESOLVED -> REOPENED` | `resolvedAt` NULL | `server/tests/lab-04/ticket-workflow.api.test.ts` | |
| WF-52 | Workflow | AC-129, AC-147; BR-50, BR-51, C-167, C-179 | A Requester creates a Ticket | One history row, `fromStatus` null -> `NEW`; `historyComplete` true on both DTOs | `server/tests/lab-04/ticket-workflow.api.test.ts` | |
| WF-53 | Workflow | AC-77; BR-51, C-179 | A legacy Ticket: inserted through Prisma with no history row, as every pre-migration row is | `historyComplete` false and `statusHistory` `[]` on both DTOs; no date anywhere | `server/tests/lab-04/ticket-workflow.api.test.ts` | |
| WF-54 | Workflow | AC-36; BR-23, BR-50 | Three moves | Both DTOs list the creation row and the three changes, `changedAt, id` ascending; Requester rows carry `changedBy: { name }` only | `server/tests/lab-04/ticket-workflow.api.test.ts` | |
| WF-55 | Workflow | AC-76; BR-50 | A status change whose transaction fails: a temporary trigger raising on `INSERT INTO "TicketStatusChange"`, dropped in `finally` | 500 `INTERNAL_ERROR` with no stack or SQL; status, `version`, `lastActivityAt` and history unchanged | `server/tests/lab-04/ticket-workflow.api.test.ts` | |

**Duplicate submission on Public Comments and Internal Notes (C-139, C-158)**

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| WF-56 | Workflow | AC-63; BR-42, BR-43 | Public Comment posted twice by one author with key K | Second 200 with the original comment; one row | `server/tests/lab-04/ticket-workflow.api.test.ts` | |
| WF-57 | Workflow | AC-128; BR-43, C-166 | Internal Note replayed with K and a different body | 200 with the original note; no new row; body not compared | `server/tests/lab-04/ticket-workflow.api.test.ts` | |
| WF-58 | Workflow | BR-43, C-139 | Five concurrent Public Comments with one K (P2002 path) | One row; every response 200 or 201 with it; none 500 | `server/tests/lab-04/ticket-workflow.api.test.ts` | |
| WF-59 | Workflow | BR-43, C-139 | Five concurrent Internal Notes with one K (P2002 path) | One row; none 500 | `server/tests/lab-04/ticket-workflow.api.test.ts` | |
| WF-60 | Workflow | AC-127; BR-40, BR-43 | Public Comment replayed after the Ticket moved to `CLOSED` | 200 with the original, not `TICKET_CLOSED` | `server/tests/lab-04/ticket-workflow.api.test.ts` | |
| WF-61 | Workflow | BR-43, C-166 | Internal Note replayed after the Ticket moved to `CLOSED` | 200 with the original, not `TICKET_CLOSED` | `server/tests/lab-04/ticket-workflow.api.test.ts` | |
| WF-62 | Workflow | AC-65; BR-42 | Two identical Internal Notes with no `clientRequestId` | Two rows | `server/tests/lab-04/ticket-workflow.api.test.ts` | |
| WF-63 | Workflow | AC-66; BR-42 | Two staff authors use the same K on notes; the Requester and a staff user use it on comments | Each author gets their own row | `server/tests/lab-04/ticket-workflow.api.test.ts` | |
| WF-64 | Workflow | C-158 (D-13 cut from Ticket create) | `POST /api/tickets` twice by one Requester with the same `clientRequestId` | 201 both times; two Tickets: the field is ignored, the Lab 2 contract unchanged | `server/tests/lab-04/ticket-workflow.api.test.ts` | |

### 2.6 Migration and regression

MIG-01 to MIG-08 and MIG-14 to MIG-21 are assertions in `migration.db.test.ts`. MIG-01 to
MIG-08 read the schema of `toktickit_test`. MIG-14 to MIG-21 are claims about a fresh seed
(AC-99), and `toktickit_test` is not one: it persists between runs, its seed Tickets predate the
Lab 4 migration (so, as legacy rows, they carry no history and a NULL `resolvedAt`, C-188), and
tests add rows to it. Those eight run against `toktickit_test_fresh_seed`, which the file
creates, migrates with `migrate deploy`, seeds and drops (Issue #63). **MIG-09 to MIG-13 and
MIG-22 are artifact rows**: no test database holds pre-migration data, so none can show counts
unchanged, a backfill or a restore. Those rows are discharged by captures under `artifacts/lab-04/evidence/issue-2/`
(rehearsal) and `artifacts/lab-04/evidence/issue-10/` (final runs), as L3 MIG-21 to MIG-23 were.
The automated zero-drift check is **L3 MIG-14**, carried unchanged: it compares the whole schema
with the migrations, Lab 4's included.

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| MIG-01 | Migration | C-145, L3 C-70 | `ActionStatus` | Exactly `PLANNED`, `COMPLETED`, `CANCELLED`, created in its own migration folder, ordered before the table migration | `server/tests/lab-04/migration.db.test.ts` | |
| MIG-02 | Migration | `specification.md` 7.2, BR-01 | `ActionTaken` columns | Every 7.2 column with its type and nullability; `ticketId` NOT NULL FK to `Ticket`; assignee, creator and performer FKs to `User` | `server/tests/lab-04/migration.db.test.ts` | |
| MIG-03 | Migration | `specification.md` 7.3, C-167 | `TicketStatusChange` columns | `fromStatus` nullable, `toStatus` NOT NULL, `changedById` FK; no `updatedAt` column | `server/tests/lab-04/migration.db.test.ts` | |
| MIG-04 | Migration | `specification.md` 7.4, BR-35 | New Ticket columns | `version` INT NOT NULL DEFAULT 0; `lastActivityAt` NOT NULL DEFAULT `now()`; `resolvedAt` nullable | `server/tests/lab-04/migration.db.test.ts` | |
| MIG-05 | Migration | BR-42, C-145 | The four `clientRequestId` composite uniques | Present on `Ticket(requesterId, …)`, `PublicComment(authorId, …)`, `InternalNote(authorId, …)`, `ActionTaken(createdById, …)`; two NULL keys by one author both insert | `server/tests/lab-04/migration.db.test.ts` | |
| MIG-06 | Migration | `specification.md` 7.5, C-145 | The five named indexes | Each exists with its column order | `server/tests/lab-04/migration.db.test.ts` | |
| MIG-07 | Migration | BR-67, C-145 | Every Lab 4 `migration.sql` | No `DROP TABLE`, `DROP COLUMN`, `DROP TYPE`, column type change or `CHECK` constraint | `server/tests/lab-04/migration.db.test.ts` | |
| MIG-08 | Migration | C-145 | A direct `prisma.ticket.create` naming no Lab 4 field | Succeeds with `version` 0, `lastActivityAt` set, `resolvedAt` null | `server/tests/lab-04/migration.db.test.ts` | |
| MIG-09 | Migration (artifact) | AC-96; BR-67, C-129 | Rehearsal on `toktickit_rehearsal`, restored from `lab3-final.dump`: row counts per table and Tickets per Requester email, before and after `migrate deploy` | Every figure identical | Artifact: `artifacts/lab-04/evidence/issue-2/` (rehearsal before and after) | |
| MIG-10 | Migration (artifact) | AC-96; `specification.md` 7.7 | The rehearsal backfill | Every `lastActivityAt` non-NULL, `>= updatedAt`, and equal to the greatest of `updatedAt`, latest comment, latest upload and removal; every `version` 0 | Artifact: `artifacts/lab-04/evidence/issue-2/` (backfill query output) | |
| MIG-11 | Migration (artifact) | BR-49, C-126 | Legacy rows after the rehearsal | Every `resolvedAt` NULL; zero `ActionTaken` and zero `TicketStatusChange` rows | Artifact: `artifacts/lab-04/evidence/issue-2/` | |
| MIG-12 | Migration (artifact) | AC-96 | Drift after deploy, on `toktickit_rehearsal` and then on the dev database | `npx prisma migrate diff ... --exit-code` exits 0 both times | Artifact: `artifacts/lab-04/evidence/issue-2/` | |
| MIG-13 | Migration (artifact) | AC-97; BR-68, C-129 | Restore test: the pre-migration dump restored into a fresh database | Its row counts equal the source's | Artifact: `artifacts/lab-04/evidence/issue-2/` | |
| MIG-14 | Migration | AC-98; BR-69, L3 C-72 | The seed run a second time | No `ActionTaken`, `TicketStatusChange`, Ticket, comment or note row duplicated; actions keyed by (Ticket, description); a changed password survives | `server/tests/lab-04/migration.db.test.ts` | |
| MIG-15 | Migration | AC-99; BR-02, C-146 | Seed composition: action counts | Tickets with zero, one and several actions; one Ticket with actions created or performed by three different staff users | `server/tests/lab-04/migration.db.test.ts` | |
| MIG-16 | Migration | C-146 | Seed composition: action states | At least one `PLANNED`, `COMPLETED`, `CANCELLED` and follow-up-required action | `server/tests/lab-04/migration.db.test.ts` | |
| MIG-17 | Migration | AC-99; C-146 | Seed composition: the gate | One open Ticket whose `resolutionGate.met` is true and one whose is false | `server/tests/lab-04/migration.db.test.ts` | |
| MIG-18 | Migration | C-146, BR-32 | Seeded `RESOLVED` and `CLOSED` Tickets | Each has `resolvedAt` set and completed actions that satisfy the gate | `server/tests/lab-04/migration.db.test.ts` | |
| MIG-19 | Migration | AC-99; C-146 | The zero-metric accounts | nattapong.w owns zero Tickets; the Administrator who owns nothing owns zero Tickets and is assignee of zero planned actions | `server/tests/lab-04/migration.db.test.ts` | |
| MIG-20 | Migration | C-146, 1.1 report 2.17 | Run-relative activity times | On a fresh seed, staff `recentlyUpdated`, a seeded Requester's `recentlyUpdated` and `recentlyResolved` are non-empty | `server/tests/lab-04/migration.db.test.ts` | |
| MIG-21 | Migration | BR-04 to BR-07, C-146 | Seeded actions obey their own rules | `actionAt >= ` Ticket `createdAt`; completed `actionAt <= now + 5 min`; `followUpNote` iff `followUpRequired`; text bounds | `server/tests/lab-04/migration.db.test.ts` | |
| MIG-22 | Regression (artifact) | AC-100; BR-70, C-157 | The final server, client and e2e runs on `lab4-staging` | Every Lab 1-3 test passes; the counts equal section 4.4 | Artifact: `artifacts/lab-04/evidence/issue-10/` and section 6 | |

### 2.7 Performance-smoke

`npm run test:perf` runs the script against `toktickit_perf` only - it refuses to start when
`DATABASE_URL` names any other database. Ten warm-up requests, then 50 timed requests per
endpoint; p95 by nearest rank. `EXPLAIN (ANALYZE, BUFFERS)` for each dashboard query is written
to the output as information and never asserted (C-148). The `test:perf` script entry is added
in Issue 8; the script fills `toktickit_perf` itself (C-183).

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| PERF-01 | Performance-smoke | AC-102; BR-72 | `GET /api/dashboard/requester` as the Requester with the most Tickets, about 2,000 Tickets in the database | p95 under 500 ms | `server/tests/lab-04/perf-smoke.ts` | |
| PERF-02 | Performance-smoke | AC-102; BR-72 | `GET /api/dashboard/staff` as the Administrator (every staff query plus `userCounts`) | p95 under 500 ms | `server/tests/lab-04/perf-smoke.ts` | |

### 2.8 UI component

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| UI-01 | UI | FR-18, FR-21; `ui-spec.md` 6 | Staff card grid | Eleven cards in API order; each one `<a>` to its `drillDown`, named `<label>: <count>. Open …` | `client/tests/lab-04/StaffDashboard.test.tsx` | |
| UI-02 | UI | AC-87; FR-19 | User accounts row | Administrator: three cards with `N active` as text, not a link; IT Staff: no such row | `client/tests/lab-04/StaffDashboard.test.tsx` | |
| UI-03 | UI | AC-83; BR-57 | Zero and empty | A zero card shows `0` and is still a link; each empty list shows its `ui-spec.md` 12.1 copy with `View all` kept | `client/tests/lab-04/StaffDashboard.test.tsx` | |
| UI-04 | UI | AC-84; BR-58, C-128 | Refresh, and no polling | One request on mount; fake timers advanced 15 min send none; Refresh sends exactly one, is disabled and busy in flight, and the `Updated …` line changes | `client/tests/lab-04/StaffDashboard.test.tsx` | |
| UI-05 | UI | AC-80; C-142 | No delta text | No "yesterday", no `+N` / `-N` from-text anywhere | `client/tests/lab-04/StaffDashboard.test.tsx` | |
| UI-06 | UI | AC-90; BR-62 | Quick Actions | Exactly `Search Tickets` -> `/queue` and `My Queue` -> `/queue?owner=me`; no `Create Ticket` | `client/tests/lab-04/StaffDashboard.test.tsx` | |
| UI-07 | UI | AC-133; BR-84 | `#my-actions` panel | Seven rows in API order, card 7, footer `7 planned actions`; arriving at the hash focuses the panel heading | `client/tests/lab-04/StaffDashboard.test.tsx` | |
| UI-08 | UI | AC-82; FR-21, C-161 | List rows | Rows in the API's order, never re-sorted; each links to `/queue/:id`; `View all` links to `viewAll` | `client/tests/lab-04/StaffDashboard.test.tsx` | |
| UI-09 | UI | `ui-spec.md` 12.1 | Loading and failure | Skeleton with `aria-busy="true"` and Refresh disabled; a 500 shows the FAIL panel with Retry and Refresh kept | `client/tests/lab-04/StaffDashboard.test.tsx` | |
| UI-10 | UI | AC-72; FR-16, BR-48 | Queue landing from the card | `/queue?requesterResolved=true` shows the filter as `Only these` and requests it; `Last updated` shows `lastActivityAt` | `client/tests/lab-04/StaffDashboard.test.tsx` | |
| UI-11 | UI | AC-117; FR-24 | User Management landing | `/users?role=IT_STAFF` shows the role filter set and requests `role=IT_STAFF`; changing it writes the URL | `client/tests/lab-04/StaffDashboard.test.tsx` | |
| UI-12 | UI | AC-88; BR-61, C-144 | Staff navigation | `Dashboard` first; `aria-current="page"` on `/dashboard` and on `/dashboard#my-actions`; the wordmark links to `/dashboard` | `client/tests/lab-04/StaffDashboard.test.tsx` | |
| UI-13 | UI | FR-20; `ui-spec.md` 7 | Requester cards | Four cards in API order, each a link to its My Tickets drill-down; `Waiting for you` carries the Waiting badge | `client/tests/lab-04/RequesterDashboard.test.tsx` | |
| UI-14 | UI | FR-20, FR-21 | Requester lists | `Recently updated` with `View all`; `Recently resolved` without, each row `Resolved DD MMM YYYY`; rows link to `/tickets/:id` | `client/tests/lab-04/RequesterDashboard.test.tsx` | |
| UI-15 | UI | AC-83; BR-57 | The zero account | Four `0` cards; both lists show their `ui-spec.md` 12.2 empty copy | `client/tests/lab-04/RequesterDashboard.test.tsx` | |
| UI-16 | UI | AC-80; BR-62, `LS 8.2` | Requester Quick Action and restraint | Only `Create Ticket` -> `/tickets/new`; no delta text; no table element | `client/tests/lab-04/RequesterDashboard.test.tsx` | |
| UI-17 | UI | AC-84; BR-58 | Requester Refresh, no polling | As UI-04 for `GET /api/dashboard/requester` | `client/tests/lab-04/RequesterDashboard.test.tsx` | |
| UI-18 | UI | AC-72; FR-17, BR-88 | My Tickets landing | `/tickets?statusGroup=open` shows `Open tickets` with no `currentStatus`; choosing a status clears `statusGroup`; `Recently updated` sends `lastActivityAt:desc`; `Last updated` shows `lastActivityAt` | `client/tests/lab-04/RequesterDashboard.test.tsx` | |
| UI-19 | UI | `ui-spec.md` 12.2 | Requester loading and failure | Skeleton `aria-busy`; FAIL panel with Retry | `client/tests/lab-04/RequesterDashboard.test.tsx` | |
| UI-20 | UI | C-144; `ui-spec.md` 2 | Forbidden link | A Requester at `/queue` sees Forbidden with `Go to Dashboard` -> `/dashboard` | `client/tests/lab-04/RequesterDashboard.test.tsx` | |
| UI-21 | UI | FR-01; AC-15; BR-22 | Staff Actions Taken list | Every FR-01 field per row in API order; times as `DD MMM YYYY HH:mm`; `Created by <name> on …`; an inactive assignee as `<name> (inactive)` | `client/tests/lab-04/ActionsTaken.test.tsx` | |
| UI-22 | UI | `ui-spec.md` 8.2 | Empty list | `No actions recorded yet.`; the composer still present | `client/tests/lab-04/ActionsTaken.test.tsx` | |
| UI-23 | UI | AC-34; BR-21, FR-03 | Composer defaults | `Shown to the Requester.` visible; status defaults `Completed`; assignee defaults to the signed-in user, options from assignable-users | `client/tests/lab-04/ActionsTaken.test.tsx` | |
| UI-24 | UI | AC-09; BR-05 | Field reveal | `Planned` hides Result and Follow-up; ticking reveals a required Follow-up Note; unticking clears it and the request carries no `followUpNote` | `client/tests/lab-04/ActionsTaken.test.tsx` | |
| UI-25 | UI | AC-14; BR-07, BR-44 | Request body | Typing 09:00 sends `…T09:00:00+07:00`; the body carries a UUID `clientRequestId` | `client/tests/lab-04/ActionsTaken.test.tsx` | |
| UI-26 | UI | `ui-spec.md` 3, 12.3 | Server validation | Each 400 field message renders directly below its control, verbatim from the catalogue; focus moves to the first invalid field | `client/tests/lab-04/ActionsTaken.test.tsx` | |
| UI-27 | UI | AC-67, AC-118; FR-08 | Success | `Action added.`; the form resets; the next submit carries a different `clientRequestId`; the Ticket summary re-renders from the returned DTO | `client/tests/lab-04/ActionsTaken.test.tsx` | |
| UI-28 | UI | AC-68; BR-44 | In flight | `Add Action` disabled and `aria-busy`; a second click sends nothing | `client/tests/lab-04/ActionsTaken.test.tsx` | |
| UI-29 | UI | AC-92; BR-63, C-147 | Form protection | After 400, 409, 422, 500 and a rejected `fetch`, every typed value is still in the composer | `client/tests/lab-04/ActionsTaken.test.tsx` | |
| UI-30 | UI | FR-09, C-174 | Operations from the API | A `PLANNED` row with `allowedOperations: []` shows no control; one with `["EDIT"]` shows only `Edit` | `client/tests/lab-04/ActionsTaken.test.tsx` | |
| UI-31 | UI | AC-18; BR-10, C-175, C-177 | Edit mode | Pre-filled; `Save Action` disabled until a field differs; only changed fields sent, with `version`; an inactive assignee shown `(inactive)` does not block saving the description | `client/tests/lab-04/ActionsTaken.test.tsx` | |
| UI-32 | UI | AC-19, AC-132; BR-11 | Complete panel | `actionAt` pre-filled; Result required; success `Action completed.`; the row shows `Completed by <name>`; a future stored time shows the C-168 message | `client/tests/lab-04/ActionsTaken.test.tsx` | |
| UI-33 | UI | AC-21; BR-12 | Cancel panel | `Reason` required with the finality helper; success `Action cancelled.`; the row shows `Cancelled by` and `Reason`; the closing control reads `Close` | `client/tests/lab-04/ActionsTaken.test.tsx` | |
| UI-34 | UI | AC-60, AC-94; BR-39, BR-63 | `STALE_UPDATE` on an edit | `role="alert"` panel with the `ui-spec.md` 4 message; Ticket re-fetched and fresh values shown; draft kept; `Apply my changes again` sends the fresh `version`; `Discard my changes` resets | `client/tests/lab-04/ActionsTaken.test.tsx` | |
| UI-35 | UI | AC-94; `ui-spec.md` 11 | Other action conflicts | `ACTION_NOT_PLANNED`, `TICKET_RESOLVED`, `TICKET_CLOSED` each render the panel without the two buttons, then re-fetch | `client/tests/lab-04/ActionsTaken.test.tsx` | |
| UI-36 | UI | AC-28; BR-18 | 422 assignee | `Choose an active IT Staff or Administrator user.` below Assignee; values kept | `client/tests/lab-04/ActionsTaken.test.tsx` | |
| UI-37 | UI | AC-37, AC-38; BR-24 | Terminal and Resolved Tickets | Resolved: no composer, no row control, the "Reopen it first" line; Closed: the Lab 3 closed line once; the list still readable | `client/tests/lab-04/ActionsTaken.test.tsx` | |
| UI-38 | UI | AC-33; FR-07, BR-20 | Requester Ticket Detail | The same list with no composer and no row control; `Recorded by IT Staff.`; no `@` rendered | `client/tests/lab-04/ActionsTaken.test.tsx` | |
| UI-39 | UI | AC-16; BR-08 | Plain text | A description `<b>x</b>` plus a line break renders as literal text with the break kept; no `<b>` element in the DOM | `client/tests/lab-04/ActionsTaken.test.tsx` | |
| UI-40 | UI | AC-42; FR-10, `CLAUDE.md` rule 3 | Status select offers | Exactly `allowedTransitions`, including a deliberately non-matrix fixture set, so no client copy of the matrix can pass | `client/tests/lab-04/TicketWorkflow.test.tsx` | |
| UI-41 | UI | AC-136; BR-27, C-171 | Gate unmet | `Resolved - not available yet` disabled; the callout lists each reason line in API order; bound by `aria-describedby` | `client/tests/lab-04/TicketWorkflow.test.tsx` | |
| UI-42 | UI | BR-27 | Gate met | `Resolved` enabled; no callout | `client/tests/lab-04/TicketWorkflow.test.tsx` | |
| UI-43 | UI | AC-60, AC-94; BR-39 | `STALE_UPDATE` on the status control | Panel, re-fetch, chosen status kept; `Apply my changes again` sends the fresh `version`; if the fresh `allowedTransitions` lacks the draft, the button is absent and the reason shown | `client/tests/lab-04/TicketWorkflow.test.tsx` | |
| UI-44 | UI | AC-94 | `STALE_UPDATE` on owner and on IT Priority | The same panel in each group; the draft owner or priority kept | `client/tests/lab-04/TicketWorkflow.test.tsx` | |
| UI-45 | UI | AC-94; `ui-spec.md` 9.2 | Server `RESOLUTION_GATE_NOT_MET` | After re-fetch the callout renders as a conflict with the returned reasons | `client/tests/lab-04/TicketWorkflow.test.tsx` | |
| UI-46 | UI | AC-51, AC-94; `ui-spec.md` 9.3 | `PLANNED_ACTIONS_OPEN` on cancel | The `ui-spec.md` 4 message inline in the status group, with `Go to Actions Taken` | `client/tests/lab-04/TicketWorkflow.test.tsx` | |
| UI-47 | UI | AC-36; FR-14, BR-23 | Status history, both detail screens | An `<ol>` oldest first; `Created as New by <name>`; change rows with both badges; no edit or delete control | `client/tests/lab-04/TicketWorkflow.test.tsx` | |
| UI-48 | UI | AC-77, AC-147; BR-51 | Legacy line | `historyComplete` false: `Status changes made before this history began were not recorded.` above the list on both screens; true: absent | `client/tests/lab-04/TicketWorkflow.test.tsx` | |
| UI-49 | UI | AC-72; BR-48 | Staff Ticket Detail `Last Updated` | Shows `lastActivityAt`, not `updatedAt` | `client/tests/lab-04/TicketWorkflow.test.tsx` | |
| UI-50 | UI | BR-63, C-147 | Public Comment (both screens) and Internal Note composers after 400, 409, 500 and a rejected `fetch` | Every typed value kept (C-181: the action form is UI-49's) | `client/tests/lab-04/TicketWorkflow.test.tsx` | |
| UI-51 | UI | AC-67, AC-68; BR-44 | The same composers' key and button | A new `clientRequestId` after each success; the submit button disabled and busy in flight | `client/tests/lab-04/TicketWorkflow.test.tsx` | |
| UI-52 | UI | AC-69; BR-45 | Requester Attachment upload | The upload control disabled in flight; at five active files the cap message shows and no request is sent | `client/tests/lab-04/TicketWorkflow.test.tsx` | |

### 2.9 UI style

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| STYLE-01 | UI style | AC-34; `ui-spec.md` 8.1 | Actions Taken distinct from comments and notes | Its card has the left primary bar class, the clipboard-check icon and the standing label; comments and notes have neither | `client/tests/lab-04/ActionsTaken.test.tsx` | |
| STYLE-02 | UI style | `ui-spec.md` 8.2, `CLAUDE.md` | Action status badges | Each carries text and an icon; Planned dashed border, Cancelled struck-through label - distinct without colour | `client/tests/lab-04/ActionsTaken.test.tsx` | |
| STYLE-03 | UI style | AC-16; BR-08 | Action text | Computed `white-space` is `pre-wrap` on description, result, follow-up note and attachment notes | `client/tests/lab-04/ActionsTaken.test.tsx` | |
| STYLE-04 | UI style | `ui-spec.md` 8.2, VIS-19 | Read-only versus editable | Finished rows use the read-only background token; composer controls are white | `client/tests/lab-04/ActionsTaken.test.tsx` | |
| STYLE-05 | UI style | `ui-spec.md` 3, VIS-21, VIS-22 | Validation placement | Each message is the next sibling of its control, in the danger class, referenced by `aria-describedby`; Follow-up Note carries the required asterisk and the message too | `client/tests/lab-04/ActionsTaken.test.tsx` | |
| STYLE-06 | UI style | `ui-spec.md` 5, L3 C-118 | Button levels | `Add Action`, `Save Action`, `Complete Action` primary; `Cancel Action` destructive; `Close` secondary; row actions tertiary; a disabled button keeps its level | `client/tests/lab-04/ActionsTaken.test.tsx` | |
| STYLE-07 | UI style | `CLAUDE.md` (success never colour alone) | Action success panels | Each has a check icon and a sentence, `aria-live="polite"` | `client/tests/lab-04/ActionsTaken.test.tsx` | |
| STYLE-08 | UI style | `ui-spec.md` 14 | Accessible names in the composer and the edit, complete and cancel panels | Every control has a visible `<label>` and a non-empty accessible name | `client/tests/lab-04/ActionsTaken.test.tsx` | |
| STYLE-09 | UI style | `ui-spec.md` 6, VIS-06 | Metric card structure | One link; label, count with the primary token class, and the `View list` cue; status cards carry their status badge | `client/tests/lab-04/StaffDashboard.test.tsx` | |
| STYLE-10 | UI style | `ui-spec.md` 14 | Dashboard accessibility | The `Updated …` line is `aria-live="polite"`; one `h1`; every card, list link and Quick Action has a non-empty accessible name | `client/tests/lab-04/StaffDashboard.test.tsx` | |
| STYLE-11 | UI style | `ui-spec.md` 9.2, 11 | Gate callout and conflict panel | Callout in the info treatment with an icon; conflict panel `role="alert"` with the warning border and icon | `client/tests/lab-04/TicketWorkflow.test.tsx` | |
| STYLE-12 | UI style | VIS-01; `CLAUDE.md` theme tokens | No hard-coded colour in Lab 4 components | No hex literal in the Lab 4 component sources outside the token stylesheet | `client/tests/lab-04/StaffDashboard.test.tsx` | |

### 2.10 Responsive

Each runs at desktop 1280, tablet 834 and mobile 390 unless marked mobile-only (skipped at the
other two, counted in section 4.4).

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| RESP-01 | Responsive | AC-120; FR-33 | Both dashboards | `scrollWidth <= innerWidth`; no card count wraps below its label | `e2e/lab-04/dashboards.spec.ts` | |
| RESP-02 | Responsive | AC-120; FR-33 | Staff and Requester Ticket Detail with actions, history and an open composer | No horizontal page scroll | `e2e/lab-04/actions-taken-flow.spec.ts` | |
| RESP-03 | Responsive | `ui-spec.md` 13, VIS-32 | Card grid columns | Staff 4 / 3 / 2, Requester 4 / 2 / 2, measured from card positions | `e2e/lab-04/dashboards.spec.ts` | |
| RESP-04 | Responsive | `ui-spec.md` 8.2, 13 | Actions Taken layout | A table at 1280; stacked cards at 834 and 390 | `e2e/lab-04/actions-taken-flow.spec.ts` | |
| RESP-05 | Responsive | `ui-spec.md` 6, 13 | Dashboard panels | Two columns at 1280, one below | `e2e/lab-04/dashboards.spec.ts` | |
| RESP-06 | Responsive | `ui-spec.md` 13, VIS-31 | Dashboard touch targets (mobile-only) | Every card, list link and Quick Action at least 44 px tall | `e2e/lab-04/dashboards.spec.ts` | |
| RESP-07 | Responsive | `ui-spec.md` 13, VIS-31 | Actions Taken touch targets (mobile-only) | Row actions and composer buttons at least 44 px tall | `e2e/lab-04/actions-taken-flow.spec.ts` | |
| RESP-08 | Responsive | `ui-spec.md` 14, VIS-24, VIS-25 | Keyboard on the dashboards | Tab reaches every card, list link, `View all` and Quick Action in visual order, each with a visible focus ring | `e2e/lab-04/dashboards.spec.ts` | |
| RESP-09 | Responsive | `ui-spec.md` 14, VIS-24 | Keyboard in Actions Taken | Composer, row actions and conflict buttons reachable in order; Follow-up Note directly after its checkbox | `e2e/lab-04/actions-taken-flow.spec.ts` | |
| RESP-10 | Responsive | AC-120; VIS-20 | Status control with the gate callout | Disabled `Resolved` and its reasons visible together, unclipped, at each width | `e2e/lab-04/ticket-resolution.spec.ts` | |
| RESP-11 | Responsive | BR-61; `ui-spec.md` 2 | Navigation toggler (mobile-only) | The panel lists `Dashboard` first and exactly the role's items, with Log Out | `e2e/lab-04/dashboards.spec.ts` | |

### 2.11 End to end

**Console-error fixture (C-149, BR-66).** Every Lab 4 spec imports the fixture, which fails a
test on `console.error`, `pageerror` or a same-origin response >= 500. The only allowlisted lines
are the browser's `Failed to load resource` lines for a 401, 403, 404, 409 or 422 that the test
declares it expects (`expectStatus(…)`). E2E-28 to E2E-32 prove both halves with `test.fail()`
where the fixture must trip.

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| E2E-01 | E2E | AC-01, AC-18, AC-19, AC-118; FR-02, FR-04, FR-05 | Create planned, edit, complete in the UI | Each step succeeds with its success copy; the summary and list update from each response | `e2e/lab-04/actions-taken-flow.spec.ts` | |
| E2E-02 | E2E | AC-09, AC-22 | Create already completed with follow-up | The note appears on tick and clears on untick; the saved row shows `Follow-up needed:` | `e2e/lab-04/actions-taken-flow.spec.ts` | |
| E2E-03 | E2E | AC-21; FR-06 | Cancel with a reason | The row shows `Cancelled by <name>` and `Reason` | `e2e/lab-04/actions-taken-flow.spec.ts` | |
| E2E-04 | E2E | AC-28 | Inactive assignee (expected 422) | The message at the Assignee field; nothing saved | `e2e/lab-04/actions-taken-flow.spec.ts` | |
| E2E-05 | E2E | AC-60; C-153 | Two browser contexts; B edits an action A has open; A saves (expected 409) | Conflict panel, fresh values, A's draft kept; `Apply my changes again` succeeds | `e2e/lab-04/actions-taken-flow.spec.ts` | |
| E2E-06 | E2E | AC-31, AC-33; FR-07 | The Requester's view of the same Ticket | Every action read-only, names only; no `@` in the page's HTML | `e2e/lab-04/actions-taken-flow.spec.ts` | |
| E2E-07 | E2E | AC-37, AC-38 | Actions on a Resolved and a Closed Ticket | Read-only list, no composer, the matching line | `e2e/lab-04/actions-taken-flow.spec.ts` | |
| E2E-08 | E2E | `ui-spec.md` 15 | Captures `actions-taken/`, 15 states | `actions-<vp>-<state>.png` for the 15 `ui-spec.md` 15 names, after transitions settle | `e2e/lab-04/actions-taken-flow.spec.ts` | |
| E2E-09 | E2E | AC-68; BR-44 | Double-click `Add Action` | Exactly one new action | `e2e/lab-04/actions-taken-flow.spec.ts` | |
| E2E-10 | E2E | AC-03 | A Requester's browser POSTs to `/api/tickets/:id/actions` (expected 403) | 403; no action appears for staff | `e2e/lab-04/actions-taken-flow.spec.ts` | |
| E2E-11 | E2E | AC-119, AC-49; C-154 | **Two-role creation to closure**: a Requester creates a Ticket; IT Staff claims it, records a completed action, sees the gate met, resolves with the confirmation, closes it | Each step succeeds in the UI; the Requester sees `Closed`, the action and the full history | `e2e/lab-04/ticket-resolution.spec.ts` | |
| E2E-12 | E2E | AC-136 | Gate unmet in the UI | `Resolved` disabled with its reasons; after completing the planned action it is enabled | `e2e/lab-04/ticket-resolution.spec.ts` | |
| E2E-13 | E2E | AC-51 | Cancel blocked by a planned action (expected 409) | The message and `Go to Actions Taken`, which scrolls to the card | `e2e/lab-04/ticket-resolution.spec.ts` | |
| E2E-14 | E2E | AC-60 | Stale status, two contexts (expected 409) | Conflict panel on the status control, chosen status kept | `e2e/lab-04/ticket-resolution.spec.ts` | |
| E2E-15 | E2E | AC-48 | Reopen, then try to resolve | `Record an action completed since the ticket was reopened.`; after a new completed action, Resolved succeeds | `e2e/lab-04/ticket-resolution.spec.ts` | |
| E2E-16 | E2E | AC-36; FR-14 | History on both screens | Oldest first, the creation row first | `e2e/lab-04/ticket-resolution.spec.ts` | |
| E2E-17 | E2E | `ui-spec.md` 15; AC-77 | Captures `ticket-workflow/`, 10 states | `workflow-<vp>-<state>.png` for the 10 names; the legacy-history state from `toktickit_rehearsal` (C-188) | `e2e/lab-04/ticket-resolution.spec.ts` | |
| E2E-18 | E2E | AC-91; BR-63 | Create Ticket with every field filled; the submit fails by network abort, then succeeds | Every value kept after the failure; one Ticket created; the abort is declared to the fixture (C-182) | `e2e/lab-04/ticket-resolution.spec.ts` | |
| E2E-19 | E2E | AC-88; FR-23 | Each role signs in | Lands on `/dashboard`; `Dashboard` first and `aria-current` | `e2e/lab-04/dashboards.spec.ts` | |
| E2E-20 | E2E | AC-89; FR-28, FR-30, C-149 | **Requester walk** under the fixture: every nav item, Quick Action, card and list link | Each loads with no console error; every Lab 2-3 Requester screen reachable | `e2e/lab-04/dashboards.spec.ts` | |
| E2E-21 | E2E | AC-89; FR-28, FR-30 | **IT Staff walk**, as E2E-20 | No console error; every Lab 3 staff screen reachable | `e2e/lab-04/dashboards.spec.ts` | |
| E2E-22 | E2E | AC-89; FR-28, FR-30 | **Administrator walk**, including the user cards | No console error; User Management reachable filtered | `e2e/lab-04/dashboards.spec.ts` | |
| E2E-23 | E2E | AC-81; VIS-09 | Every staff and Administrator card clicked in the browser | Each landed list's total on screen equals the card's count | `e2e/lab-04/dashboards.spec.ts` | |
| E2E-24 | E2E | AC-81; VIS-09 | Every Requester card clicked | Each landed My Tickets total equals the card | `e2e/lab-04/dashboards.spec.ts` | |
| E2E-25 | E2E | AC-84; C-128 | Refresh and no polling, with `page.clock` advanced 15 min | No dashboard request while idle; Refresh sends one and the `Updated …` line changes | `e2e/lab-04/dashboards.spec.ts` | |
| E2E-26 | E2E | AC-133; VIS-26 | Following `My planned actions` | `#my-actions` in view, focus on its heading | `e2e/lab-04/dashboards.spec.ts` | |
| E2E-27 | E2E | C-144 | A Requester at `/queue` (expected 403 where requested) | Forbidden with `Go to Dashboard` | `e2e/lab-04/dashboards.spec.ts` | |
| E2E-28 | E2E | AC-95; BR-66 | Fixture: a page that calls `console.error` | The test fails (`test.fail()` passes) | `e2e/lab-04/regression.spec.ts` | |
| E2E-29 | E2E | AC-95; BR-66 | Fixture: an uncaught page exception | The test fails | `e2e/lab-04/regression.spec.ts` | |
| E2E-30 | E2E | AC-95; BR-66 | Fixture: a same-origin 500 | The test fails | `e2e/lab-04/regression.spec.ts` | |
| E2E-31 | E2E | AC-95; BR-66 | Fixture: a declared expected 404 (`/tickets/999999` as a Requester) | The test passes; the `Failed to load resource` line is allowlisted | `e2e/lab-04/regression.spec.ts` | |
| E2E-32 | E2E | AC-95; BR-66 | Fixture: the same 404 undeclared | The test fails | `e2e/lab-04/regression.spec.ts` | |
| E2E-33 | E2E | `ui-spec.md` 15 | Captures `staff-dashboard/`, 8 states | Including `-zero` (the real Administrator) and `-lists-empty-mocked` (named mocked, C-180); `-failure` by a declared mocked 500 (C-182) | `e2e/lab-04/dashboards.spec.ts` | |
| E2E-34 | E2E | `ui-spec.md` 15, C-180 | Captures `requester-dashboard/`, 5 states | `-populated` (Part 5 role evidence), `-zero` for nattapong.w; `-failure` by a declared mocked 500 (C-182) | `e2e/lab-04/dashboards.spec.ts` | |
| E2E-35 | E2E | `ui-spec.md` 15; FR-29, FR-30 | Captures `regression/`, 14 states | The 14 names, from the real app; `system-check` public | `e2e/lab-04/regression.spec.ts` | |

---

## 3. Acceptance-Criterion Traceability

All **148** criteria. Lab 2 and Lab 3 tests are cited where they already discharge a criterion
and are adapted or carried by section 4.

| AC | Planned tests | AC | Planned tests |
|---|---|---|---|
| AC-01 | API-01, E2E-01 | AC-75 | WF-51 |
| AC-02 | SEC-08, SEC-13 | AC-76 | WF-55 |
| AC-03 | SEC-01, E2E-10 | AC-77 | WF-53, UI-48, E2E-17 |
| AC-04 | API-03 | AC-78 | API-49, API-60 |
| AC-05 | API-04 | AC-79 | UNIT-08, API-56, API-78 |
| AC-06 | UNIT-01, API-09 | AC-80 | UI-05, UI-16 |
| AC-07 | UNIT-01, API-11 | AC-81 | API-50..API-53, API-61..API-74, E2E-23, E2E-24 |
| AC-08 | UNIT-01, API-12 | AC-82 | API-54, API-76, API-77, UI-08 |
| AC-09 | UI-24, E2E-02 | AC-83 | API-57, API-79, UI-03, UI-15 |
| AC-10 | UNIT-01, API-13 | AC-84 | UI-04, UI-17, E2E-25 |
| AC-11 | UNIT-02, API-14 | AC-85 | SEC-06 |
| AC-12 | UNIT-02, API-15 | AC-86 | SEC-05 |
| AC-13 | UNIT-02, API-16 | AC-87 | SEC-07, UI-02 |
| AC-14 | UNIT-09, UI-25 | AC-88 | UI-12, E2E-19, L3 Login landing test (adapted) |
| AC-15 | UNIT-10, UI-21 | AC-89 | E2E-20, E2E-21, E2E-22, L3 UI-50 and L3 E2E-05 (adapted) |
| AC-16 | UI-39, STYLE-03 | AC-90 | UI-06 |
| AC-17 | API-17 | AC-91 | E2E-18, L2 UI-15 in `CreateTicket.test.tsx` (unchanged) |
| AC-18 | API-19, UI-31, E2E-01 | AC-92 | UI-29 |
| AC-19 | API-20, UI-32, E2E-01 | AC-93 | L3 UI-15 in `ChangePassword.test.tsx`, L3 UI-04 in `Login.test.tsx` (both unchanged) |
| AC-20 | API-23 | AC-94 | UI-34, UI-35, UI-43, UI-44, UI-45, UI-46 |
| AC-21 | API-24, UI-33, E2E-03 | AC-95 | E2E-28..E2E-32 |
| AC-22 | API-02, E2E-02 | AC-96 | MIG-09, MIG-10, MIG-12 (artifacts); L3 MIG-14 (automated drift) |
| AC-23 | API-25 | AC-97 | MIG-13 (artifact) |
| AC-24 | SEC-11 | AC-98 | MIG-14 |
| AC-25 | API-41 | AC-99 | MIG-15, MIG-17, MIG-19 |
| AC-26 | API-26 | AC-100 | MIG-22 (artifact) |
| AC-27 | API-07 | AC-101 | SEC-09, SEC-10 |
| AC-28 | API-08, UI-36, E2E-04 | AC-102 | PERF-01, PERF-02 |
| AC-29 | API-06 | AC-103 | API-50 |
| AC-30 | API-27 | AC-104 | API-51 |
| AC-31 | API-42, E2E-06 | AC-105 | API-52 |
| AC-32 | API-43 | AC-106 | API-53 |
| AC-33 | UI-38, E2E-06 | AC-107 | API-54, SEC-08 |
| AC-34 | UI-23, STYLE-01 | AC-108 | API-55 |
| AC-35 | API-40 | AC-109 | API-61 |
| AC-36 | WF-54, UI-47, E2E-16 | AC-110 | API-62 |
| AC-37 | API-35, UI-37, E2E-07 | AC-111 | API-63..API-68 |
| AC-38 | API-36, UI-37, E2E-07 | AC-112 | API-69 |
| AC-39 | API-18 | AC-113 | API-70 |
| AC-40 | UNIT-07, L3 API-64 (adapted), L3 UNIT-12 (unchanged) | AC-114 | API-71 |
| AC-41 | L3 API-73 (unchanged) | AC-115 | API-76 |
| AC-42 | UNIT-07, WF-14, UI-40 | AC-116 | API-77 |
| AC-43 | WF-01, WF-21 | AC-117 | API-73, UI-11 |
| AC-44 | WF-02 | AC-118 | API-39, UI-27, E2E-01 |
| AC-45 | WF-03 | AC-119 | E2E-11 |
| AC-46 | WF-04 | AC-120 | RESP-01..RESP-11; VIS-28..VIS-32 (manual) |
| AC-47 | UNIT-06, WF-08 | AC-121 | API-30 |
| AC-48 | WF-05, E2E-15 | AC-122 | WF-47 |
| AC-49 | WF-10, E2E-11 | AC-123 | WF-17 |
| AC-50 | WF-12 | AC-124 | WF-16 |
| AC-51 | WF-13, WF-21, UI-46, E2E-13 | AC-125 | WF-15 |
| AC-52 | WF-32 | AC-126 | API-45 |
| AC-53 | WF-18, WF-22, WF-23 | AC-127 | WF-60 |
| AC-54 | WF-24, WF-25, WF-26, WF-29, WF-30 | AC-128 | WF-57 |
| AC-55 | WF-27, WF-31 | AC-129 | WF-52 |
| AC-56 | WF-40..WF-46, WF-48 | AC-130 | WF-06 |
| AC-57 | WF-36, WF-37, WF-38, WF-47 | AC-131 | API-21 |
| AC-58 | WF-39 | AC-132 | API-22, UI-32 |
| AC-59 | WF-28 | AC-133 | API-75, UI-07, E2E-26 |
| AC-60 | UI-34, UI-43, E2E-05, E2E-14 | AC-134 | API-58 |
| AC-61 | WF-19 | AC-135 | WF-11 |
| AC-62 | API-37 | AC-136 | UI-41, E2E-12 |
| AC-63 | WF-56 | AC-137 | API-77 |
| AC-64 | API-46 | AC-138 | API-55 |
| AC-65 | WF-62 | AC-139 | API-31 |
| AC-66 | WF-63 | AC-140 | API-32 |
| AC-67 | UI-27, UI-51 | AC-141 | API-05 |
| AC-68 | UI-28, UI-51, E2E-09 | AC-142 | API-33 |
| AC-69 | UI-52, L2 API-33 (unchanged) | AC-143 | API-34 |
| AC-70 | WF-35..WF-47 | AC-144 | API-29 |
| AC-71 | WF-48 | AC-145 | API-28 |
| AC-72 | API-59, UI-10, UI-18, UI-49, L2 UI-25 in `RequesterTicketDetail.test.tsx` (adapted) | AC-146 | WF-49 |
| AC-73 | API-80 | AC-147 | WF-52, UI-48 |
| AC-74 | WF-50 | AC-148 | API-38, SEC-02 |

**C-158 note.** AC-66 says "a Ticket or note"; under the cut it is tested on notes and comments
only (WF-63), and WF-64 proves Ticket create ignores the key.

### 3.1 Criteria with no automated test

Stated plainly rather than filled with a weaker assertion (`CLAUDE.md`). **Three** criteria have
no automated assertion of their own, so no merge list is owed (the threshold is ten).

| Group | AC | Why | How it is discharged |
|---|---|---|---|
| Migration artifact | **AC-96** | It is about data that existed **before** the migration; `toktickit_test` is created fresh and holds none | MIG-09, MIG-10, MIG-12: the C-129 rehearsal captures. Only its drift half is also automated, by L3 MIG-14 |
| Migration artifact | **AC-97** | It *is* the restore of a dump into a fresh database, a manual recovery step | MIG-13: the restore capture |
| Recorded suite output | **AC-100** | A claim about three whole suites and their counts, not one behavior | MIG-22: the final runs' terminal output, checked against section 4.4 |

Partly manual, with automated parts listed alongside:

| AC | Automated | Manual or conditional |
|---|---|---|
| AC-120 | RESP-01..RESP-11 measure scroll, columns, touch targets and focus | "No clipped or overlapping control" over 13 screens x 3 widths is a judgement: VIS-28..VIS-32 against the section 15 captures |
| AC-91 | L2 UI-15 already proves a failed Create Ticket keeps every value | E2E-18's network failure is a declared failure (C-182) |
| AC-77 | WF-53 and UI-48 | The real-legacy screenshot comes from `toktickit_rehearsal` (C-188) |

---

## 4. Labs 1-3 Regression Disposition

Every test `phase1-analysis.md` section 3 lists, confirmed by ID and title in its file at commit
`39a7b86`. **Counted by test ID, not by file.** Expected: **adapted only, none retired**. An
adapted test keeps its Lab 2 or Lab 3 ID and its property; only its request bodies, fixtures or
asserted key sets change, because a decision changed them.

### 4.1 Server

| File | Test ID | Disposition | Decision | What changes |
|---|---|---|---|---|
| `server/tests/lab-03/staff-ticket-detail.api.test.ts` | L3 API-54, API-55, API-56, API-57, API-58, API-59, API-60, API-61 | Adapted | C-138 | Owner and IT Priority bodies gain `version` through the `setOwner`/`setPriority` helpers (L73-75); assertions unchanged |
| same | L3 API-62 | Adapted | C-138, C-137 | Status body gains `version`; the `RESOLVED` case gains a completed action |
| same | L3 API-64 | Adapted | C-138, C-137, C-164 | The 64-cell walk sends `version`; `RESOLVED` cells gain a completed action; assertions unchanged (C-164) |
| same | L3 API-66, API-67, API-69 | Adapted | C-138, C-164 | Body gains `version`; assertions unchanged - steps 1-3 precede the version check |
| same | L3 API-68, API-71 | Adapted | C-138 | Body gains `version` |
| same | L3 API-70 | Adapted | C-138, C-137 | Body gains `version`; the move to Resolved gains a completed action |
| same | untitled "an out-of-set or absent currentStatus -> 400" (L415) | Adapted | C-138, C-164 | Body gains `version`; still 400 at step 1 |
| same | L3 API-72 | Adapted | C-138 | Priority and status bodies gain `version` |
| same | L3 API-119, API-121 | Adapted | C-138, C-164 | Bodies gain `version`; assertions unchanged (C-164) |
| same | L3 API-123 | Adapted | C-138 | Bodies gain `version`; the malformed-id assertion unchanged |
| same | L3 API-49 | Adapted | C-136, C-138, C-140, C-126, C-141, C-171, C-179 | Exact staff DTO key set gains `version`, `lastActivityAt`, `resolvedAt`, `actions`, `statusHistory`, `historyComplete`, `allowedTransitions`, `resolutionGate` |
| same | L3 UNIT-12 | **Unchanged** | C-125 | The matrix is unchanged |
| `server/tests/lab-03/authorization.api.test.ts` | L3 SEC-13 | Adapted | C-138 | The Administrator's owner, priority and status calls send `version` |
| same | L3 SEC-23 | Adapted | C-138 | Its successful PATCHes send `version` |
| same | L3 SEC-26 | Adapted | C-136, C-140, C-141 | Requester DTO key set gains the Lab 4 keys; still no key carrying note data |
| same | L3 SEC-01, SEC-17, SEC-18, the byte-identical 403 test | **Unchanged** | L3 C-63 | The 403 precedes the body; SEC-01 picks up the six new routes from the router itself |
| `server/tests/lab-03/staff-queue.api.test.ts` | L3 API-48 | Adapted | C-140 | Queue row key set gains `lastActivityAt`; the `updatedAt` sort test (L264) stays |
| `server/tests/lab-02/my-tickets.api.test.ts` | untitled "returns the C-27 envelope and list-row shape" (L90) | Adapted | C-140 | Row shape gains `lastActivityAt` |
| `server/tests/lab-02/ticket-detail.api.test.ts` | L2 API-28 | Adapted | C-123, C-136, C-141, C-179 | **Inverts in part**: the Requester DTO must now carry `actions`, `statusHistory`, `historyComplete`; it must still carry no Internal Note key |
| `comments-notes`, `create-ticket`, `data-model.db`, `lab-03/migration.db` | all | **Unchanged** | C-139 (optional key), C-158 | `clientRequestId` is optional; the two seed constraints (L3 `migration.db.test.ts:430-443`, L2 `my-tickets-screenshots.spec.ts`) stay binding and MIG-19 restates them |
| `attachments`, `create-ticket`, `data-model.db`, `my-tickets`, `ticket-detail` (L2); `authorization`, `comments-notes`, `migration.db`, `staff-queue`, `staff-ticket-detail` (L3) | 8 `afterAll` blocks, 4 inline deletes | Cleanup, not a test | C-167, C-188, BR-50 | `prisma.ticket.delete`/`deleteMany` becomes `deleteTickets` (`server/tests/support/cleanup.ts`), which removes the Ticket's `TicketStatusChange` and `ActionTaken` rows first: every created Ticket now has a creation history row under a RESTRICT key. No assertion changes (Issue #63) |

**28 server tests adapted.** `phase1-analysis.md` section 3's summary line says 32, but its own
list names these 28 by ID; the adapted count is taken from the Issue #66 run (C-189). Any further test whose fixture
walks to `RESOLVED` through the API is adapted the same way (C-137) and added to this table when
Issue 5 meets it.

### 4.2 Client

| File | Test ID | Disposition | Decision | What changes |
|---|---|---|---|---|
| `client/tests/lab-03/Login.test.tsx` | L3 UI-50 | Adapted | C-144 | Per-role nav gains `Dashboard` first |
| same | untitled "each role lands on its own screen" (L242) | Adapted | C-144 | Every role lands on `/dashboard` |
| `client/tests/lab-03/StaffTicketDetail.test.tsx` | shared fixture (~L30) | Fixture, not a test | C-138, C-171, C-140 | Gains `version`, `allowedTransitions`, `resolutionGate`, `actions`, `statusHistory`, `historyComplete`, `lastActivityAt` |
| same | L3 UI-29 | Adapted | `CLAUDE.md` rule 3, C-171 | Offered moves come from the fixture's `allowedTransitions` |
| same | L3 UI-31 | Adapted | C-138 | The confirmed request body carries `version` |
| same | untitled "a confirmed Resolved move sends the request" (L173) | Adapted | C-138, C-137 | Body carries `version`; fixture gate met |
| same | untitled "OWNER_REQUIRED inline" (L185) | Adapted | C-137 | Still first and inline; the fixture's gate reasons do not displace it |
| `client/tests/lab-02/RequesterTicketDetail.test.tsx` | L2 UI-25 (L188) | Adapted | C-140 | `Last Updated` reads `lastActivityAt` |

**7 client tests adapted.** `client/vite.config.ts` does not type-check, so every adapted
fixture is checked by eye for `Invalid Date` and blank renders (1.1 report caution).

### 4.3 End to end

| File | Test ID | Disposition | Decision | What changes |
|---|---|---|---|---|
| `e2e/lab-03/authentication.spec.ts` | L3 E2E-03, E2E-01, E2E-05 | Adapted | C-144 | Post-login and post-change landing is `/dashboard`; the nav table gains `Dashboard` |
| same | untitled Forbidden test (L252) | Adapted | C-144 | Link reads `Go to Dashboard` |
| `e2e/lab-03/staff-ticket-flow.spec.ts` | L3 E2E-11 | Adapted | C-137, C-138 | An action is completed before Resolve |
| same | L3 E2E-12, E2E-15, E2E-26 | Adapted | C-138, C-137, C-156 | Raw fixture PATCHes send `version` and now assert their status first (C-156) |
| `e2e/lab-03/visual-evidence.spec.ts` | `staffMoves` helper | Helper, not a test | C-138 | Sends `version` |
| same | L3 E2E-32, E2E-36 | Adapted | C-137, C-138 | The walk through `RESOLVED` gains a completed action |
| same | L3 E2E-41, E2E-46, E2E-49 | Adapted | C-138 | Via the helper only |
| same | L3 E2E-48 (one declaration, three role cases) | Adapted | C-144 | `aria-current` checked on the new nav |
| `e2e/lab-02/requester-ticket-flow.spec.ts` | L2 RESP-04 | Adapted (title only) | C-144 | Assertions still pass; the stale title "both nav items" is corrected |

**15 e2e declarations adapted**: the 14 `phase1-analysis.md` counts, plus RESP-04's title.

### 4.4 Expected suite counts

Counted by `it(`/`test(` declarations at commit `39a7b86`, matching L3 tests.md section 7. **No
retirement**, so every "after" equals "before" plus the Lab 4 additions.

| Suite | Before Lab 4 | Lab 4 additions | Expected after Lab 4 |
|---|---|---|---|
| Server (`cd server; npm test`) | 297 tests, 15 files | +183 (UNIT-01..08, API 81, SEC 14, WF 64, MIG 16 automated), 5 files | **480 tests, 20 files** |
| Client (`cd client; npm test`) | 128 tests, 11 files | +67 (UNIT-09..11, UI 52, STYLE 12), 4 files | **195 tests, 15 files** |
| Playwright (`npm run test:e2e`) | 101 declarations, 103 tests (L3 E2E-48 loops over three roles): 278 passed + 34 skipped = 312 runs, with the 3 setup sign-ins | +46 tests (E2E 35, RESP 11) x 3 viewports = +138 runs, of which RESP-06, RESP-07, RESP-11 skip at 2 widths (+6 skipped) | **147 declarations, 149 tests: 410 passed + 40 skipped = 450 runs** |
| Perf-smoke (`npm run test:perf`) | - | +2 timings | **2 passed** |

A drop below these numbers, or a change in any "before" figure, is a bug, and MIG-22 records it.
Files added by C-184 and C-185 are counted here.

---

## 5. Manual Run Sequence (PowerShell)

`psql`, `pg_dump` and `pg_restore` are not installed on the host; they run inside the
`toktickit-db` container, and every SQL file is executed with `psql -f`. SQL files are written
under `tmp\` (ignored). `<PGUSER>` and `<PGPASSWORD>` are your local values from `server\.env`
and never enter a tracked file.

**Forbidden, nowhere in this sequence:** `npx prisma migrate reset` (L2 C-37) and
`npx prisma migrate dev` without `--create-only`.

```powershell
# 0. Repository root
Set-Location C:\Downloads\Lab1_Starter_Scaffold\toktickit
$PgUser = "<PGUSER>"
$Base   = "postgresql://<PGUSER>:<PGPASSWORD>@localhost:5432"

# 1. Database container
docker start toktickit-db
docker ps --filter name=toktickit-db

# 2. Issue 2 only - dump the dev database outside the repository (BR-68)
docker exec toktickit-db pg_dump -U $PgUser -Fc -d toktickit -f /tmp/lab4-pre-migration.dump
docker cp toktickit-db:/tmp/lab4-pre-migration.dump C:\Users\Tamat\Downloads\lab4-pre-migration.dump

# 3. Issue 2 only - rehearsal on toktickit_rehearsal (C-129; MIG-09..MIG-12)
$Ev = "artifacts\lab-04\evidence\issue-2"
docker cp C:\Users\Tamat\Downloads\lab3-final.dump toktickit-db:/tmp/lab3-final.dump
docker exec toktickit-db createdb -U $PgUser toktickit_rehearsal
docker exec toktickit-db pg_restore -U $PgUser -d toktickit_rehearsal --no-owner /tmp/lab3-final.dump
docker cp tmp\lab4-counts.sql   toktickit-db:/tmp/lab4-counts.sql
docker cp tmp\lab4-backfill.sql toktickit-db:/tmp/lab4-backfill.sql
docker exec toktickit-db psql -U $PgUser -d toktickit_rehearsal -f /tmp/lab4-counts.sql | Out-File -Encoding utf8 "$Ev\rehearsal-before.txt"
Set-Location server
$env:DATABASE_URL = "$Base/toktickit_rehearsal?schema=public"
npx prisma migrate deploy
npx prisma migrate diff --from-url $env:DATABASE_URL --to-schema-datamodel prisma/schema.prisma --exit-code
Set-Location ..
docker exec toktickit-db psql -U $PgUser -d toktickit_rehearsal -f /tmp/lab4-counts.sql   | Out-File -Encoding utf8 "$Ev\rehearsal-after.txt"
docker exec toktickit-db psql -U $PgUser -d toktickit_rehearsal -f /tmp/lab4-backfill.sql | Out-File -Encoding utf8 "$Ev\rehearsal-backfill.txt"

# 4. Issue 2 only - restore test (MIG-13, BR-68)
docker exec toktickit-db createdb -U $PgUser toktickit_restore_check
docker exec toktickit-db pg_restore -U $PgUser -d toktickit_restore_check --no-owner /tmp/lab4-pre-migration.dump
docker exec toktickit-db psql -U $PgUser -d toktickit_restore_check -f /tmp/lab4-counts.sql | Out-File -Encoding utf8 "$Ev\restore-check.txt"

# 5. Dev database - migrate, prove no drift, seed twice (idempotent)
Set-Location server
$env:DATABASE_URL = "$Base/toktickit?schema=public"
npx prisma migrate deploy
npx prisma migrate diff --from-url $env:DATABASE_URL --to-schema-datamodel prisma/schema.prisma --exit-code
npm run prisma:seed
npm run prisma:seed
npx tsx prisma/seed-demo.ts
Remove-Item Env:DATABASE_URL

# 6. API - leave running (terminal 2). For evidence runs, point it at toktickit_evidence first (README).
Set-Location C:\Downloads\Lab1_Starter_Scaffold\toktickit\server
npm run dev                                   # http://localhost:3000

# 7. Client - leave running (terminal 3)
Set-Location C:\Downloads\Lab1_Starter_Scaffold\toktickit\client
npm run dev                                   # http://localhost:5173

# 8. The three suites (terminal 1)
Set-Location C:\Downloads\Lab1_Starter_Scaffold\toktickit\server; npm test     # toktickit_test via global setup
Set-Location C:\Downloads\Lab1_Starter_Scaffold\toktickit\client; npm test
Set-Location C:\Downloads\Lab1_Starter_Scaffold\toktickit;        npm run test:e2e   # needs 1, 6 and 7

# 9. Performance smoke (C-148) - toktickit_perf only; stop the step 6 API first
docker exec toktickit-db createdb -U $PgUser toktickit_perf
Set-Location C:\Downloads\Lab1_Starter_Scaffold\toktickit\server
$env:DATABASE_URL = "$Base/toktickit_perf?schema=public"
npx prisma migrate deploy
npm run prisma:seed
# perf-smoke.ts fills toktickit_perf itself (C-183)
npm run test:perf
Remove-Item Env:DATABASE_URL
```

`tmp\lab4-counts.sql` (run before and after; it never names a Lab 4 table, so it works on both):

```sql
SELECT 'User' AS tbl, count(*) FROM "User"
UNION ALL SELECT 'Session', count(*) FROM "Session"
UNION ALL SELECT 'Category', count(*) FROM "Category"
UNION ALL SELECT 'RelatedSystem', count(*) FROM "RelatedSystem"
UNION ALL SELECT 'Ticket', count(*) FROM "Ticket"
UNION ALL SELECT 'Attachment', count(*) FROM "Attachment"
UNION ALL SELECT 'PublicComment', count(*) FROM "PublicComment"
UNION ALL SELECT 'InternalNote', count(*) FROM "InternalNote"
ORDER BY 1;
SELECT u.email, count(t.id) AS tickets
FROM "User" u LEFT JOIN "Ticket" t ON t."requesterId" = u.id
WHERE u.role = 'REQUESTER' GROUP BY u.email ORDER BY u.email;
```

`tmp\lab4-backfill.sql` (after only; MIG-10, MIG-11):

```sql
SELECT count(*) FILTER (WHERE "lastActivityAt" IS NULL)          AS null_activity,
       count(*) FILTER (WHERE "lastActivityAt" < "updatedAt")     AS activity_before_update,
       count(*) FILTER (WHERE "version" <> 0)                    AS nonzero_version,
       count(*) FILTER (WHERE "resolvedAt" IS NOT NULL)          AS resolved_at_set
FROM "Ticket";
SELECT count(*) AS mismatched_backfill FROM "Ticket" t
WHERE t."lastActivityAt" <> GREATEST(
  t."updatedAt",
  (SELECT max(c."createdAt")  FROM "PublicComment" c WHERE c."ticketId" = t.id),
  (SELECT max(a."uploadedAt") FROM "Attachment"    a WHERE a."ticketId" = t.id),
  (SELECT max(a."removedAt")  FROM "Attachment"    a WHERE a."ticketId" = t.id));
SELECT (SELECT count(*) FROM "ActionTaken")        AS actions,
       (SELECT count(*) FROM "TicketStatusChange") AS history_rows;
```

Every figure in the backfill output must be 0. Each capture is saved ANSI-stripped and headed
with the command, the date and the commit hash, and named in
`artifacts/lab-04/evidence/issue-2/README.md`.

---

## 6. Final Results

Blank until the final run on `lab4-staging`; filled from that commit with its hash (C-157).
After the release merge the suites re-run on `main` and `git diff lab4-staging main` is shown
empty in the PDF only.

| Suite | Command | Before Lab 4 | Expected | Actual | Result |
|---|---|---|---|---|---|
| Server | `cd server; npm test` | 297 | 480 | | |
| Client | `cd client; npm test` | 128 | 195 | | |
| Playwright | `npm run test:e2e` | 278 passed, 34 skipped | 410 passed, 40 skipped | | |
| Perf-smoke | `npm run test:perf` | - | 2 passed | | |

---

## 7. Open Questions - settled

The nine questions the first draft raised are settled by decisions C-181 to C-189 in
`decisions.md`: composers (C-181), declared failures (C-182), perf-smoke (C-183), the
route-matrix file (C-184), the regression spec (C-185), a cancelled action after a reopen
(C-186), re-sending the current IT Priority (C-187), seed and status history (C-188), and
the adapted Lab 3 count (C-189).
