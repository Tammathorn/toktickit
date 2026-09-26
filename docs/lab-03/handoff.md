# TokTickIT — Lab 3 Plan for Claude Code

This plan is for a fresh chat or a fresh Claude Code session. Commit it as
`docs/lab-03/handoff.md` on the contract branch so both can read it.

Author: Tammathorn Kananurak — 67070503489 — GitHub @Tammathorn
Peer reviewer: 67070503434 — GitHub @PAKATO123 (display name PAKATO)

Lab 3 is worth 60 points. It adds Users, Roles, IT Staff Ticketing, and Admin Screens. It
turns the Requester-only MVP into a three-role system with real login.

---

## 1. Where Lab 2 ended (checked against GitHub on 2026-09-26)

| Item | Value |
|---|---|
| `main` | `e4f3bf4`, release PR **#36** merged |
| Lab 2 Issues / PRs | Issues #10–#17; PRs #18–#36, including four staging→main PRs |
| Decision log | `docs/lab-02/decisions.md`, **C-01..C-52** |
| Last recorded suites | 86 server · 48 client · 126 Playwright (3 viewports) |
| Repo path | `C:\Downloads\Lab1_Starter_Scaffold\toktickit`. It is the only path. |
| Dependencies | express, cors, multer, Prisma 5.22, Vitest, Supertest, Playwright at the repo root |

### What in the current code Lab 3 breaks

Read this before writing any Lab 3 code. Each row is something the agent will trip over if
nobody tells it.

| Where | Today | Lab 3 needs |
|---|---|---|
| `CLAUDE.md` | Forbids authentication, passwords, sessions, IT Staff workflow, and comments | Must be rewritten **first**, or the agent will refuse the work or hedge |
| `schema.prisma` `RequesterUser` | No role, no password. The comment says Lab 3 attaches auth "without touching Ticket.requesterId" (LC-02) | Becomes `User` with role, password hash, and must-change flag. Existing ids and ticket ownership are preserved |
| `enum TicketStatus` | NEW, IN_PROGRESS, RESOLVED, CLOSED, CANCELLED. The schema comment claims "Lab 3 needs no enum migration" | This is **wrong** now. Add OPEN, WAITING_FOR_REQUESTER, and REOPENED |
| `Ticket.itPriority` | Nullable and never set | Backfill it from `requestedPriority`, and set it on create |
| Ticket owner | Does not exist | Add a nullable `ownerId` foreign key to User |
| Identity | `?requesterId=` on every route (C-42), and in the POST body (C-12) | Comes from the session only. A value the client sends is ignored (AC-03) |
| **C-13** | Returns 403 for another Requester's ticket. It *deliberately* leaks that the ticket exists, "because Lab 2 has no auth" | Labsheet 6.2 forbids leaking existence, so this becomes 404. Supersede C-13 and the linked C-20 |
| `GET /api/requesters` | Lists users with no authentication | Remove it (information leak) |
| `app.use(cors())` | Wildcard origin | A wildcard cannot carry cookies. See decision D-03 |
| `client/src/requester/`, `RequesterSelection.tsx`, selector state in the browser | The Lab 2 identity mechanism | Remove all of it, and document the removal (labsheet 5.2) |
| Lab 2 tests | Every Lab 2 server, client, and E2E test file uses `requesterId`. `attachments.api.test.ts` asserts 403 for non-owners (C-13, C-20). `RequesterSelection.test.tsx` and `selection-screenshots.spec.ts` test the selector itself | Adapt them to log in. Retire a test only through a decision row that names its replacement |
| Lab 2 branch names | `feature/1-sprint-spec` … `feature/8-release-docs` still exist on origin | Lab 3 needs **new** names (section 5) |

---

## 2. Lab 3 at a glance

**New screens:** Login, Change Password, IT Staff Ticket Queue, IT Staff Ticket Detail, and
User Management. Requester Ticket Detail gains Public Comments and a "Problem Appears
Resolved" action. The app shell shows the user's name, role, and a Logout action.

**Size:** 34–46 hours of hands-on work, plus review waiting time. It is larger than Lab 2,
because every Lab 2 test has to move onto a real login as well as carrying the new features.

**Out of scope. The agent must never add these:** email of any kind (invites, resets,
initial passwords), MFA, SSO, social login, self-registration, Actions Taken, SLA, escalation,
notifications, dashboards and KPIs, multi-tenancy, departments, multiple roles per user, user
deletion, bulk operations, import and export, account history, profile photos, account
lockout and unlock, approval workflows, user-list pagination, multi-column sort, multiple
simultaneous filters, production deployment, and the Resolution Summary and "Service Actions"
tab shown in the mock-up (Lab 4 material).

**Required files (labsheet section 12):**

```
docs/lab-03/            specification.md  tests.md  ui-spec.md  api-spec.md  reviewer.md  ai-use.md
server/tests/lab-03/    auth · authorization · staff-queue · staff-ticket-detail · comments-notes · users-admin  (.api.test.ts)
client/tests/lab-03/    Login · ChangePassword · StaffTicketQueue · StaffTicketDetail · UserManagement  (.test.tsx)
e2e/lab-03/             authentication · staff-ticket-flow · user-administration  (.spec.ts)
artifacts/lab-03/screenshots/   authentication/  staff-queue/  staff-ticket-detail/  user-management/
```

This is a minimum. Keep `decisions.md` and `handoff.md` in `docs/lab-03/`, and add
`server/tests/lab-03/migration.db.test.ts`. Client tests **must** live under `client/tests/`,
because `vite.config.ts` only collects files matching `tests/**/*.test.tsx`.

---

## 3. Working rules

**Carried over from Lab 2 — keep all of these:**

- The agent runs git, within limits that never relax:
  - It stages explicit paths only.
  - It reports exactly which files are staged before each commit.
  - Every PR uses `--base lab3-staging`.
  - No force-push. No rebasing a pushed branch. Nothing reaches main except through the release PR.
- Contract conflicts are reported and never silently resolved. Each one becomes a decision row.
- Never accept "done" without output you can see. Never fabricate evidence or review comments.
- Never `prisma migrate reset`. Never `npm run prisma:migrate`, because it runs `migrate dev`,
  which offers a reset. Apply migrations with `npx prisma migrate deploy`.
- Restart Claude Code after installing anything. Always launch it from the repo root.
- Screenshot as you go. Some states cannot be recreated later.

**New for Lab 3:**

1. **A security claim needs a test, not a code reading.** "Every route is protected" is proven
   by a route-inventory test (Issue 4). That test walks the Express router and fails if any
   non-public route answers without a session.
2. **Capture TDD red runs.** For each Issue, the agent writes the planned tests first, runs
   them, and you screenshot them failing. This is cheap, and it makes Parts 3 and 4
   believable.
3. **Name tests so the terminal output reads as evidence.** For example:
   `Requester GET /api/tickets/:id/internal-notes -> 403, no note content`. Part 7 asks for
   "direct API authorization evidence", and passing output with names like that *is* the
   evidence.
4. **Isolate test data.** Lab 2's screenshot spec quietly added tickets on every run. In
   Lab 3, users cannot be deleted, so leaked test users pile up in the admin list you
   screenshot for Part 8 (see D-15).
5. **Open each PR the day its tests go green.** Only 1 of 8 Lab 2 PRs was reviewed. Message
   @PAKATO123 during Phase 0: about ten PRs will arrive through the sprint, and you need
   comments with substance.
6. **Keep `ai-use.md` as a running log from day 1.** After each phase, paste in the one or two
   prompts that mattered and what went wrong. Part 4 then takes minutes, not an evening.

---

## 4. Decisions to settle in Phase 1 — with recommendations

The labsheet says you choose these *with the specification agent*. The recommendations below
are starting positions to argue with, not answers to paste. Record your choices, in your own
reasoning, as **C-53 onward** in `docs/lab-03/decisions.md`. Continuing the Lab 2 numbering
keeps decision IDs unique across labs. FR, BR, and AC numbering restarts at 01, as the
labsheet requires. Cite a Lab 2 rule as `L2 BR-21`.

| ID | Decision | Options | Recommendation | Why |
|---|---|---|---|---|
| D-01 | Password hashing | `node:crypto` scrypt · bcrypt/bcryptjs · argon2 | **scrypt**, built in. Per-user 16-byte salt; store `scrypt$N$r$p$salt$hash`; compare with `timingSafeEqual` | No new dependency, and no native build on Windows. It is memory-hard. `CLAUDE.md` already bans auth libraries |
| D-02 | Session mechanism | DB-backed opaque session in an httpOnly cookie · JWT | **DB `Session` table.** 32 random bytes in cookie `tt_session`; store only its SHA-256. `HttpOnly; SameSite=Strict; Path=/`. 8 h absolute expiry | Logout really invalidates the session, as 6.1 requires. Deactivation, role change, and a new initial password can kill sessions at once. There is no signing secret to manage |
| D-03 | Cookies across :5173 → :3000 | Vite dev proxy for `/api` (same origin) · `cors({origin, credentials:true})` plus `credentials:'include'` everywhere | **Vite proxy.** Set `VITE_API_URL=""` explicitly: `api.ts` uses `??`, so an *unset* variable still falls back to :3000. Remove the wildcard `cors()` or pin it to `CLIENT_ORIGIN` | Same-origin makes SameSite=Strict work and removes a class of CORS bugs. It is a one-line `vite.config.ts` change |
| D-04 | CSRF | SameSite only · plus an Origin check · plus a token | **SameSite=Strict, plus rejecting state-changing requests whose `Origin` is present and not `CLIENT_ORIGIN`** | Proportionate for a local lab. Justify it in one paragraph, since 6.1 asks for "CSRF considerations" |
| D-05 | RequesterUser → User | Rename the table in place · keep `RequesterUser` and add columns · create a new table and copy rows | **Rename in place.** Hand-edit the migration to `ALTER TABLE ... RENAME` and rename its PK and email-unique constraint | Ids, and so every `Ticket.requesterId`, survive untouched. **Trap:** Prisma generates DROP + CREATE for a model rename, so the migration must be created with `--create-only` and edited |
| D-06 | Role storage | Postgres enum `UserRole` · reference table | **Enum** `REQUESTER`, `IT_STAFF`, `ADMINISTRATOR` | One role per user, from a fixed set. It matches the Lab 2 enum style |
| D-07 | Existing Requesters' passwords | SQL cannot compute scrypt hashes | Migration: `passwordHash` NULL, `mustChangePassword` true. A NULL hash can never log in (same generic 401). The seed gives seeded accounts a documented dev password **only where the hash is NULL**, so it never overwrites a changed password. Any other migrated user gets one when an Administrator sets an initial password | Satisfies 5.2's "document and test how existing Requesters receive initial passwords", with no plaintext anywhere |
| D-08 | Seeded personas and the first-login flag | All must change · none must change · a dedicated account | **Personas: `mustChangePassword=false`** (a documented local-dev exception). **One dedicated first-login account.** E2E resets it each run through the Admin "set initial password" action | E2E can rerun without creating rows, and it exercises a Lab 3 feature while doing so |
| D-09 | Non-visible resources | 403 (L2 C-13) · 404 | **404 when the role *could* access this kind of resource but this one is not theirs. 403 when the role can *never* perform the operation** (a Requester calling the queue or notes endpoints) | Meets 6.2 without leaking existence. AC-04 ("rejected without exposing note content") still holds |
| D-10 | Client-supplied `requesterId` | Ignore it · reject with 400 | **Ignore it** | AC-03's wording: "the backend still applies the authenticated identity" |
| D-11 | Public endpoints | — | **`/api/health` and `/api/categories`** (the Lab 1 contract), `/api/related-systems`, and `/api/auth/login`. Everything else requires a session | Reference lists are not sensitive, and the Lab 1 tests stay unchanged |
| D-12 | Administrator ticket powers | Admin can do everything IT Staff can · Admin manages users only | **Admin is a superset of IT Staff on tickets.** Nav shows Queue **and** User Management | 4.5 allows an Admin to be Ticket Owner, and BR-04 lets Admins read Internal Notes. An Admin who can own a ticket but not open it makes no sense. 4.3 allows this if the matrix says so explicitly |
| D-13 | Login failures | — | Unknown email, wrong password, and NULL hash all get **one generic 401**. An inactive account gets **403 `ACCOUNT_INACTIVE` only after the password is correct**. No lockout, since unlock is excluded. Emails are stored lower-case and compared case-insensitively | Inactive status is revealed only to someone who already holds the password, which gives 8.1 its "clear response without exposing information" |
| D-14 | Password policy | — | 8–128 characters; upper and lower case; a digit; a special character. The new password must differ from the current one. Confirmation must match. **One validator** shared by Change Password and the Admin screens | Matches the mock-up. One validator means one test set |
| D-15 | Test data isolation | Shared dev DB · separate test DB | **`toktickit_test` database for Supertest**: Vitest global setup points `DATABASE_URL` there and runs migrate deploy plus seed. E2E runs against dev but reuses fixed accounts. The create-user E2E runs on the **desktop project only**, with an `@e2e.test` email | No clutter in the Part 8 screenshot, and C-37 still protects the dev DB |
| D-16 | Comments vs notes storage | Two tables · one table with a visibility flag | **Two tables:** `PublicComment` and `InternalNote` | A notes query structurally cannot leak into the comments endpoint |
| D-17 | Comment and note content | — | Trim; reject empty; 1–2000 characters. Render as plain text (no `dangerouslySetInnerHTML`) with `white-space: pre-wrap`. Newest first. Author and time are set by the server | 4.6 asks for "justified length limits and safe rendering" |
| D-18 | Claim / assign | — | **Claim** assigns the caller only if the ticket is unassigned, via a conditional update. It returns **409 `ALREADY_OWNED`** if another user won the race. **Assign/reassign** accepts any *active* IT Staff or Admin. Unassign is allowed. An inactive owner stays displayed as "(inactive)" until reassigned | A natural, testable conflict case for 8.6 |
| D-19 | "Problem Appears Resolved" | Status change · flag | **Flag** `requesterResolvedAt`, plus an automatic Public Comment. **Status does not change** (BR-05). Only the owning Requester can set it, and only while the status is Open, In Progress, Waiting for Requester, or Reopened. Staff see a badge in the queue and on the detail screen. The next staff status change clears it | Keeps IT Staff responsible for formally resolving the ticket |
| D-20 | Initial password (create and reset) | The Admin types it · the system generates it and shows it once | **The Admin types it**, validated by D-14. Reset sets `mustChangePassword=true` and **revokes that user's sessions** | Simplest "approved local-lab behavior". The mock-up's "send reset email" checkbox is excluded |
| D-21 | Last-active-Admin rule | — | Enforce it on **both deactivation and role change**, inside a transaction that locks the active-Admin rows | It can be reached two ways: the sole Admin demoting themselves, or two Admins deactivating each other at the same moment. Without locking, the race leaves zero Admins |
| D-22 | Self-protection | — | Block **self-deactivation** only. Do **not** block self role change; the last-Admin rule handles it | If self role change were also blocked, the last-Admin rule could never be triggered from the UI, and Part 8 has to *demonstrate* it |
| D-23 | Queue query | — | Search by ticket number and summary. Filter by `currentStatus`, `itPriority`, `owner` (`me` / `unassigned` / user id), and `categoryId`. Sort by created, updated, IT priority, ticket number, or status. **Default:** exclude Closed and Cancelled; sort IT priority high→low, then oldest first. Page size 10, 25, or 50 (default 10). Bad parameters → 400 `INVALID_QUERY_PARAM` | Reuse `server/src/lib/list-query.ts` and C-43's paging semantics |
| D-24 | Branches and decision IDs | — | `feature/lab3-N-slug`, and C-53 onward | The Lab 2 branch names still exist on origin |

### Draft status-transition matrix (IT Staff and Admin)

| From ↓ / To → | Open | In Progress | Waiting for Requester | Resolved | Closed | Reopened | Cancelled |
|---|---|---|---|---|---|---|---|
| **New** | ✓ | ✓* | | | | | ✓† |
| **Open** | | ✓* | ✓* | ✓* | | | ✓† |
| **In Progress** | | | ✓* | ✓* | | | ✓† |
| **Waiting for Requester** | | ✓* | | ✓* | | | ✓† |
| **Resolved** | | | | | ✓† | ✓ | |
| **Reopened** | | ✓* | ✓* | ✓* | | | ✓† |
| **Closed / Cancelled** | terminal | | | | | | |

\* The ticket must have an owner (otherwise 409 `OWNER_REQUIRED`). † A UI confirmation is
required, and the status is terminal. Any other move returns 409
`INVALID_STATUS_TRANSITION`. A same-status move returns 400. Requesters never change status
(BR-05). Decide whether claiming a New ticket also moves it to Open. The recommendation is
**no**: one action, one effect.

### Draft authorization matrix

| Operation | Anonymous | Must change password | Requester | IT Staff | Admin |
|---|---|---|---|---|---|
| login | ✓ | ✓ | ✓ | ✓ | ✓ |
| me · logout · change own password | 401 | ✓ | ✓ | ✓ | ✓ |
| Anything else | 401 | 403 `PASSWORD_CHANGE_REQUIRED` | per the rows below | | |
| Create a ticket; My Tickets; own ticket detail and attachments | 401 | 403 | own only (else 404) | 403 | 403 |
| Public Comments on a ticket: read and post | 401 | 403 | own tickets (else 404) | any | any |
| Mark "problem appears resolved" | 401 | 403 | own tickets | 403 | 403 |
| Queue; staff detail; claim/assign; IT Priority; status; staff attachment read | 401 | 403 | **403** | ✓ | ✓ (D-12) |
| Internal Notes: read and post | 401 | 403 | **403, no content** | ✓ | ✓ |
| User Management API | 401 | 403 | 403 | 403 | ✓ |

---

## 5. Issues, branches, and estimates

| # | Issue | Branch | Estimate | Feeds Part |
|---|---|---|---|---|
| 1 | Sprint 3 engineering contract | `feature/lab3-1-contract` | 5–7 h | 2, 3 |
| 2 | User migration, schema, and seed | `feature/lab3-2-data-migration` | 3–4 h | 2, 3 |
| 3 | Authentication foundation | `feature/lab3-3-authentication` | 4–5 h | 5 |
| 4 | Authorization and Requester regression | `feature/lab3-4-authz-regression` | 5–7 h | 3, 5, 7 |
| 5 | IT Staff Ticket Queue | `feature/lab3-5-staff-queue` | 3–4 h | 6 |
| 6 | IT Staff ticket operations, comments, notes | `feature/lab3-6-staff-ticket-ops` | 6–8 h | 7 |
| 7 | Administrator user management | `feature/lab3-7-user-admin` | 3–5 h | 8 |
| 8 | E2E and responsive/visual evidence | `feature/lab3-8-e2e-visual` | 3–4 h | 3, 9 |
| 9 | Release integration and documentation | `feature/lab3-9-release-docs` | 3 h | 1, 4 |

GitHub assigns the Issue numbers, probably from #37. Order: **1 → 2 → 3 → 4**, then 5 → 6,
with 7 independent after 4. Then 8 and 9. **Issue 1 merges before any code Issue starts.**
All work flows feature branch → `lab3-staging` → one release PR → `main`.

Between Issues 3 and 4, `lab3-staging` is deliberately hybrid: login exists, but the ticket
routes still read `requesterId`. Both Lab 2 suites must still be green when Issue 3 merges.
Issue 4 is the cutover.

**Model choice:** use Opus for Issue 1 and for every end-of-Issue audit, and Sonnet for the
implementation in Issues 2–8. Switch with `/model`.

---

## 6. Phase 0 — setup (about 45 minutes)

```powershell
docker start toktickit-db
docker ps                                  # toktickit-db Up on 5432
cd C:\Downloads\Lab1_Starter_Scaffold\toktickit
git checkout main
git pull

# Safety copy of the final Lab 2 database. Keep it OUTSIDE the repo.
docker exec toktickit-db pg_dump -U toktickit -d toktickit -Fc -f /tmp/lab2-final.dump
docker cp toktickit-db:/tmp/lab2-final.dump C:\Downloads\lab2-final.dump

# Separate database for Supertest (D-15)
docker exec toktickit-db createdb -U toktickit toktickit_test

git checkout -b lab3-staging
git push -u origin lab3-staging
git checkout -b feature/lab3-1-contract
mkdir docs\lab-03\spec
copy C:\Downloads\Lab_3_sheet.pdf docs\lab-03\spec\   # adjust to wherever you saved it
```

Then:

- Add `docs/lab-03/spec/*.pdf` and `/e2e/.auth/` to `.gitignore`.
- Ask Claude Code to create the nine Issues with `gh issue create`, using the table in
  section 5, and add them to the **TokTickIT Individual Sprints** board in Backlog.
- Message @PAKATO123.

---

## 7. Phase 1 — contract prompts (Issue 1, Opus)

Run these one at a time, and read and decide between each. The decisions are the graded work.

### 1.1 — Read first, write nothing (plan mode)

```
Read docs/lab-03/spec/Lab_3_sheet.pdf, CLAUDE.md, docs/lab-03/handoff.md,
docs/lab-02/decisions.md, docs/lab-02/specification.md sections 7 and 11,
server/prisma/schema.prisma, server/src/app.ts, server/src/lib/requester.ts,
server/src/routes/, and client/src/requester/.

Write nothing. Report:
1. Every Lab 3 deliverable, grouped by the 9 PDF parts it feeds.
2. Every place in the code, tests and Lab 2 docs that Lab 3 invalidates - file and line.
   Check my table in handoff section 1 and tell me what it missed.
3. Every Lab 2 test file: survives as-is, needs adapting to login, or must be retired
   (and what replaces it).
4. For each rule area labsheet 4.4 says I must define, the options.
5. Where you disagree with a recommendation in handoff section 4, with a reason.
   Do not agree to be agreeable.
```

### 1.2 — Decision log

```
My decisions are below (handoff section 4 with my changes marked). Write
docs/lab-03/decisions.md continuing at C-53: ID, topic, decision, reason as I stated it,
what it supersedes. Supersede C-13 and C-20 explicitly. Add a short "Carried from Lab 2"
list of Lab 2 decisions that still hold unchanged. Do not add reasons I did not give.
```

### 1.3 — Rewrite the guardrail

```
Rewrite CLAUDE.md for Lab 3. Keep: repo path, mandatory stack, Zen Green tokens, TokTickIT
naming (C-41), git working agreement and pre-commit inspection, secrets, never delete or
skip a test, never migrate reset, migrate deploy only, verify-by-evidence.
Change:
- Scope = Lab 3; a "never add" list from labsheet 4.2 and 8.5.
- Remove the Lab 2 auth ban. Approved mechanism = decisions C-xx (scrypt via node:crypto,
  DB sessions, httpOnly cookie). Still banned unless a decision approves: passport,
  jsonwebtoken, bcrypt/bcryptjs/argon2, express-session, any hosted auth.
- Security rules: identity only from the session; role checks in server middleware; 404
  for resources the caller may not see, 403 for operations the role may never do; never
  return or log a password or passwordHash; seeded passwords are local-dev only.
- Branches feature/lab3-N-slug, every PR --base lab3-staging.
- Labsheet section 12 layout for Lab 3.
- Contract = docs/lab-03/{specification,api-spec,ui-spec,tests,decisions}.md.
- Lab 1 and Lab 2 behavior must keep working. A Lab 2 test may be adapted to log in; it is
  retired only when a decision row names its replacement.
Keep it under ~250 lines. Move Lab 2 history out rather than appending.
```

### 1.4 — specification.md

```
Write docs/lab-03/specification.md with the 11 sections in labsheet 9, from decisions.md.
- FR/BR/AC numbering restarts at 01. Cite Lab 2 rules as "L2 BR-21".
- BR-01..05 as the labsheet words them, then rules for every area in 4.4: login attempts,
  password policy, logout, inactive users, duplicate email, current user, the
  password-change gate, ownership, assignment, IT Priority, comments, notes, status
  transitions (as a matrix), validation, failures, regression, and the seven
  Administrator rules.
- An authorization matrix: every endpoint x anonymous / must-change / Requester / IT Staff
  / Admin, with the status code each receives.
- Section 7: migration as ordered steps, the existing-Requester password path, how the
  selector and its client state are removed, and the seed accounts.
- ACs in Given-When-Then, atomic, including labsheet AC-01..04 verbatim.
- Section 10 is the Definition of Done you will be held to.
Assumptions go in section 11, not buried. Do not restate the handout.
```

### 1.5 — api-spec.md and ui-spec.md

```
Write docs/lab-03/api-spec.md and docs/lab-03/ui-spec.md from specification.md.

api-spec: every capability in labsheet 6 - path, method, request/response shape, cookie
behavior, validation, the fixed check order (auth -> password gate -> role -> load ->
ownership -> validate), an error-code catalogue, and status codes for 400/401/403/404/409/500.
Queue: searchable, filterable and sortable fields, defaults, page sizes, metadata, invalid
params. Changed Lab 2 endpoints get a "changed from Lab 2" note. Removed ones are listed.

ui-spec: app shell per role, Login, Change Password, Queue (desktop table and the
smaller-screen card form - no mega-grid), Staff Ticket Detail (editable vs read-only
fields, Public vs Internal visually distinct), Requester detail additions, User
Management, every mode and feedback state from 8.6, badge rules for status / requested
priority / IT priority / role, the three viewports, accessibility, and screenshot paths
under artifacts/lab-03/screenshots/. Use the exact tokens from CLAUDE.md. Carry forward
the Lab 2 44 px touch-target fix.

Consistency with specification.md is required. Stop and tell me on any conflict.
```

### 1.6 — tests.md

```
Write docs/lab-03/tests.md on the Lab 2 template. Columns: Test ID, Type, Requirement/AC,
What It Tests, Expected Result, Automated Test File, Final (blank for now).
Levels: unit, API, UI component, UI style, responsive, security/authorization,
migration/regression, E2E. Use the section 12 file paths, plus
server/tests/lab-03/migration.db.test.ts.
Must include:
- A route-inventory test that fails if any non-public route answers without a session.
- Every Administrator test listed in labsheet section 10.
- A "Lab 2 regression disposition" table: every Lab 2 test file -> kept / adapted /
  retired, with the replacing test and decision ID for any retirement.
- The AC traceability matrix. Tell me explicitly which ACs have no automated test. Do not
  invent a weak test to fill the gap.
```

### 1.7 — Audit (fresh session, Opus)

```
Audit docs/lab-03/*.md for internal consistency. Read-only. Report: endpoints in
api-spec absent from the authorization matrix; ACs with no test; tests citing files
outside section 12 or missing ones; status codes that differ between documents; any
behavior in a document that appears in the labsheet's excluded list; decisions cited
but not recorded.
```

Fix what the audit finds. Then commit, open the PR into `lab3-staging`, get it reviewed, and
merge. **Screenshot the merged PR with its timestamp before Issue 2 starts.** That is Part 2's
proof, and it cannot be backdated.

---

## 8. Implementation prompts (Issues 2–9, Sonnet)

Every Issue opens with the same header, sent in plan mode from a fresh session (`/clear`):

```
Issue #N, branch feature/lab3-N-slug from an up-to-date lab3-staging.
Read CLAUDE.md, docs/lab-03/handoff.md, and the contract sections for this Issue.
Plan first: files you will touch, and the tests.md IDs you will write BEFORE the code.
Wait for my OK. Then: write those tests, run them, show them failing (I screenshot this),
implement, show them passing, and run all three suites. Anything the contract does not
cover: stop and ask.
```

### Issue 2 — migration, schema, and seed

```
Implement specification.md section 7 only.
1. Before changing anything: `npx prisma migrate status`, row counts per table, and
   tickets per requesterId. Save that output - it is the "before" evidence.
2. Point Vitest at toktickit_test via a global setup (migrate deploy + seed) per C-xx.
3. Write migration.db.test.ts from tests.md; show it red.
4. Edit schema.prisma. Create the migration with
   `npx prisma migrate dev --create-only --name lab03_users_roles`. If Prisma offers a reset,
   answer no and stop. Show me the generated SQL before editing it.
5. RequesterUser -> User must be ALTER TABLE ... RENAME plus renaming its primary key and
   email unique constraint. No DROP TABLE anywhere. Do not use a new enum value in the
   same migration that adds it.
6. Apply with `npx prisma migrate deploy`. Prove zero drift:
   `npx prisma migrate diff --from-schema-datasource prisma/schema.prisma
    --to-schema-datamodel prisma/schema.prisma --exit-code`
7. Re-run the counts. Tickets per requester must be identical.
8. Seed per labsheet 5.3 and C-xx: the 4 active + 1 inactive Lab 2 Requesters, 3 active +
   1 inactive IT Staff, exactly 1 active Administrator, the first-login account, realistic
   tickets across statuses / priorities / owned and unassigned, and harmless example
   comments and notes. Run it twice; show that the counts do not change and
   that a changed password is not overwritten.
```

### Issue 3 — authentication

```
Scope: auth endpoints, Login, Change Password, shell user + role badge + Logout, Vite proxy.
Do not touch ticket routes - that is Issue 4. Both Lab 2 suites must stay green.
Build: server/src/lib/password.ts (scrypt, timingSafeEqual, the shared policy validator),
server/src/lib/session.ts (create / lookup / revoke, SHA-256 of the token only),
requireAuth, the password-change gate, and /api/auth/{login,logout,me,change-password}.
Client: AuthContext, Login, ChangePassword, and route guard to Change Password when required.
Proof beyond tests: show the Set-Cookie header flags, /me 200 with the cookie, and /me 401
with the same cookie after logout.
```

### Issue 4 — authorization and Requester regression

```
- requireRole middleware on every route, per the authorization matrix.
- Route-inventory test in authorization.api.test.ts.
- Ticket and attachment routes take identity from the session. A requesterId in the query or
  body is ignored (AC-03 test). Non-owned -> 404 (supersedes C-13).
- Remove GET /api/requesters, RequesterSelection, client/src/requester/, and the selector
  browser state.
- Role navigation, a Forbidden screen for direct URLs, post-login landing per role.
- Adapt Lab 2 tests exactly as the regression table says: a logged-in Supertest agent helper,
  an AuthContext test wrapper, and a Playwright login helper with storageState per role in
  e2e/.auth/ (gitignored).
- Show Lab 2 test counts per file, before and after. Any drop must match a retirement row.
```

### Issue 5 — IT Staff Ticket Queue

```
GET queue endpoint per api-spec (reuse list-query.ts), StaffTicketQueue with desktop table +
card layout below the tablet breakpoint, search, filters, sort, pagination, badges,
owner / Unassigned, "resolved by requester" badge, and loading / empty / no-results /
forbidden / failure states. Tests: staff-queue.api.test.ts and StaffTicketQueue.test.tsx.
```

### Issue 6 — IT Staff ticket operations (the largest; Part 7 is worth 10)

```
Staff detail API + screen: claim (conditional update, 409 on race), assign/reassign to
active staff/admin, IT Priority, status per the transition matrix with confirmations,
Public Comments and Internal Notes (two tables, visually distinct composer and list,
append-only, plain-text rendering), existing attachments read-only.
Requester side: Public Comments on Requester Ticket Detail and the "Problem Appears
Resolved" action (flag + auto comment, no status change).
Tests: staff-ticket-detail.api, comments-notes.api, StaffTicketDetail.test.tsx, plus the
Requester detail tests. Include: Requester -> notes endpoint -> 403 with no content in the
body; comment with <script> renders as text; whitespace-only comment rejected.
```

### Issue 7 — Administrator user management

```
Admin users API + one User Management screen: list (Name, Email, Role, Status, Edit),
name/email search, optional role filter, create (name, email, one role, active, initial
password), edit (name, email, role, active), set new initial password (forces change,
revokes that user's sessions), duplicate email 409 (case-insensitive), invalid role 400,
self-deactivation blocked, last-active-admin blocked on deactivate AND role change inside
a locking transaction, non-admin 403. Never return passwordHash.
Tests: users-admin.api.test.ts (include the two-admins-at-once race), UserManagement.test.tsx.
```

### Issue 8 — E2E and visual evidence

```
e2e/lab-03/authentication, staff-ticket-flow, user-administration, across the three
viewport projects. The first-login account is reset through the Admin action at the start
of each run; the create-user spec runs on desktop only. Screenshots go to
artifacts/lab-03/screenshots/{authentication,staff-queue,staff-ticket-detail,user-management}/.
Then the visual checklist - MEASURE each row (touch targets, focus ring after the
transition settles, overflow at 390 px). Do not tick from reading the CSS.
After the run: report user and ticket counts, to prove the run left no clutter.
```

### Issue 9 — release

```
Fill the Final column in tests.md from real runs on lab3-staging; README (run steps, the
local-only seed account table, test DB setup); reviewer.md; finish ai-use.md. Then the
release PR lab3-staging -> main. After merge, run all suites on main - that output goes in
Part 3.
```

### End-of-Issue audit (fresh session, Opus) — run before every PR

```
Audit this branch against the contract for Issue #N. Read-only.
1. Each AC in scope: covering test ID and file, and run it - pass or fail.
2. Each route added or changed: middleware chain, and the status for anonymous, each
   wrong role, must-change-password, and non-owner - proven by a named test.
3. Anything built that the contract does not mention; anything required that is missing.
4. Any response body that could carry passwordHash, a session token, or another user's data.
5. Contract conflicts. Report them; do not fix.
```

---

## 9. Per-issue loop

1. Move the card: Backlog → Specified → Started.
2. Fresh Claude Code session, `/model sonnet`, send the section 8 header in plan mode, and approve the plan.
3. Take the red-run screenshot. Then implement and get to green. Read every changed file yourself.
4. Screenshot new UI states **now**, while they exist.
5. Run the audit on `/model opus` in a fresh session, and fix the findings.
6. Pre-commit inspection → commit → push → `gh pr create --base lab3-staging`. Move the card to PR Review and send @PAKATO123 the link the same day.
7. If comments come in: move the card to Fixing, reply on the PR, and record the exchange in `reviewer.md`. Merge, then move the card to Done.
8. Add one or two prompts and a line on what went wrong to `ai-use.md`.

---

## 10. Evidence to capture as you go

| Part | Capture during the Issue it belongs to |
|---|---|
| 1 | The board mid-sprint, with cards in PR Review and Fixing; review threads while they are open |
| 2 | The merged contract PR with its timestamp, before Issue 2 |
| 3 | Red runs per Issue; migration before/after counts and the zero-drift diff; all suites on `main` at the end |
| 5 | Valid login; invalid login; inactive account; busy button; forced password change with the rule checklist; shell with name and role; logout; direct URL and back button after logout returning to Login; API 401 after logout |
| 6 | Queue with realistic data; search; each filter; sort; pagination; assigned and Unassigned; badges; empty, no-results, and failure states; three viewports |
| 7 | Claim; reassign; IT Priority; an allowed transition and a rejected one; Cancel/Close confirmation; Public vs Internal side by side; attachments on staff detail; Requester marks resolved and staff see it; empty-comment validation; failure state; the Requester → notes endpoint 403 test output |
| 8 | List columns; search; role filter; create; duplicate email; invalid input; edit; set initial password followed by the forced change at next login; self-deactivation blocked; sole Admin demoting self blocked; non-Admin forbidden in both UI and API; mobile layout |
| 9 | Every major screen at desktop, tablet, and mobile; the measured visual checklist |

---

## 11. PDF checklist

Filename: `report_lab03_67070503489.pdf`. Headings must be `Answer Part 1` … `Answer Part 9`,
in order. Keep it concise and include working links.

| Part | Pts | Needs |
|---|---|---|
| 1 | 10 | Commit graph: feature branches → `lab3-staging` → `main`; board all Done; rendered `reviewer.md` (identity, PR links, comments, responses, approvals); README and `.gitignore`; directory tree |
| 2 | 5 | Rendered `specification.md`: FR, BR, the authorization matrix, AC, migration decisions, DoD, and the PR timestamp proof |
| 3 | 10 | Rendered `tests.md`: planned table, traceability, real paths, Final status; every suite passing on `main` |
| 4 | 5 | Rendered `ai-use.md`: the LLM named, 6–10 key prompts, and "My Reflection" on the spec agent vs the coding agent |
| 5 | 5 | Login and password-change states (section 10, row 5) |
| 6 | 5 | Queue states (section 10, row 6) |
| 7 | 10 | Ticket Detail states plus the API authorization evidence (section 10, row 7) |
| 8 | 5 | User Management states (section 10, row 8) |
| 9 | 5 | Rendered `ui-spec.md`, three-viewport screenshots, the completed visual checklist |

Traps carried from Lab 2:

- Delete every template placeholder heading before you screenshot.
- `reviewer.md` must carry the reviewer's name, student ID, GitHub username, **and** PR links in both directions.
- Where a review genuinely did not happen, say so plainly.
