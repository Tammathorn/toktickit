# TokTickIT Lab 3 - Approved Decision Log

Status: **Approved**. These decisions are settled and binding on
`specification.md`, `api-spec.md`, `ui-spec.md` and `tests.md`. Where the labsheet
leaves a choice open, the decision below is the choice. Where the labsheet
contradicts itself, the decision below is the resolution.

Owner: Tammathorn Kananurak (67070503489). Lab 3, Sprint 3.

Labsheet references are to `docs/lab-03/spec/Lab_3_sheet.pdf`. Lab 2 rules are cited as
`L2 BR-21`. Numbering continues the Lab 2 log so decision IDs stay unique across labs;
FR, BR and AC numbering restarts at 01, as the labsheet requires.

The recommendations in `docs/lab-03/handoff.md` section 4 are superseded by this file. The
`D-xx` tag in the Topic column names the handoff row each decision came from, so the two
documents stay traceable to one another.

## Decision table

### Authentication and session

| ID | Topic | Decision | Reason | Supersedes |
|---|---|---|---|---|
| C-53 | Password hashing (D-01) | scrypt from `node:crypto`. A per-user 16-byte salt; stored as `scrypt$N$r$p$salt$hash`; compared with `timingSafeEqual`. | No new dependency under the stack rule, no native build on Windows, and it is memory-hard. | - |
| C-54 | Session mechanism (D-02) | A database `Session` table holding an opaque token. 32 random bytes travel in cookie `tt_session`; only the SHA-256 of the token is stored. Cookie flags `HttpOnly; SameSite=Strict; Path=/`. | Logout really invalidates the session, as 6.1 requires. Deactivation, role change and a new initial password can kill sessions at once. There is no signing secret to manage. | - |
| C-55 | Session lifetime and revocation | 8 hours absolute, with no sliding renewal. Logout ends the calling session only. Deactivation, a role change and a new initial password each end **all** of that user's sessions. `requireAuth` also rejects a session whose user is inactive. | Logout really invalidates the session, as 6.1 requires; deactivation, role change and a new initial password can kill sessions at once. 8 hours covers a working day. Absolute expiry needs no database write per request and is testable with a fixed clock. Ending all of a user's sessions on deactivation, role change or a new initial password makes those Administrator actions take effect at once, not at the user's next login. | - |
| C-56 | Cookie transport across ports (D-03) | The Vite dev server proxies `/api` to the API, making the app same-origin. `VITE_API_URL` is set explicitly to the empty string, because `client/src/api.ts` uses `??` and an unset variable would still fall back to `http://localhost:3000`. The wildcard `app.use(cors())` is removed, or pinned to `CLIENT_ORIGIN`. | Same-origin makes `SameSite=Strict` work and removes a class of CORS bugs. It is a one-line `vite.config.ts` change. | - |
| C-57 | Cookie port scope | Cookies ignore port, so the `tt_session` cookie set for `localhost` also reaches the API on `:3000` directly, and any other service on `localhost`. | Accepted as a local-only risk. | - |
| C-58 | CSRF (D-04) | `SameSite=Strict`, plus rejecting any state-changing request whose `Origin` header is present and is not `CLIENT_ORIGIN`. Two tests are required and named in `tests.md`: a foreign `Origin` is rejected, and a missing `Origin` is accepted. | Proportionate for a local lab, and 6.1 asks for CSRF considerations to be justified in the contract. | - |
| C-59 | Login failures (D-13) | Unknown email, wrong password and a NULL `passwordHash` all return one generic 401. An inactive account returns 403 `ACCOUNT_INACTIVE`, and only after the password has been verified. No lockout. Emails are stored lower-case and compared case-insensitively. | Inactive status is revealed only to someone who already holds the password, which gives 8.1 its "clear response without exposing information". Account unlocking is excluded by 4.2, so a lockout could never be undone. | L2 C-33 (the inactive-Requester 403 moves to the login path) |
| C-60 | Password policy (D-14) | 8 to 128 characters; upper and lower case; a digit; a special character. The new password must differ from the current one. The confirmation field must match. **One** validator, shared by Change Password, Administrator create and Administrator set-initial-password. | It matches the mock-up. One validator means one test set. | - |
| C-61 | Password-change gate and current user | `GET /api/auth/me` works while `mustChangePassword` is true, so the Change Password screen can show the user's name and role. `POST /api/auth/change-password` requires the current password. | The Change Password screen needs the user's name. Requiring the current password means a stolen session alone cannot change the password. | - |
| C-62 | Public endpoints (D-11) | `GET /api/health`, `GET /api/categories`, `GET /api/related-systems` and `POST /api/auth/login`. Every other route requires a session. | Reference lists are not sensitive, and the Lab 1 tests stay unchanged. | - |
| C-63 | Check order | Fixed for every protected route: session -> password-change gate -> role -> parse parameters -> load the resource -> ownership -> body validation. | Role is checked before the Ticket is loaded, so a Requester calling an Internal Notes endpoint gets 403 whether or not the Ticket exists - the status code never reveals existence (6.2, AC-04). Parameters are parsed after the role check, so a malformed id cannot probe a forbidden endpoint either. | L2 C-45, L2 C-52 (both are stated against the Lab 2 order) |
| C-64 | Client-supplied `requesterId` (D-10) | Ignored. A `requesterId` in a query string or a request body has no effect; the authenticated identity is used. Identity no longer travels in the request at all, so the Lab 2 caller-resolution statuses 400 `REQUESTER_REQUIRED`, 404 `REQUESTER_NOT_FOUND` and 403 `REQUESTER_INACTIVE` cease to exist. | AC-03's wording: "the backend still applies the authenticated identity". | **L2 C-12**, **L2 C-42**, **L2 C-45** |

### Authorization

| ID | Topic | Decision | Reason | Supersedes |
|---|---|---|---|---|
| C-65 | Non-visible resources (D-09) | 404 when the role could access this kind of resource but this one is not theirs. 403 when the role may never perform the operation at all - a Requester calling the queue or an Internal Notes endpoint. | It meets 6.2 without leaking existence. AC-04, "rejected without exposing note content", still holds, and C-63 places the role check before the resource is loaded so a 403 also says nothing about existence. | **L2 C-13**, **L2 C-20** |
| C-66 | Administrator ticket powers (D-12) | Option (a). An Administrator holds every IT Staff ticket permission: queue, staff detail, claim, assign and reassign, IT Priority, status changes, Public Comments and Internal Notes. A Ticket Owner may be an active IT Staff **or** Administrator user. Navigation for an Administrator shows the Queue and User Management. | 4.5 lets an Administrator be the Ticket Owner, and an owner has to be able to act on the Ticket. 4.3 allows this when the matrix says so explicitly, and this row is that statement. Role-restriction evidence comes from Requester -> staff routes and non-Administrator -> user management. | - |

### Data model, migration and seed

| ID | Topic | Decision | Reason | Supersedes |
|---|---|---|---|---|
| C-67 | `RequesterUser` -> `User` (D-05) | Rename the table in place. The migration is hand-edited to `ALTER TABLE ... RENAME`, and its primary key and email-unique constraint are renamed with it. No `DROP TABLE` anywhere. | Ids, and so every `Ticket.requesterId`, survive untouched. Prisma generates DROP + CREATE for a model rename, so the migration must be created with `--create-only` and edited. | L2 C-31 |
| C-68 | `Ticket.requesterId` column name | Unchanged. The foreign key keeps the name `requesterId` and continues to point at the renamed table. | It still means "who submitted the Ticket". Renaming it touches four indexes, `list-query.ts`, `ticket-dto.ts` and the migration's data path for no change in behavior. | - |
| C-69 | Role storage (D-06) | A PostgreSQL enum `UserRole` with `REQUESTER`, `IT_STAFF`, `ADMINISTRATOR`. | One role per user, from a fixed set. It matches the Lab 2 enum style. | - |
| C-70 | `TicketStatus` enum migration order | `OPEN`, `WAITING_FOR_REQUESTER` and `REOPENED` are added in their own migration, applied **before** the migration that renames the table and adds the new columns. No migration uses a value it has just added. The enum then carries eight values, all of them reachable. | A new enum value cannot be used in the same migration that adds it. PostgreSQL cannot use a new enum value in the same transaction that adds it, so they must exist before the migration that uses them. | **L2 C-21** |
| C-71 | IT Priority | `itPriority` is backfilled from `requestedPriority` for every existing row, then made `NOT NULL`, and is set from `requestedPriority` on create. | 4.5 says IT Priority starts as a copy of Requested Priority. Backfilling old Tickets the same way gives one rule for old and new Tickets, and `NOT NULL` lets the queue sort and filter on it without a null case. | **L2 C-07** |
| C-72 | Existing users' passwords and seeded personas (D-07 + D-08) | The migration sets `passwordHash` NULL and `mustChangePassword` true for every existing user; a NULL hash can never authenticate, and returns the same generic 401 as a wrong password (C-59). The seed then, **only where `passwordHash IS NULL`**, sets the documented local-dev password and clears `mustChangePassword` for the named personas, in a single write. The dedicated first-login account is created flagged and is never updated by the seed. Any other migrated user receives a password when an Administrator sets an initial one. | One answer to 5.2, and the seed never touches a password a person has changed. | - |
| C-73 | Comments versus notes storage (D-16) | Two tables: `PublicComment` and `InternalNote`. | A notes query structurally cannot leak into the comments endpoint. | - |
| C-74 | Comment and note content (D-17) | Trim; reject empty; 1 to 2000 characters. Rendered as plain text, never through `dangerouslySetInnerHTML`, with `white-space: pre-wrap`. Newest first. Author and creation time are set by the server. | 4.6 asks for justified length limits and safe rendering. | - |

### Tickets and workflow

| ID | Topic | Decision | Reason | Supersedes |
|---|---|---|---|---|
| C-75 | Claim, assign and reassign (D-18) | **Claim** assigns the caller only if the Ticket is unassigned, through a conditional update, and returns 409 `ALREADY_OWNED` if another user won the race. **Assign and reassign** accept any active IT Staff or Administrator. Unassign is allowed. An inactive owner stays displayed as "(inactive)" until reassigned. | A natural, testable conflict case for 8.6. | - |
| C-76 | "Problem Appears Resolved" (D-19) | A flag `requesterResolvedAt` - a timestamp, not a status. The Ticket's status does not change (BR-05). Only the owning Requester may set it, and only while the status is Open, In Progress, Waiting for Requester or Reopened. It is cleared only by a move to Resolved, Closed or Cancelled. **No automatic Public Comment is posted.** Staff see a badge in the queue and on the detail screen. | It keeps IT Staff responsible for formally resolving the Ticket. | - |
| C-77 | Same-status move | A status change whose target equals the current status returns 400. | The UI never offers it, so the request is a client error; a silent success would hide bugs. | - |
| C-78 | Queue query (D-23) | Search by ticket number and summary. Filter by `currentStatus`, `itPriority`, `owner` (`me`, `unassigned`, or a user id) and `categoryId`. Sort by created, updated, IT priority, ticket number or status. Default: exclude Closed and Cancelled, sort IT priority high to low then oldest first. Page size 10, 25 or 50, default 10. A bad parameter returns 400 `INVALID_QUERY_PARAM`. | It reuses `server/src/lib/list-query.ts` and L2 C-43's paging semantics. | - |

### Administration

| ID | Topic | Decision | Reason | Supersedes |
|---|---|---|---|---|
| C-79 | Initial password, create and reset (D-20) | The Administrator types it, validated by C-60. A reset sets `mustChangePassword` true and revokes that user's sessions. | The simplest approved local-lab behavior. The mock-up's "send reset email" checkbox is excluded. | - |
| C-80 | Last-active-Administrator rule (D-21) | Enforced on **both** deactivation and role change, inside a transaction that locks the active-Administrator rows. | It can be reached two ways: the sole Administrator demoting themselves, or two Administrators deactivating each other at the same moment. Without locking, the race leaves zero Administrators. | - |
| C-81 | Self-protection (D-22) | Self-deactivation is blocked. Self role change is **not** blocked; C-80 handles it. | If self role change were also blocked, the last-Administrator rule could never be triggered from the UI, and Part 8 has to demonstrate it. | - |
| C-82 | Duplicate email | 409 `EMAIL_TAKEN`, presented at the email field. | It conflicts with existing data rather than being malformed input, and showing it at the email field tells the Administrator exactly what to fix. | - |

### Testing, tooling and repository

| ID | Topic | Decision | Reason | Supersedes |
|---|---|---|---|---|
| C-83 | Test data isolation and migration evidence (D-15) | Supertest runs against a separate `toktickit_test` database: a Vitest global setup points `DATABASE_URL` at it and runs `migrate deploy` plus the seed. E2E runs against the dev database and reuses fixed accounts; the create-user spec runs on the desktop project only, with an `@e2e.test` email. Migration evidence has two halves: the automated shape test `server/tests/lab-03/migration.db.test.ts`, and a **rehearsal** - restore `lab2-final.dump` into `toktickit_rehearsal`, capture row counts and tickets per requester, `migrate deploy`, capture the counts again together with the `migrate diff --exit-code` drift check. Both halves are saved under `artifacts/lab-03/migration/`. The dev database is migrated only after the rehearsal passes. | Migration evidence has two halves. There is no clutter in the Part 8 screenshot, and L2 C-37 still protects the dev database. | - |
| C-84 | Test file names | Labsheet section 12 filenames are authoritative. The section 10 example table disagrees twice - `server/tests/lab-03/notes.api.test.ts` and `e2e/lab-03/first-login.spec.ts` - and is disregarded in both; the files are `comments-notes.api.test.ts` and `authentication.spec.ts`. | Same ground as L2 C-02. Section 12 is the required tree Part 1 is graded against; the section 10 table is an example. | - |
| C-85 | Client routing | The hand-rolled History-API router in `client/src/router.tsx` is extended with route guards. No router library is added. | No new dependency without approval. The existing router already handles paths and navigation; route guards are a small addition. | **L2 C-51** (changed: C-51 allowed a library if the route count grew; it does not) |
| C-86 | Migration commands | `server/package.json`'s `prisma:migrate` script is repointed from `prisma migrate dev` to `prisma migrate deploy`. | `migrate dev` offers a reset, and a reset destroys the seed data L2 C-37 protects. A rule in prose is weaker than removing the command that breaks it. | - |
| C-87 | The Lab 1 Check System screen | `/system-check` stays public. | It calls only public endpoints. | - |
| C-88 | Branches and decision IDs (D-24) | Feature branches are named `feature/lab3-N-slug`; decisions continue at C-53. | The Lab 2 branch names still exist on origin. | - |
| C-89 | Test levels | Eight levels, per labsheet section 10: unit, API/integration, UI component, UI style, responsive, security/authorization, migration/regression and E2E. The level is carried by the Test ID column, not by the file name. Security tests live in `server/tests/lab-03/authorization.api.test.ts` plus role tests inside each API test file; migration tests in `server/tests/lab-03/migration.db.test.ts` plus the C-83 rehearsal artifact; regression is the adapted Lab 2 suites. | As L2 C-09 - fill every level without changing the section 12 tree. | **L2 C-09** (six levels) |
| C-90 | Playwright configuration for Lab 3 | The same three viewport projects - desktop 1280, tablet 834, mobile 390 - Chromium only, with `webServer` still disabled. Lab 3 screenshots go to `artifacts/lab-03/screenshots/{authentication,staff-queue,staff-ticket-detail,user-management}/`. A setup project writes one `storageState` per role into `e2e/.auth/`, which is gitignored. | Logging in once per role keeps the three-viewport run fast, and every spec starts from a known identity. | L2 C-10 (extended) |
| C-91 | Seed composition | The graded seed now holds what labsheet 5.3 requires: accounts for all three roles, realistic Tickets across Requesters, statuses, priorities and owned or unassigned ownership, and harmless example Public Comments and Internal Notes. It stays idempotent through a stable natural key: the seed finds an existing Ticket by (Requester email, summary). `server/prisma/seed-demo.ts` keeps only the extra volume needed for queue and My Tickets pagination. | 5.3 now names Tickets, comments and notes, so C-22's premise is gone; keeping the volume data separate keeps the graded seed readable. On the key: `ticketNumber` cannot be the key because it comes from the row id (L2 C-49). Email is used instead of `requesterId` because ids differ between the dev and test databases. It needs no schema change and matches the Lab 2 demo seed. The seed stops with an error if two seeded Tickets share a Requester and summary, so the key can never match the wrong row. | **L2 C-22** |
| C-92 | Terminology | The canonical glossary in `specification.md` section 11 is carried forward and extended with User, Role, Ticket Owner, IT Priority, Public Comment, Internal Note, Session and Initial Password. | As L2 C-40. | L2 C-40 (extended) |

### Gaps closed after the first `specification.md` draft

The first draft of `specification.md` listed ten gaps, G-01 to G-10, where this log was
silent, and refused to invent a rule for any of them. These twelve rows close all ten, fix
one matrix cell the draft got wrong, and close one hole the first round of answers opened.
The Gap column names the gap each row closes.

| ID | Topic | Gap | Decision | Reason | Supersedes |
|---|---|---|---|---|---|
| C-93 | Acting on a Ticket, and the owner requirement | G-01 | Any active IT Staff or Administrator user may act on any Ticket; ownership is **not** required to set IT Priority, change status, comment or note. But a move to `IN_PROGRESS`, `WAITING_FOR_REQUESTER` or `RESOLVED` requires the Ticket to have a Ticket Owner, and is refused 409 `OWNER_REQUIRED` when it has none. The requirement is checked on the transition, not held continuously: a Ticket already in one of those statuses may still be unassigned. | Work is shared, but a Ticket being worked on must have someone accountable. | - |
| C-94 | `User.name` and `User.email` bounds | G-02 | `name` is trimmed and is 1 to 100 characters. `email` is trimmed, lower-cased, of valid format, and at most 254 characters. | 254 is the practical email limit; 100 fits every real name and the table layout. | - |
| C-95 | Ticket Owner disclosure to the Requester | G-09 | A Requester sees the Ticket Owner's **name**, never their email address. | Knowing who is handling the Ticket helps; the email is not needed. | - |
| C-96 | Expired session rows | G-10 | An expired `Session` row is deleted when a lookup finds it expired. There is no background job and no scheduled sweep. | There is no scheduler in the stack, and an expired row is harmless until it is looked up. | - |
| C-97 | Sessions after a self-service password change | - | A successful self-service password change ends **all of that user's other sessions** and keeps the calling one. | If a session was stolen, changing the password must lock the thief out. | C-55 (its list of session-ending events was read as exhaustive; this is a fourth event, and a partial one) |
| C-98 | Terminal statuses | - | `CLOSED` and `CANCELLED` are both terminal. `REOPENED` is reachable only from `RESOLVED`. | The handoff section 4 draft matrix says "Closed / Cancelled - terminal", and no decision row ever made `CLOSED` reopenable. The first `specification.md` draft allowed `CLOSED` to be reopened on its own authority, which is exactly the invention this log exists to prevent. | - |
| C-99 | The password-change gate's status code | G-07 | 403 `PASSWORD_CHANGE_REQUIRED`. | The caller is authenticated and forbidden, which is the distinction 6.2 asks every protected endpoint to draw. It is never 401, because 401 would send the client back to Login and lose the session it must keep to change the password. | - |
| C-100 | Refusal codes for a well-formed request | G-06 | **409** when the refusal is a conflict with the state of the resource or of the rows it depends on: `ALREADY_OWNED`, `OWNER_REQUIRED`, `INVALID_STATUS_TRANSITION`, `RESOLUTION_NOT_PERMITTED_IN_STATUS`, `EMAIL_TAKEN`, `LAST_ADMINISTRATOR`. **422** when the refusal is about the submitted value: an ineligible assignee, and `SELF_DEACTIVATION`. A same-status move stays 400 (C-77). Lab 2's five-active-attachment refusal keeps its 422 (`L2 BR-39`) as a carried Lab 2 contract; it is not re-coded by this row and is not a contradiction of it. | The handoff section 4 draft already assigned 409 to `INVALID_STATUS_TRANSITION`, and C-93 puts 409 `OWNER_REQUIRED` on the same endpoint; splitting one status-change endpoint between 409 and 422 for two refusals of the same kind would be arbitrary. The line is drawn where HTTP draws it - 409 is a conflict with state, 422 is a well-formed body the server will not act on. `LAST_ADMINISTRATOR` depends on the state of other `User` rows, so by that same line it is a conflict; `SELF_DEACTIVATION` depends only on who the caller is and what they submitted, so it is not. | The first `specification.md` draft's assumption A-07, which used 422 throughout |
| C-101 | Tickets raised by staff | G-03 | IT Staff and Administrator users do not raise Tickets of their own. The Requester-view routes - create, own-list, own-detail - are Requester-only and answer 403 to any other role. | 4.3 gives "create Tickets" and "view and manage only owned Tickets" to the Requester alone, and a staff-raised Ticket would need a Requester-facing screen for a role whose navigation does not carry one. | - |
| C-102 | Claiming and status | G-04 | Claiming a Ticket does not change its status. | One action, one effect, as the handoff section 4 draft recommends. A silent status change would bypass the transition matrix and its confirmations. | - |
| C-103 | Attachments and staff | G-05 | IT Staff and Administrator users may list and download a Ticket's Attachments. Upload and soft removal stay Requester-owner operations. | 8.4 gives the staff screen the *existing* Attachments; no clause gives staff a write. Read without write is the narrowest reading that still satisfies 8.4. | - |
| C-104 | Unassigning a Ticket that is being worked on | - | Unassigning a Ticket whose status is `IN_PROGRESS`, `WAITING_FOR_REQUESTER` or `RESOLVED` is refused 409 `OWNER_REQUIRED`; the Ticket is moved to `OPEN` first. Reassigning such a Ticket to another eligible user stays allowed, because it never leaves the Ticket without an owner. | C-93 says a Ticket being worked on must have someone accountable. Checking that only at the moment of the status change left a hole: the Ticket could be unassigned a second later and sit in a worked status with nobody accountable. This keeps C-93 true at all times rather than at one instant. | C-93 (its "checked on the transition, not held continuously" reading) |

### Gaps closed after the `api-spec.md` and `ui-spec.md` drafts

Four rows, closing the four items those two documents declared and refused to resolve on
their own authority - three silences in this log, and one disagreement inside
`specification.md` itself. `api-spec.md` section 12 and `ui-spec.md` section 25 listed each
with options and a recommendation; these are the answers.

| ID | Topic | Declared as | Decision | Reason | Supersedes |
|---|---|---|---|---|---|
| C-105 | The assignable-users endpoint | `api-spec.md` 12.1, `ui-spec.md` 25.2 | A staff endpoint, **IT Staff and Administrator only**, returning the `id`, `name` and `role` of active IT Staff and Administrator users. **No email address.** | The owner picker needs the list, and the user-admin API is Administrator-only. | - |
| C-106 | A wrong current password on change-password | `api-spec.md` 12.2, `ui-spec.md` 25.1 | **422 `CURRENT_PASSWORD_INCORRECT`**, shown at the current-password field. **Never 401.** | The client treats 401 as an expired session and sends the user to Login. | - |
| C-107 | The user list's order | `api-spec.md` 12.3, `ui-spec.md` 25.3 | Fixed, **by name ascending, then id**. No user-controlled sort. | 8.5 does not require sorting, and a fixed order keeps tests and screenshots stable. | - |
| C-108 | The queue at tablet width | `ui-spec.md` 25.4 | Keep Ticket Number, Ticket Summary, IT Priority, Current Status, Ticket Owner and Last Updated. **Hide** Created, Category and Requested Priority - they stay on the detail screen. **`specification.md` section 6 is corrected to match FR-39**, so the conflict is fixed at its source rather than worked around. `tests.md` RESP-04 is tightened to assert exactly these columns. | At tablet width the columns that pick the next piece of work stay; the rest is one click away. | Corrects `specification.md` section 6, which named Related System - a column FR-39 never creates |

C-106 lands where C-100 already drew the line: the refusal is about the value submitted, not
about the state of a resource, so it is 422 rather than 409. It adds a ninth code to the
catalogue and a second code to the 422 bucket alongside `ASSIGNEE_NOT_ELIGIBLE` and
`SELF_DEACTIVATION`.

C-108 is the only row in this log that **changes `specification.md` rather than adding to
it**. The section 6 sentence and FR-39 disagreed, and `CLAUDE.md` requires a conflict between
contract documents to be reported rather than resolved locally - it was reported, and this row
is the resolution, applied at the source so the two stop disagreeing.

### Raised in peer review of PR #46

| ID | Topic | Raised by | Decision | Reason | Supersedes |
|---|---|---|---|---|---|
| C-109 | Writing to a terminal Ticket | PAKATO, PR #46 review | A **Closed or Cancelled Ticket is read-only for every role**. Posting a Public Comment or an Internal Note, uploading or soft-removing an Attachment, and changing owner, IT Priority or status all return **409** - a state conflict under C-100. Reading and downloading stay allowed. **`RESOLVED` stays open to comments**, because a Resolved Ticket can still be Reopened. **In the check order, this runs immediately after ownership and ahead of body field validation and the operation's own refusal** (api-spec.md 1.4), so a malformed body on a terminal Ticket still answers 409 `TICKET_CLOSED`, not 400 - the caller does not learn their body was invalid until the Ticket itself is writable. **One exception**: on `DELETE /api/attachments/:id`, an already-removed Attachment stays **410 `ATTACHMENT_REMOVED`** even on a terminal Ticket - the resource being gone precedes the Ticket being write-locked, the same ordering as `L2 C-52`. | C-98 makes both statuses terminal with no way back, so anything written after closure reaches nobody who can act on it; the Requester raises a new Ticket instead. Resolved stays open to comments because a Resolved Ticket can still be Reopened. | Narrows **BR-68**, which allowed the owning Requester, IT Staff and Administrator to post Public Comments with no status constraint, and **BR-96**, which let any staff user act on any Ticket |

The reviewer's point was that `specification.md` section 5.1 makes `CLOSED` and `CANCELLED`
terminal while BR-68 permitted comments on any Ticket the caller could see, and neither rule
mentioned the other. Both readings were self-consistent, so no test would have caught the
disagreement - the same shape of defect as C-108, found by a person rather than by an audit.

**Code reuse.** The refusal keeps its existing name where one already exists. A status change
on a terminal Ticket stays **409 `INVALID_STATUS_TRANSITION`** (BR-55, AC-81, API-67) - it is
generated by the section 5.1 matrix and is already tested. The other write operations gain one
new code, **409 `TICKET_CLOSED`**, because `INVALID_STATUS_TRANSITION` would misname a refused
comment: no transition was attempted. One new code, not one per operation and not one per
terminal status.

### Raised by the review schedule

| ID | Topic | Raised by | Decision | Reason | Supersedes |
|---|---|---|---|---|---|
| C-110 | Stacked pull requests while review is batched | The reviewer's schedule: PAKATO reviews all nine feature PRs at the end of the batch, not partway through | **Unapproved PRs may stack through #45**, each targeting the feature branch directly below it (#46 into `lab3-staging`; #47 into `feature/lab3-1-contract`; #48 into `feature/lab3-2-data-migration`; and so on). **Nothing merges into `lab3-staging` until the reviewer has reviewed.** A change review asks for in a lower PR is made on **that** branch, then merged **upward** into each stacked branch in order with `git merge` - never a rebase, so no pushed branch is rewritten - and all three suites are run at every level. Each stacked PR states its stack in its body. Once the PRs below it merge, a PR is retargeted to `lab3-staging`. **The release PR, `lab3-staging` into `main`, is never stacked** - it opens only after every feature PR has merged. | Peer review stays mandatory on every PR (`LS 11.1`), but one reviewer reviewing once cannot keep pace with nine sequential Issues. Stacking keeps each PR's diff to its own Issue. Merging upward rather than rebasing keeps every pushed branch and every captured commit hash valid. The stack now runs the full nine Issues (through #45) because the reviewer batches all of them to one pass at the end rather than reviewing mid-stack. The release PR stays unstacked because it is the single gate onto `main` and needs every feature PR settled first | Narrows `CLAUDE.md`'s "every `gh pr create` carries `--base lab3-staging`" and C-88's "every feature branch opens a PR into `lab3-staging`" for the stacked PRs only; the base becomes `lab3-staging` again once the PRs below merge. Supersedes this row's own earlier "reviews once, after #41" schedule |

### Raised during implementation

| ID | Topic | Raised by | Decision | Reason | Supersedes |
|---|---|---|---|---|---|
| C-112 | How the client learns who signed in | Setup item 4 (#48) | **The client takes its identity from the `POST /api/auth/login` response**, not from a follow-up `GET /api/auth/me` call. `GET /api/auth/me` is still called once, at page load, to recover identity from the session cookie after a refresh. `ui-spec.md` 10 is corrected to match: a successful Login holds the login response directly rather than fetching the current user again. | The login response and `/api/auth/me` already return the same six keys (`api-spec.md` 10.1), so a client that discards the login response and immediately re-asks the server for the identity it was just given spends a second round trip for nothing. One fewer request, on the one path every session takes | Narrows `ui-spec.md` 10's "the client fetches the current user" step |

### Raised during implementation

| ID | Topic | Raised by | Decision | Reason | Supersedes |
|---|---|---|---|---|---|
| C-111 | The queue's Current Status filter | Implementation of #41 | **No `All statuses` option.** The Current Status select offers exactly nine options: the default `Open tickets` (the parameter omitted, BR-72's exclusion applies) and each of the eight statuses individually. `ui-spec.md` 15.1 is corrected to match - its `All statuses` option is removed from the table and from the option count. | `api-spec.md` 8.1 gives `currentStatus` exactly one value from the eight-member enum, or omitted, which always means the BR-72 default; there is no query that returns every status unfiltered, so an `All statuses` option could not be served without inventing new API behavior. No new behavior is needed: Closed and Cancelled stay reachable by selecting them individually, and a *queue* exists to show unfinished work, not a full Ticket archive. | Narrows `ui-spec.md` 15.1's Current Status filter row |

### Raised during implementation

| ID | Topic | Raised by | Decision | Reason | Supersedes |
|---|---|---|---|---|---|
| C-113 | A malformed path `:id` | Implementation of #42 | **A non-positive-integer path parameter answers 400 `INVALID_QUERY_PARAM`**, with `fields` naming the parameter (`id`), on every route addressed by a Ticket, Attachment or other resource id - staff or Requester, new or carried from Lab 2. `VALIDATION_FAILED` stays for a body field; a path parameter is not a body field. | `api-spec.md` 1.3 named no code for a bad path parameter, and the existing `GET /api/tickets/:id` already answered `INVALID_QUERY_PARAM` for one (`L2 C-43`); the #42 routes had drifted to `VALIDATION_FAILED` instead. One code for every malformed id, matching the Lab 2 precedent, rather than two codes for the same shape of error. | Narrows `api-spec.md` 1.3's `VALIDATION_FAILED` and `INVALID_QUERY_PARAM` rows for the #42 staff and Ticket/Attachment-id routes |

### Raised during implementation

| ID | Topic | Raised by | Decision | Reason | Supersedes |
|---|---|---|---|---|---|
| C-114 | The owner's activation state on the Requester Ticket DTO | Implementation of #42 | **`api-spec.md` 10.2's `owner` key gains `isActive`: `{ name, isActive }` \| null.** `ui-spec.md` 14.1 already asks the Requester Ticket Detail screen to show a deactivated owner as `Siriporn Chai (inactive)`, the same marker C-33 already gives the IT Staff screen, but the DTO carried `{ name }` only - there was no flag to render it from. | `api-spec.md` 10.2 and `ui-spec.md` 14.1 disagreed with each other and neither named the other, the same shape of gap as C-108 and C-109: both readings were self-consistent, so no test would have caught it until the screen was actually built against both documents at once (found in #42). Adding `isActive` costs nothing BR-100 protects - the email address stays absent - and matches the precedent C-33 already set for the IT Staff screen. | Narrows `api-spec.md` 10.2's `owner` row shape |

---

## Carried from Lab 2

All of C-01 to C-52 remain the record of Lab 2 and continue to bind Lab 2 behavior on the
final `main`. Fifteen of them change in Lab 3.

### Superseded or changed

| ID | Lab 2 decision | Status in Lab 3 | Replaced by |
|---|---|---|---|
| C-07 | `Ticket.itPriority` is a nullable column, never settable | **Superseded.** Backfilled from Requested Priority, made `NOT NULL`, and set on create. | C-71 |
| C-09 | Six test levels, the level carried by the Test ID column | **Changed.** Eight levels; the Test ID column still carries the level. | C-89 |
| C-10 | Playwright: Chromium, three viewports, `webServer` disabled, Lab 2 screenshot folders | **Carried with additions.** Same projects; Lab 3 screenshot folders and a per-role `storageState` setup project. | C-90 |
| C-12 | `requesterId` in the POST body and as `?requesterId=` on GETs | **Superseded.** Identity never travels in the request. | C-64 |
| C-13 | 403 when a Ticket or Attachment exists but belongs to another Requester, deliberately leaking its existence | **Superseded.** 404, because labsheet 6.2 forbids the leak now that a security boundary exists. | C-65 |
| C-20 | A removed file returns 410 to the owner and 403 to a non-owner | **Superseded.** 410 to the owner is unchanged; a non-owner now receives 404. C-13 and C-20 were linked and move together. | C-65 |
| C-21 | The status enum carries five values, only `NEW` reachable | **Superseded.** Eight values, all reachable. | C-70 |
| C-22 | The graded seed contains no Tickets; demonstration data lives in `seed-demo.ts` | **Changed.** 5.3 now requires Tickets, comments and notes in the graded seed; `seed-demo.ts` keeps only the pagination volume. | C-91 |
| C-31 | The model is `RequesterUser`; the UI label is "Development Requester" | **Superseded.** The model is `User`. The UI says "Requester", the role; "Development Requester" disappears. | C-67 |
| C-32 | The selected Requester is held in React context and persisted in `localStorage` | **Superseded.** No identity is held in browser storage at all. The client learns who it is from `/api/auth/me` and the session cookie. | C-54, C-56 |
| C-33 | An inactive Requester is hidden from the selector, is refused with 403, and keeps their data | **Changed.** An inactive user cannot log in and loses existing sessions. Their Tickets and Attachments are kept (`L2 LC-01`). An inactive IT Staff user cannot be assigned and stays shown as "(inactive)" on Tickets they already own. | C-59, C-55, C-75 |
| C-40 | A canonical glossary fixes each term once | **Carried and extended.** Eight Lab 3 terms are added. | C-92 |
| C-42 | `requesterId` as a query parameter on every endpoint except `POST /api/tickets` | **Superseded.** The parameter is ignored wherever it appears. | C-64 |
| C-45 | An unknown `requesterId` returns 404 and an inactive one 403, both resolved before the addressed resource is loaded | **Superseded.** There is no client-supplied caller to resolve; the inactive case moves to the login path. | C-64, C-59, C-63 |
| C-51 | Client routing is the hand-rolled `router.tsx`, and Lab 3 may adopt a library if the route count grows | **Changed.** The router is kept and extended with guards; no library is adopted. | C-85 |

### Carried unchanged

C-01 project guardrail - C-02 section 12 test file names - C-03 client test path
(`client/tests/lab-NN/`) - C-04 Lab 1 SystemCheck component - C-05 reference-data
`isActive` - C-06 screen modes, edit deferred - C-08 unit test location - C-11 Ticket
Number format - C-14 upload rejection statuses - C-15 two-step attachment upload -
C-16 multer - C-17 attachment storage - C-18 attachment slot accounting - C-19 removal
reason required - C-23 Requested Priority values - C-24 Related System scoping -
C-25 field validation bounds - C-26 duplicate submission - C-27 ticket-list query
contract - C-28 empty versus no-results - C-29 sort order - C-30 searchable fields -
C-34 Ticket Date - C-35 AI use document name - C-36 specification file name -
C-37 migration strategy, never `migrate reset` - C-38 environment variables -
C-39 timestamp handling - C-41 product name TokTickIT - C-43 malformed `page` -
C-44 download and preview selection - C-46 unavailable attachment state -
C-47 Selection screen screenshot location - C-48 Selection screen test file -
C-49 Ticket Number assignment point - C-50 Ticket Number year versus displayed date -
C-52 check order for `disposition`.

---

## Notes

- C-13 and C-20 were linked in Lab 2, and a change to either had to be reflected in the
  other. C-65 changes both together.
- C-64 removes three error codes from the contract - `REQUESTER_REQUIRED`,
  `REQUESTER_NOT_FOUND` and `REQUESTER_INACTIVE`. `api-spec.md` section 1.3's catalogue and
  every test that asserts them must be updated, not left to fail.
- C-71 changes the meaning of four existing Lab 2 tests that assert `itPriority` is null:
  `server/tests/lab-02/data-model.db.test.ts` DB-06, `create-ticket.api.test.ts` API-03,
  `client/tests/lab-02/MyTickets.test.tsx` line 217, and `RequesterTicketDetail.test.tsx`
  STYLE-07. Each is rewritten, not deleted; `tests.md` records the disposition.
- C-70 also fixes `server/tests/lab-02/data-model.db.test.ts` DB-04, which asserts the
  `TicketStatus` enum equals exactly its five Lab 2 values in declared order. That
  assertion is updated to the eight Lab 3 values in the same commit as the enum migration.
- C-83's rehearsal is the only evidence that the C-67 rename preserved ticket ownership.
  `migration.db.test.ts` runs against a freshly created `toktickit_test`, which has no Lab
  2 history to preserve, so it can prove schema shape and seed invariants and nothing more.
