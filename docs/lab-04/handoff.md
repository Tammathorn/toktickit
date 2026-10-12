# TokTickIT — Lab 4 Plan for Claude Code

This plan is for a fresh chat or a fresh Claude Code session. Commit it as
`docs/lab-04/handoff.md` on the contract branch so both can read it.

Author: Tammathorn Kananurak — 67070503489 — GitHub @Tammathorn
Peer reviewer: Pattarapon Sribuathong — 67070503434 — GitHub @PAKATO123 (display name PAKATO)

**Status, 2026-10-12 — planning.** Nothing for Lab 4 exists in the repository yet. The facts
in section 1 were read from a clone of `main` at `2186e84` on 2026-10-12, not from memory.

**Deadline: Sunday 2026-10-25.** Target: PDF ready Saturday 24 October; Sunday is buffer.
PAKATO has agreed to review the contract PR within 1–2 days.

Lab 4 is worth 60 points: Actions Taken, the final Ticket workflow, role dashboards, and
hardening of everything built in Labs 1–3.

---

## 1. Where Lab 3 ended

| Item | Value |
|---|---|
| `main` | `2186e84`. Lab 3 merged through PRs #46–#54 (feature), #55, #57, #59, #60, #61 |
| Highest PR / Issue number | #61. Lab 4 Issues will start around #62 — record the real numbers in section 5 |
| Decision log | `docs/lab-03/decisions.md`, **C-53..C-121** (Lab 2 is C-01..C-52) |
| Last recorded suites | server 297 · client 128 · Playwright 278 passed / 34 skipped / 0 failed (local, no CI) |
| API | 30 routes in `server/src/app.ts` and `server/src/routes/*.ts` |
| Contract docs | `docs/lab-03/{specification,api-spec,ui-spec,tests,decisions}.md` — 7,380 lines across `docs/lab-03/` |
| Repo path | `C:\Downloads\Lab1_Starter_Scaffold\toktickit`. It is the only path |
| Untracked leftovers | `AGENTS.md`, `tmp/`, `detail-*-owned.png` — deal with them in Phase 0 |

### Gaps Lab 3 left that Lab 4 must not repeat

| Lab 3 gap | Why it cost marks | Lab 4 rule |
|---|---|---|
| The contract PR #46 merged on 2026-10-05, after every implementation PR existed | Part 2 asks for proof the spec came *before* implementation. An open PR is weaker proof than a merged one | Contract PR reviewed and merged **before Issue 2 starts**. Ask PAKATO for this one PR first |
| All nine PRs reviewed in one batch on 2026-10-05 | Approvals given "against the stack", not the product; PR #47's own approval says so | Open each PR the day it goes green and send it the same day. Feature PRs may stack (section 5) but are reviewed as they arrive, never saved for one batch |
| No card ever entered Fixing (P1-04) | The board column exists and Part 1 shows it unused | When a review asks for a change, move the card to Fixing and capture it. Never stage a Fixing state |
| Four approval comments never answered on GitHub | Part 1 grades "comments, responses" | Reply on GitHub to every review comment, even ones inside an approval |
| PAKATO twice asked what evidence file names meant (#50, #51) | Reviewer could not read the evidence | Every `evidence/issue-N/` folder gets a `README.md` naming each file |
| #60 and #61 self-merged without review; three staging→main PRs | Part 1 graph is less clean | Finish UI fixes before the release PR. Exactly one release PR |
| Eight PDF figures predated the last UI fix | Figures did not match `main` | Freeze UI before the final capture run (Issue 9) |

### What in the current code Lab 4 breaks

Read this before writing any Lab 4 code. Each row is something the agent will trip over.

| Where | Today | Lab 4 needs |
|---|---|---|
| `CLAUDE.md` | "Never add … Actions Taken … dashboards or KPI analytics"; "The Resolution Summary and the Service Actions tab are Lab 4. Do not prepare for Lab 4"; scope, branches, `--base lab3-staging`, `artifacts/lab-03` | Rewrite **first**, or the agent refuses or hedges |
| `client/src/auth/roles.ts` | `LANDING`: Requester `/tickets`, staff `/queue`. No dashboard destination | Dashboard becomes the first nav item and the landing screen per role |
| `PATCH /api/staff/tickets/:id/status` (`staff.ts` ~L279) | The request carries no record of what the user last saw: the server reads the status at request time (and on a race re-reads and retries up to 3 times). A user whose screen still says Open can move a Ticket someone else just set to Waiting, and neither learns of it | Labsheet 6.1: stale writes must be detected. Replace the silent retry with a version check → 409 |
| `PATCH …/owner`, `PATCH …/it-priority` | No stale-update check at all | Same version check |
| `Ticket.updatedAt` | Prisma `@updatedAt`: moves only when the Ticket row changes. A Public Comment or Attachment does **not** move it | "Recently updated" needs an activity timestamp (D-14) |
| `Ticket` | No `resolvedAt` | "Recently resolved" cannot be computed (D-15) |
| `GET /api/tickets` (My Tickets) | Single `currentStatus` filter; sort fields `createdAt, ticketNumber, summary, currentStatus`; **the screen keeps filters in state, not in the URL** | Drill-down from "Open tickets" needs a status group, "recently updated" needs an activity sort, and the screen must read filters from the URL |
| `GET /api/staff/tickets` (queue) | URL-driven filters ✓; no filter for the Requester-resolved flag | A `requesterResolved=true` filter for that dashboard card |
| User Management screen | Role filter lives in component state | Read `?role=` from the URL if the Admin dashboard drills down to it |
| L2 C-26 | Duplicate submission prevented in the UI only | Labsheet 8.5 adds "network retry" — a server-side guard (D-13) |
| C-109 | Closed/Cancelled read-only for comments, notes, attachments, owner, priority, status | Extend to Actions Taken |
| C-103 | Staff cannot upload attachments | "Attachment Notes" stays a text field that points at existing files |
| C-101 | Staff do not raise Tickets | The labsheet mock-ups show "Create Ticket" in the staff header. Keep C-101; say so in the contract |
| Lab 3 tests | Status, owner and IT-priority PATCH tests send no version; login tests assert landing on `/queue` or `/tickets` | Adapt through decision rows, as the regression rule requires |
| Graded seed | 9 Tickets; no Actions Taken; Nattapong Wong (active Requester) owns none; Administrator owns none | Keep those two zero cases — they are real empty-dashboard evidence. Add Actions Taken (D-23) |

---

## 2. Lab 4 at a glance

**New:** an Actions Taken area on both Ticket Detail screens (staff read-write, Requester
read-only); the resolution gate and stale-update protection on the Ticket workflow; an IT
Staff dashboard (also the Administrator's, with user counts); a Requester dashboard; and
hardening across Labs 1–3.

**Size:** 35–47 hours hands-on, plus review waiting. Roughly Lab 3's size: fewer new screens,
but every workflow write changes and the regression surface is the whole product.

**The grading weight is not where the work is.** Part 6 (Actions Taken UI) is 10 points;
Parts 5, 7, 8 and 9 are 5 each; Parts 1 and 3 are 10 each. Process and tests are 20 of 60.

| Part | Pts | What it is in Lab 4 |
|---|---|---|
| 1 | 10 | Git workflow — graph through `lab4-staging`, board all Done, reviewer.md both ways, README, .gitignore, tree |
| 2 | 5 | `specification.md` + proof it predates implementation |
| 3 | 10 | `tests.md` + complete passing output **from main** |
| 4 | 5 | `ai-use.md`, 6–10 key prompts, "My Reflection" |
| 5 | 5 | IT Staff Dashboard UI, with evidence the metrics match database queries |
| 6 | 10 | Actions Taken UI: list, create, assign, edit, status transition, complete, cancel, validation, inactive-assignee rejection, role restrictions, safe failures, responsive, several actions on one Ticket |
| 7 | 5 | Ticket workflow: permitted transitions, stable ordering, append-only behavior, role-appropriate visibility |
| 8 | 5 | Requester Dashboard + representative regression of every Lab 2–3 feature |
| 9 | 5 | `ui-spec.md`, three viewports for every major Lab 4 screen, visual and accessibility checklist |

**Out of scope. The agent must never add these** (labsheet 4.2, plus Lab 3's list where it
still applies): SLA clocks, escalation engines, on-call scheduling, breach notifications;
email, SMS, LINE, push or any notification service; inventory, spare parts, purchasing, cost
accounting; time sheets, billing, payroll, labor cost; multi-level approval, electronic
signatures; BI tools, report builders, export; multi-tenancy, production cloud operations;
MFA, SSO, self-registration, user deletion, bulk user operations, lockout; uploads on Actions
Taken; Ticket creation by staff (C-101); auto-polling or live-updating dashboards; any feature
the Sprint 4 contract does not approve.

**Required files (labsheet section 12):**

```
docs/lab-04/            specification.md  tests.md  ui-spec.md  api-spec.md  reviewer.md  ai-use.md
server/tests/lab-04/    actions-taken · ticket-workflow · requester-dashboard · staff-dashboard  (.api.test.ts)
client/tests/lab-04/    StaffDashboard · RequesterDashboard · ActionsTaken · TicketWorkflow  (.test.tsx)
e2e/lab-04/             actions-taken-flow · ticket-resolution · dashboards  (.spec.ts)
artifacts/lab-04/screenshots/   staff-dashboard/  requester-dashboard/  actions-taken/
```

This is a minimum. Also keep `docs/lab-04/decisions.md` and `handoff.md`, and add
`server/tests/lab-04/migration.db.test.ts` and a performance-smoke test (D-26). The labsheet
writes the client folder as `client/.../lab-04 tests/`; it must be `client/tests/lab-04/`
because `client/vite.config.ts` collects only `tests/**/*.test.tsx`. Add
`artifacts/lab-04/screenshots/{ticket-workflow,regression}/` for Parts 7 and 8.

**Ten test levels** (labsheet section 10 — two more than Lab 3): unit, API/integration, UI
component, UI style, responsive, authorization, **workflow**, migration/regression,
**performance-smoke**, E2E.

---

## 3. Working rules

**Carried from Lab 3 — keep all of these:**

- The agent runs git within limits that never relax: explicit paths only, never `git add .`;
  report exactly what is staged; no force-push; no rebase of a pushed branch; nothing reaches
  `main` except through the one release PR.
- Every PR `--base lab4-staging` (or, if stacking is unavoidable, the branch below it, stated in
  the PR body).
- Contract conflicts are reported, never silently resolved; each becomes a decision row.
- Never `prisma migrate reset`. Create migrations with `--create-only`, read the SQL, apply with
  `npx prisma migrate deploy`. Prove zero drift after each one.
- A security claim needs a test. The route-inventory test already walks the router; every new
  route must appear in the authorization matrix or it fails.
- Tests first, shown red, captured. Names that read as evidence.
- Never fabricate evidence, review comments or states. Mocked captures are named as mocked.
- Restart Claude Code after installing anything; always launch from the repo root.

**New for Lab 4:**

1. **Contract merged before code.** Issue 2 does not start until the contract PR is merged and
   its merged page is captured with the timestamp.
2. **Every count card has a drill-down whose list total equals the count.** An API test asserts
   it for every card. That test, plus one psql query per metric, *is* Part 5's "metrics match
   database queries".
3. **The server decides what the UI offers.** Allowed status moves (including the resolution
   gate) and allowed action operations come from the API, so the screen cannot disagree with
   the rule it displays. The server still enforces every one.
4. **No console errors.** A Playwright fixture fails any test on `console.error`, `pageerror`, or
   a same-origin 5xx. This turns labsheet 8.5's "console errors removed" into a test.
5. **Evidence folders explain themselves.** Each `artifacts/lab-04/evidence/issue-N/` has a
   `README.md` listing every file and what it proves.
6. **Answer review on GitHub, then in reviewer.md.** Never only in reviewer.md.
7. **Keep `ai-use.md` as a running log.** One or two prompts per Issue, plus what went wrong.

---

## 4. Decisions to settle in Phase 1 — with recommendations

The labsheet leaves these open, and several of its sentences pull against each other. The
recommendations are starting positions to argue with. Record your choices, in your own
reasoning, as **C-122 onward** in `docs/lab-04/decisions.md`. FR, BR and AC restart at 01;
cite earlier rules as `L3 BR-45`, `L2 C-26`.

### 4.1 The labsheet conflicts you must resolve first

| # | The labsheet says | But also says | Why it matters |
|---|---|---|---|
| X-1 | §3, §8.3: fields are Date/Time, Description, Result, **Performed by (auto)**, Follow-Up Required?, Follow-up Note, Attachment Notes | §9.1 AC-01: "authenticated creator **and approved assignee**"; Part 6: "assign … status transition, complete, cancel … **inactive-assignee rejection**"; Part 5: "current-user Actions Taken" | A pure work log cannot show half of Part 6 (10 pts). See D-01 |
| X-2 | §4.3: Requesters see Actions Taken "where approved by the specification" | §8.3: "Requesters will see **all** Actions Taken items" | §8.3 is the more specific; follow it (D-06) |
| X-3 | §3: "Action Date/Time" | §8.3: "Action **create** date/time" | Two different times: when the work happened vs when it was recorded (D-04) |
| X-4 | §8.1 mock-up: "Create Ticket" in the staff header and Quick Actions | L3 C-101: staff do not raise Tickets | Keep C-101 (D-21) |
| X-5 | §8.1 mock-up: "+3 from yesterday" under each card | §6.2: metrics computed from authoritative data | No daily snapshot exists to compute "yesterday" (D-17) |
| X-6 | §8.1/8.2 mock-ups render the name "TikTockIT" | L2 C-41 | Same typo as earlier labs; not followed |

### 4.2 Actions Taken

| ID | Decision | Options | Recommendation | Why |
|---|---|---|---|---|
| D-01 | What an Action Taken is | **A** work log only (§3 fields, Performed by = creator) · **B** planned work + log: adds an assignee and a status `PLANNED → COMPLETED / CANCELLED` · **C** full task model (In Progress, due dates, priorities) | **B.** Fields: `actionAt`, `description`, `result`, `followUpRequired`, `followUpNote`, `attachmentNotes`, plus `assigneeId` (chosen, default = me), `performedById` (**auto**: the user who completes it), `createdById` and `createdAt` (auto), `status`, `version`. An action may be created already `COMPLETED` (work done) or `PLANNED` (work to do) | Satisfies X-1 without inventing a task system. "Performed by (auto)" stays literally automatic; "assign" and "inactive-assignee rejection" have something to act on. C is scope creep |
| D-02 | Who writes Actions Taken | Owner only · any active IT Staff/Admin · creator/assignee only | **Any active IT Staff or Administrator, on any Ticket they can see** (L3 C-93). Requester → 403 before the Ticket is loaded. Assignee must be an active IT Staff or Administrator, else 422 `ASSIGNEE_NOT_ELIGIBLE` (reuses L3 BR-48's code) | BR-02 ("an Action may be by a different IT Staff member") and 4.3 ("IT Staff create and update") |
| D-03 | What can change after creation | Everything, always · nothing · planned only | **`PLANNED` is editable** (description, `actionAt`, assignee, attachment notes). **Complete** sets `result`, `followUpRequired`, `followUpNote`, `performedById`. **Cancel** needs a `result` that states why. `COMPLETED` and `CANCELLED` are **final**; a correction is a new action | An auditable record (learning outcome). Gives Part 6 its edit, complete and cancel without letting history be rewritten |
| D-04 | Field rules | — | `description` and `result` trimmed, 1–1000; `followUpNote` 1–500, **required iff** `followUpRequired`, and **400 if sent while false**; `attachmentNotes` 0–500, optional, plain text. `actionAt` ISO 8601 with offset, ≥ Ticket `createdAt`; for `COMPLETED` also ≤ now + 5 min. `createdAt` is the server's "Action create date/time" (X-3). Display both in Asia/Bangkok (L2 C-39). Rendered as plain text, `pre-wrap` | Covers "dates" in the BR list. The 5-minute allowance absorbs clock skew between laptop and server |
| D-05 | Ticket statuses that accept action writes | — | `NEW, OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER, REOPENED`. `RESOLVED` → 409 `TICKET_RESOLVED` ("Reopen it first"). `CLOSED`/`CANCELLED` → 409 `TICKET_CLOSED` (C-109 extended) | Work on a Resolved Ticket without reopening it would bypass the gate |
| D-06 | What the Requester sees | Nothing · completed only · everything | **Every action on their own Tickets, every field, read-only; names only, never email** (L3 C-95). Non-owned → 404. The staff composer carries a visible "Shown to the Requester" label; Internal Notes remain the private channel | §8.3 (X-2). The label makes "private versus shared content" (§7) visible |
| D-07 | Ordering | — | `actionAt desc, id desc` everywhere — list, API, "latest" in the gate | "Stable ordering" (Part 7): ties never reorder between loads |
| D-08 | Endpoints | One PATCH that also changes status · sub-resources | `GET /api/tickets/:id/actions` (any role, visibility rules) · `POST /api/staff/tickets/:id/actions` · `PATCH /api/staff/actions/:id` (edit planned) · `POST /api/staff/actions/:id/complete` · `POST /api/staff/actions/:id/cancel` | One operation, one effect, one set of 409s — the same reasoning as L3 C-102 |

### 4.3 Ticket workflow

| ID | Decision | Options | Recommendation | Why |
|---|---|---|---|---|
| D-09 | The resolution gate (§4.5) | Owner only (Lab 3) · ≥1 completed action · no planned actions · latest action needs no follow-up · a Resolution Summary field | A move to `RESOLVED` needs **all of:** an owner (L3), **≥1 `COMPLETED` action, no `PLANNED` action, and the latest `COMPLETED` action has `followUpRequired = false`.** Otherwise 409 `RESOLUTION_GATE_NOT_MET` with a `reasons` array. Checked inside the same transaction as the update. No separate Resolution Summary field. **Legacy Tickets** (no actions) are never re-validated: an existing Resolved or Closed row stays as it is; an open one must have an action recorded before it can be resolved | Gives "Follow-Up Required?" a real effect with no new entity: "follow-up needed" means the work is not finished. The Requester's flag stays advisory (§4.5) |
| D-10 | Cancelling a Ticket with planned actions | Block · auto-cancel the actions | **Block:** 409 `PLANNED_ACTIONS_OPEN` — cancel the actions first | No hidden side effects; easy to test and to explain |
| D-11 | The final transition matrix | — | **Lab 3's matrix in `server/src/lib/status-transitions.ts`, unchanged**, plus D-09 on `→ RESOLVED` and D-10 on `→ CANCELLED`. No automatic transitions: creating or completing an action never moves the Ticket; a Requester comment never leaves Waiting. Requesters never change status (L3 BR-05) | §4.5 asks to "refine and document", not to redesign. Automatic moves would bypass the confirmations |
| D-12 | Stale-update detection (§6.1) | `If-Match` + ETag header · `version` in the body · `updatedAt` compare | **`version Int` on `Ticket` and `ActionTaken`.** Every PATCH and transition sends `version`; the update is conditional on it; a mismatch → 409 `STALE_UPDATE` with the current resource. Missing `version` → 400. Ticket `version` moves on status, owner, IT Priority, claim, and the Requester flag — **not** on comments, notes, attachments or actions. Replaces the Lab 3 retry loop | An integer is simpler to test than timestamp equality, and body fields are simpler for a student client than ETags. Making it required means a client that skips it is refused, not trusted |
| D-13 | Duplicate submission (§8.5; supersedes L2 C-26) | UI-disable only · idempotency key · natural-key dedupe | **`clientRequestId` (UUID, generated when the form opens)** on the four creates: Ticket, Action Taken, Public Comment, Internal Note. Unique per `(author, clientRequestId)`. A repeat returns **200 with the original row**, not a second 201. The UI keeps disabling the button. PATCHes are already covered by D-12 | "Network retry" cannot be stopped in the UI. Comments and notes are append-only, so a duplicate could never be removed |
| D-14 | "Recently updated" | `updatedAt` · new `lastActivityAt` | **`lastActivityAt` on Ticket**: set on create, every workflow change, Public Comment, Attachment add/remove, every action write, the Requester flag. **Not on Internal Notes.** Backfill: the greatest of `updatedAt`, the latest Public Comment and the latest Attachment time. "Last updated" on every screen shows it | The Requester's list must not reveal that something private happened. `updatedAt` misses comments today |
| D-15 | "Recently resolved" | Derive from history · `resolvedAt` column | **`resolvedAt`**: set on `→ RESOLVED`, cleared on `→ REOPENED`, kept on `→ CLOSED`. **Legacy rows stay NULL** — no record says when they were resolved. They count in status counts but never in "recently resolved". The seed sets it for its own Tickets | Answers 5.2 ("how dashboard calculations treat existing records") without inventing dates |
| D-16 | Status history | None · append-only `TicketStatusChange` | **Add it:** `ticketId, fromStatus, toStatus, changedById, changedAt`, written in the same transaction as the change, no update or delete path. Shown on both detail screens oldest first (`changedAt, id`). Legacy Tickets show "History is recorded from <migration date>" | Part 7 asks for append-only behavior and stable ordering; auditability is a learning outcome. About 2 hours. Drop it only if time runs out — then say so in section 11 |

### 4.4 Dashboards

| ID | Decision | Recommendation | Why |
|---|---|---|---|
| D-17 | Time rules | Server computes everything at request time. "Recent" = **rolling 7 days** (now − 168 h), so no calendar boundary is involved; display in Asia/Bangkok. **No "from yesterday" deltas** (X-5). If a "today" metric is ever added, it is the Asia/Bangkok calendar day | §6.2 asks for time zone and boundaries; a rolling window has none to get wrong |
| D-18 | Count = drill-down invariant | Every count card has exactly one drill-down URL; that list's `meta.total` equals the card. Lists are top 5 (`activity desc, id desc`), each item links to its Ticket, with a "View all" | Part 5's "metrics match database queries" becomes one test per card |
| D-19 | API shape | `GET /api/dashboard/requester` (Requester only) and `GET /api/dashboard/staff` (IT Staff and Admin; Admin also gets `userCounts`). Body: `{ generatedAt, timeZone, cards: [{ key, label, count, drillDown }], lists: {…} }`. Other roles → 403 before any query | §6.2: concise data, never whole Ticket collections |
| D-20 | Refresh | Load on open plus a manual Refresh button. No polling | The mock-up shows Refresh; polling adds flaky tests |
| D-21 | Navigation | "Dashboard" first in the nav and the landing screen for every role. Staff keep Ticket Queue (+ User Management for Admin); Requesters keep My Tickets and Create Ticket. No staff Create Ticket (X-4). No Profile menu — Logout stays where it is | §7 asks for Dashboard navigation with active-page indication |

**Draft Requester metric catalogue** (every query is scoped to the session's user first):

| Card / list | Definition | Drill-down |
|---|---|---|
| Open tickets | status ∈ New, Open, In Progress, Waiting for Requester, Reopened | `/tickets?statusGroup=open` — **new parameter** |
| Waiting for you | status = Waiting for Requester | `/tickets?currentStatus=WAITING_FOR_REQUESTER` |
| Resolved — awaiting closure | status = Resolved | `/tickets?currentStatus=RESOLVED` |
| Closed | status = Closed | `/tickets?currentStatus=CLOSED` |
| Recently updated (list, 5) | `lastActivityAt` within 7 days | each row → Ticket Detail; View all → `/tickets?sort=lastActivityAt:desc` — **new sort** |
| Recently resolved (list, 5) | `resolvedAt` within 7 days | each row → Ticket Detail |

**Draft IT Staff / Administrator metric catalogue** ("open" = the queue's default set: not Closed, not Cancelled):

| Card / list | Definition | Drill-down |
|---|---|---|
| Unassigned | open, no owner | `/queue?owner=unassigned` |
| Mine | open, owner = me | `/queue?owner=me` |
| New · Open · In Progress · Waiting · Reopened · Resolved | open, by status | `/queue?currentStatus=…` |
| High IT Priority | open, IT Priority High | `/queue?itPriority=HIGH` |
| Requester says resolved | open, `requesterResolvedAt` set | `/queue?requesterResolved=true` — **new filter** |
| My planned actions | actions `PLANNED`, assignee = me, Ticket not terminal | the dashboard's own "My actions" panel (same total) |
| Recently updated (list, 5) | all open, `lastActivityAt` | View all → `/queue?sort=lastActivityAt:desc` — **new sort** |
| Urgent (list, 5) | open, High IT Priority, oldest first | View all → `/queue?itPriority=HIGH` |
| Admin only: active Requesters · IT Staff · Administrators | active users by role | `/users?role=…` — the screen must read it from the URL |

**Empty versus zero.** A zero card is not an empty state. Empty = a list with no rows, which
gets the Lab 2 empty component. Real zero cases already exist in the seed: Nattapong Wong
(active Requester, no Tickets) and Panida (Administrator, owns nothing).

### 4.5 Data, seed, migration, hardening

| ID | Decision | Recommendation | Why |
|---|---|---|---|
| D-22 | Migration shape | Additive only: new enum `ActionStatus`, new tables `ActionTaken`, `TicketStatusChange`; new columns on Ticket (`version` default 0, `lastActivityAt` backfilled then NOT NULL, `resolvedAt` NULL), nullable `clientRequestId` columns with plain composite `@@unique([authorOrRequesterId, clientRequestId])` — PostgreSQL allows repeated NULLs, so legacy rows need no value, and a partial index would show as drift because Prisma cannot express one. Enum in its own migration first (L3 C-70). Indexes: `ActionTaken(ticketId, actionAt, id)`, `ActionTaken(assigneeId, status)`, `Ticket(requesterId, lastActivityAt)`, `Ticket(resolvedAt)`, `TicketStatusChange(ticketId, changedAt, id)` | §5.1 asks for at least two justified design decisions: D-12 (version column), D-14 (denormalized activity time) and D-16 (separate history table) are three |
| D-23 | Seed (§5.3) | Idempotent as before. Tickets with **zero, one and several** actions; one Ticket with actions by **three different staff** (BR-02, Part 6); planned, completed, cancelled and follow-up-required actions; one Ticket that passes the gate and one that fails it; `resolvedAt` on the seed's own Resolved/Closed Tickets; keep the two zero-metric accounts | Every Part 5–8 screenshot needs a real row behind it |
| D-24 | Recovery (§5.2) | `pg_dump -Fc` before migrating. Rehearse on a restored copy (`toktickit_rehearsal`, as L3 C-83). Recovery = restore the dump, tested once in the rehearsal and recorded. No down-migration: Prisma has none and every change is additive | "Documented and tested" — the restore test is the evidence |
| D-25 | Form protection (§8.5) | Every form keeps the user's input after 400/409/422/500 and after a network failure. On `STALE_UPDATE` the draft is kept, the fresh server values are shown, and the user chooses to re-apply | Testable per form in Vitest |
| D-26 | Performance-smoke (§10) | `toktickit_perf` database with ~2,000 bulk-inserted Tickets and ~5,000 actions. Each dashboard endpoint called 20 times; p95 under 500 ms locally; `EXPLAIN` of each count query shows an index. Its own script (`npm run test:perf`), so Supertest counts stay stable | A smoke, not a benchmark — generous threshold, real database |
| D-27 | Hardening scope | Console-error fixture (rule 4); a nav-walk spec per role that opens every destination; remove anything obsolete the audit finds; **keep `/system-check`** (the Lab 1 contract, public, outside the nav); answer PAKATO's Lab 3 paging comment (#53) | §7 last bullet and §8.5, made checkable |
| D-28 | Branches and IDs | `lab4-staging`; `feature/lab4-N-slug`; decisions C-122 onward | The Lab 2 and Lab 3 branch names still exist on origin |

### Draft authorization matrix — Lab 4 rows

| Operation | Anonymous | Must change password | Requester | IT Staff | Admin |
|---|---|---|---|---|---|
| `GET /api/tickets/:id/actions` | 401 | 403 | own (else 404) | any | any |
| Create / edit / complete / cancel an action | 401 | 403 | **403** | ✓ | ✓ |
| `GET /api/dashboard/requester` | 401 | 403 | ✓ (own data only) | 403 | 403 |
| `GET /api/dashboard/staff` | 401 | 403 | **403** | ✓ | ✓ (+ user counts) |
| Every Lab 3 row | unchanged | | | | |

---

## 5. Issues, branches, and estimates

| # | GitHub | Issue | Branch | Est. | Feeds Part | Model |
|---|---|---|---|---|---|---|
| 1 | #62 | Sprint 4 engineering contract | `feature/lab4-1-contract` | 5–7 h | 2, 3 | Opus |
| 2 | #63 | Data model, migration, backfill, seed | `feature/lab4-2-data-model` | 3–4 h | 2, 3 | Sonnet |
| 3 | #64 | Actions Taken API | `feature/lab4-3-actions-api` | 4–5 h | 6 | Opus |
| 4 | #65 | Actions Taken UI | `feature/lab4-4-actions-ui` | 4–5 h | 6 | Sonnet |
| 5 | #66 | Ticket workflow: gate, stale updates, status history | `feature/lab4-5-ticket-workflow` | 4–5 h | 7 | Opus |
| 6 | #67 | IT Staff and Administrator dashboard | `feature/lab4-6-staff-dashboard` | 4–5 h | 5 | Sonnet |
| 7 | #68 | Requester dashboard | `feature/lab4-7-requester-dashboard` | 2–3 h | 8 | Sonnet |
| 8 | #69 | Final hardening and regression | `feature/lab4-8-hardening` | 3–5 h | 8, 9 | Sonnet |
| 9 | #70 | E2E and responsive/visual evidence | `feature/lab4-9-e2e-visual` | 3–4 h | 3, 5–9 | Sonnet |
| 10 | #71 | Release integration and documentation | `feature/lab4-10-release-docs` | 3–4 h | 1, 3, 4 | Sonnet |

Order: **1 → 2 → 3**, then 4 and 5 (5 needs 3's actions for the gate), then 6 → 7, then 8 →
9 → 10. **Issue 1 merges before Issue 2 starts.** Everything flows feature branch →
`lab4-staging` → one release PR → `main`.

Use Opus for the contract, for Issues 3 and 5 (the rule-dense ones), and for every
end-of-Issue audit. Use Sonnet elsewhere. Switch to Opus if Sonnet loops on the same failing
test twice.

### Stacking with a 1–2 day review

Ten PRs in fourteen days with a 1–2 day review each cannot merge one after another. So:

- **The contract PR is never stacked.** It merges into `lab4-staging` before Issue 2 starts.
- **Feature PRs #2–#9 stack** when the PR below is still waiting: `--base` is the branch
  directly below, and the body says so. Each is retargeted to `lab4-staging` and merged as
  soon as the one below it merges. A change asked for in a lower PR is made there and merged
  upward with `git merge` (never rebase), running all three suites at each level.
- **PAKATO reviews each PR as it arrives**, not in one batch at the end (the Lab 3 gap).
- **The release PR is never stacked.** It opens only after every feature PR has merged.

### Calendar — deadline Sunday 25 October

About 35–47 hours over 13 working days: 3 hours on weekdays, 5–6 on weekends.

| Date | Work | Gate before moving on |
|---|---|---|
| Mon 12 Oct | Phase 0; send PAKATO message A; prompts 1.1–1.2 | Decisions written |
| Tue 13 | Prompts 1.3–1.7; fix the audit; **open the contract PR in the evening** | PR link sent to PAKATO |
| Wed 14 | Answer review comments on GitHub; restore `lab3-final.dump` into `toktickit_rehearsal` (no code) | **Contract merged**; merged page captured |
| Thu 15 | Issue 2 — migration, backfill, seed | Counts identical; zero drift. **Latest day the contract can merge** |
| Fri 16 | Issue 3 — Actions Taken API | PR open |
| Sat 17 | Issue 4 — Actions Taken UI | PR open |
| Sun 18 | Issue 5 — Ticket workflow | PR open |
| Mon 19 | Issue 6 — staff/admin dashboard | Count = drill-down tests green |
| Tue 20 | Issue 7 — Requester dashboard; start Issue 8 | PR open |
| Wed 21 | Issue 8 — hardening | Console-error fixture green; **UI frozen** |
| Thu 22 | Issue 9 — E2E and final screenshots | Every checklist row measured |
| Fri 23 | Issue 10; every feature PR merged; **open the release PR** | PAKATO asked to approve by Sat noon |
| Sat 24 | Merge to main; all suites on main; PDF; read it end to end | **Ready to submit** |
| Sun 25 | Buffer; submit | — |

If the contract has not merged by Thursday 15, every later date slips a day and Sunday stops
being a buffer. Message PAKATO on Wednesday evening if there is no review yet.

---

## 6. Phase 0 — setup (about 45 minutes)

```powershell
docker start toktickit-db
docker ps                                  # toktickit-db Up on 5432
cd C:\Downloads\Lab1_Starter_Scaffold\toktickit
git checkout main
git pull
git status                                 # AGENTS.md, tmp/, detail-*-owned.png are Lab 3 leftovers

# Safety copy of the final Lab 3 database. Keep it OUTSIDE the repo.
docker exec toktickit-db pg_dump -U toktickit -d toktickit -Fc -f /tmp/lab3-final.dump
docker cp toktickit-db:/tmp/lab3-final.dump C:\Downloads\lab3-final.dump

# Databases Lab 4 uses besides dev and toktickit_test (which already exist)
docker exec toktickit-db createdb -U toktickit toktickit_rehearsal
docker exec toktickit-db createdb -U toktickit toktickit_perf

git checkout -b lab4-staging
git push -u origin lab4-staging
git checkout -b feature/lab4-1-contract
mkdir docs\lab-04\spec
copy C:\Downloads\SELab4.pdf docs\lab-04\spec\Lab_4_sheet.pdf   # adjust to where you saved it
```

Then:

- Decide the three leftovers: open `AGENTS.md`. If it duplicates `CLAUDE.md`, delete it; two
  rule files drift. Delete `tmp/` and the stray PNGs, or add them to `.gitignore`.
- Add `docs/lab-04/spec/*.pdf` to `.gitignore`.
- Ask Claude Code to create the ten Issues with `gh issue create` from section 5, add them to
  the **TokTickIT Individual Sprints** board in Backlog, and write the real numbers into section 5.
- Send PAKATO **message A** (section 12).

---

## 7. Phase 1 — contract prompts (Issue 1, Opus)

Run one at a time, and read and decide between each. The decisions are the graded work.

### 1.1 — Read first, write nothing (plan mode)

```
Read docs/lab-04/spec/Lab_4_sheet.pdf, CLAUDE.md, docs/lab-04/handoff.md,
docs/lab-03/decisions.md, docs/lab-03/specification.md sections 5.1, 5.2 and 7,
server/prisma/schema.prisma, server/src/lib/status-transitions.ts,
server/src/lib/list-query.ts, server/src/routes/staff.ts, server/src/routes/tickets.ts,
client/src/auth/roles.ts and client/src/pages/MyTickets.tsx.

Write nothing. Report:
1. Every Lab 4 deliverable, grouped by the 9 PDF parts it feeds.
2. Every place in code, tests and Lab 3 docs that Lab 4 invalidates - file and line. Check
   my table in handoff section 1 and tell me what it missed.
3. Every Lab 3 test that Lab 4 changes (version on PATCH, landing on /dashboard, anything
   else): adapted or retired, and which decision forces it.
4. The labsheet conflicts in handoff 4.1 - any I missed.
5. Where you disagree with a recommendation in handoff section 4, with a reason. Do not
   agree to be agreeable. Pay most attention to D-01, D-03, D-09 and D-12.
```

### 1.2 — Decision log

```
My decisions are below (handoff section 4, with my changes marked). Write
docs/lab-04/decisions.md continuing at C-122: ID, topic, decision, reason as I stated it,
what it supersedes. Supersede L2 C-26 explicitly, and name every Lab 3 decision that is
extended (C-93, C-101, C-103, C-109). Add a short "Carried from Lab 3" list of decisions
that still hold unchanged. Do not add reasons I did not give.
```

### 1.3 — Rewrite the guardrail

```
Rewrite CLAUDE.md for Lab 4. Keep: repo path, mandatory stack, the approved auth mechanism,
Zen Green tokens, TokTickIT naming, the security rules and fixed check order, git working
agreement and pre-commit inspection, secrets, never delete or skip a test, never migrate
reset, migrate deploy only, verify-by-evidence, the evidence rules, the token budget.
Change:
- Scope = Lab 4; remove Actions Taken and dashboards from "never add"; add the labsheet
  4.2 list and handoff section 2's list.
- Branches feature/lab4-N-slug, every PR --base lab4-staging, with one exception recorded
  as a new decision: feature PRs 2-9 may stack on the branch directly below while it awaits
  review (handoff section 5). The contract PR and the release PR are never stacked.
- Section 12 layout for Lab 4, with client tests in client/tests/lab-04/.
- Contract = docs/lab-04/{specification,api-spec,ui-spec,tests,decisions}.md.
- Labs 1-3 must keep working; a test is retired only through a decision row naming its
  replacement.
- New rules from handoff section 3 (contract merged before code, count = drill-down,
  server decides what the UI offers, no console errors, evidence README per folder).
Keep it under ~300 lines. Move Lab 3 detail out rather than appending.
```

### 1.4 — specification.md

```
Write docs/lab-04/specification.md with the 11 sections in labsheet 9, from decisions.md.
- FR/BR/AC restart at 01. Cite earlier rules as "L3 BR-45".
- BR-01 and BR-02 exactly as labsheet 4.4 words them. Then rules for: action fields and
  dates, action lifecycle, who may write, Requester visibility, ordering, ticket statuses
  that accept actions, the resolution gate, cancel with planned actions, stale updates,
  duplicate submission, activity time, resolvedAt, status history, every dashboard metric
  (name, exact query, empty behavior, drill-down), time zone and boundaries.
- The full transition matrix (8 x 8) with the gate and the cancel rule marked.
- The authorization matrix: every endpoint, Lab 1-4, x anonymous / must-change /
  Requester / IT Staff / Admin, with the status each gets.
- Section 7: the models and fields, indexes with reasons, the migration as ordered steps,
  backfill rules, legacy-row behavior in every metric, recovery, and the seed.
- ACs in Given-When-Then, atomic, including labsheet AC-01 and AC-02 verbatim.
- Section 10 is the Product Definition of Done you will be held to.
Assumptions go in section 11, not buried. Do not restate the handout.
```

### 1.5 — api-spec.md and ui-spec.md

```
Write docs/lab-04/api-spec.md and docs/lab-04/ui-spec.md from specification.md.

api-spec: every new endpoint - path, method, request and response, validation, the fixed
check order, error codes, 400/401/403/404/409/422/500. Changed Lab 2-3 endpoints get a
"changed from Lab 3" note: version on every PATCH, clientRequestId on the four creates,
statusGroup and the lastActivityAt sort on My Tickets, requesterResolved and the
lastActivityAt sort on the queue, allowedTransitions and statusHistory on the detail DTOs.
Dashboards: each card's key, query, and drill-down string.

ui-spec: the shell with Dashboard nav; Staff, Admin and Requester dashboards (cards, lists,
Quick Actions without Create Ticket for staff, Refresh); the Actions Taken area on both
detail screens (list, create, view, edit, complete, cancel; planned vs completed vs
cancelled visually distinct; "Shown to the Requester" label); status history; metric cards
as links whose accessible name carries the label, the number and the destination; the
STALE_UPDATE presentation; every feedback state; the three viewports; accessibility; the
visual and accessibility checklist rows labsheet Part 9 names; screenshot names under
artifacts/lab-04/screenshots/. Exact tokens from CLAUDE.md. Reuse existing components.

Consistency with specification.md is required. Stop and tell me on any conflict.
```

### 1.6 — tests.md

```
Write docs/lab-04/tests.md on the Lab 3 template. Columns: Test ID, Type, Requirement/AC,
What It Tests, Expected Result, Automated Test File, Final (blank for now).
Ten levels: unit, API/integration, UI component, UI style, responsive, authorization,
workflow, migration/regression, performance-smoke, E2E. Section 12 paths, plus
migration.db.test.ts and the perf-smoke file.
Must include:
- One count = drill-down test per dashboard card.
- The gate's every failing reason, alone and combined; a stale-update race on status and
  on an action edit; a duplicate clientRequestId on each of the four creates.
- Requester -> every staff action endpoint -> 403 with no action content.
- A "Labs 1-3 regression disposition" table: every changed test -> adapted or retired,
  with the decision ID.
- The AC traceability matrix. Tell me which ACs have no automated test. Do not invent a
  weak test to fill the gap.
```

### 1.7 — Audit (fresh session, Opus)

```
Audit docs/lab-04/*.md for internal consistency. Read-only. Report: endpoints absent from
the authorization matrix; dashboard cards without a query, empty behavior or drill-down;
ACs with no test; tests citing files outside section 12; status codes or error codes that
differ between documents; anything in the labsheet 4.2 excluded list; decisions cited but
not recorded; any Lab 3 behavior changed without a decision row.
```

Fix what the audit finds. Commit, open the PR into `lab4-staging`, send PAKATO the link,
reply to his comments on GitHub, and merge. **Capture the merged PR page with its timestamp
before Issue 2 starts.**

---

## 8. Implementation prompts (Issues 2–10)

Every Issue opens with the same header, in plan mode from a fresh session (`/clear`):

```
Issue #N, branch feature/lab4-N-slug from an up-to-date lab4-staging. Move #N to Started.
Read CLAUDE.md, docs/lab-04/handoff.md, and only the contract sections for this Issue.
Plan first: files you will touch, and the tests.md IDs you will write BEFORE the code.
Wait for my OK. Then: write those tests, run them, save the red run, implement, save the
green run, run all three suites. Anything the contract does not cover: stop and ask.
Before the PR: one subagent audit, every evidence row this Issue owns captured, and
evidence/issue-N/README.md naming each file.
```

### Issue 2 — data model, migration, backfill, seed

```
Implement specification.md section 7 only.
1. Before: migrate status, row counts per table, tickets per requesterId and per
   currentStatus. Save it.
2. Write migration.db.test.ts from tests.md; show it red.
3. Enum migration first, then the tables, columns, backfill and indexes. Create each with
   --create-only and show me the SQL before applying. No DROP anywhere.
4. Rehearse on toktickit_rehearsal restored from C:\Downloads\lab3-final.dump: migrate
   deploy, counts, backfill checks, then the recovery test (drop, restore, verify). Save it.
5. Only then migrate dev. Prove zero drift with migrate diff --exit-code.
6. Re-run the counts: every pre-existing count identical; lastActivityAt never null;
   resolvedAt null on every legacy row.
7. Seed per decision D-23. Run it twice; show counts unchanged and a changed password not
   overwritten.
```

### Issue 3 — Actions Taken API

```
The five action endpoints in api-spec, with the fixed check order, version on edit,
complete and cancel, clientRequestId on create, ASSIGNEE_NOT_ELIGIBLE, TICKET_RESOLVED,
TICKET_CLOSED, field and date validation, lastActivityAt updates, and Requester read access
through GET /api/tickets/:id/actions. Tests: actions-taken.api.test.ts. Include: Requester
-> POST action -> 403, no content; a non-owned ticket's actions -> 404; an assignee
deactivated between page load and save -> 422; two staff editing one planned action ->
one 200, one 409 STALE_UPDATE.
```

### Issue 4 — Actions Taken UI

```
The Actions Taken area on Staff Ticket Detail (list, create, view, edit planned, complete,
cancel, assignee select of active staff only, follow-up note shown and required only when
follow-up is ticked, the "Shown to the Requester" label) and read-only on Requester Ticket
Detail. Every feedback state; STALE_UPDATE keeps the draft (D-25); duplicate click sends
one request; after each write the Ticket summary (status, owner, Last updated) refreshes
from the response. Tests: ActionsTaken.test.tsx. Screenshots for every Part 6 state,
desktop.
```

### Issue 5 — Ticket workflow

```
Version on status, owner and IT Priority (replace the Lab 3 retry loop); the resolution
gate with reasons; the cancel rule; resolvedAt; TicketStatusChange written in the same
transaction; allowedTransitions and statusHistory on both detail DTOs; the status menu
renders exactly allowedTransitions and shows the gate's reasons; a successful change
refreshes the Ticket summary status (labsheet 8.4); history on both screens.
Adapt the Lab 3 tests exactly as the regression table says. Tests:
ticket-workflow.api.test.ts and TicketWorkflow.test.tsx. Include a client that bypasses
the screen and PATCHes RESOLVED directly -> 409 RESOLUTION_GATE_NOT_MET.
```

### Issue 6 — IT Staff and Administrator dashboard

```
GET /api/dashboard/staff, the queue's requesterResolved filter and lastActivityAt sort,
User Management reading ?role= from the URL, and the dashboard screen (cards, My actions
panel, Recently updated, Urgent, Admin user counts, Refresh, loading, empty, forbidden,
failure, three viewports). Tests: staff-dashboard.api.test.ts with one count = drill-down
test per card, and StaffDashboard.test.tsx. Then run one psql query per card on the dev
database and save it next to the API response - that is Part 5's evidence.
```

### Issue 7 — Requester dashboard

```
GET /api/dashboard/requester, My Tickets' statusGroup parameter and lastActivityAt sort,
My Tickets reading its filters from the URL, and the screen. Tests:
requester-dashboard.api.test.ts (count = drill-down per card; Requester A never sees
Requester B's numbers; staff -> 403) and RequesterDashboard.test.tsx. Capture Nattapong
Wong's real empty dashboard.
```

### Issue 8 — final hardening and regression

```
1. The console-error fixture in e2e/support, applied to every spec.
2. A nav-walk spec per role that opens every destination and asserts no error state.
3. clientRequestId on Create Ticket, Public Comments and Internal Notes (D-13).
4. Form protection (D-25) on every form; one test each.
5. A read-only audit for obsolete, duplicate or placeholder UI; fix what it finds.
6. README: Lab 4 setup, migration, seed, test, perf-smoke and demo steps.
Run all three suites and show Lab 1-3 counts before and after; any drop must match a
retirement row.
```

### Issue 9 — E2E and visual evidence

```
e2e/lab-04/actions-taken-flow, ticket-resolution and dashboards across the three viewport
projects. Regenerate the final Part 5-9 screenshot sets on toktickit_evidence (fresh
migrate deploy + seed), named per ui-spec. Measure every visual and accessibility checklist
row - touch targets, focus after transitions settle, clipping, overlap, overflow at 390 -
and record the measured value. Never tick from reading CSS. Run perf-smoke and save it.
Report user, ticket and action counts after the run to show nothing leaked.
```

### Issue 10 — release

```
Fill tests.md Final from real runs on this branch; reviewer.md (both directions, only what
exists on GitHub); ai-use.md with the 6-10 key prompts marked and "My Reflection" left as
a heading; artifacts/lab-04/report-lab04.md with "Answer Part 1" ... "Answer Part 9".
Then the release PR lab4-staging -> main. After the merge, run all suites on main - that
output is Part 3.
```

### End-of-Issue audit (fresh session, Opus) — before every PR

```
Audit this branch against the contract for Issue #N. Read-only.
1. Each AC in scope: covering test ID and file; run it.
2. Each route added or changed: middleware chain, and the status for anonymous,
   must-change-password, each wrong role, and non-owner - each proven by a named test.
3. Each write: is version or clientRequestId enforced where the contract says?
4. Anything built that the contract does not mention; anything required that is missing.
5. Any response that could carry passwordHash, a session token, another user's data, or
   an Internal Note to a Requester.
6. Contract conflicts. Report them; do not fix.
```

---

## 9. Per-issue loop

1. Board: Backlog → Specified → Started.
2. Fresh session, header from section 8, approve the plan.
3. Red run saved → implement → green run saved. Read every changed file yourself.
4. Capture new UI states now, while they exist.
5. Audit on Opus; fix findings.
6. Pre-commit inspection → commit → push → PR → card to PR Review → send PAKATO the link the same day.
7. If he asks for a change: card to **Fixing**, capture the board, reply on GitHub, fix, reply again with the commit.
8. Approved → merge → card to Done → capture. One or two lines into `ai-use.md`.

---

## 10. Evidence to capture as you go

| Part | Capture during |
|---|---|
| 1 | Board at every move (PR Review, **Fixing**, Done); review threads while open; merged PR pages |
| 2 | Merged contract PR with timestamp, before Issue 2 (Issue 1) |
| 3 | Red/green runs per Issue; migration before/after counts, zero drift, rehearsal and restore; perf-smoke; all suites on `main` (Issue 10) |
| 5 | Staff dashboard with real data; each card's drill-down landing on the queue with the same total; My actions panel; recent and urgent lists; loading; real zero (Panida); empty lists; Requester → staff dashboard forbidden (UI and API); failure with Retry; three viewports; card-vs-psql table |
| 6 | Action list with several actions by different staff; create planned; create completed; edit; complete; cancel with reason; follow-up note required; inactive assignee 422; STALE_UPDATE; Requester read-only view; Requester → POST action 403 output; three viewports |
| 7 | Allowed moves menu; gate refusal with each reason; bypass PATCH → 409 output; cancel blocked by planned action; status history oldest first; Requester sees history and actions but no Internal Notes |
| 8 | Requester dashboard (Kanya or Siriporn) with every card and both lists; drill-down; A vs B isolation; Nattapong's empty dashboard; regression: login, My Tickets, Ticket Detail, Attachments, Public Comments, queue, Internal Notes, User Management on the Lab 4 build |
| 9 | Every Lab 4 screen at desktop, tablet, mobile; measured checklist |

---

## 11. PDF checklist

Filename `report_lab04_67070503489.pdf`. Headings `Answer Part 1` … `Answer Part 9`, in
order, nothing else at that level. Concise; working links; screenshots readable without
zoom. The repository and final `main` remain the source of truth.

Traps carried from Labs 2 and 3:

- No template placeholder headings in any rendered document.
- `reviewer.md` carries PAKATO's name, ID, handle, PR links, his comments, **your replies**,
  his approvals, and your reviews of his PRs.
- Where a review or a state genuinely did not happen, say so plainly.
- "My Reflection" is in your own words.
- Every figure must match the final `main`. If the UI changes after a capture, recapture.

---

## 12. Messages to PAKATO

**A. Phase 0 — before any Lab 4 work**

> Hi PAKATO, Lab 4 is starting. This time the contract PR comes first and on its own — I'll send it Tuesday evening (13 Oct). Could you review it by Wednesday night? The labsheet grades proof that the spec existed before the code, so I can't start implementing until it's merged.
>
> After that, about eight PRs will arrive one a day from Thursday 15 to Wednesday 21, then the release PR on Friday 23 — I'll need that one approved by Saturday noon. Some will be stacked, so the PR body will say which branch it sits on. If you see something wrong, please use **Request changes** rather than approving with a note — I'll fix it on the branch and reply. Happy to do the same for yours; send me your links as they come.

**B. With each PR** — the link, the Issue, and one line naming its riskiest part
(e.g. "the gate in `ticket-workflow` and the version check are where bugs would hide").

**C. The release PR** — "It contains only the PRs you already reviewed."
