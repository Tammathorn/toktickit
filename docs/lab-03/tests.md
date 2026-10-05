# Lab 3 Test Plan and Results

TokTickIT - CPE 334 Individual Sprint 3.
Owner: Tammathorn Kananurak (67070503489).

Planned from `specification.md` **before implementation**, per `LS 10`. This plan is not
reconstructed from whatever tests were generated afterwards; it is the contract the
implementation is measured against. Tests are written first, run first, and their failing output
captured before the code that satisfies them exists (`CLAUDE.md`).

Sources: `specification.md` (binding), `api-spec.md`, `ui-spec.md`, `decisions.md`, and
`phase1-analysis.md` section 3 for the Lab 2 disposition.

The `Final` column is blank until the final run on the release branch. A row whose `Final` is
blank is a planned test, not a passing one, and no claim is made for it.

---

## 1. Test Strategy

`LS 10` requires **eight** levels for Lab 3 - the six of Lab 2 plus security/authorization and
migration/regression. Per C-89 the level is carried by the **Test ID prefix**, not by the
filename, because `LS 12` fixes the filenames and there is no room to encode a level in them.

| Prefix | Level | Tool | Where it lives |
|---|---|---|---|
| `UNIT` | Unit | Vitest | `server/tests/lab-03/auth.api.test.ts` and the Lab 2 unit file |
| `API` | API / integration | Supertest + Vitest | The six `server/tests/lab-03/*.api.test.ts` files |
| `UI` | UI component | Vitest + Testing Library | The five `client/tests/lab-03/*.test.tsx` files |
| `STYLE` | UI style | Vitest + Testing Library | Inside the same client files (C-89) |
| `RESP` | Responsive | Playwright | The three `e2e/lab-03/*.spec.ts` files, three viewport projects |
| `SEC` | **Security / authorization** | Supertest | `server/tests/lab-03/authorization.api.test.ts`, plus role tests inside each API file |
| `MIG` | **Migration / regression** | Vitest + Prisma against real Postgres | `server/tests/lab-03/migration.db.test.ts`, plus the C-83 rehearsal artifact |
| `E2E` | End to end | Playwright | The three `e2e/lab-03/*.spec.ts` files |

One further ID appears in this plan and is **not** one of the eight automated levels:

| ID | What it is | Where it lives |
|---|---|---|
| `VIS-01` | The **manual** responsive and visual checklist, completed by a person against the RESP-09 captures. It is the predicate AC-106 and AC-107 partly rest on, and it is deliberately not an automated test - `LS 8.8` asks for a comparison against a written specification, which is a judgement | Section 5, against `ui-spec.md` section 24 |

`VIS-01` is excluded from the 278 count in section 2 and from the per-level table, because counting
a human checklist as a planned automated test would overstate the automation. It is listed here so
that its appearances in section 3's traceability table resolve to something declared.

**`SEC` and `MIG` are the two new levels**, and both are new because Lab 3 introduces something
Lab 2 did not have: a security boundary, and a migration over existing data. Neither can be
discharged by reading code - `CLAUDE.md` requires a security claim to be backed by a named
passing test.

### 1.1 Test file inventory

Every path below is in the `LS 12` tree, which is a stated **minimum**; additions are permitted,
renames and relocations are not (C-84, `CLAUDE.md`).

```
server/tests/lab-03/auth.api.test.ts                  LS 12
server/tests/lab-03/authorization.api.test.ts         LS 12
server/tests/lab-03/staff-queue.api.test.ts           LS 12
server/tests/lab-03/staff-ticket-detail.api.test.ts   LS 12
server/tests/lab-03/comments-notes.api.test.ts        LS 12  (not notes.api.test.ts - C-84)
server/tests/lab-03/users-admin.api.test.ts           LS 12
server/tests/lab-03/migration.db.test.ts              LS 12
client/tests/lab-03/Login.test.tsx                    LS 12
client/tests/lab-03/ChangePassword.test.tsx           LS 12
client/tests/lab-03/StaffTicketQueue.test.tsx         LS 12
client/tests/lab-03/StaffTicketDetail.test.tsx        LS 12
client/tests/lab-03/UserManagement.test.tsx           LS 12
e2e/lab-03/authentication.spec.ts                     LS 12  (not first-login.spec.ts - C-84)
e2e/lab-03/staff-ticket-flow.spec.ts                  LS 12
e2e/lab-03/user-administration.spec.ts                LS 12
```

**No file is added to this list.** Lab 2 needed three additions; Lab 3 needs none, because the
`LS 12` tree already names a file for every level once `migration.db.test.ts` is counted.

**Client tests go in `client/tests/lab-03/`** because `client/vite.config.ts` includes only
`tests/**/*.test.tsx` - any other location collects zero tests and still reports success
(`CLAUDE.md`). This is checked before the first client test is written, not after.

Where `LS 10`'s example table disagrees with `LS 12` on a filename, `LS 12` wins (C-84). It
disagrees twice, and both are resolved above.

### 1.2 Approach

**API and security tests** run against a separate `toktickit_test` database (C-83). A Vitest
global setup points `DATABASE_URL` at it and runs `migrate deploy` plus the seed, so the Supertest
suite never touches dev data and `L2 C-37`'s protection of the seeded dev database is never
exercised by a test run.

**Authenticated requests use a logged-in Supertest agent**, which holds the `tt_session` cookie.
No test sends a `requesterId`, except the three that assert it is *ignored*.

**Client tests** mock `fetch` at the module boundary and render inside an `AuthContext` test
wrapper that supplies a user and a role. They assert rendered output, never implementation
internals. The Lab 2 `STORAGE_KEY` + `RequesterProvider` harness is replaced in all five adapted
files (`phase1-analysis.md` section 3).

**Playwright** drives the real stack across three viewport projects (C-90). A setup project logs
in once per role and writes one `storageState` per role into `e2e/.auth/`, which is gitignored.
Every spec starts from a known identity.

**No test is skipped, `.only`, commented out, deleted or weakened to make a suite green**
(BR-95, `CLAUDE.md`). A test retires only where a decision row names its replacement, and section
5 records every such case.

### 1.3 What the counts must do

Lab 2 ended at **86 server, 48 client, 126 Playwright** (42 specs x 3 viewports). Section 4 is the
disposition of every one of those, by test ID. Any drop in a suite count that section 4.3 does not
account for is a bug, not a cleanup (`CLAUDE.md`).

---

## 2. Planned Tests

**278 planned tests** across the eight `LS 10` levels. Every test names a file path from section
1.1, and every path exists in the `LS 12` tree.

| Level | Prefix | Planned |
|---|---|---|
| Unit | `UNIT` | 12 |
| API / integration | `API` | 116 |
| Security / authorization | `SEC` | 26 |
| Migration / regression | `MIG` | 24 |
| UI component | `UI` | 52 |
| UI style | `STYLE` | 12 |
| Responsive | `RESP` | 10 |
| End to end | `E2E` | 26 |
| **Total** | | **278** |

Five IDs were retired to the merges approved in section 9.1 - API-63, API-65, API-78, API-91 and
SEC-12 - so `API` runs 01..117 and `SEC` 01..27 with those five absent. **Surviving IDs were not
renumbered**, because every one is cited in the section 3 traceability matrix and renumbering to
close five gaps would have rewritten a hundred references to save nothing. Two of the 24 `MIG`
rows - MIG-21 and MIG-22 - are discharged by committed artifacts rather than by an assertion in a
test file, and section 2.8 says so explicitly rather than counting them as automated tests.

### 2.1 Unit

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| UNIT-01 | Unit | BR-11, C-53 | scrypt hash format | `hashPassword()` returns `scrypt$N$r$p$salt$hash`, six `$`-separated parts, salt 16 bytes as 32 hex characters | `server/tests/lab-03/auth.api.test.ts` | |
| UNIT-02 | Unit | BR-11 | Per-user salt | The same plaintext hashed twice yields two different stored strings, and both verify | `server/tests/lab-03/auth.api.test.ts` | |
| UNIT-03 | Unit | BR-11 | Verification is correct and constant-time | `verifyPassword()` is true for the right password, false for a wrong one, and uses `timingSafeEqual` rather than `===` | `server/tests/lab-03/auth.api.test.ts` | |
| UNIT-04 | Unit | BR-17, C-72 | NULL hash never authenticates | `verifyPassword(null, anything)` is false and throws nothing | `server/tests/lab-03/auth.api.test.ts` | |
| UNIT-05 | Unit | BR-12 | Password policy boundaries | 7 characters fails, 8 passes, 128 passes, 129 fails | `server/tests/lab-03/auth.api.test.ts` | |
| UNIT-06 | Unit | BR-12 | Password policy character classes | One password missing each of upper, lower, digit and special is refused; one carrying all four passes | `server/tests/lab-03/auth.api.test.ts` | |
| UNIT-07 | Unit | BR-14, C-60 | One validator, three call sites | The validator module exported for Change Password, Administrator create and set-initial-password is the same function, asserted by identity | `server/tests/lab-03/auth.api.test.ts` | |
| UNIT-08 | Unit | BR-21, C-54 | Token and its stored hash | A 32-byte token renders as 64 hex characters; the stored value is its SHA-256 and never the token | `server/tests/lab-03/auth.api.test.ts` | |
| UNIT-09 | Unit | BR-22, C-55 | Session expiry arithmetic | `expiresAt` is exactly `createdAt` + 8 h; a fixed clock at +7 h 59 m is live and at +8 h 1 m is expired | `server/tests/lab-03/auth.api.test.ts` | |
| UNIT-10 | Unit | BR-06, BR-99 | Email normalisation | A padded mixed-case address is trimmed and lower-cased; a 254-character address passes and 255 fails; an address with no `@` fails | `server/tests/lab-03/auth.api.test.ts` | |
| UNIT-11 | Unit | BR-64, BR-99 | Trim-then-measure | `name` and comment `body` are trimmed before length is measured, so a padded 1-character value is 1 and not 3 | `server/tests/lab-03/auth.api.test.ts` | |
| UNIT-12 | Unit | BR-55, section 5.1 | The transition matrix as data | Every cell of `specification.md` 5.1 is asserted against the transition function: 64 pairs, each permitted or refused exactly as the matrix says | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | |

UNIT-12 is deliberately data-driven from the matrix rather than a list of hand-picked cases. The
matrix has 8 x 8 = 64 cells and every one is asserted, so a cell cannot be changed in the code
without a test failing.

### 2.2 API and integration - authentication

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| API-01 | API | AC-01, FR-02 | Valid login | 200; body carries id, name, email, role, isActive, mustChangePassword | `server/tests/lab-03/auth.api.test.ts` | |
| API-02 | API | AC-12, BR-10 | Login body carries no secret | The 200 body has exactly six keys; no `passwordHash`, no `password`, no token, no session id | `server/tests/lab-03/auth.api.test.ts` | |
| API-03 | API | AC-13, BR-21 | Cookie flags | `Set-Cookie` names `tt_session` and carries `HttpOnly`, `SameSite=Strict` and `Path=/` | `server/tests/lab-03/auth.api.test.ts` | |
| API-04 | API | AC-14, BR-21 | Only the hash is stored | After login the `Session` row's `tokenHash` equals the SHA-256 of the cookie's token, and the raw token appears in no column | `server/tests/lab-03/auth.api.test.ts` | |
| API-05 | API | AC-05, BR-07 | Unknown email | 401 `INVALID_CREDENTIALS`, body byte-identical to API-06's, no cookie | `server/tests/lab-03/auth.api.test.ts` | |
| API-06 | API | AC-06, BR-07 | Wrong password | 401 `INVALID_CREDENTIALS`; no response body or log line contains the submitted password | `server/tests/lab-03/auth.api.test.ts` | |
| API-07 | API | AC-07, BR-17 | NULL password hash | A migrated user with `passwordHash` NULL gets the same generic 401 for any password | `server/tests/lab-03/auth.api.test.ts` | |
| API-08 | API | AC-08, BR-09 | Inactive account, right password | 403 `ACCOUNT_INACTIVE`, no cookie set | `server/tests/lab-03/auth.api.test.ts` | |
| API-09 | API | AC-09, BR-09 | Inactive account, wrong password | 401 `INVALID_CREDENTIALS`, **not** `ACCOUNT_INACTIVE` - inactivity is revealed only to someone holding the password | `server/tests/lab-03/auth.api.test.ts` | |
| API-10 | API | AC-10, BR-08 | No lockout | Ten consecutive failures then the correct password gives 200 | `server/tests/lab-03/auth.api.test.ts` | |
| API-11 | API | AC-11, BR-06 | Case-insensitive email | A stored lower-case address logs in when supplied in mixed case | `server/tests/lab-03/auth.api.test.ts` | |
| API-12 | API | AC-22, BR-32 | Current user under the gate | A user with `mustChangePassword` true gets 200 from `/api/auth/me` with name and role | `server/tests/lab-03/auth.api.test.ts` | |
| API-13 | API | BR-33, FR-70 | Current user carries no secret | The 200 body has the six keys and no hash or token | `server/tests/lab-03/auth.api.test.ts` | |
| API-14 | API | AC-21, BR-19, C-99 | The gate refuses everything else | A gated user calling `GET /api/tickets`, the queue, and `GET /api/users` each gets **403 `PASSWORD_CHANGE_REQUIRED`**, never 401 | `server/tests/lab-03/auth.api.test.ts` | |
| API-15 | API | AC-28, BR-18 | Successful change clears the gate | 200; `mustChangePassword` false in the body; the calling session still works | `server/tests/lab-03/auth.api.test.ts` | |
| API-16 | API | AC-27, BR-15, BR-105 | Wrong current password | **422 `CURRENT_PASSWORD_INCORRECT`** with the message in `fields.currentPassword`; the stored hash is unchanged; the session still works. Asserts it is **not 401**, because the client would treat 401 as an expired session (C-106) | `server/tests/lab-03/auth.api.test.ts` | |
| API-17 | API | AC-23, AC-24, BR-12 | Change-password policy | 7, 129, and one password missing each character class are each refused with the BR-12 catalogue message in `fields.newPassword` | `server/tests/lab-03/auth.api.test.ts` | |
| API-18 | API | AC-25, BR-13 | New must differ from current | Submitting the current password as the new one is refused | `server/tests/lab-03/auth.api.test.ts` | |
| API-19 | API | AC-26, BR-13 | Confirmation mismatch, server side | A mismatched confirmation is refused by the backend, not only by the client | `server/tests/lab-03/auth.api.test.ts` | |
| API-20 | API | AC-29, BR-102, C-97 | Self-service change revokes other sessions | Two sessions; one changes the password; that one still works and the other gets 401 | `server/tests/lab-03/auth.api.test.ts` | |
| API-21 | API | AC-16, BR-23 | Logout ends one session only | Two sessions; one logs out with 204; the other still works | `server/tests/lab-03/auth.api.test.ts` | |
| API-22 | API | AC-17, FR-07 | Replayed token after logout | The logged-out token on a protected route gives 401 | `server/tests/lab-03/auth.api.test.ts` | |
| API-23 | API | AC-15, BR-22 | Absolute 8-hour expiry | A session row aged past 8 h gives 401 on every protected route | `server/tests/lab-03/auth.api.test.ts` | |
| API-24 | API | AC-116, BR-101, C-96 | Expired rows are deleted on lookup | After the 401 of API-23 the `Session` row no longer exists | `server/tests/lab-03/auth.api.test.ts` | |
| API-25 | API | AC-18, BR-24 | Deactivation kills live sessions | A logged-in user deactivated by an Administrator gets 401 on their next request | `server/tests/lab-03/auth.api.test.ts` | |
| API-26 | API | A-01 | Login on an existing session | A second login issues a second `Session` row and both tokens work | `server/tests/lab-03/auth.api.test.ts` | |
| API-27 | API | AC-19, BR-27, C-58 | CSRF: foreign `Origin` rejected | `POST` with a valid session and `Origin: http://evil.example` gives 403 `ORIGIN_NOT_ALLOWED` | `server/tests/lab-03/auth.api.test.ts` | |
| API-28 | API | AC-20, BR-27, C-58 | CSRF: missing `Origin` accepted | The same `POST` with no `Origin` header succeeds | `server/tests/lab-03/auth.api.test.ts` | |

API-05 and API-06 assert **byte-identical** bodies rather than merely the same status, because
BR-07's rule is that no field distinguishes the two. Comparing the serialised bodies is the only
assertion that actually tests that.

API-27 and API-28 are the two tests C-58 names explicitly. Neither is optional.

### 2.3 Security and authorization

The level `LS 10` adds and `LS 6.2` is graded on. Test names are written so the terminal output
reads as evidence, per `CLAUDE.md`: the name states the caller, the route, the status and what was
*not* returned.

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| SEC-01 | Security | AC-43, FR-20, BR-92 | **Route inventory** - the test `CLAUDE.md` names | Walks the Express router, enumerates every registered route, and calls each with **no session**. Every route outside the four public ones answers 401. A new unprotected route added later fails this test without anyone remembering to update it | `server/tests/lab-03/authorization.api.test.ts` | |
| SEC-02 | Security | AC-44, C-62, FR-69 | The four public routes stay public | `GET /api/health`, `/api/categories`, `/api/related-systems` answer 200 with no session and the Lab 1 shapes; `POST /api/auth/login` is reachable | `server/tests/lab-03/authorization.api.test.ts` | |
| SEC-03 | Security | AC-36, BR-74 | `Requester GET /api/staff/tickets -> 403, no ticket data` | 403 `FORBIDDEN_ROLE`; the body carries no ticket array, no count, no `meta` | `server/tests/lab-03/authorization.api.test.ts` | |
| SEC-04 | Security | AC-04, BR-70 | `Requester GET /api/tickets/:id/internal-notes -> 403, no note content` | 403; the body contains none of the seeded note bodies and no note count | `server/tests/lab-03/authorization.api.test.ts` | |
| SEC-05 | Security | AC-37, C-63, C-65 | `Requester internal-notes on a nonexistent ticket -> 403, identical to an existing one` | The 403 body for ticket id 999999 is **byte-identical** to the 403 body for a real ticket, proving the role check precedes the load | `server/tests/lab-03/authorization.api.test.ts` | |
| SEC-06 | Security | AC-37, C-63 | `Requester internal-notes with a malformed id -> 403, not 400` | `/api/tickets/abc/internal-notes` gives 403, not 400, proving parsing follows the role check | `server/tests/lab-03/authorization.api.test.ts` | |
| SEC-07 | Security | BR-70, FR-29 | Requester POST to internal notes | `POST` is refused 403 and **no `InternalNote` row is created** | `server/tests/lab-03/authorization.api.test.ts` | |
| SEC-08 | Security | AC-38, BR-42, C-65 | `Requester B GET Requester A's ticket -> 404, no ticket data` | 404 `TICKET_NOT_FOUND`; body carries no summary, description, number or any Ticket field | `server/tests/lab-03/authorization.api.test.ts` | |
| SEC-09 | Security | AC-39, BR-42 | Cross-Requester attachment | Metadata, download and soft-removal of another Requester's attachment each give 404 | `server/tests/lab-03/authorization.api.test.ts` | |
| SEC-10 | Security | BR-44, C-65 | Removed attachment does not leak to a non-owner | A non-owning Requester asking for a **removed** attachment gets 404, never 410 - so removal state does not leak. The owner gets 410 (AC-40) | `server/tests/lab-03/authorization.api.test.ts` | |
| SEC-11 | Security | AC-96, BR-39 | `IT Staff and Requester -> every user-administration route -> 403` | Parameterised over both non-Administrator roles: all four of `GET /api/users`, `POST /api/users`, `PATCH /api/users/:id`, `POST /api/users/:id/initial-password` give 403 to each; no user data in any body. Merged from SEC-12 (section 9.1) | `server/tests/lab-03/authorization.api.test.ts` | |
| SEC-13 | Security | BR-39, C-66 | Administrator holds every staff ticket permission | An Administrator succeeds on the queue, staff detail, claim, owner, IT Priority, status, comments and notes - all eight | `server/tests/lab-03/authorization.api.test.ts` | |
| SEC-14 | Security | C-101, section 5.2 [1] | Staff cannot use the Requester routes | IT Staff and Administrator each get 403 on `POST /api/tickets`, `GET /api/tickets` and `GET /api/tickets/:id` | `server/tests/lab-03/authorization.api.test.ts` | |
| SEC-15 | Security | C-103, section 5.2 [2] | Staff read attachments but do not write | IT Staff get 200 on metadata and download, and 403 on upload and soft-removal | `server/tests/lab-03/authorization.api.test.ts` | |
| SEC-16 | Security | AC-58, BR-60 | Staff cannot use the Requester resolution indication | IT Staff and Administrator each get 403 on `POST /api/tickets/:id/requester-resolved` | `server/tests/lab-03/authorization.api.test.ts` | |
| SEC-17 | Security | AC-79, BR-05, BR-54 | `Requester PATCH status -> 403, including Resolved and Closed` | Every one of the eight target statuses gives 403 to a Requester, and the Ticket's status is unchanged after all eight | `server/tests/lab-03/authorization.api.test.ts` | |
| SEC-18 | Security | AC-76, BR-50 | Requester cannot set IT Priority | 403, and the stored value is unchanged | `server/tests/lab-03/authorization.api.test.ts` | |
| SEC-19 | Security | AC-03, AC-41, BR-31, C-64 | Body `requesterId` is ignored on create | `POST /api/tickets` carrying another user's `requesterId` saves the Ticket against the **authenticated** user | `server/tests/lab-03/authorization.api.test.ts` | |
| SEC-20 | Security | AC-03, AC-42, BR-31 | Query `requesterId` is ignored on list | `GET /api/tickets?requesterId=<other>` returns only the authenticated user's Tickets | `server/tests/lab-03/authorization.api.test.ts` | |
| SEC-21 | Security | AC-03, BR-31 | Query `requesterId` is ignored on detail | `GET /api/tickets/:id?requesterId=<owner>` where the Ticket belongs to that other owner still gives 404 to the caller | `server/tests/lab-03/authorization.api.test.ts` | |
| SEC-22 | Security | AC-103, BR-31, C-64 | No route reads a client identity | A source scan asserts no handler reads `req.query.requesterId` or `req.body.requesterId`, and that `server/src/lib/requester.ts` no longer exists | `server/tests/lab-03/authorization.api.test.ts` | |
| SEC-23 | Security | BR-88, FR-70, AC-06 | No secret on any path | Across a success, a 401, a 403, a 404, a 409, a 422 and a forced 500, no response body and no captured log line contains a password, a `passwordHash` or a session token. The success path **includes `GET /api/users`**, the one endpoint whose rows are built from the `User` table and so the likeliest place a hash could surface | `server/tests/lab-03/authorization.api.test.ts` | |
| SEC-24 | Security | AC-105, BR-89 | Safe failure | A forced failure gives 500 `INTERNAL_ERROR` with no stack trace, SQL, filesystem path or database text | `server/tests/lab-03/authorization.api.test.ts` | |
| SEC-25 | Security | AC-104, `CLAUDE.md` | No banned dependency | `package.json` and the source tree carry no `passport`, `jsonwebtoken`, `bcrypt`, `bcryptjs`, `argon2` or `express-session` | `server/tests/lab-03/authorization.api.test.ts` | |
| SEC-26 | Security | AC-47, FR-29, BR-70 | The Requester DTO has no note key | The `GET /api/tickets/:id` payload contains a `publicComments` array and **no key of any name** carrying note data, asserted over the full key set rather than a guessed name | `server/tests/lab-03/authorization.api.test.ts` | |
| SEC-27 | Security | BR-104, C-105, BR-39 | `Requester GET /api/staff/assignable-users -> 403, no user data` | 403 `FORBIDDEN_ROLE` to a Requester; 200 to IT Staff and Administrator. The 403 body carries no name and no id | `server/tests/lab-03/authorization.api.test.ts` | |

**SEC-01 is the test `CLAUDE.md` names by hand**, and it is the one test in this plan that
protects a rule nobody has to remember. It enumerates the router rather than a hand-written list,
so a route added in Issue 6 with no middleware fails it in Issue 6, not at the release audit.

**SEC-05 and SEC-06 are the pair that make AC-04 real.** A 403 that differs between an existing
and a nonexistent Ticket would leak existence just as a 404 would; only byte-identity proves the
role check ran first.

**SEC-26 asserts over the key set, not over a name.** A test asserting
`expect(body.internalNotes).toBeUndefined()` passes if the key is renamed to `notes`. This one
fails on any key whose name or contents reach note data.

### 2.4 API and integration - the IT Staff Ticket Queue

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| API-29 | API | AC-61, BR-72, FR-38 | The default view | No parameters: no Closed or Cancelled Ticket appears, and the order is IT Priority high to low then oldest first | `server/tests/lab-03/staff-queue.api.test.ts` | |
| API-30 | API | BR-72 | The default is replaceable | `?currentStatus=CLOSED` returns Closed Tickets, proving the exclusion is a default and not a filter the caller cannot lift | `server/tests/lab-03/staff-queue.api.test.ts` | |
| API-31 | API | AC-62, BR-71, FR-34 | Search by Ticket Number | A full Ticket Number returns exactly that Ticket; a prefix returns its group | `server/tests/lab-03/staff-queue.api.test.ts` | |
| API-32 | API | AC-62, BR-71 | Search by Ticket Summary | A case-insensitive substring returns the matching Tickets, and Description is never matched | `server/tests/lab-03/staff-queue.api.test.ts` | |
| API-33 | API | AC-63, BR-71, FR-35 | Owner filter, `unassigned` | Every returned Ticket has `owner` null | `server/tests/lab-03/staff-queue.api.test.ts` | |
| API-34 | API | AC-64, BR-71 | Owner filter, `me` | Every returned Ticket is owned by the calling IT Staff user, and the same call by a different staff user returns a different set | `server/tests/lab-03/staff-queue.api.test.ts` | |
| API-35 | API | BR-71, FR-35 | Owner filter, a named user id | Every returned Ticket is owned by that user | `server/tests/lab-03/staff-queue.api.test.ts` | |
| API-36 | API | AC-65, BR-71 | Two filters together | `currentStatus` and `itPriority` together return only Tickets matching both | `server/tests/lab-03/staff-queue.api.test.ts` | |
| API-37 | API | BR-71, FR-35 | Category filter | Only Tickets in that Category are returned | `server/tests/lab-03/staff-queue.api.test.ts` | |
| API-38 | API | AC-66, BR-71, FR-36 | All five sort fields, both directions | `createdAt`, `updatedAt`, `itPriority`, `ticketNumber`, `currentStatus` each in `asc` and `desc` give 200 and the asserted order - ten cases | `server/tests/lab-03/staff-queue.api.test.ts` | |
| API-39 | API | BR-71, api-spec 8.1 | Enum sorts use declaration order | `itPriority:desc` gives HIGH, MEDIUM, LOW - not the alphabetical MEDIUM, LOW, HIGH | `server/tests/lab-03/staff-queue.api.test.ts` | |
| API-40 | API | AC-67, BR-72 | Page sizes | 10, 25 and 50 give 200; 11 gives 400 with a message on `pageSize` | `server/tests/lab-03/staff-queue.api.test.ts` | |
| API-41 | API | BR-72, `L2 C-43` | Paging boundaries | The last page returns a partial slice with correct `meta`; one page beyond returns `data: []` with correct `meta` and status 200, not an error | `server/tests/lab-03/staff-queue.api.test.ts` | |
| API-42 | API | AC-68, BR-73, FR-42 | Unknown sort field | `?sort=description:asc` gives 400 `INVALID_QUERY_PARAM` naming `sort` in `fields`, and no query reaches the database | `server/tests/lab-03/staff-queue.api.test.ts` | |
| API-43 | API | BR-73 | One message per offending parameter | Three bad parameters at once give three `fields` entries, not one generic message | `server/tests/lab-03/staff-queue.api.test.ts` | |
| API-44 | API | BR-71, C-70 | All eight statuses are filterable | Each of the eight `TicketStatus` values is accepted as a filter, including the three added by the migration | `server/tests/lab-03/staff-queue.api.test.ts` | |
| API-45 | API | AC-60, BR-62, FR-40 | The resolution marker reaches the queue | A Ticket carrying `requesterResolvedAt` returns it non-null in its queue row | `server/tests/lab-03/staff-queue.api.test.ts` | |
| API-46 | API | AC-75, BR-30, FR-46 | The inactive-owner marker reaches the queue | A Ticket owned by a deactivated user returns `owner.isActive` false and keeps that owner | `server/tests/lab-03/staff-queue.api.test.ts` | |
| API-47 | API | BR-74, api-spec 10.4 | The queue is not requester-scoped | A queue listing contains Tickets from more than one Requester | `server/tests/lab-03/staff-queue.api.test.ts` | |
| API-48 | API | api-spec 10.4, FR-39 | The queue row shape | The row carries exactly the keys api-spec 10.4 names, and no `requester` key | `server/tests/lab-03/staff-queue.api.test.ts` | |

### 2.5 API and integration - IT Staff Ticket Detail

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| API-49 | API | FR-43, api-spec 10.5 | The staff DTO | Carries `requester` with email, `owner`, `publicComments` **and** `internalNotes` | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | |
| API-50 | API | AC-70, BR-46, FR-44 | Claim an unassigned Ticket | 200; the caller becomes the Ticket Owner | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | |
| API-51 | API | AC-71, BR-46 | Claim a Ticket already owned | 409 `ALREADY_OWNED`; the owner does not change | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | |
| API-52 | API | BR-46, C-75 | The claim race | Two simultaneous claims on one unassigned Ticket: exactly one gets 200, the other 409, and the Ticket has exactly one owner | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | |
| API-53 | API | AC-102 note, C-102 | Claiming does not change status | A `NEW` Ticket claimed stays `NEW` | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | |
| API-54 | API | AC-72, BR-47, C-66 | Assign to an eligible user | Assigning to an active IT Staff user and to an active Administrator both succeed | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | |
| API-55 | API | AC-73, BR-48 | Ineligible assignees | A Requester, an inactive user and an unknown id each give 422 `ASSIGNEE_NOT_ELIGIBLE`; the owner does not change | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | |
| API-56 | API | AC-74, BR-47 | Unassign from a non-worked status | A Ticket in `NEW` or `OPEN` unassigns with 200 and appears under the `unassigned` filter | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | |
| API-57 | API | AC-111, BR-97, C-104 | Unassign while being worked on | `ownerId: null` on a Ticket in `IN_PROGRESS`, `WAITING_FOR_REQUESTER` and `RESOLVED` each gives 409 `OWNER_REQUIRED`; the owner is unchanged | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | |
| API-58 | API | AC-111, C-104 | Reassign while being worked on | Reassigning the same Tickets to another eligible user succeeds, because the Ticket never loses an owner | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | |
| API-59 | API | AC-117, BR-97 | The release path | A Ticket in `IN_PROGRESS` moved to `OPEN` then unassigned: both succeed, and it appears under `unassigned` | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | |
| API-60 | API | api-spec 8.4 | Absent `ownerId` is not an unassign | A `PATCH` with an empty body gives 400, and the owner is unchanged | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | |
| API-61 | API | AC-76, FR-47 | Set IT Priority | Each of LOW, MEDIUM, HIGH is stored and returned | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | |
| API-62 | API | AC-109, BR-97, C-93 | Owner required to start work | Data-driven over all three worked statuses: moving an **unassigned** Ticket to `IN_PROGRESS`, `WAITING_FOR_REQUESTER` and `RESOLVED` each gives 409 `OWNER_REQUIRED` with the status unchanged; after a claim, each move succeeds. Merged from API-63 (section 9.1) | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | |
| API-64 | API | AC-77, BR-55 | The transition matrix over HTTP | One traversal of all 64 cells of section 5.1 on an owned Ticket: every `Y` cell succeeds, and every `-` cell off the diagonal gives 409 `INVALID_STATUS_TRANSITION` with the status unchanged. Merged from API-65 (section 9.1) | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | |
| API-66 | API | AC-78, BR-56, C-77 | Same-status move | Each of the eight statuses targeting itself gives **400**, not 409 and not a silent 200 | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | |
| API-67 | API | AC-81, BR-58, C-98 | Terminal statuses | From `CLOSED` and from `CANCELLED`, each of the **seven other** targets is refused 409 and the status is unchanged. The eighth - the status itself - is the diagonal and is 400 `SAME_STATUS` by BR-56, which API-66 covers; asserting 409 there would contradict it | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | |
| API-68 | API | AC-112, BR-98, C-98 | Reopened only from Resolved | `RESOLVED -> REOPENED` succeeds; `REOPENED` requested from every other status gives 409 | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | |
| API-69 | API | api-spec 8.6 | Refusal precedence | An **unassigned** `CLOSED` Ticket asked for `IN_PROGRESS` gives `INVALID_STATUS_TRANSITION`, not `OWNER_REQUIRED` | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | |
| API-70 | API | AC-59, BR-61, C-76 | Resolution flag cleared | Moving to Resolved, Closed and Cancelled each clears `requesterResolvedAt`, and **no Public Comment is created** | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | |
| API-71 | API | BR-61 | Other moves do not clear it | A move to `IN_PROGRESS` or `WAITING_FOR_REQUESTER` leaves `requesterResolvedAt` set | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | |
| API-72 | API | AC-110, BR-96, C-93 | Shared work | A staff user who does **not** own the Ticket successfully sets IT Priority, posts a comment, writes a note and makes a permitted status change - all four | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | |
| API-73 | API | AC-55, BR-59, BR-60 | Resolution indication recorded | The owning Requester in Open, In Progress, Waiting for Requester and Reopened each succeeds, and Current Status is unchanged in all four | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | |
| API-74 | API | AC-56, BR-60 | Resolution indication refused by status | New, Resolved, Closed and Cancelled each give 409 `RESOLUTION_NOT_PERMITTED_IN_STATUS` | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | |
| API-75 | API | AC-57, BR-42 | Resolution indication by a non-owner | A Requester who does not own the Ticket gets 404 | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | |
| API-119 | API | AC-118, BR-108, C-109 | Terminal Tickets refuse ownership and priority writes | On a `CLOSED` and on a `CANCELLED` Ticket, claim, an owner change and an IT Priority change each give 409 `TICKET_CLOSED` with nothing changed. **A status change on the same Ticket still answers `INVALID_STATUS_TRANSITION`, not `TICKET_CLOSED`** - the code-reuse rule of C-109 | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | |
| API-120 | API | AC-118, BR-108, C-109 | Terminal Tickets refuse attachment writes | On a `CLOSED` and on a `CANCELLED` Ticket, an upload and a soft removal each give 409 `TICKET_CLOSED`, with no `Attachment` row created and no file written and no existing row modified. Listing metadata still gives 200, and downloading an active Attachment still gives 200 | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | |

### 2.6 API and integration - Public Comments and Internal Notes

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| API-76 | API | AC-48, BR-65, FR-28 | Owning Requester posts a comment | 201; author is the authenticated user, `createdAt` is server-set, and it appears first in the list | `server/tests/lab-03/comments-notes.api.test.ts` | |
| API-77 | API | BR-65, FR-52 | Client-supplied author and timestamp ignored | A body carrying `authorId` and `createdAt` is stored with the session's user and the server's clock | `server/tests/lab-03/comments-notes.api.test.ts` | |
| API-79 | API | AC-49, AC-50, BR-64 | Body length boundaries | 1 and 2000 characters succeed; 0 and 2001 are refused - four cases, on comments and on notes. The 0 case includes a **whitespace-only** body, which API-80's trim-before-measure rule makes the same case, and asserts **no row is created**. Merged from API-78 (section 9.1) | `server/tests/lab-03/comments-notes.api.test.ts` | |
| API-80 | API | BR-64 | Trim before measuring | A 2000-character body padded with spaces is accepted and stored trimmed | `server/tests/lab-03/comments-notes.api.test.ts` | |
| API-81 | API | AC-51 | HTML is stored as text | A body containing markup is stored and returned verbatim, unescaped and unaltered, so the client is the only escaping point | `server/tests/lab-03/comments-notes.api.test.ts` | |
| API-82 | API | AC-52, BR-66 | Line breaks preserved | A multi-line body round-trips with its newlines intact | `server/tests/lab-03/comments-notes.api.test.ts` | |
| API-83 | API | BR-67 | Newest first | Three comments posted in order are returned in reverse order, and the same for notes | `server/tests/lab-03/comments-notes.api.test.ts` | |
| API-84 | API | BR-68, BR-04 | All three roles read and post comments | The owning Requester, IT Staff and Administrator each list and post successfully | `server/tests/lab-03/comments-notes.api.test.ts` | |
| API-85 | API | AC-53, BR-04, FR-55 | Staff list and create notes | IT Staff and Administrator each list and create Internal Notes, which carry a server-set author and creation time | `server/tests/lab-03/comments-notes.api.test.ts` | |
| API-86 | API | BR-69, C-73 | Two tables, no leakage | A note and a comment with identical bodies on one Ticket: the comments endpoint returns only the comment, the notes endpoint only the note | `server/tests/lab-03/comments-notes.api.test.ts` | |
| API-87 | API | BR-63, FR-51 | Append-only | No `PATCH` or `DELETE` route exists on either collection or on any individual comment or note - asserted against the router inventory | `server/tests/lab-03/comments-notes.api.test.ts` | |
| API-88 | API | BR-42 | Cross-Requester comments | A Requester listing or posting a comment on another Requester's Ticket gets 404 | `server/tests/lab-03/comments-notes.api.test.ts` | |
| API-89 | API | api-spec 6.1, 10.7 | The row shape | Comment and note rows carry `id`, `body`, `author` with id, name and role, and `createdAt` - and **no author email** | `server/tests/lab-03/comments-notes.api.test.ts` | |
| API-118 | API | AC-118, BR-108, C-109 | Terminal Tickets refuse comments and notes | On a `CLOSED` and on a `CANCELLED` Ticket, posting a Public Comment and creating an Internal Note each give 409 `TICKET_CLOSED` and **no row is created**; listing both still gives 200. A Requester who does **not** own the terminal Ticket still gets **404, not 409**, so the lock does not reveal existence | `server/tests/lab-03/comments-notes.api.test.ts` | |

### 2.7 API and integration - Administrator user management

Every Administrator test `LS 10` lists, plus the rules `LS 4.4` adds.

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| API-90 | API | AC-82, FR-56 | The user list | Every user appears with name, email, role, isActive and mustChangePassword | `server/tests/lab-03/users-admin.api.test.ts` | |
| API-92 | API | AC-83, FR-57 | Search by name and by email | A name fragment and an email fragment each return the matching users, case-insensitively | `server/tests/lab-03/users-admin.api.test.ts` | |
| API-93 | API | AC-84, FR-58 | Role filter | Each of the three roles returns only users holding it | `server/tests/lab-03/users-admin.api.test.ts` | |
| API-94 | API | BR-84, FR-66, AC-98 | No pagination, no page size | `?page=2` and `?pageSize=25` do not paginate the result; the full list is returned | `server/tests/lab-03/users-admin.api.test.ts` | |
| API-95 | API | FR-56 | Inactive users are listed | The list includes inactive users - Status is a column, not a filter | `server/tests/lab-03/users-admin.api.test.ts` | |
| API-96 | API | AC-85, BR-75, BR-16 | Create a user | 201; the user exists with the given name, email, role and activation state, and `mustChangePassword` is **true** | `server/tests/lab-03/users-admin.api.test.ts` | |
| API-97 | API | AC-86, BR-16 | The created user's first login | Logging in with the initial password succeeds and returns `mustChangePassword` true, and every other protected route then gives 403 | `server/tests/lab-03/users-admin.api.test.ts` | |
| API-98 | API | BR-12, BR-14, C-60 | Create enforces the password policy | A weak initial password is refused with the BR-12 catalogue message - the same string Change Password emits | `server/tests/lab-03/users-admin.api.test.ts` | |
| API-99 | API | AC-87, BR-77, FR-62 | Duplicate email on create | 409 `EMAIL_TAKEN`, with the message at the `email` field | `server/tests/lab-03/users-admin.api.test.ts` | |
| API-100 | API | AC-88, BR-77, BR-06 | Duplicate differing only in case | `RATCHADA@x.local` against a stored `ratchada@x.local` is refused as a duplicate | `server/tests/lab-03/users-admin.api.test.ts` | |
| API-101 | API | AC-87 | Duplicate email on edit | Editing a user to an address another user holds gives 409; editing a user to **their own** current address succeeds | `server/tests/lab-03/users-admin.api.test.ts` | |
| API-102 | API | AC-113, BR-99, C-94 | Name bounds | 0 and 101 characters are refused; 1 and 100 are accepted; a padded name is stored trimmed | `server/tests/lab-03/users-admin.api.test.ts` | |
| API-103 | API | AC-114, BR-99, C-94 | Email bounds and format | 254 characters is accepted, 255 refused, an address with no `@` refused; a padded mixed-case address is stored trimmed and lower-cased | `server/tests/lab-03/users-admin.api.test.ts` | |
| API-104 | API | AC-89, BR-76, FR-60 | Edit the four fields | Name, email, role and activation state are all saved, and `createdAt`, `mustChangePassword` and the password hash are unchanged | `server/tests/lab-03/users-admin.api.test.ts` | |
| API-105 | API | BR-76, FR-60 | No other field is editable | A `PATCH` carrying `passwordHash`, `mustChangePassword`, `id` or `createdAt` does not change them | `server/tests/lab-03/users-admin.api.test.ts` | |
| API-106 | API | AC-90, BR-83, BR-24 | Role change revokes sessions | A user with a live session whose role is changed gets 401 on their next request | `server/tests/lab-03/users-admin.api.test.ts` | |
| API-107 | API | AC-91, BR-78, C-79 | Set a new initial password | The user's sessions are revoked, `mustChangePassword` becomes true, and their next login requires a change | `server/tests/lab-03/users-admin.api.test.ts` | |
| API-108 | API | AC-92, BR-79, C-81 | Self-deactivation blocked | An Administrator deactivating themselves gets **422 `SELF_DEACTIVATION`** and stays active | `server/tests/lab-03/users-admin.api.test.ts` | |
| API-109 | API | AC-93, BR-80, C-80 | Last Administrator, deactivation | With exactly one active Administrator, deactivating them gives **409 `LAST_ADMINISTRATOR`** and they stay active | `server/tests/lab-03/users-admin.api.test.ts` | |
| API-110 | API | AC-94, BR-80, BR-82 | Last Administrator, role change | The same account changed to Requester and to IT Staff each gives 409, and the role is unchanged | `server/tests/lab-03/users-admin.api.test.ts` | |
| API-111 | API | AC-95, BR-80, C-80 | The last-Administrator race | Two Administrators deactivated concurrently: exactly one succeeds, and at least one active Administrator remains | `server/tests/lab-03/users-admin.api.test.ts` | |
| API-112 | API | BR-82, C-81 | Self role change permitted | An Administrator may change their own role while another active Administrator exists | `server/tests/lab-03/users-admin.api.test.ts` | |
| API-113 | API | BR-81, FR-66, AC-98 | No delete route | `DELETE /api/users/:id` is not registered, asserted against the router inventory | `server/tests/lab-03/users-admin.api.test.ts` | |
| API-114 | API | BR-29, `L2 LC-01` | Deactivation retains data | A deactivated user's Tickets, Attachments, comments and notes all still exist and are still reachable by staff | `server/tests/lab-03/users-admin.api.test.ts` | |
| API-115 | API | BR-93, C-62 | The removed Lab 2 route | `GET /api/requesters` is not registered; the Administrator user list is its replacement | `server/tests/lab-03/users-admin.api.test.ts` | |
| API-116 | API | BR-104, C-105 | The assignable-users list | Returns active IT Staff and Administrator users only, each as exactly `{ id, name, role }`. A Requester, an inactive staff user and **any email address** are all absent | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | |
| API-117 | API | BR-106, C-107 | The user list's fixed order | The list returns name ascending with id as the tiebreak, and supplying `?sort=` changes nothing | `server/tests/lab-03/users-admin.api.test.ts` | |

API-111 is the test C-80's locking exists for. It runs two concurrent requests and asserts the
invariant afterwards, not the two responses in isolation - a test that only checked one response
would pass against the unlocked implementation that leaves zero Administrators.

### 2.8 Migration and regression

Two halves, per C-83: the automated shape test, and the rehearsal whose artifacts are committed.
`migration.db.test.ts` runs against a freshly created `toktickit_test` with no Lab 2 history, so
it can prove the **shape** but not the **preservation** - which is exactly why the rehearsal
exists and why both are required.

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| MIG-01 | Migration | C-70, BR-52 | The status enum carries eight values | `TicketStatus` holds NEW, OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER, RESOLVED, CLOSED, REOPENED, CANCELLED, in declaration order | `server/tests/lab-03/migration.db.test.ts` | |
| MIG-02 | Migration | C-69 | The role enum exists | `UserRole` holds REQUESTER, IT_STAFF, ADMINISTRATOR | `server/tests/lab-03/migration.db.test.ts` | |
| MIG-03 | Migration | C-67 | The table is named `User` | A `User` table exists and no `RequesterUser` table exists | `server/tests/lab-03/migration.db.test.ts` | |
| MIG-04 | Migration | C-67 | The rename was not a drop | No migration SQL file in `server/prisma/migrations/` contains `DROP TABLE "RequesterUser"`; the rename appears as `ALTER TABLE ... RENAME` | `server/tests/lab-03/migration.db.test.ts` | |
| MIG-05 | Migration | C-68 | The FK column keeps its name | `Ticket.requesterId` exists, is named exactly that, and points at `User` | `server/tests/lab-03/migration.db.test.ts` | |
| MIG-06 | Migration | specification 7 | `User` carries the new columns | `role` NOT NULL default REQUESTER, `passwordHash` nullable, `mustChangePassword` NOT NULL default true, `updatedAt` | `server/tests/lab-03/migration.db.test.ts` | |
| MIG-07 | Migration | C-71, BR-49 | `itPriority` is NOT NULL | The column is NOT NULL, and a newly created Ticket has it equal to `requestedPriority` (AC-45) | `server/tests/lab-03/migration.db.test.ts` | |
| MIG-08 | Migration | specification 7 | `Ticket` carries the new columns | `ownerId` nullable FK to `User`, `requesterResolvedAt` nullable | `server/tests/lab-03/migration.db.test.ts` | |
| MIG-09 | Migration | specification 7, C-73 | The three new tables | `Session`, `PublicComment` and `InternalNote` exist with their columns and foreign keys | `server/tests/lab-03/migration.db.test.ts` | |
| MIG-10 | Migration | specification 7 | Append-only by absence | Neither `PublicComment` nor `InternalNote` has an `updatedAt` or a `deletedAt` column | `server/tests/lab-03/migration.db.test.ts` | |
| MIG-11 | Migration | specification 7 | The queue indexes exist | `[currentStatus, itPriority, createdAt]`, `[currentStatus, ownerId]` and `[currentStatus, categoryId]` are present on `Ticket` | `server/tests/lab-03/migration.db.test.ts` | |
| MIG-12 | Migration | specification 7 | The session and list indexes exist | `Session.tokenHash` unique, `Session[userId]`, `PublicComment[ticketId, createdAt]`, `InternalNote[ticketId, createdAt]` | `server/tests/lab-03/migration.db.test.ts` | |
| MIG-13 | Migration | specification 7 | The four Lab 2 indexes survive | All four `requesterId`-led indexes still exist - My Tickets still issues the query they were chosen for | `server/tests/lab-03/migration.db.test.ts` | |
| MIG-14 | Migration | DoD | Zero drift | `npx prisma migrate diff --exit-code` between the schema and the migrated database reports no drift | `server/tests/lab-03/migration.db.test.ts` | |
| MIG-15 | Migration | AC-99, C-91 | Seed idempotence | Running the graded seed twice leaves the User, Category, RelatedSystem, Ticket, PublicComment and InternalNote counts unchanged | `server/tests/lab-03/migration.db.test.ts` | |
| MIG-16 | Migration | AC-100, C-91, `LS 5.3` | Seed composition | At least four active and one inactive Requester, three active and one inactive IT Staff, one active Administrator, and one dedicated first-login account | `server/tests/lab-03/migration.db.test.ts` | |
| MIG-17 | Migration | C-91, `LS 5.3` | Seeded tickets, comments and notes | Tickets exist across more than one Requester, across all eight statuses, across all three priorities, and both owned and unassigned; example comments and notes exist | `server/tests/lab-03/migration.db.test.ts` | |
| MIG-18 | Migration | AC-101, C-72 | The seed never overwrites a changed password | A seeded user whose hash is then changed keeps the new hash when the seed runs again | `server/tests/lab-03/migration.db.test.ts` | |
| MIG-19 | Migration | C-72 | The first-login account stays flagged | The dedicated account keeps `mustChangePassword` true after a re-seed | `server/tests/lab-03/migration.db.test.ts` | |
| MIG-20 | Migration | C-91 | The natural key is safe | The seed raises an error rather than proceeding if two seeded Tickets would share a Requester email and summary | `server/tests/lab-03/migration.db.test.ts` | |
| MIG-21 | Migration | AC-102, C-83, C-67 | **The rehearsal** | `lab2-final.dump` restored into `toktickit_rehearsal`, `migrate deploy` applied: every table's row count unchanged, every Requester's ticket count unchanged, `itPriority` non-null and equal to `requestedPriority` on every row, and the drift check clean | **Artifact**, `artifacts/lab-03/migration/` | |
| MIG-22 | Migration | AC-46, C-71 | A pre-migration Ticket after migration | In the rehearsal database, a Ticket created before the migration has non-null `itPriority` equal to its `requestedPriority`, and its Requester is unchanged | **Artifact**, `artifacts/lab-03/migration/` | |
| MIG-23 | Migration | AC-108, BR-91, BR-95 | Suite counts | The Lab 1 and Lab 2 suites pass on the final `main`, and every count drop matches a retirement row in section 4.3 | Recorded in section 7 | |
| MIG-24 | Migration | `CLAUDE.md`, DoD | No skipped tests | `git grep -n "\.skip\|\.only\|xit(\|xdescribe("` returns nothing across all three suites | Recorded in section 7 | |

**MIG-21 and MIG-22 are artifacts, not assertions in a test file**, and are listed here because
`LS 10` requires migration evidence and `CLAUDE.md` requires evidence to be passing terminal
output rather than a claim. Their captures are committed under `artifacts/lab-03/migration/`, and
the dev database is migrated only after they pass (C-83). Marking them as tests in this table
without marking them as artifacts would misrepresent how they are produced.

### 2.9 UI component

Rendered with an `AuthContext` test wrapper supplying a user and a role; `fetch` mocked at the
module boundary.

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| UI-01 | UI | FR-01 | Login renders both fields | Email Address and Password render, both required, with a `Sign In` button | `client/tests/lab-03/Login.test.tsx` | |
| UI-02 | UI | FR-01 | Login presence validation | Submitting empty shows both catalogue messages and sends no request | `client/tests/lab-03/Login.test.tsx` | |
| UI-03 | UI | FR-01 | Login busy state | While the request is pending, `Sign In` is disabled, shows `Signing in…`, and a second click fires no second request | `client/tests/lab-03/Login.test.tsx` | |
| UI-04 | UI | AC-05, BR-07 | Invalid credentials | The generic banner renders above the fields, the password is cleared, the email retained, and the banner is **not** attached to the email field | `client/tests/lab-03/Login.test.tsx` | |
| UI-05 | UI | AC-08, BR-09 | Inactive account | The distinct `ACCOUNT_INACTIVE` message renders, visibly different from the invalid-credentials one | `client/tests/lab-03/Login.test.tsx` | |
| UI-06 | UI | FR-67 | Login API failure | The `INTERNAL_ERROR` banner and a `Retry` render | `client/tests/lab-03/Login.test.tsx` | |
| UI-07 | UI | `LS 4.2`, scope | Login offers no excluded affordance | No forgot-password link, no create-account link, no remember-me, no SSO or social button renders | `client/tests/lab-03/Login.test.tsx` | |
| UI-08 | UI | AC-34, FR-11, BR-25 | Nothing is written to browser storage | After a successful login, `localStorage` and `sessionStorage` hold no user id, email, role or token | `client/tests/lab-03/Login.test.tsx` | |
| UI-09 | UI | FR-15, AC-22 | Change Password shows name and role | The authenticated user's name and Role badge render at the top | `client/tests/lab-03/ChangePassword.test.tsx` | |
| UI-10 | UI | FR-16 | The rules are stated before typing | The BR-12 rule text is present on first render, before any input | `client/tests/lab-03/ChangePassword.test.tsx` | |
| UI-11 | UI | AC-26, BR-13 | Confirmation mismatch is caught client-side | A mismatch shows the catalogue message and **sends no request** | `client/tests/lab-03/ChangePassword.test.tsx` | |
| UI-12 | UI | AC-23, AC-24 | Policy messages render below the field | Each policy failure renders the BR-12 message directly below New Password, with `aria-invalid` and `aria-describedby` set | `client/tests/lab-03/ChangePassword.test.tsx` | |
| UI-13 | UI | AC-28, FR-18 | Success and continuation | On 200 the success panel renders with an icon and a sentence, then the role's landing screen renders | `client/tests/lab-03/ChangePassword.test.tsx` | |
| UI-14 | UI | FR-14, BR-20 | The client gate | A user with `mustChangePassword` true navigating to My Tickets, the Queue or User Management renders Change Password instead | `client/tests/lab-03/ChangePassword.test.tsx` | |
| UI-15 | UI | BR-88 | No password is rendered | No password value appears in the DOM after submission, and the fields are cleared on unmount | `client/tests/lab-03/ChangePassword.test.tsx` | |
| UI-16 | UI | FR-39, `ui-spec` 15.2 | Queue desktop table | All nine columns render at desktop width | `client/tests/lab-03/StaffTicketQueue.test.tsx` | |
| UI-17 | UI | FR-40 | Assigned versus unassigned | An owned row shows the owner's name; an unassigned row shows `Unassigned` with the pale cell ground | `client/tests/lab-03/StaffTicketQueue.test.tsx` | |
| UI-18 | UI | AC-75, FR-46 | The inactive-owner marker | A row whose owner is inactive renders `Name (inactive)` | `client/tests/lab-03/StaffTicketQueue.test.tsx` | |
| UI-19 | UI | AC-60, FR-40 | The resolution marker in the queue | A Ticket carrying the indication renders the marker, and it is **not** in the status column | `client/tests/lab-03/StaffTicketQueue.test.tsx` | |
| UI-20 | UI | FR-41, AC-69 | Empty versus no-results | With no filter and no rows, `No tickets in the queue`; with a filter active and no rows, `No matches` plus `Clear filters`. Different headings, different actions | `client/tests/lab-03/StaffTicketQueue.test.tsx` | |
| UI-21 | UI | FR-41 | Queue loading and failure | A skeleton with `aria-busy` while pending; on 500 the failure panel with `Retry`, the toolbar retained | `client/tests/lab-03/StaffTicketQueue.test.tsx` | |
| UI-22 | UI | FR-42, AC-68 | Invalid query feedback | On 400 the `fields` message renders beside its own control and `Clear filters` is offered instead of `Retry` | `client/tests/lab-03/StaffTicketQueue.test.tsx` | |
| UI-23 | UI | FR-35, FR-36, FR-37 | Controls map to parameters | Changing search, each of the four filters, sort and page size issues a request carrying the matching parameter, and search resets `page` to 1 | `client/tests/lab-03/StaffTicketQueue.test.tsx` | |
| UI-24 | UI | FR-24, AC-97 | Queue forbidden state | On 403 the forbidden state renders - not a blank screen and not a generic error | `client/tests/lab-03/StaffTicketQueue.test.tsx` | |
| UI-25 | UI | FR-43, `ui-spec` 16.1 | Staff detail read-only group | Requester, Category, Related System, Requested Priority and the dates render read-only, with no input among them | `client/tests/lab-03/StaffTicketDetail.test.tsx` | |
| UI-26 | UI | FR-44 | Claim renders only when unassigned | `Claim` renders on an unassigned Ticket and not on an owned one | `client/tests/lab-03/StaffTicketDetail.test.tsx` | |
| UI-27 | UI | FR-44, AC-71 | The lost claim race | On 409 the conflict message renders inline in the owner group, the view refreshes, and `Claim` is gone | `client/tests/lab-03/StaffTicketDetail.test.tsx` | |
| UI-28 | UI | FR-45, BR-104, C-105 | Assign offers only eligible users | The owner select is populated from `GET /api/staff/assignable-users` and lists no Requester and no inactive user | `client/tests/lab-03/StaffTicketDetail.test.tsx` | |
| UI-29 | UI | FR-48, section 5.1 | Only permitted transitions are offered | From each current status the select offers exactly the matrix's permitted targets and no others | `client/tests/lab-03/StaffTicketDetail.test.tsx` | |
| UI-30 | UI | BR-58, C-98 | Terminal statuses offer no control | On a Closed and on a Cancelled Ticket the status select is absent and the explanatory line renders | `client/tests/lab-03/StaffTicketDetail.test.tsx` | |
| UI-31 | UI | AC-80, BR-57 | Confirmation before Resolved, Closed, Cancelled | Each of the three opens a modal and **sends no request until it is confirmed**; Cancel sends nothing | `client/tests/lab-03/StaffTicketDetail.test.tsx` | |
| UI-32 | UI | FR-50, AC-59 | The resolution callout | The callout renders when the flag is set and is not presented as a status | `client/tests/lab-03/StaffTicketDetail.test.tsx` | |
| UI-33 | UI | FR-55, AC-107 | Comments and notes are distinct | Both sections render with different headings, the notes panel carries its standing `Not visible to the Requester.` label, and the two composers are not adjacent without the separation | `client/tests/lab-03/StaffTicketDetail.test.tsx` | |
| UI-34 | UI | AC-51, BR-66 | HTML in a body is shown as text | A comment body containing markup renders as visible text with no element from it in the DOM | `client/tests/lab-03/StaffTicketDetail.test.tsx` | |
| UI-35 | UI | FR-53 | The live character counter | The counter tracks the body length and turns danger past 2000 | `client/tests/lab-03/StaffTicketDetail.test.tsx` | |
| UI-36 | UI | FR-51, BR-63 | No edit or delete control | No comment and no note renders an edit or delete affordance | `client/tests/lab-03/StaffTicketDetail.test.tsx` | |
| UI-37 | UI | C-103, FR-49 | Staff attachments are read-only | Preview and Download render; no upload control and no Remove control renders | `client/tests/lab-03/StaffTicketDetail.test.tsx` | |
| UI-52 | UI | AC-118, BR-108, C-109 | A terminal Ticket renders read-only | On a `CLOSED` and on a `CANCELLED` Ticket: no status, owner or IT Priority control renders; neither composer renders; both lists still render their entries; the line `This ticket is closed - create a new ticket if the problem returns.` renders **once**; and the Internal Notes panel keeps its border and its standing label | `client/tests/lab-03/StaffTicketDetail.test.tsx` | |
| UI-38 | UI | AC-82, FR-56 | The user list | Name, Email, Role, Status and Edit render for every user | `client/tests/lab-03/UserManagement.test.tsx` | |
| UI-39 | UI | AC-98, FR-66, BR-84 | The excluded controls are absent | No delete control, no checkbox column, no bulk action, no import, no export, no pagination and no sortable header renders | `client/tests/lab-03/UserManagement.test.tsx` | |
| UI-40 | UI | AC-83, AC-84 | Search and role filter | Each issues a request carrying its parameter and renders the returned rows | `client/tests/lab-03/UserManagement.test.tsx` | |
| UI-41 | UI | FR-59, BR-16 | The create form | Name, Email, Role, Status and Initial Password render, with the must-change line and no email or invitation option | `client/tests/lab-03/UserManagement.test.tsx` | |
| UI-42 | UI | AC-87, FR-62 | Duplicate email at the field | On 409 `EMAIL_TAKEN` the message renders at the Email Address field, not as a banner | `client/tests/lab-03/UserManagement.test.tsx` | |
| UI-43 | UI | AC-92, FR-63 | Self-deactivation | The Status control is disabled on the viewer's own row with the explanatory line; on a 422 the message renders inline | `client/tests/lab-03/UserManagement.test.tsx` | |
| UI-44 | UI | AC-93, AC-94 | Last Administrator | On 409 `LAST_ADMINISTRATOR` the message renders as a form-level banner in the panel | `client/tests/lab-03/UserManagement.test.tsx` | |
| UI-45 | UI | BR-82, C-81 | Self role change is offered | The Role select is **not** disabled on the viewer's own row | `client/tests/lab-03/UserManagement.test.tsx` | |
| UI-46 | UI | FR-60, BR-76 | Edit carries four fields only | The edit form renders Name, Email, Role and Status and no password field | `client/tests/lab-03/UserManagement.test.tsx` | |
| UI-47 | UI | FR-61, AC-91 | Set initial password | The separate panel renders with the validator's rules and the session-revocation warning | `client/tests/lab-03/UserManagement.test.tsx` | |
| UI-48 | UI | AC-97, FR-24, FR-65 | User Management forbidden | A non-Administrator rendering the route sees the forbidden state and **no user request is issued** | `client/tests/lab-03/UserManagement.test.tsx` | |
| UI-49 | UI | AC-30, FR-09, BR-94 | The shell shows identity, not a selector | Name, Role badge and `Log Out` render; the strings `Development Requester` and `Change Requester` are absent | `client/tests/lab-03/Login.test.tsx` | |
| UI-50 | UI | AC-31, AC-32, AC-33, BR-36 | Role-derived navigation | Requester sees My Tickets and Create Ticket only; IT Staff sees the Queue and no User Management; Administrator sees both | `client/tests/lab-03/Login.test.tsx` | |
| UI-51 | UI | AC-35, BR-34, FR-12 | A 401 shows Login | A 401 from any screen's request discards the in-memory user and renders Login, not a generic error | `client/tests/lab-03/Login.test.tsx` | |

### 2.10 UI style

`LS 8.8`'s consistency rules, asserted rather than eyeballed. They live inside the same five
client files (C-89).

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| STYLE-01 | UI style | `ui-spec` 2.1 | The four fixed tokens | The built CSS carries `#006B3C`, `#0B7A46`, `#EAF6EF` and `#F5F7F6` unchanged | `client/tests/lab-03/Login.test.tsx` | |
| STYLE-02 | UI style | `ui-spec` 2.2, 2.4 | The pinned and added tokens | `--tk-surface`, `--tk-text` and the three Lab 3 tokens resolve to their specified values | `client/tests/lab-03/Login.test.tsx` | |
| STYLE-03 | UI style | `ui-spec` 8.2 | Eight status treatments | Each of the eight statuses renders its own treatment and its own title-case text, never the raw enum | `client/tests/lab-03/StaffTicketQueue.test.tsx` | |
| STYLE-04 | UI style | FR-31, BR-49 | The IT Priority badge always renders | Every Ticket row and detail renders an IT Priority badge - the inverse of the Lab 2 assertion | `client/tests/lab-03/StaffTicketQueue.test.tsx` | |
| STYLE-05 | UI style | `ui-spec` 8.4 | The Role badge family | All three roles render with their treatment and the glossary spelling - `IT Staff`, `Administrator`, never `Admin` | `client/tests/lab-03/UserManagement.test.tsx` | |
| STYLE-06 | UI style | `ui-spec` 8.1 | Shape separates the families | Priority badges are pills; status and role badges are square-cornered | `client/tests/lab-03/StaffTicketDetail.test.tsx` | |
| STYLE-07 | UI style | AC-107, FR-55 | Notes are visually distinct | The notes panel's ground, border and standing label differ from the comments section, asserted on computed styles | `client/tests/lab-03/StaffTicketDetail.test.tsx` | |
| STYLE-08 | UI style | `ui-spec` 4 | Read-only versus editable | On staff detail the read-only group and the operations group resolve to different backgrounds | `client/tests/lab-03/StaffTicketDetail.test.tsx` | |
| STYLE-09 | UI style | BR-87 | Message parity | Every validation string the client renders exists verbatim in the `ui-spec` section 6 catalogue | `client/tests/lab-03/ChangePassword.test.tsx` | |
| STYLE-10 | UI style | `CLAUDE.md` | Success is not colour alone | Every success panel carries an icon and a sentence, not only a green ground | `client/tests/lab-03/ChangePassword.test.tsx` | |
| STYLE-11 | UI style | AC-106 group | Accessible names | Every interactive control on all five new screens has a non-empty accessible name | `client/tests/lab-03/UserManagement.test.tsx` | |
| STYLE-12 | UI style | `L2 C-41` | The product name | Every heading and title spells `TokTickIT`; `TikTockIT` appears nowhere | `client/tests/lab-03/Login.test.tsx` | |

### 2.11 Responsive

Playwright, three viewport projects - desktop 1280, tablet 834, mobile 390 (C-90). Each row runs
three times, once per project.

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| RESP-01 | Responsive | AC-106, FR-68 | No horizontal page scroll | On all five new screens at each viewport, `document.documentElement.scrollWidth <= window.innerWidth` | `e2e/lab-03/staff-ticket-flow.spec.ts` | |
| RESP-02 | Responsive | `ui-spec` 15.4 | The queue renders cards on mobile | At 390 px the Queue renders the card list and no `<table>` is present | `e2e/lab-03/staff-ticket-flow.spec.ts` | |
| RESP-03 | Responsive | `ui-spec` 15.2 | The queue renders the table on desktop | At 1280 px all nine columns are present | `e2e/lab-03/staff-ticket-flow.spec.ts` | |
| RESP-04 | Responsive | `ui-spec` 15.3, BR-107, C-108 | The queue's tablet columns | At 834 px the table renders **exactly six columns** - Ticket Number, Ticket Summary, IT Priority, Current Status, Ticket Owner, Last Updated - and Created, Category and Requested Priority are **absent from the DOM**, not merely hidden by CSS | `e2e/lab-03/staff-ticket-flow.spec.ts` | |
| RESP-05 | Responsive | `ui-spec` 17.1 | User Management renders cards on mobile | At 390 px the user list renders cards and no `<table>` | `e2e/lab-03/user-administration.spec.ts` | |
| RESP-06 | Responsive | FR-68, `ui-spec` 4 | 44 px touch targets | At 390 px every control and button on the five new screens has a bounding box at least 44 px high - the Lab 2 VIS-01 row 33 fix, carried | `e2e/lab-03/staff-ticket-flow.spec.ts` | |
| RESP-07 | Responsive | `ui-spec` 9.1 | Mobile navigation per role | At 390 px the toggler is present and the expanded panel exposes exactly the role's destinations, plus the name, Role badge and `Log Out` | `e2e/lab-03/authentication.spec.ts` | |
| RESP-08 | Responsive | AC-106 | Keyboard traversal | Tabbing each new screen reaches every interactive control, each with a visible focus ring | `e2e/lab-03/authentication.spec.ts` | |
| RESP-09 | Responsive | AC-106, DoD | Screenshot capture | Every screenshot named in `ui-spec` section 23 is written, at all three viewports | All three `e2e/lab-03/*.spec.ts` | |
| RESP-10 | Responsive | AC-107 | The notes distinction survives greyscale | The comments-and-notes capture is converted to greyscale and the two panels' mean luminance still differs, with the border edge detectable | `e2e/lab-03/staff-ticket-flow.spec.ts` | |

RESP-10 is the assertion behind the one criterion Lab 2 had to discharge by hand. AC-107 asks
whether two things are *visually distinct*, and a greyscale luminance comparison is a narrow but
real automated answer to part of it; the rest stays in the section 5 checklist, and section 3.1 says
so rather than claiming full automation.

### 2.12 End to end

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| E2E-01 | E2E | AC-01, `LS 14` Part 5 | The login journey | A seeded Requester signs in, lands on My Tickets, and the shell shows their name and Role badge | `e2e/lab-03/authentication.spec.ts` | |
| E2E-02 | E2E | AC-05, AC-08 | Invalid and inactive login | A wrong password shows the generic message; the inactive account's correct password shows the inactive message | `e2e/lab-03/authentication.spec.ts` | |
| E2E-03 | E2E | AC-02, AC-86, `LS 14` Part 5 | The mandatory first-login change | The dedicated first-login account signs in, reaches **only** Change Password, cannot navigate away by URL, changes the password, and then lands on its role's screen | `e2e/lab-03/authentication.spec.ts` | |
| E2E-04 | E2E | AC-17, FR-07, `LS 14` Part 5 | Logout blocks a bookmarked URL | After logout, navigating directly to My Tickets shows Login, and a direct API call returns 401 | `e2e/lab-03/authentication.spec.ts` | |
| E2E-05 | E2E | AC-31, AC-32, AC-33 | Navigation per role | Each of the three roles signs in and sees exactly its own destinations | `e2e/lab-03/authentication.spec.ts` | |
| E2E-06 | E2E | AC-34, FR-11 | No identity in browser storage | After signing in, `localStorage` and `sessionStorage` are inspected in the real browser and hold no identity | `e2e/lab-03/authentication.spec.ts` | |
| E2E-07 | E2E | `LS 14` Part 6 | The queue journey | An IT Staff user signs in, searches, applies each filter, sorts, pages, and opens a Ticket from the queue | `e2e/lab-03/staff-ticket-flow.spec.ts` | |
| E2E-08 | E2E | AC-69, FR-41 | Empty and no-results in the browser | A filter combination matching nothing shows `No matches`; the unfiltered empty queue shows `No tickets in the queue` | `e2e/lab-03/staff-ticket-flow.spec.ts` | |
| E2E-09 | E2E | AC-70, AC-109, `LS 14` Part 7 | Claim then work | An unassigned Ticket refuses the move to In Progress, is claimed, and then accepts it | `e2e/lab-03/staff-ticket-flow.spec.ts` | |
| E2E-10 | E2E | AC-72, FR-45 | Reassign | The Ticket is reassigned to another eligible user and the new owner renders | `e2e/lab-03/staff-ticket-flow.spec.ts` | |
| E2E-11 | E2E | AC-76, AC-77, AC-80 | IT Priority and a confirmed status change | IT Priority is changed; a move to Resolved shows its confirmation and then applies | `e2e/lab-03/staff-ticket-flow.spec.ts` | |
| E2E-12 | E2E | AC-81, `LS 14` Part 7 | A refused status change | A Closed Ticket offers no status control, and a direct API attempt returns 409 | `e2e/lab-03/staff-ticket-flow.spec.ts` | |
| E2E-13 | E2E | AC-53, AC-107, `LS 14` Part 7 | A comment and a note in one frame | Staff post a Public Comment and an Internal Note; both render, visibly distinct, in one capture | `e2e/lab-03/staff-ticket-flow.spec.ts` | |
| E2E-14 | E2E | AC-54, AC-04, `LS 14` Part 7 | **The note never reaches the Requester** | With a note on the Ticket, the owning Requester opens their detail screen: no note text appears in the rendered DOM and **no network response** in the session contains it | `e2e/lab-03/staff-ticket-flow.spec.ts` | |
| E2E-15 | E2E | AC-55, AC-59, `LS 14` Part 7 | The resolution round trip | The Requester confirms "Problem Appears Resolved", status is unchanged, staff see the badge, staff resolve, and the indication clears | `e2e/lab-03/staff-ticket-flow.spec.ts` | |
| E2E-16 | E2E | AC-115, BR-100 | The owner's email never reaches the Requester | On the Requester's detail screen the owner's name renders and their email address appears in no DOM node and no network response | `e2e/lab-03/staff-ticket-flow.spec.ts` | |
| E2E-17 | E2E | FR-25, BR-91, `LS 14` Part 7 | Attachment continuity | A Requester's existing attachment is still listed and downloadable on the authenticated identity, and staff can download it but see no upload or remove control | `e2e/lab-03/staff-ticket-flow.spec.ts` | |
| E2E-18 | E2E | AC-36, AC-97, `LS 14` Part 7 | Role restriction in the browser | A Requester navigating to the Queue URL and the User Management URL sees the forbidden state both times, and the direct API calls return 403 | `e2e/lab-03/staff-ticket-flow.spec.ts` | |
| E2E-19 | E2E | AC-82, `LS 14` Part 8 | The user list | An Administrator signs in and the full `LS 8.5` list renders | `e2e/lab-03/user-administration.spec.ts` | |
| E2E-20 | E2E | AC-85, AC-86, `LS 14` Part 8 | Create a user and use it | A user is created with an `@e2e.test` email, then signs in and meets Change Password (C-83) | `e2e/lab-03/user-administration.spec.ts` | |
| E2E-21 | E2E | AC-87, `LS 14` Part 8 | Duplicate email rejected | Creating a second user with a taken address shows the message at the email field | `e2e/lab-03/user-administration.spec.ts` | |
| E2E-22 | E2E | AC-92, `LS 14` Part 8 | Self-deactivation prevented | The Administrator's own Status control is disabled with its explanation | `e2e/lab-03/user-administration.spec.ts` | |
| E2E-23 | E2E | AC-93, AC-94, `LS 14` Part 8 | Last Administrator prevented | With one active Administrator, both deactivation and a role change are refused with the banner | `e2e/lab-03/user-administration.spec.ts` | |
| E2E-24 | E2E | AC-96, `LS 14` Part 8 | A non-Administrator is forbidden | An IT Staff user opening User Management sees the forbidden state and fetches no user data | `e2e/lab-03/user-administration.spec.ts` | |
| E2E-25 | E2E | AC-89, AC-91 | Edit and reset | A user's four fields are edited and saved; a new initial password is set and that user's session stops working | `e2e/lab-03/user-administration.spec.ts` | |
| E2E-26 | E2E | AC-118, BR-108, C-109 | A closed Ticket in the browser | The owning Requester opens a Closed Ticket: existing comments are readable, no composer and no upload control render, and the closed-ticket line shows. A direct `POST` to the comments endpoint returns 409 `TICKET_CLOSED` | `e2e/lab-03/staff-ticket-flow.spec.ts` | |

**Temporary fixture for E2E-03 (Issue #39), replaced in Issue #43.** The forced first-password
change consumes the seeded first-login account, and the Administrator set-initial-password action
that would reset it (handoff Issue 8) does not exist until #43. Until then
`resetFirstLoginAccount()` in `e2e/support/auth.ts` puts that one account back into the state the
seed creates it in, before and after the test: it finds the account by its email, fails loudly if
it does not exist, takes the password from the seed's own `FIRST_LOGIN_ACCOUNT` constant rather
than a copy, and updates no other row. A directory lock serialises it across the three viewport
projects, which would otherwise share the one account. #43 swaps the fixture for the Administrator
action.

**E2E-20 runs on the desktop project only**, and creates its user with an `@e2e.test` address, so
three viewport runs do not create three users and drift the demo data (C-83). Every other row runs
on all three projects.

**E2E-14 and E2E-16 are the two browser-level leak tests.** Both assert on the network traffic as
well as the DOM, because a payload carrying data the screen does not render is still a leak - and
the Requester DTO is shaped so that neither can happen (`api-spec.md` 10.2).

---

## 3. Acceptance-Criterion Traceability

All **118** criteria, each with the planned tests that discharge it.

| AC | Planned tests | AC | Planned tests |
|---|---|---|---|
| AC-01 | API-01, E2E-01 | AC-60 | API-45, UI-19 |
| AC-02 | API-14, E2E-03 | AC-61 | API-29 |
| AC-03 | SEC-19, SEC-20, SEC-21 | AC-62 | API-31, API-32 |
| AC-04 | SEC-04, SEC-05, E2E-14 | AC-63 | API-33 |
| AC-05 | API-05, UI-04, E2E-02 | AC-64 | API-34 |
| AC-06 | API-06, SEC-23 | AC-65 | API-36 |
| AC-07 | API-07 | AC-66 | API-38, API-39 |
| AC-08 | API-08, UI-05, E2E-02 | AC-67 | API-40 |
| AC-09 | API-09 | AC-68 | API-42, UI-22 |
| AC-10 | API-10 | AC-69 | UI-20, E2E-08 |
| AC-11 | API-11 | AC-70 | API-50, E2E-09 |
| AC-12 | API-02 | AC-71 | API-51, UI-27 |
| AC-13 | API-03 | AC-72 | API-54, E2E-10 |
| AC-14 | API-04 | AC-73 | API-55 |
| AC-15 | API-23 | AC-74 | API-56 |
| AC-16 | API-21 | AC-75 | API-46, UI-18 |
| AC-17 | API-22, E2E-04 | AC-76 | API-61, SEC-18, E2E-11 |
| AC-18 | API-25 | AC-77 | API-64, UNIT-12, E2E-11 |
| AC-19 | API-27 | AC-78 | API-66 |
| AC-20 | API-28 | AC-79 | SEC-17 |
| AC-21 | API-14 | AC-80 | UI-31, E2E-11 |
| AC-22 | API-12, UI-09 | AC-81 | API-67, UI-30, E2E-12 |
| AC-23 | API-17, UI-12 | AC-82 | API-90, UI-38, E2E-19 |
| AC-24 | API-17, UI-12 | AC-83 | API-92, UI-40 |
| AC-25 | API-18 | AC-84 | API-93, UI-40 |
| AC-26 | API-19, UI-11 | AC-85 | API-96, E2E-20 |
| AC-27 | API-16 | AC-86 | API-97, E2E-03, E2E-20 |
| AC-28 | API-15, UI-13 | AC-87 | API-99, API-101, UI-42, E2E-21 |
| AC-29 | API-20 | AC-88 | API-100 |
| AC-30 | UI-49 | AC-89 | API-104, E2E-25 |
| AC-31 | UI-50, E2E-05 | AC-90 | API-106 |
| AC-32 | UI-50, E2E-05 | AC-91 | API-107, UI-47, E2E-25 |
| AC-33 | UI-50, E2E-05 | AC-92 | API-108, UI-43, E2E-22 |
| AC-34 | UI-08, E2E-06 | AC-93 | API-109, UI-44, E2E-23 |
| AC-35 | UI-51 | AC-94 | API-110, UI-44, E2E-23 |
| AC-36 | SEC-03, UI-24, E2E-18 | AC-95 | API-111 |
| AC-37 | SEC-05, SEC-06 | AC-96 | SEC-11, E2E-24 |
| AC-38 | SEC-08 | AC-97 | UI-48, E2E-18 |
| AC-39 | SEC-09 | AC-98 | API-94, API-113, UI-39 |
| AC-40 | SEC-10 | AC-99 | MIG-15 |
| AC-41 | SEC-19 | AC-100 | MIG-16 |
| AC-42 | SEC-20 | AC-101 | MIG-18 |
| AC-43 | **SEC-01** | AC-102 | **MIG-21 (artifact)** |
| AC-44 | SEC-02 | AC-103 | SEC-22 |
| AC-45 | MIG-07 | AC-104 | SEC-25 |
| AC-46 | **MIG-22 (artifact)** | AC-105 | SEC-24 |
| AC-47 | SEC-26 | AC-106 | RESP-01, RESP-06, RESP-08, **VIS-01 (manual)** |
| AC-48 | API-76 | AC-107 | UI-33, STYLE-07, RESP-10, E2E-13 |
| AC-49 | API-79 | AC-108 | MIG-23 |
| AC-50 | API-79 | AC-109 | API-62, E2E-09 |
| AC-51 | API-81, UI-34 | AC-110 | API-72 |
| AC-52 | API-82 | AC-111 | API-57, API-58 |
| AC-53 | API-85, E2E-13 | AC-112 | API-68 |
| AC-54 | E2E-14 | AC-113 | API-102 |
| AC-55 | API-73, E2E-15 | AC-114 | API-103 |
| AC-56 | API-74 | AC-115 | E2E-16 |
| AC-57 | API-75 | AC-116 | API-24 |
| AC-58 | SEC-16 | AC-117 | API-59 |
| AC-59 | API-70, UI-32, E2E-15 | AC-118 | API-118, API-119, API-120, UI-52, E2E-26 |

**Coverage: 118 of 118.** Every criterion maps to at least one planned test.

### 3.1 The criteria that are not discharged by an ordinary automated assertion

Stated plainly rather than papered over with a test that would assert something narrower than the
criterion (`CLAUDE.md`, and the Lab 2 precedent for AC-54).

| AC | Why | How it is discharged |
|---|---|---|
| **AC-46** | It asks about a Ticket that existed **before** the migration. `migration.db.test.ts` runs against a freshly created `toktickit_test` with no Lab 2 history, so no such Ticket can exist inside it | **MIG-22**, the C-83 rehearsal, whose before-and-after captures are committed under `artifacts/lab-03/migration/`. Reproducible, but the evidence is a captured artifact rather than an assertion |
| **AC-102** | Same reason - it *is* the rehearsal | **MIG-21**, the same artifact, including the `migrate diff --exit-code` drift output |
| **AC-106** | It asks whether anything is clipped, hidden or overlapping. RESP-01 proves no horizontal scroll, RESP-06 proves touch-target height and RESP-08 proves keyboard reach, but "no label is clipped" over five screens x three viewports is a judgement no assertion in this sprint makes | RESP-01, RESP-06 and RESP-08 automate the measurable parts; the rest is **VIS-01**, the section 5 checklist, completed by a person against the RESP-09 captures |
| **AC-107** | It asks whether two things are *visually distinct*. STYLE-07 asserts the computed styles differ and RESP-10 asserts the greyscale luminance differs, which together cover the mechanism - but "a staff user will not mistake one for the other" is not assertable | UI-33, STYLE-07, RESP-10 and E2E-13 automate the mechanism; the seven-point comparison of `ui-spec` section 19 is checked by hand in VIS-01 |
| **AC-108** | It is a claim about two whole suites and their counts, not about one behaviour | **MIG-23**, recorded in section 7 as the final run's output, with section 4.3 accounting for every count change |

**Five criteria therefore rest partly or wholly on evidence that is not a passing assertion**:
AC-46 and AC-102 on committed rehearsal artifacts, AC-106 and AC-107 on the manual checklist
alongside their automated parts, and AC-108 on the recorded suite output. That is five rows above
and it is stated here so the traceability table cannot be read as claiming more automation than
exists.

**No AC has no test at all.** Where an automated test would have been weaker than the criterion, a
narrower automated test is listed **alongside** the manual or artifact evidence rather than
instead of it.

---

## 4. Lab 2 regression disposition

Every Lab 2 test file, and what becomes of it. **Counted by test ID, not by file** (C-89,
`CLAUDE.md`). A test is **retired only where a decision row names its replacement**; everything
else is kept or adapted. No test is deleted to make a suite green (BR-95).

The `Tests` column counts `it(` occurrences as of commit `e5a27ae`, from
`phase1-analysis.md` section 3.

### 4.1 Files that survive untouched

| File | Tests | Why it survives |
|---|---|---|
| `server/tests/lab-01/health.test.ts` | 1 | `/api/health` stays public (C-62). SEC-02 additionally asserts it answers with no session |
| `server/tests/lab-01/categories.test.ts` | 1 | `/api/categories` stays public (C-62); the four names in id order still hold on a freshly seeded `toktickit_test` |
| `client/tests/lab-01/App.test.tsx` | 3 | Renders `SystemCheck` directly (`L2 C-04`), uses no context. `/system-check` stays public (C-87) |
| `server/tests/lab-02/ticket-number.unit.test.ts` | 13 | A pure generator: no identity, no database, no session |

**18 tests, unchanged.** These are the Lab 1 contract plus the Ticket Number generator, and
`CLAUDE.md` requires all four to keep passing on the final `main`.

### 4.2 Files adapted - kept, with assertions rewritten where a decision changed the behaviour

| File | Tests | What changes | Decision |
|---|---|---|---|
| `server/tests/lab-02/create-ticket.api.test.ts` | 15 | Logged-in Supertest agent; the body `requesterId` is dropped. **API-03 inverts**: `itPriority` is no longer null but equals `requestedPriority`. **API-11 and API-12 retire** (below) | C-64, C-71 |
| `server/tests/lab-02/my-tickets.api.test.ts` | 15 | 29 `requesterId` references become the agent's session. **The 403 at `:241` becomes 404.** The status filter gains three values | C-64, C-65, C-70 |
| `server/tests/lab-02/ticket-detail.api.test.ts` | 6 | **Two 403s become 404** (`:67`, `:116`). **API-28 inverts**: the payload must now carry `publicComments` and must still carry no Internal Note key. **API-13 retires** | C-64, C-65 |
| `server/tests/lab-02/attachments.api.test.ts` | 17 | **Three 403s become 404** (`:148`, `:286`, `:294`). API-40's point is preserved: a non-owner gets **404 not 410**, so removal state still does not leak. The inactive-caller and unknown-caller cases are **merged into one 401 test** (`:159`) rather than retired - no test ID disappears | C-64, C-65 |
| `server/tests/lab-02/data-model.db.test.ts` | 18 | Heaviest. Five `prisma.requesterUser` become `prisma.user`; **DB-04's enum equality goes from five values to eight**; **DB-08's FK becomes `Ticket -> User`**; DB-06's `itPriority: null` assertion inverts; DB-01 and DB-02 grow to the `LS 5.3` role counts; DB-05 grows to the queue indexes | C-67, C-70, C-71, C-91 |
| `client/tests/lab-02/CreateTicket.test.tsx` | 12 | The `STORAGE_KEY` + `RequesterProvider` harness becomes an `AuthContext` wrapper | C-56, C-64 |
| `client/tests/lab-02/MyTickets.test.tsx` | 11 | Same wrapper. **`:217` is rewritten, not deleted**: "no IT badge anywhere" becomes "the IT Priority badge renders with the backfilled value" | C-71, BR-95 |
| `client/tests/lab-02/RequesterTicketDetail.test.tsx` | 5 | Same wrapper. **STYLE-07 at `:78` rewritten** as above. Grows with the Public Comments list, the composer and the resolution action | C-71, C-74, C-76 |
| `client/tests/lab-02/AttachmentSection.test.tsx` | 7 | Wrapper only. The attachment contract itself is unchanged (BR-85) | C-64 |
| `e2e/lab-02/requester-ticket-flow.spec.ts` | 12 | `addInitScript`/`STORAGE_KEY` becomes a login helper plus `storageState`. **`:166-174`'s 403 becomes 404** | C-65, C-90 |
| `e2e/lab-02/create-ticket-screenshots.spec.ts` | 6 | Login helper; the selector injection at `:60` goes | C-90 |
| `e2e/lab-02/my-tickets-screenshots.spec.ts` | 11 | Login helper; the direct API 403 at `:213` becomes 404 | C-65, C-90 |
| `e2e/lab-02/ticket-detail-screenshots.spec.ts` | 7 | Login helper | C-90 |

**An adapted test keeps its Lab 2 test ID.** `docs/lab-02/tests.md` stays the record of what each
ID meant in Lab 2; this table is the record of what changed and why.

**Rewriting an assertion is not weakening a test.** Each inverted assertion above tests the same
property against a rule a decision row changed - `itPriority` is asserted just as strictly, for
the opposite value.

### 4.3 Tests retired, each against a named replacement

A retirement needs a decision row naming what replaces it (`CLAUDE.md`, BR-95). There are
**19 retired test IDs**: two files retired whole, carrying 10 client tests and 6 Playwright specs
between them, plus 3 individual server tests inside files that are otherwise adapted.

| Retired | Tests | Why | Replaced by | Decision |
|---|---|---|---|---|
| `client/tests/lab-02/RequesterSelection.test.tsx` | **10** | The Development Requester Selection screen is removed by `LS 8.2`. Every one of its ten tests asserts the behaviour of a screen that no longer exists | `client/tests/lab-03/Login.test.tsx` (UI-01..UI-08, UI-49..UI-51) and `client/tests/lab-03/ChangePassword.test.tsx` (UI-09..UI-15) | `L2 C-31`, `L2 C-32`, C-64 |
| `e2e/lab-02/selection-screenshots.spec.ts` | **6 specs** | Same screen. Its four Lab 2 screenshots stay in `artifacts/lab-02/` as Lab 2 evidence and are not regenerated | `e2e/lab-03/authentication.spec.ts` (E2E-01..E2E-06, RESP-07) | `L2 C-31`, C-90 |
| `create-ticket.api.test.ts` **API-11** | 1 | Asserts the inactive Requester is absent from `GET /api/requesters`, a route that is deleted | API-95, the Administrator user list showing inactive users (`users-admin.api.test.ts`) | C-62, C-64, BR-93 |
| `create-ticket.api.test.ts` **API-12** | 1 | Asserts 403 `REQUESTER_INACTIVE`, a code that ceases to exist | API-08, the inactive-account login refusal (`auth.api.test.ts`) | C-59, C-64 |
| `ticket-detail.api.test.ts` **API-13** | 1 | Asserts 404 `REQUESTER_NOT_FOUND`, a code that ceases to exist | SEC-01, the route-inventory 401, which is what an unresolvable caller now receives | C-64, `L2 C-45` |

**Expected suite movement.** Counted by test ID:

| Suite | Lab 2 | Retired | Net before additions |
|---|---|---|---|
| Server | 86 | **3** (API-11, API-12, API-13) | 83 |
| Client | 48 | **10** (RequesterSelection.test.tsx) | 38 |
| Playwright specs | 42 (x 3 viewports = 126) | **6 specs** (selection-screenshots) | 36 specs (108 runs) |

**Any drop other than exactly these is a bug**, and `MIG-23` asserts it. The
`phase1-analysis.md` section 3 note that "the server count drops by nothing" was corrected in that
file: it counted files rather than test IDs, and three server tests do retire.

Lab 3 then adds its own 278 planned tests on top of these figures.

---

## 5. Responsive and Visual Checklist

**VIS-01.** The predicate AC-106 and AC-107 partly rest on (section 3.1). Every row is ticked by a
person looking at the RESP-09 screenshots, at each of the three viewports, against `ui-spec.md` -
not from memory, which is what `LS 8.8` requires.

Three columns: D = 1280 px, T = 834 px, M = 390 px. Rows naming a colour, a height, a width or a
count are measured in the browser at each viewport; rows about legibility, clipping, overlap and
greyscale are checked by eye, the greyscale ones on greyscale conversions of the captures.

**The checklist is `ui-spec.md` section 24, reproduced there in full and completed here.** It is
not duplicated into this document, so the two cannot drift; `ui-spec.md` section 24 is the list
and this section is where its result is recorded.

| Group | Rows | D | T | M |
|---|---|---|---|---|
| Colour and tokens | 4 | | | |
| Badges - all four families | 7 | | | |
| Fields and forms | 6 | | | |
| Comments and notes | 6 | | | |
| States | 6 | | | |
| Layout | 5 | | | |
| Accessibility | 4 | | | |
| Naming and absence | 4 | | | |
| **Total** | **42** | | | |

A row that fails is fixed **in the UI, not in the checklist**. Lab 2's two failures - the 40 px
touch targets at 390 px, and a focus ring captured before it had painted - were both invisible to
every assertion in the suites and were found only by a person reading the captures with a probe
measuring bounding boxes. That is the reason this section exists rather than being replaced by
RESP-01 and RESP-06.

---

## 6. Test Commands

The API, security and migration tests and Playwright all need the real database, so the container
starts first. `webServer` stays disabled in `playwright.config.ts` (C-90) precisely so a missing
container fails visibly here rather than looking like a test failure.

**Manual start sequence**

```bash
# 1. Database - from the repository root
docker start toktickit-db
docker ps --filter name=toktickit-db      # confirm it is running

# 2. Migrations and seed - first run, or after a schema change
cd server
npx prisma migrate deploy                  # never `migrate reset` (L2 C-37)
npm run prisma:seed                        # idempotent, safe to repeat
npx tsx prisma/seed-demo.ts                # non-graded volume data (C-91)

# 3. API - leave running
cd server
npm run dev                                # http://localhost:3000

# 4. Client - leave running, second terminal
cd client
npm run dev                                # http://localhost:5173
```

Two commands are **forbidden** and appear nowhere in this document, in any script, or in the
sprint's command history:

- **`npx prisma migrate reset`** - it destroys the seed data (`L2 C-37`).
- **`npm run prisma:migrate`** - until C-86 repoints it in Issue 2 it still runs `migrate dev`,
  which can offer a reset. After C-86 it runs `migrate deploy` and is safe; until then
  `npx prisma migrate deploy` is used directly.

**Test commands**

```bash
# Unit, API, security and migration - server suite, includes the Lab 1 and Lab 2 suites
cd server && npm test

# UI component and UI style - client suite, includes the Lab 1 test
cd client && npm test

# Responsive and E2E - repository root, needs steps 1, 3 and 4 running
npm run test:e2e

# Screenshots only, if the artifacts need regenerating
npx playwright test e2e/lab-03 --project=desktop --project=tablet --project=mobile
```

**The migration rehearsal** (MIG-21, MIG-22) is run once, before the dev database is migrated,
and its output committed:

```bash
# Restore the Lab 2 dump into a throwaway database, capture, migrate, capture again
createdb toktickit_rehearsal
pg_restore -d toktickit_rehearsal lab2-final.dump
# before: row counts per table, and tickets per Requester email
# then: npx prisma migrate deploy   against toktickit_rehearsal
# after: the same two captures, plus npx prisma migrate diff ... --exit-code
```

Both captures and the drift output are saved under `artifacts/lab-03/migration/`, which is
tracked. **The dev database is migrated only after this passes** (C-83).

`toktickit_test` is created and migrated by the Vitest global setup - `migrate deploy` plus the
seed - so the server suite never touches dev data (C-83).

---

## 7. Final Results

To be completed on the release branch, from a clean state, after the container is restarted,
migrations applied and both seeds run. Until then every `Final` column in section 2 is blank and
no claim is made.

| Suite | Command | Lab 2 | Expected Lab 3 | Actual | Result |
|---|---|---|---|---|---|
| Server | `cd server && npm test` | 86 | 83 + Lab 3 additions | | |
| Client | `cd client && npm test` | 48 | 38 + Lab 3 additions | | |
| Playwright | `npm run test:e2e` | 126 (42 x 3) | 108 + Lab 3 additions | | |

**The evidence is passing terminal output**, pasted here, not a claim that the tests pass
(`CLAUDE.md`). Every count change against the Lab 2 figures must match section 4.3, and MIG-23
is the assertion that it does.

---

## 8. Gaps this plan needed and could not close - all closed

Two items were declared here when this plan was first written, both inherited from
`api-spec.md` section 12 and `ui-spec.md` section 25: a test plan cannot test behaviour the
contract has not settled. Both are now closed, and two further items that had constrained how
narrowly a test could be written are closed with them.

| # | Gap | Closed by | Effect on this plan |
|---|---|---|---|
| 1 | The assignable-users endpoint was pending | **C-105** | UI-28 now names `GET /api/staff/assignable-users` as the owner select's source, and API-35's by-user queue filter is buildable. **API-116** and **SEC-27** are added for the endpoint itself - its shape, and the 403 a Requester receives |
| 2 | The wrong-current-password status code was pending, so **API-16 deliberately asserted no code** | **C-106** | API-16 now asserts 422 `CURRENT_PASSWORD_INCORRECT` with `fields.currentPassword`, and asserts explicitly that it is **not 401** |
| 3 | The user list's sort column was unnamed, so API-90 asserted contents and not order | **C-107** | **API-117** is added: the fixed name-then-id order, and that a supplied `?sort=` changes nothing |
| 4 | The queue's tablet columns were unsettled by a conflict inside `specification.md` | **C-108** | RESP-04 is tightened from "the table degraded somehow" to **exactly six named columns, with the other three absent from the DOM** |

**No planned test was invented to fill a gap, and no gap was closed by choosing a behaviour
here** (`CLAUDE.md`). Every one was escalated, decided in `decisions.md`, and only then written
into an assertion.

The pattern is worth recording for the implementation phase: in all four cases the test was
written **weaker than the eventual rule** while the rule was open - API-16 asserted a refusal
without a code, RESP-04 asserted a degradation without naming columns - rather than guessing.
A test that guesses passes against the guess and hides the fact that nobody decided.

---

## 9. Duplication review

278 planned tests is about 2.5x Lab 2's 111. Some of that growth is real - Lab 3 adds a security
boundary, a migration, three roles and four screens - but a plan this size earns a check for
assertions that exist twice. This section is that check.

**The five merges below were approved and are applied.** Each surviving row names the ID it
absorbed, every acceptance criterion the absorbed row carried was moved onto the survivor, and
the section 3 traceability matrix still maps all 118 criteria. A sixth proposal was withdrawn
before approval, for the reason given under the table.

### 9.1 Merges applied - the same assertion written twice

| # | Tests | The duplication | Applied as | Saved |
|---|---|---|---|---|
| 1 | **API-62 absorbs API-63** | API-62 asserted `OWNER_REQUIRED` on a move to `IN_PROGRESS` without an owner, then the claim-and-retry path. API-63 asserted the identical refusal for `WAITING_FOR_REQUESTER` and `RESOLVED`. One rule (BR-97) over three values | **API-62**, data-driven over all three worked statuses, keeping the claim-then-succeed round trip | 1 |
| 2 | **SEC-11 absorbs SEC-12** | The same four user-administration routes asserted 403 for IT Staff and then again for a Requester. One rule (BR-39), two callers | **SEC-11**, parameterised over both non-Administrator roles. AC-96 still maps to it | 1 |
| ~~3~~ | ~~SEC-19, SEC-20, SEC-21~~ | **Withdrawn before approval.** Inconsistent with this review's own reasoning - see below | Not applied; all three stay | 0 |
| 4 | **API-64 absorbs API-65** | API-64 walked every `Y` cell of the section 5.1 matrix; API-65 walked every `-` cell. Two halves of one traversal of the same table | **API-64**, one traversal of all 64 cells asserting the expected outcome per cell - which is how UNIT-12 is already written. AC-77 still maps to it | 1 |
| 5 | **API-79 absorbs API-78** | API-78 asserted a whitespace-only body is rejected; API-79 asserts the 0, 1, 2000 and 2001 boundaries. A whitespace-only body **is** the 0-after-trim case, which API-80 pins | **API-79**, whose 0-length case now includes the whitespace-only body and keeps the "no row is created" assertion. **AC-49 moved onto API-79** | 1 |
| 6 | **SEC-23 absorbs API-91** | API-91 asserted the user list carries no `passwordHash`; SEC-23 sweeps for passwords, hashes and tokens across a success and six failure paths, and its success path is `GET /api/users` - the same response API-91 inspected | **SEC-23**, whose row now names `GET /api/users` explicitly as the success path it sweeps | 1 |

**Five merges applied, five test IDs retired: 278 becomes 273.** The retired IDs are API-63,
API-65, API-78, API-91 and SEC-12. No assertion was lost - each moved onto the surviving row, and
section 3 still maps all 118 acceptance criteria.

**One proposal was withdrawn during review, and the reason matters more than the proposal.**
Item 3 would have merged SEC-19, SEC-20 and SEC-21 - `requesterId` ignored on create, on list
and on detail - into one parameterised row. But section 9.2 refuses to merge API-33, API-34 and
API-35 on the grounds that three filter values are three different implementations and *a bug in
any one would not fail the others*. SEC-19 to SEC-21 are three separate **route handlers**, which
is a stronger version of the same argument: they are more independent than the three filter
values, not less. Merging them while keeping the others separate would have applied this review's
own principle in one direction only, so the proposal is withdrawn and the three tests stay.

### 9.2 Overlaps that are not duplication, and why they stay

Listed so the review is visible rather than implied, and so nobody merges these later by
reading section 9.1 as a licence.

| Tests | Why it looks duplicated | Why it stays |
|---|---|---|
| **SEC-04, SEC-05** | Both assert a Requester gets 403 from an Internal Note endpoint | SEC-05's assertion is *byte-identity between two responses*, and SEC-04's existing-ticket case is one of the two bodies it compares. SEC-04 is also the evidence-shaped test `CLAUDE.md` names by hand |
| **API-08/09, UI-05, E2E-02** | The inactive account appears at three levels | `LS 10` requires the levels to be distinct. The API test asserts a status code, the component test asserts a rendered message, the E2E test asserts a person sees it in a browser. Collapsing them would drop a level |
| **API-46, UI-18** | Both concern the inactive-owner marker | API-46 asserts the payload carries `owner.isActive` false; UI-18 asserts `(inactive)` renders. A payload can be right and the rendering wrong |
| **UI-20, E2E-08** | Empty versus no-results, twice | `LS 14` Part 6 requires both states captured in the browser; UI-20 is the component contract and E2E-08 is the evidence |
| **API-33, API-34, API-35** | Three owner-filter values | Three different implementations: `unassigned` is `IS NULL`, `me` resolves the session, an id is plain equality. A bug in any one would not fail the others |
| **API-02, API-13, SEC-23** | Three "no secret in the body" assertions | API-02 and API-13 pin the **exact key set** of two specific responses - six keys, no more. SEC-23 sweeps for forbidden *values* across many paths. A response could pass the sweep and still have grown a seventh key |
| **UNIT-12, API-64/65** | Both walk the section 5.1 matrix | UNIT-12 tests the pure transition function, API-64/65 test the endpoint that calls it - including the owner requirement and the 400/409 split, which the function alone does not decide |

### 9.3 What the growth is actually made of

| Source of growth | Tests |
|---|---|
| The security/authorization level, which Lab 2 did not have | 27 |
| The migration/regression level, which Lab 2 did not have | 24 |
| Authentication, sessions and the password-change gate - entirely new | ~40 |
| The queue, staff detail and user management - three new screens with API, UI and E2E coverage | ~120 |
| Comments and notes | ~20 |
| Carried-forward levels at Lab 2's density | the remainder |

The two new levels alone account for 51 tests, and `LS 10` requires both. The rest is three
screens and an authentication system that did not exist in Lab 2.
