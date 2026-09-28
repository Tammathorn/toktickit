# Lab 3 API Contract

TokTickIT - CPE 334 Individual Sprint 3.
Owner: Tammathorn Kananurak (67070503489).

This document is the binding REST contract for Lab 3. It answers `LS 6`, `LS 6.1`,
`LS 6.2`, `LS 6.3` and `LS 6.4`.

`docs/lab-03/specification.md` governs. Where this document and the specification disagree,
the specification wins and the disagreement is a defect to report, not to resolve locally.
Field names are taken verbatim from the specification's section 11 glossary. Rule references
are `BR-nn`, requirement references `FR-nn`, criterion references `AC-nn`, decision
references `C-nn`; a Lab 2 rule is cited `L2 BR-nn` or `L2 C-nn`, never bare.

Thirty endpoints are defined. Three are unchanged from Lab 1 and Lab 2, seven are Lab 2 endpoints
whose contract changes, and twenty are new. One Lab 2 endpoint is removed (section 1.7). The
inventory in section 11.1 is the authority on this count.

Section 12 lists every place this document needed a rule that `specification.md` and
`decisions.md` do not carry. Nothing in section 12 was resolved on this document's own
authority.

---

## 1. Conventions

**Base path.** Every endpoint is mounted under `/api`. The API runs on the port the Lab 1
configuration fixes. The client reaches it same-origin through the Vite dev-server proxy, and
`VITE_API_URL` is set explicitly to the empty string because `client/src/api.ts` uses `??`
and an unset variable would fall back to a cross-origin URL (BR-26, C-56).

**Content types.** Requests and responses are `application/json; charset=utf-8`, with two
exceptions carried from Lab 2: attachment upload is `multipart/form-data` (`L2 C-16`), and
attachment download returns the stored file's own `Content-Type`.

**Identity transport.** There is none. The authenticated identity comes only from the
`tt_session` cookie (BR-31, C-64). A `requesterId` in a query string or a request body is
ignored on every route, and no endpoint accepts a caller identifier of any kind. Every
client-side `?requesterId=` and body `requesterId` of Lab 2 is deleted, not made optional -
Lab 2 carried the identifier on seven endpoints, six as `?requesterId=` and one as a body
field (`L2 C-12`, `L2 C-42`), and Lab 3 carries it on none.

**Timestamps.** Every timestamp in a response body is ISO 8601 with an explicit `Z` offset,
serialised from the UTC value in the database. The `DD MMM YYYY HH:mm` Asia/Bangkok rendering
is a display rule the client applies (`L2 BR-10`); the API never returns a pre-formatted date.

**Secrets.** No response body and no log line contains a password, a `passwordHash` or a
session token, on any path including every error path (BR-88, FR-70). The `Set-Cookie` header
is the only place a session token ever appears, and it is never logged.

### 1.1 Error envelope

Every 4xx and 5xx response uses this shape, carried unchanged from Lab 2. No response body
contains a stack trace, a SQL statement, a filesystem path or raw database error text
(BR-89, AC-105).

```json
{
  "error": {
    "code": "TICKET_NOT_FOUND",
    "message": "That ticket does not exist."
  }
}
```

A validation failure adds a `fields` object keyed by the offending field. Each value is the
message `ui-spec.md` defines for that rule; the server emits no validation text absent from
that catalogue, and the client renders the identical string (BR-87).

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Some fields need attention.",
    "fields": {
      "newPassword": "New Password must be 8 to 128 characters and contain an upper-case letter, a lower-case letter, a digit and a special character."
    }
  }
}
```

Every 401 response body is byte-identical regardless of cause - no session, an unknown token,
an expired session, a logged-out session, a session whose user has been deactivated, or a
session invalidated by a role change or a new initial password (BR-22, BR-24, AC-15..AC-18).

Every 403 raised by the role check is byte-identical whether or not the addressed resource
exists, because the role check runs before the resource is loaded (BR-38, C-63). This is what
makes AC-04 and AC-37 hold.

### 1.2 Status codes

Fixed by `specification.md` section 8. No endpoint returns a status absent from this table.

| Status | Condition |
|---|---|
| 200 | Successful retrieval, successful update, successful download or preview |
| 201 | Ticket created, Attachment created, Public Comment created, Internal Note created, User created |
| 204 | Logout succeeded; no body |
| 400 | Malformed input: a missing, unparseable or out-of-set parameter or body field, and a status change whose target equals the current status (BR-56, C-77) |
| 401 | No session, or a session that is unknown, expired, logged out, or whose user is inactive or has been invalidated (BR-22, BR-24) |
| 403 | The role may never perform this operation (BR-38, C-65); the password-change gate is set (BR-19, C-99); a login whose password verified but whose account is inactive (BR-09); or a state-changing request carrying a foreign `Origin` (BR-27) |
| 404 | The addressed resource does not exist, **or** exists and is not this caller's to see (BR-38, BR-42, C-65) |
| 409 | A conflict with the state of the resource or of the rows it depends on (BR-103, C-100) |
| 410 | The addressed Attachment is soft-removed and the caller is permitted to see the Ticket (BR-44) |
| 413 | Upload exceeds 5 MB (`L2 BR-43`) |
| 415 | Upload is not JPG, JPEG, PNG, WEBP or PDF (`L2 BR-42`) |
| 422 | A well-formed request refused because of the value it submitted (BR-103, C-100), including the carried Lab 2 five-active-attachment refusal (`L2 BR-39`) |
| 500 | Unexpected server error, reported safely (BR-89) |

**New since Lab 2:** 401, 204 and 409. **Changed since Lab 2:** 403 no longer means an
ownership failure, and 404 absorbs that meaning (C-65, superseding `L2 C-13` and `L2 C-20`).

The 409 / 422 line is C-100's and is not redrawn here: **409 when the refusal is a conflict
with state**, **422 when it is about the submitted value**. Six codes are 409 -
`ALREADY_OWNED`, `OWNER_REQUIRED`, `INVALID_STATUS_TRANSITION`,
`RESOLUTION_NOT_PERMITTED_IN_STATUS`, `EMAIL_TAKEN`, `LAST_ADMINISTRATOR`. Three are 422 -
`ASSIGNEE_NOT_ELIGIBLE`, `SELF_DEACTIVATION` and `CURRENT_PASSWORD_INCORRECT` (C-106).
`ATTACHMENT_LIMIT_REACHED` keeps its Lab 2 422 as a carried contract and is not re-coded
(BR-103).

### 1.3 Error code catalogue

Every code the API can emit. A code absent from this table is a defect.

| `code` | Status | Raised when |
|---|---|---|
| `VALIDATION_FAILED` | 400 | A body field fails a rule; `fields` names each one |
| `INVALID_QUERY_PARAM` | 400 | A query parameter is unparseable or out of set; `fields` names each one (BR-73) |
| `SAME_STATUS` | 400 | A status change targets the status the Ticket already holds (BR-56, C-77) |
| `AUTH_REQUIRED` | 401 | No valid session. One body for every cause (section 1.1) |
| `INVALID_CREDENTIALS` | 401 | Login with an unknown email, a wrong password, or a NULL `passwordHash`. One body for all three (BR-07, BR-17) |
| `ACCOUNT_INACTIVE` | 403 | Login whose password verified against an inactive account (BR-09). Returned only after verification |
| `PASSWORD_CHANGE_REQUIRED` | 403 | The caller must change their password and called a route other than current-user, change-password or logout (BR-19, C-99) |
| `FORBIDDEN_ROLE` | 403 | The caller's role may never perform this operation (BR-38, C-65). Raised before the resource is loaded |
| `ORIGIN_NOT_ALLOWED` | 403 | A state-changing request carries an `Origin` header that is not `CLIENT_ORIGIN` (BR-27, C-58) |
| `TICKET_NOT_FOUND` | 404 | No Ticket with that id, **or** a Ticket that is not this caller's to see (BR-42) |
| `ATTACHMENT_NOT_FOUND` | 404 | No Attachment with that id, **or** one on a Ticket that is not this caller's to see |
| `USER_NOT_FOUND` | 404 | No User with that id (Administrator routes only) |
| `ALREADY_OWNED` | 409 | Claim lost the race; another user is already the Ticket Owner (BR-46) |
| `OWNER_REQUIRED` | 409 | A move into `IN_PROGRESS`, `WAITING_FOR_REQUESTER` or `RESOLVED` on an unowned Ticket, or an unassignment while the Ticket sits in one of those (BR-97, C-93, C-104) |
| `INVALID_STATUS_TRANSITION` | 409 | The target status is not permitted from the current one by `specification.md` section 5.1 (BR-55) |
| `RESOLUTION_NOT_PERMITTED_IN_STATUS` | 409 | The resolution indication was attempted outside Open, In Progress, Waiting for Requester or Reopened (BR-60) |
| `EMAIL_TAKEN` | 409 | The email address is already held by another User (BR-77) |
| `LAST_ADMINISTRATOR` | 409 | The change would leave no active Administrator (BR-80) |
| `ATTACHMENT_REMOVED` | 410 | The Attachment is soft-removed and the caller may see the Ticket (BR-44) |
| `FILE_TOO_LARGE` | 413 | Upload over 5 MB (`L2 BR-43`) |
| `UNSUPPORTED_FILE_TYPE` | 415 | Upload outside the permitted set (`L2 BR-42`) |
| `CURRENT_PASSWORD_INCORRECT` | 422 | The current password supplied to change-password does not verify. Presented at the current-password field. **Never 401** (BR-105, C-106) |
| `ASSIGNEE_NOT_ELIGIBLE` | 422 | The named assignee is a Requester, inactive, or unknown (BR-48) |
| `SELF_DEACTIVATION` | 422 | An Administrator attempted to deactivate their own account (BR-79) |
| `ATTACHMENT_LIMIT_REACHED` | 422 | The Ticket already holds five active Attachments (`L2 BR-44`) |
| `REMOVAL_REASON_REQUIRED` | 422 | Removal reason is empty after trimming (`L2 BR-47`) |
| `INTERNAL_ERROR` | 500 | Anything unhandled (BR-89) |

**Three Lab 2 codes cease to exist** with the caller resolver: `REQUESTER_REQUIRED`,
`REQUESTER_NOT_FOUND` and `REQUESTER_INACTIVE` (C-64). Every Lab 2 test asserting them is
adapted or retired against a named replacement in `tests.md`, not left to fail (BR-95).

**Two Lab 2 codes are removed and their meaning folded into 404**: `TICKET_FORBIDDEN` and
`ATTACHMENT_FORBIDDEN` (C-65, superseding `L2 C-13`). A non-owner now receives
`TICKET_NOT_FOUND` or `ATTACHMENT_NOT_FOUND`, which is the point: the code must not say the
resource exists.

### 1.4 The fixed check order

C-63 fixes one order for every protected route, so the status for any request is
deterministic and testable. It is implemented as one shared middleware chain, not repeated
per route.

1. **Session** - no valid `tt_session` -> 401 `AUTH_REQUIRED`. An expired row is deleted here
   (BR-101, C-96). A session whose user is inactive is rejected here (BR-24).
2. **Password-change gate** - `mustChangePassword` set, and the route is not current-user,
   change-password or logout -> 403 `PASSWORD_CHANGE_REQUIRED` (BR-19, C-99).
3. **Role** - the caller's role may never perform this operation -> 403 `FORBIDDEN_ROLE`.
4. **Parse parameters** - a path or query parameter is malformed -> 400.
5. **Load the resource** - absent -> 404.
6. **Ownership** - the resource exists but is not this caller's -> 404 (C-65).
7. **Body validation** - a field rule fails -> 400; a business refusal -> 409 or 422 per
   C-100.

The `Origin` check of section 1.6 runs ahead of step 1 on state-changing methods, because a
cross-origin write must be refused before it can touch a session at all.

Four orderings carry consequences and are deliberate:

- **Step 3 precedes step 5.** A Requester calling an Internal Notes endpoint receives 403
  whether or not the Ticket exists, so the status code never reveals existence (AC-04,
  AC-37). This is the single most important ordering in the document.
- **Step 4 follows step 3.** A malformed id cannot probe a forbidden endpoint: a Requester
  sending `GET /api/tickets/abc/internal-notes` receives 403, not 400, so the shape of the
  response does not distinguish a forbidden route from a badly addressed one.
- **Step 6 returns 404, not 403.** Lab 2 deliberately answered 403 here to say "this exists
  but is not yours" (`L2 C-13`). Once a real security boundary exists, `LS 6.2` forbids that
  leak, so ownership failure and absence are indistinguishable (C-65).
- **Step 7 is last.** An unauthenticated or unauthorized caller never learns whether their
  body would have been accepted (BR-86).

The Lab 2 ordering that resolved a client-supplied caller before the addressed resource
(`L2 C-45`) has no Lab 3 counterpart: there is no client-supplied caller to resolve.

`disposition` on the download route keeps its Lab 2 deferral - it is validated after
ownership and removal state, never before (`L2 C-44`, `L2 C-52`), for exactly the reason
step 6 exists.

### 1.5 Session cookie behaviour

One cookie, `tt_session`, carrying a 32-byte opaque token encoded as 64 lower-case hex
characters. Only the token's SHA-256 is stored, in `Session.tokenHash` (C-54, BR-21).

| Attribute | Value | Why |
|---|---|---|
| `HttpOnly` | set | Script cannot read the token (C-54) |
| `SameSite` | `Strict` | The first half of the CSRF cover (C-58) |
| `Path` | `/` | One cookie for the whole application |
| `Max-Age` / `Expires` | not set | A session cookie. Server-side expiry in `Session.expiresAt` is the authority, so a client that keeps the cookie gains nothing (BR-22) |
| `Secure` | **not set** | The lab runs on `http://localhost`. `Secure` would stop the cookie being sent at all. This is a local-development contract; production deployment is out of scope (`LS 4.2`) |

**Set on** a successful login, and only there. **Cleared on** logout, with
`Set-Cookie: tt_session=; Max-Age=0; HttpOnly; SameSite=Strict; Path=/`.

**Never rotated.** A session lasts 8 hours from creation, absolutely, with no sliding renewal
and no re-issue on activity (C-55, BR-22). No endpoint but login writes the cookie.

**Cookies ignore port**, so the cookie set for `localhost` also reaches the API directly on
`:3000` and any other service on `localhost`. Accepted as a local-only risk (C-57).

A request presenting a token whose row is absent, expired, or whose user is inactive receives
401 and, where the row existed and was expired, that row is deleted by the lookup (BR-101,
AC-116).

### 1.6 The `Origin` check on state-changing requests

The second half of the CSRF cover (C-58, BR-27). It applies to `POST`, `PATCH` and `DELETE`
and to no `GET`.

| `Origin` header | Outcome |
|---|---|
| Absent | **Accepted.** Server-to-server callers and Supertest send no `Origin`, and a browser attack cannot suppress it |
| Equal to `CLIENT_ORIGIN` | Accepted |
| Present and anything else | **403 `ORIGIN_NOT_ALLOWED`**, before the session is looked at |

`CLIENT_ORIGIN` is configuration, listed in `server/.env.example` with a placeholder. The
wildcard `app.use(cors())` of Lab 2 is removed or pinned to `CLIENT_ORIGIN`, because a
wildcard origin cannot carry credentials (C-56).

Two tests are required and named in `tests.md`: a foreign `Origin` is rejected, and a missing
`Origin` is accepted (C-58, AC-19, AC-20).

### 1.7 Removed from Lab 2

| Endpoint | Why | Replacement |
|---|---|---|
| `GET /api/requesters` | An unauthenticated list of every active user, which was the selector's data source. `LS 8.2` removes the selector and `LS 6.1` will not carry an anonymous user list (C-62, C-64) | `GET /api/users` (section 9.1), Administrator only. Its Lab 2 test `API-11` retires against that named replacement (BR-93) |

Nothing else is removed. Every other Lab 1 and Lab 2 endpoint survives, seven of them with a
changed contract, each marked **Changed from Lab 2** in its own section.

---

## 2. Public endpoints

Four routes require no session (C-62). Every other route in this document requires one, and
the route-inventory test in `server/tests/lab-03/authorization.api.test.ts` walks the Express
router and fails if any route outside this list answers without a session (AC-43).

### 2.1 `GET /api/health`

**Unchanged from Lab 1.** No session, no parameters, no body.

```json
{ "status": "ok", "service": "TokTickIT API" }
```

200 always. The Lab 1 test asserts this shape and is not adapted (AC-44).

### 2.2 `GET /api/categories`

**Unchanged from Lab 1.** Active Categories only, `{ id, name }` in ascending id order
(`L2 BR-56`, `L2 C-05`). 200, or 500 `INTERNAL_ERROR`.

```json
[ { "id": 1, "name": "Account and Access" } ]
```

### 2.3 `GET /api/related-systems`

**Unchanged from Lab 2.** Active Related Systems only, `{ id, name }` in ascending id order,
never scoped to a Category (`L2 C-24`). 200, or 500 `INTERNAL_ERROR`.

### 2.4 `POST /api/auth/login`

The fourth public route, and the only public route that writes.

| | |
|---|---|
| **Method and path** | `POST /api/auth/login` |
| **Session** | Not required. Permitted while one already exists, which issues a second `Session` row (A-01) |
| **Serves** | FR-01, FR-02, FR-03, FR-04 |
| **Verified by** | AC-01, AC-05 to AC-13 |

**Request body**

```json
{ "email": "requester@toktickit.local", "password": "…" }
```

| Field | Rule | Trace |
|---|---|---|
| `email` | Required, non-empty after trimming, compared case-insensitively against the stored lower-case value | BR-06 |
| `password` | Required, non-empty. Never trimmed - leading and trailing spaces are part of a password | BR-11 |

Neither field's length is validated on this route. A login form is not a registration form:
rejecting an over-long password here would tell an attacker that the policy bound exists.

**Response 200** - sets the `tt_session` cookie (section 1.5).

```json
{
  "id": 3,
  "name": "Anucha Prasert",
  "email": "requester@toktickit.local",
  "role": "REQUESTER",
  "isActive": true,
  "mustChangePassword": false
}
```

Exactly these six keys. No password, no hash, no token, no session id (BR-10, AC-12).

| Status | Condition |
|---|---|
| 200 | Credentials valid and the account is active. Cookie set |
| 400 | `email` or `password` missing or empty, `VALIDATION_FAILED` |
| 401 | Unknown email, wrong password, or NULL `passwordHash` - one identical body for all three, `INVALID_CREDENTIALS`. No cookie (BR-07, BR-17, AC-05, AC-07, AC-09) |
| 403 | The password verified but the account is inactive, `ACCOUNT_INACTIVE`. No cookie (BR-09, AC-08) |
| 500 | Unexpected error, `INTERNAL_ERROR` |

**The order of 401 and 403 is load-bearing.** The password is verified first, and
`ACCOUNT_INACTIVE` is returned only to a caller who already holds the correct password
(BR-09, C-59). An inactive account with a wrong password returns the generic 401 (AC-09).

There is no lockout, no attempt counter and no artificial delay: `LS 4.2` excludes account
unlocking, so a lockout could never be undone (BR-08, AC-10).

The password comparison uses `timingSafeEqual` against the scrypt derivation, and a NULL
`passwordHash` performs the same work before failing, so the three 401 paths are not
distinguishable by timing either (BR-11, C-53).

---

## 3. Authentication endpoints

Three routes that require a session and are **exempt from the password-change gate**
(BR-19, C-61). They are the only three.

### 3.1 `GET /api/auth/me`

| | |
|---|---|
| **Method and path** | `GET /api/auth/me` |
| **Gate** | Exempt. Works while `mustChangePassword` is set, so Change Password can show the user's name and role (C-61, BR-32) |
| **Serves** | FR-05, FR-15 |
| **Verified by** | AC-22, AC-35 |

**Response 200** - the same six keys as 2.4's body, read from the session's user (BR-33).

| Status | Condition |
|---|---|
| 200 | A valid session, gate set or not |
| 401 | No valid session, `AUTH_REQUIRED`. The client treats this as a lost session and shows Login rather than an error (BR-34, FR-12) |
| 500 | Unexpected error |

This route is how the client learns who it is. Nothing is held in browser storage (FR-11,
BR-25, AC-34).

### 3.2 `POST /api/auth/change-password`

| | |
|---|---|
| **Method and path** | `POST /api/auth/change-password` |
| **Gate** | Exempt - it is the route that clears the gate |
| **Serves** | FR-16, FR-17, FR-18 |
| **Verified by** | AC-23 to AC-29 |

**Request body**

```json
{ "currentPassword": "…", "newPassword": "…", "confirmPassword": "…" }
```

| Field | Rule | Trace |
|---|---|---|
| `currentPassword` | Required. Must verify against the stored hash | BR-15, AC-27 |
| `newPassword` | Required. 8 to 128 characters; an upper-case letter, a lower-case letter, a digit and a special character; must differ from `currentPassword` | BR-12, BR-13 |
| `confirmPassword` | Required. Must equal `newPassword` | BR-13 |

One validator enforces these rules here, on Administrator create (9.2) and on Administrator
set-initial-password (9.4), on the client and on the server alike (BR-14, FR-17). The client
checks `confirmPassword` before sending (AC-26); the server checks it again, because a request
that bypasses the browser is still refused.

**Response 200** - the same six keys as 3.1, with `mustChangePassword` now `false`, so the
client can continue into the role's landing screen without a second request (FR-18, AC-28).

**Session effect.** The calling session keeps working. **Every other session of that user is
deleted**, so a stolen session is locked out by the password change (BR-102, C-97, AC-29).

| Status | Condition |
|---|---|
| 200 | Changed. Gate cleared; other sessions revoked |
| 400 | `VALIDATION_FAILED` - a policy or confirmation rule above, `fields` naming `newPassword` or `confirmPassword` |
| 401 | No valid session |
| 422 | The current password does not verify, `CURRENT_PASSWORD_INCORRECT`, with `fields.currentPassword` carrying the catalogue message (BR-105, C-106) |
| 500 | Unexpected error |

**A wrong current password is 422, never 401** (C-106). 401 means the session is gone, and the
client treats it as an expired session: it would send the user back to Login and lose the very
session the change requires (BR-34, and the same reasoning C-99 applies to the gate).

It is 422 rather than 400 because C-100 draws that line by what the refusal depends on - this
one is about the **value submitted**, not about a malformed body. The response still carries
`fields.currentPassword`, so BR-87's rule that the message renders directly below its own
control holds exactly as it does for a 400.

### 3.3 `POST /api/auth/logout`

| | |
|---|---|
| **Method and path** | `POST /api/auth/logout` |
| **Gate** | Exempt, so a user under the gate can still leave |
| **Serves** | FR-06, FR-07 |
| **Verified by** | AC-16, AC-17 |

No request body. Deletes the calling `Session` row and clears the cookie (section 1.5).

| Status | Condition |
|---|---|
| 204 | Logged out. No body. Idempotent in effect: the row is gone and the token is unusable |
| 401 | No valid session, `AUTH_REQUIRED` |
| 500 | Unexpected error |

**Logout ends the calling session only** (BR-23, C-55). A second session of the same user
keeps working (AC-16). Replaying the logged-out token gives 401 (AC-17).

---

## 4. Requester Ticket endpoints

**Requester-only.** IT Staff and Administrator callers receive 403 `FORBIDDEN_ROLE` on 4.1,
4.2 and 4.3: staff do not raise Tickets of their own, and the Requester-view routes carry no
screen for a role whose navigation does not have one (C-101, `specification.md` 5.2 note [1]).

The staff view of a Ticket is section 8.2, a different path returning a different DTO.

### 4.1 `POST /api/tickets`

**Changed from Lab 2.** The body no longer carries `requesterId` (`L2 C-12` superseded by
C-64); the Requester is the authenticated user. `itPriority` is now set on create instead of
being left null (C-71). The three caller-resolution statuses are gone.

| | |
|---|---|
| **Method and path** | `POST /api/tickets` |
| **Role** | Requester only |
| **Ownership** | The created Ticket is bound to the authenticated user and never reassigned (BR-41) |
| **Serves** | FR-25, FR-26 |
| **Verified by** | AC-41, AC-45 |

**Request body**

```json
{
  "categoryId": 2,
  "relatedSystemId": 6,
  "summary": "Laptop battery drains quickly",
  "description": "The battery drops from full to twenty percent within an hour of light use.",
  "requestedPriority": "MEDIUM"
}
```

| Field | Rule | Trace |
|---|---|---|
| `categoryId` | Required, positive integer, names an existing active Category | `L2 BR-33`, `L2 BR-34` |
| `relatedSystemId` | Required, positive integer, names an existing active Related System | `L2 BR-33`, `L2 BR-34` |
| `summary` | Required; trimmed before validation; 5 to 120 characters after trimming | BR-85 |
| `description` | Required; trimmed before validation; 20 to 5000 characters after trimming | BR-85 |
| `requestedPriority` | Required; one of `LOW`, `MEDIUM`, `HIGH` - the `RequestedPriority` enum of `specification.md` section 7. It is the Requester's value and is never editable after creation (BR-51) | BR-85, section 7 |

Every Lab 2 field bound is unchanged (BR-85). `ticketNumber`, `createdAt`, `updatedAt`,
`currentStatus`, `itPriority`, `ownerId` and `requesterResolvedAt` are rejected if supplied:
they are system-generated.

**`requesterId` supplied in the body is ignored, not rejected** (BR-31, AC-41). The Ticket is
saved against the authenticated user. This is AC-03's wording and the one place where "ignored"
rather than "400" matters: a client that still sends it must not be told it was wrong, it must
simply not be obeyed.

**Response 201** - the Requester Ticket DTO (section 10.2). `currentStatus` is `NEW`,
`itPriority` equals `requestedPriority` (BR-49, BR-53, AC-45), `ownerId` is null,
`requesterResolvedAt` is null, `attachments` is `[]` and `publicComments` is `[]`.

`ticketNumber` is generated as `TKT-YYYY-NNNNNN` inside the creation transaction, so it is
never null in the 201 body (`L2 C-11`, `L2 C-49`).

| Status | Condition |
|---|---|
| 201 | Created |
| 400 | A validation rule fails, `VALIDATION_FAILED` with `fields` |
| 401 | No session |
| 403 | The gate is set, `PASSWORD_CHANGE_REQUIRED`; or the caller is IT Staff or Administrator, `FORBIDDEN_ROLE` (C-101) |
| 500 | Unexpected error. The client shows a safe message and retains every entered value (`L2 BR-37`) |

### 4.2 `GET /api/tickets`

**Changed from Lab 2.** `?requesterId=` is gone; the scope is the authenticated user
(C-64). The `currentStatus` filter accepts all eight values instead of five (C-70, FR-32).

| | |
|---|---|
| **Method and path** | `GET /api/tickets` |
| **Role** | Requester only |
| **Ownership** | Scoped to the authenticated user before any search, filter or sort is applied (BR-43) |
| **Serves** | FR-25, FR-32 |
| **Verified by** | AC-42 |

**Query parameters**

| Parameter | Required | Default | Permitted values | Trace |
|---|---|---|---|---|
| `search` | No | - | Free text. Ticket Number by exact or prefix match; Ticket Summary case-insensitively by substring. Description is never searched | `L2 BR-23` |
| `categoryId` | No | - | Positive integer | `L2 BR-24` |
| `relatedSystemId` | No | - | Positive integer | `L2 BR-24` |
| `currentStatus` | No | - | One of the **eight** `TicketStatus` values | BR-52, FR-32 |
| `sort` | No | `createdAt:desc` | `field:direction`; field one of `createdAt`, `ticketNumber`, `summary`, `currentStatus`; direction `asc` or `desc` | `L2 BR-25` |
| `page` | No | `1` | Positive integer | `L2 C-43` |
| `pageSize` | No | `10` | `10`, `25` or `50` | `L2 BR-27` |

`requesterId` is accepted by the parser and discarded. It changes nothing: a request naming
another user returns the authenticated user's Tickets (AC-42, BR-31).

`id` descending is the tiebreak under every sort field, so ordering is total and a page
boundary never duplicates or drops a row (`L2 BR-26`).

**Response 200** - the Lab 2 envelope unchanged (`L2 C-27`), rows being the Requester Ticket
list DTO (section 10.3).

```json
{
  "data": [ { "id": 42, "ticketNumber": "TKT-2026-000042", "summary": "…",
              "category": { "id": 2, "name": "Hardware" },
              "relatedSystem": { "id": 6, "name": "Printer" },
              "requestedPriority": "MEDIUM", "itPriority": "MEDIUM",
              "currentStatus": "NEW", "requesterResolvedAt": null,
              "createdAt": "2026-09-05T04:12:33.000Z",
              "updatedAt": "2026-09-05T04:12:33.041Z" } ],
  "meta": { "page": 1, "pageSize": 10, "total": 1, "totalPages": 1, "sort": "createdAt:desc" }
}
```

`itPriority` is now never null (BR-49), so the badge always renders (FR-31). The Lab 2 style
tests asserting its absence are rewritten, not deleted (BR-95).

| Status | Condition |
|---|---|
| 200 | Success, including an empty page and an empty result set |
| 400 | `INVALID_QUERY_PARAM` naming each offending parameter in `fields` (`L2 C-43`) |
| 401 | No session |
| 403 | Gate set; or the caller is IT Staff or Administrator |
| 500 | Unexpected error |

A `page` beyond the last returns `data: []` with correct `meta` and is not an error
(`L2 BR-29`). The client distinguishes empty from no-results by whether a search or filter is
active, not by anything the API returns (`L2 C-28`).

### 4.3 `GET /api/tickets/:id`

**Changed from Lab 2.** A Ticket belonging to another Requester answers **404**, not 403
(C-65, superseding `L2 C-13`). The payload now carries `publicComments` and the Ticket Owner's
name, and still carries no Internal Note key of any kind.

| | |
|---|---|
| **Method and path** | `GET /api/tickets/:id` |
| **Path parameters** | `id` - the Ticket's autoincrement id, positive integer |
| **Role** | Requester only |
| **Ownership** | `Ticket.requesterId` must equal the authenticated user's id (BR-42) |
| **Serves** | FR-25, FR-27 |
| **Verified by** | AC-38, AC-47, AC-115 |

**Response 200** - the Requester Ticket DTO (section 10.2): the full Ticket, `attachments` in
ascending id order with removed ones present and distinguished by `isRemoved` (`L2 BR-50`),
`publicComments` newest first (BR-67, FR-27), `owner` as `{ "name": "…" }` or null, and
`requesterResolvedAt`.

**`owner` carries the name and never the email address** (BR-100, C-95, AC-115). It is an
object rather than a bare string so that adding a field later cannot silently become adding
the email.

**No Internal Note key appears, under any name, not even as an empty array or null** (FR-29,
BR-70, AC-47). This is why there are two DTOs rather than one shaped by the caller's role: a
refactor cannot accidentally widen a key that does not exist (`specification.md` section 8).

`storedFilename` is never returned (`L2 BR-53`).

| Status | Condition |
|---|---|
| 200 | The Ticket exists and the caller owns it |
| 400 | `id` is not a positive integer |
| 401 | No session |
| 403 | Gate set; or the caller is IT Staff or Administrator (C-101) |
| 404 | No Ticket with that id, **or** it belongs to another Requester - one identical body, `TICKET_NOT_FOUND` (AC-38) |
| 500 | Unexpected error |

The Lab 2 note that "403 and 404 are deliberately distinct, because Lab 2 has no
authentication" is reversed here. There is a boundary now, so they are deliberately
indistinguishable.

### 4.4 `POST /api/tickets/:id/requester-resolved`

**New.** The "Problem Appears Resolved" indication - a flag, never a status (C-76, BR-59).

| | |
|---|---|
| **Method and path** | `POST /api/tickets/:id/requester-resolved` |
| **Role** | Requester only. IT Staff and Administrator receive 403 (AC-58) |
| **Ownership** | The authenticated user must be the Ticket's Requester |
| **Serves** | FR-30 |
| **Verified by** | AC-55, AC-56, AC-57, AC-58 |

No request body. The server sets `requesterResolvedAt` to its own clock; a client-supplied
timestamp is ignored (BR-65).

**Current Status is not touched** (BR-59, AC-55), and **no automatic Public Comment is
posted** (BR-61, AC-59). IT Staff remain responsible for formally resolving the Ticket
(BR-05).

**Response 200** - the Requester Ticket DTO with `requesterResolvedAt` set.

| Status | Condition |
|---|---|
| 200 | Recorded. Repeating it is permitted and overwrites the timestamp - there is no "already indicated" conflict, because the Requester re-confirming is not an error |
| 400 | `id` is not a positive integer |
| 401 | No session |
| 403 | Gate set; or the caller is IT Staff or Administrator |
| 404 | No such Ticket, or it belongs to another Requester (AC-57) |
| 409 | The Ticket is not in Open, In Progress, Waiting for Requester or Reopened, `RESOLUTION_NOT_PERMITTED_IN_STATUS` (BR-60, AC-56) |
| 500 | Unexpected error |

The flag is **cleared only** by a move to Resolved, Closed or Cancelled (BR-61), which
happens in section 8.6. No endpoint clears it on the Requester's behalf, and there is no
un-indicate route - `LS 4.6` gives the Requester a comment and a flag, not an edit.

---

## 5. Attachment endpoints

The Lab 2 attachment contract is unchanged in shape and in every field bound (BR-85). Two
things change: `?requesterId=` is gone, and the role split of C-103.

**Read is shared, write is the Requester-owner's.** IT Staff and Administrator users may list
metadata and download or preview; upload and soft removal stay Requester-owner operations.
`LS 8.4` gives the staff screen the *existing* Attachments and no clause gives staff a write,
so read without write is the narrowest reading that still satisfies it (C-103,
`specification.md` 5.2 note [2]).

| Endpoint | Requester owner | Other Requester | IT Staff | Administrator |
|---|---|---|---|---|
| 5.1 list metadata | 200 | 404 | 200 | 200 |
| 5.2 upload | 201 | 404 | **403** | **403** |
| 5.3 download or preview | 200, removed 410 | 404 | 200, removed 410 | 200, removed 410 |
| 5.4 soft-remove | 200 | 404 | **403** | **403** |

### 5.1 `GET /api/tickets/:id/attachments`

**Changed from Lab 2.** No `?requesterId=`; a non-owning Requester gets 404 instead of 403;
IT Staff and Administrator are now permitted.

**Response 200** - an array of Attachment metadata in ascending id order, active and removed
both present, distinguished by `isRemoved` (`L2 BR-50`, section 10.6).

| Status | Condition |
|---|---|
| 200 | Permitted |
| 400 | `id` is not a positive integer |
| 401 | No session |
| 403 | Gate set |
| 404 | No such Ticket, or a Requester who does not own it (AC-39) |
| 500 | Unexpected error |

### 5.2 `POST /api/tickets/:id/attachments`

**Changed from Lab 2.** No `?requesterId=`; staff receive 403 (C-103).

`multipart/form-data`, one file per request, field name as Lab 2. Every Lab 2 rule is
unchanged: JPG, JPEG, PNG, WEBP or PDF; 5 MB maximum; five active Attachments per Ticket
(BR-85, `L2 BR-42`, `L2 BR-43`, `L2 BR-44`).

**Response 201** - the created Attachment's metadata.

| Status | Condition |
|---|---|
| 201 | Stored |
| 400 | `id` is not a positive integer, or no file part is present |
| 401 | No session |
| 403 | Gate set; or the caller is IT Staff or Administrator, `FORBIDDEN_ROLE` (C-103) |
| 404 | No such Ticket, or a Requester who does not own it |
| 413 | Over 5 MB, `FILE_TOO_LARGE` |
| 415 | Outside the permitted types, `UNSUPPORTED_FILE_TYPE` |
| 422 | The Ticket already holds five active Attachments, `ATTACHMENT_LIMIT_REACHED`. **Keeps its Lab 2 422** as a carried contract and is not re-coded by C-100 (BR-103) |
| 500 | Unexpected error. A failed insert leaves no row and no file on disk (`L2 BR-41`) |

### 5.3 `GET /api/attachments/:id/download`

**Changed from Lab 2.** No `?requesterId=`; a non-owning Requester gets 404 instead of 403,
which is also how the removal state stops leaking; IT Staff and Administrator are permitted.

| Query parameter | Required | Default | Values |
|---|---|---|---|
| `disposition` | No | `attachment` | `attachment` or `inline` |

**Response 200** - the stored bytes with the stored `Content-Type` and
`Content-Disposition: attachment` or `inline`. Preview is the same ownership-checked route with
`inline` rather than `attachment` (`L2 BR-49`), and the bytes are served only through this route,
never from a static directory (`L2 BR-54`). They are byte-identical to the upload, which is the
Lab 2 contract its `API-35` and `API-36` assert (`docs/lab-02/api-spec.md` 4.3).

| Status | Condition |
|---|---|
| 200 | Active and the caller is permitted |
| 400 | `id` is not a positive integer; or `disposition` is outside the set - **checked last** (`L2 C-44`, `L2 C-52`) |
| 401 | No session |
| 403 | Gate set |
| 404 | No such Attachment, or its Ticket belongs to another Requester, `ATTACHMENT_NOT_FOUND` (AC-39) |
| 410 | Soft-removed and the caller may see the Ticket, `ATTACHMENT_REMOVED` (BR-44, AC-40) |
| 500 | Unexpected error |

**The 410 / 404 split is the C-65 rewrite of `L2 C-20`.** Lab 2 gave a non-owner 403 so that
removal state did not leak; Lab 3 gives them 404, which hides existence as well. 410 reaches
only a caller entitled to see the Ticket - its Requester, or any staff user (BR-44).

`disposition` is validated **after** ownership and removal state, so an invalid value never
changes which of 404 or 410 a caller receives. It is 400 only once the caller is entitled to
the bytes (`L2 C-52`, and section 1.4).

### 5.4 `DELETE /api/attachments/:id`

**Changed from Lab 2.** No `?requesterId=`; staff receive 403 (C-103); a non-owning Requester
gets 404.

**Request body**

```json
{ "removalReason": "Uploaded the wrong screenshot." }
```

Soft removal only. The row, the file on disk, the reason and `removedAt` are all retained, and
the Attachment stays listed (`L2 BR-46`, BR-29). Removal frees a slot against the five-active
limit (`L2 BR-44`).

**Response 200** - the updated Attachment metadata with `isRemoved` true.

| Status | Condition |
|---|---|
| 200 | Removed |
| 400 | `id` is not a positive integer, or `removalReason` is absent |
| 401 | No session |
| 403 | Gate set; or the caller is IT Staff or Administrator |
| 404 | No such Attachment, or its Ticket belongs to another Requester |
| 422 | `removalReason` is empty after trimming, `REMOVAL_REASON_REQUIRED` (`L2 BR-47`) |
| 500 | Unexpected error |

There is no hard delete and no un-remove, in Lab 2 or Lab 3.

---

## 6. Public Comment endpoints

**New.** Append-only: there is no `PATCH` and no `DELETE`, in the API or in the UI, and the
table carries no `updatedAt` or `deletedAt` for one to write to (BR-63, FR-51,
`specification.md` section 7).

Readable and writable by the owning Requester, IT Staff and Administrator (BR-68, BR-04). A
Requester who does not own the Ticket gets 404, as everywhere else.

### 6.1 `GET /api/tickets/:id/public-comments`

**Response 200** - an array, **newest first** (BR-67), unpaginated.

```json
[
  { "id": 12, "body": "We have ordered a replacement battery.",
    "author": { "id": 7, "name": "Siriporn Chai", "role": "IT_STAFF" },
    "createdAt": "2026-09-06T02:10:00.000Z" }
]
```

`author.role` is present so the UI can mark a staff reply distinctly from the Requester's own.
`author.email` is never returned, to anyone - the Requester audience is the reason (BR-100),
and one shape for both audiences is how that stays true.

The list is unpaginated. Nothing in `LS 4.6` or `decisions.md` asks for comment pagination,
and a Ticket's comment count is bounded by hand-typed entries.

| Status | Condition |
|---|---|
| 200 | Permitted; `[]` when there are none |
| 400 | `id` is not a positive integer |
| 401 | No session |
| 403 | Gate set |
| 404 | No such Ticket, or a Requester who does not own it |
| 500 | Unexpected error |

The same array appears embedded as `publicComments` in the Requester DTO (4.3) and the staff
DTO (8.2), in the identical shape, so the screen can render a detail load and a post-refresh
from one component (AC-47).

### 6.2 `POST /api/tickets/:id/public-comments`

**Request body**

```json
{ "body": "The replacement battery has arrived." }
```

| Field | Rule | Trace |
|---|---|---|
| `body` | Required; trimmed before validation; rejected when empty or whitespace-only; 1 to 2000 characters after trimming | BR-64, AC-49, AC-50 |

**The author and the creation time are set by the server from the session.** A client-supplied
`authorId`, `author` or `createdAt` is ignored (BR-65, FR-52, AC-48).

The body is stored as submitted text and is **never** rendered through
`dangerouslySetInnerHTML`; the client renders it as plain text with `white-space: pre-wrap`
(BR-66, AC-51, AC-52). No sanitisation is performed on write, because escaping on render is
the control - sanitising on write would silently alter what a person typed.

**Response 201** - the created comment, in the 6.1 row shape.

| Status | Condition |
|---|---|
| 201 | Created; appears first in the list (AC-48) |
| 400 | `VALIDATION_FAILED` on `body` - absent, whitespace-only, or over 2000 characters |
| 401 | No session |
| 403 | Gate set |
| 404 | No such Ticket, or a Requester who does not own it |
| 500 | Unexpected error |

**Any active IT Staff or Administrator may comment on any Ticket**, owned by them or not - the
queue is shared work (BR-96, C-93, AC-110). Ownership constrains status and assignment, not
communication.

---

## 7. Internal Note endpoints

**New, and the most security-sensitive pair in this document.** Internal Notes live in their
own table so that a notes query cannot structurally leak into a comments response (BR-69,
C-73).

**IT Staff and Administrator only. A Requester receives 403 `FORBIDDEN_ROLE`, raised at step 3
of the check order - before the Ticket is loaded** (BR-70, C-63, C-65). The response is
byte-identical for an existing Ticket, a Ticket owned by that Requester, and a Ticket id that
does not exist (AC-37). It carries no note content, no note count, and no key indicating that
notes exist at all (FR-29, AC-04).

The path is `/api/tickets/:id/internal-notes`, which `CLAUDE.md` pins in its worked example of
an evidence-shaped test name.

**Serves** FR-55. **Verified by** AC-04, AC-37, AC-53 and AC-54: AC-53 is the positive case -
an IT Staff user lists and creates notes, and both carry a server-set author and creation time -
and the other three are the negative cases a Requester meets.

### 7.1 `GET /api/tickets/:id/internal-notes`

**Response 200** - an array, newest first, unpaginated, in the same row shape as 6.1.

| Status | Condition |
|---|---|
| 200 | IT Staff or Administrator; `[]` when there are none |
| 400 | `id` is not a positive integer - reachable only by a staff caller, because the role check precedes parsing |
| 401 | No session |
| 403 | Gate set; or **the caller is a Requester**, `FORBIDDEN_ROLE`, whether or not the Ticket exists (AC-04, AC-37) |
| 404 | No such Ticket - staff callers only, since staff are not ownership-scoped |
| 500 | Unexpected error |

### 7.2 `POST /api/tickets/:id/internal-notes`

Body, validation, author handling and rendering rules are identical to 6.2 - one validator,
one storage shape, one render path, two tables.

**Response 201** - the created note.

| Status | Condition |
|---|---|
| 201 | Created |
| 400 | `VALIDATION_FAILED` on `body` |
| 401 | No session |
| 403 | Gate set; or the caller is a Requester |
| 404 | No such Ticket |
| 500 | Unexpected error |

Append-only, as 6.x: no edit route, no delete route, no column to write to.

**A Requester-facing payload never carries note data.** The Requester DTO (10.2) has no key
for it; `GET /api/tickets/:id` cannot be made to return one by any parameter; and there is no
count, badge or boolean anywhere in the Requester surface that would reveal a note exists
(FR-29, AC-54). The test that proves it asserts on the rendered DOM and on every network
response of the Requester detail screen, not only on this endpoint.

---

## 8. IT Staff endpoints

**IT Staff and Administrator only.** A Requester receives 403 `FORBIDDEN_ROLE` on every route
in this section, before any resource is loaded (BR-74, C-65). An Administrator holds every
permission here (BR-39, C-66).

These routes are mounted under `/api/staff/` so that the role requirement is a property of the
mount rather than of each handler, which is what lets the route-inventory test assert it
mechanically.

**Ownership is not a caller requirement.** Any active staff user may act on any Ticket
(BR-96, C-93). Ownership constrains the Ticket, not the caller: a Ticket in `IN_PROGRESS`,
`WAITING_FOR_REQUESTER` or `RESOLVED` must have an owner at all times (BR-97, C-93, C-104).

### 8.1 `GET /api/staff/tickets` - the Ticket Queue

**New.** Not scoped to any Requester, which is why none of the four Lab 2 indexes serves it
(`specification.md` section 7).

| | |
|---|---|
| **Method and path** | `GET /api/staff/tickets` |
| **Role** | IT Staff, Administrator |
| **Serves** | FR-33 to FR-42 |
| **Verified by** | AC-36, AC-60 to AC-69 |

**Searchable fields**

| Parameter | Matching | Trace |
|---|---|---|
| `search` | Ticket Number by exact or prefix match; Ticket Summary case-insensitively by substring. Description is never searched, as in Lab 2 | BR-71, C-78 |

**Filterable fields.** Any combination, applied conjunctively.

| Parameter | Permitted values | Notes | Trace |
|---|---|---|---|
| `currentStatus` | One of the eight `TicketStatus` values | Replaces the default exclusion when supplied | BR-71 |
| `itPriority` | `LOW`, `MEDIUM`, `HIGH` | Never null after this sprint (BR-49) | BR-71 |
| `owner` | `me`, `unassigned`, or a positive integer user id | `me` resolves to the authenticated user; `unassigned` is `ownerId IS NULL` | BR-71, C-78 |
| `categoryId` | Positive integer | | BR-71 |

**Sortable fields**

| `sort` value | Order |
|---|---|
| `createdAt:asc` / `:desc` | Created date |
| `updatedAt:asc` / `:desc` | Last updated |
| `itPriority:asc` / `:desc` | IT Priority, `desc` being HIGH to LOW |
| `ticketNumber:asc` / `:desc` | Ticket Number |
| `currentStatus:asc` / `:desc` | Current Status |

`itPriority` and `currentStatus` order by their enum declaration order, not alphabetically, so
`itPriority:desc` is HIGH, MEDIUM, LOW and not MEDIUM, LOW, HIGH. `id` descending is the
tiebreak under every sort field (`L2 BR-26`).

**Paging**

| Parameter | Default | Permitted |
|---|---|---|
| `page` | `1` | Positive integer |
| `pageSize` | `10` | `10`, `25` or `50` |

**Defaults when no query is supplied** (BR-72, FR-38, AC-61):

- Closed and Cancelled Tickets are **excluded**.
- Order is **IT Priority high to low, then oldest first** - `itPriority desc, createdAt asc`.
- Page 1, page size 10.

This composite default is not expressible as one `field:direction` token, so it is the
behaviour of *omitting* `sort` rather than a named token. `meta.sort` reports it as
`itPriority:desc,createdAt:asc` so the response still says what order it used. Supplying any
`sort` replaces the whole default order; supplying `currentStatus` replaces the whole default
exclusion, so a caller can reach a Closed Ticket only by asking for its status explicitly.

**Response 200** - the Lab 2 envelope (`L2 C-27`), rows being the queue row DTO (section 10.4).

```json
{
  "data": [
    { "id": 42, "ticketNumber": "TKT-2026-000042",
      "summary": "Laptop battery drains quickly",
      "category": { "id": 2, "name": "Hardware" },
      "requestedPriority": "MEDIUM", "itPriority": "HIGH",
      "currentStatus": "OPEN",
      "owner": { "id": 7, "name": "Siriporn Chai", "isActive": true },
      "requesterResolvedAt": "2026-09-07T01:00:00.000Z",
      "createdAt": "2026-09-05T04:12:33.000Z",
      "updatedAt": "2026-09-06T02:10:00.000Z" }
  ],
  "meta": { "page": 1, "pageSize": 10, "total": 37, "totalPages": 4,
            "sort": "itPriority:desc,createdAt:asc" }
}
```

`owner` is null when unassigned, which is how the screen distinguishes assigned from
unassigned at a glance (FR-40). `owner.isActive` false is what renders the "(inactive)" marker
(BR-30, FR-46, AC-75). `requesterResolvedAt` non-null is what renders the resolution badge
(BR-62, FR-40, AC-60).

**Queue counts.** `LS 8.3` and `specification.md` section 3 permit "simple queue counts" and
`LS 4.2` excludes analytics beyond them. That is discharged by `meta.total`, which the screen
renders as `Showing X to Y of N tickets`. No per-status count object is returned: nothing in
the specification asks for one, and adding it would be the first step of the dashboard `LS 4.2`
excludes.

| Status | Condition |
|---|---|
| 200 | Success, including an empty result set |
| 400 | Any parameter unparseable or out of set, `INVALID_QUERY_PARAM`, one `fields` entry per offending parameter, **before any query reaches the database** (BR-73, AC-67, AC-68) |
| 401 | No session |
| 403 | Gate set; or the caller is a Requester, `FORBIDDEN_ROLE` (BR-74, AC-36) |
| 500 | Unexpected error |

The client presents each `fields` message beside the offending control (FR-42), and offers
Clear filters rather than Retry, because retrying the same invalid query fails identically
(`L2` ui-spec 6.1).

### 8.2 `GET /api/staff/tickets/:id` - IT Staff Ticket Detail

**New.** A different path and a different DTO from 4.3, which is what makes the two
`specification.md` 5.2 rows - "Requester view" and "IT Staff view" - separately testable.

| | |
|---|---|
| **Role** | IT Staff, Administrator. A Requester receives 403 even for their own Ticket |
| **Serves** | FR-43, FR-49, FR-50 |
| **Verified by** | AC-75, AC-110 |

**Response 200** - the IT Staff Ticket DTO (section 10.5): every Requester-view field, plus
`requester` as `{ id, name, email }`, `owner` as `{ id, name, role, isActive }` or null,
`publicComments`, and **`internalNotes`**.

The staff DTO carries the Requester's email address; the Requester DTO does not carry the
owner's (BR-100). The asymmetry is deliberate: staff need to contact the Requester, and the
Requester does not need to contact the owner outside the Ticket.

| Status | Condition |
|---|---|
| 200 | IT Staff or Administrator |
| 400 | `id` is not a positive integer |
| 401 | No session |
| 403 | Gate set; or the caller is a Requester |
| 404 | No Ticket with that id, `TICKET_NOT_FOUND`. There is no ownership scope for staff, so 404 here means genuine absence |
| 500 | Unexpected error |

### 8.3 `POST /api/staff/tickets/:id/claim`

**New.** Claim assigns the calling user, and only while the Ticket is unassigned (BR-46,
C-75).

No request body - the caller is the assignee by definition.

**Implemented as one conditional update**, `UPDATE … SET "ownerId" = :caller WHERE "id" = :id
AND "ownerId" IS NULL`, so two simultaneous claims cannot both succeed. If the update affects
no row, the Ticket is re-read and 409 is returned with the current owner (AC-71).

**Claiming does not change the status** (C-102, G-04). One action, one effect: a silent move
from `NEW` to `OPEN` would bypass the section 5.1 matrix and its confirmations.

**Response 200** - the IT Staff Ticket DTO with `owner` set to the caller.

| Status | Condition |
|---|---|
| 200 | The Ticket was unassigned and is now the caller's (AC-70) |
| 400 | `id` is not a positive integer |
| 401 | No session |
| 403 | Gate set; or the caller is a Requester |
| 404 | No such Ticket |
| 409 | Already owned by another user, `ALREADY_OWNED`; the owner does not change, and the body's `error.message` names the current owner so the screen can show it (BR-46, FR-44, AC-71) |
| 500 | Unexpected error |

A caller who already owns the Ticket receives 409 as well. There is no separate "you already
own this" code: the state the caller asked for - "assign me if unassigned" - was not met, and
the screen refreshes either way.

### 8.4 `PATCH /api/staff/tickets/:id/owner`

**New.** Assign, reassign and unassign - one endpoint, because all three write one column and
share one eligibility rule (BR-47, C-75).

**Request body**

```json
{ "ownerId": 7 }
```

| Field | Rule | Trace |
|---|---|---|
| `ownerId` | Required. A positive integer naming an **active** IT Staff or Administrator user, or **`null`** to unassign | BR-45, BR-47, BR-48, C-66 |

`null` is the unassign signal, and it must be present explicitly. An **absent** `ownerId` is
400 `VALIDATION_FAILED`, not an unassign: dropping an owner because a field was forgotten is
the kind of accident an explicit null prevents.

**Eligibility.** The named user must exist, be active, and hold `IT_STAFF` or `ADMINISTRATOR`.
A Requester, an inactive user and an unknown id are all **422 `ASSIGNEE_NOT_ELIGIBLE`** - the
body is well formed and the refusal is about the value it names (BR-48, C-100, AC-73). The
owner does not change.

**Unassigning a Ticket that is being worked on is refused.** While the status is
`IN_PROGRESS`, `WAITING_FOR_REQUESTER` or `RESOLVED`, `ownerId: null` answers **409
`OWNER_REQUIRED`** and leaves both status and owner unchanged. To release such a Ticket, move
it to `OPEN` first (8.6), then unassign (BR-97, C-104, AC-111, AC-117).

**Reassigning such a Ticket stays allowed** throughout, because it never leaves the Ticket
without an owner (C-104, AC-111).

An **inactive** user who already owns a Ticket keeps that ownership until it is reassigned;
they are displayed "(inactive)" rather than removed (BR-30, FR-46). Deactivation does not
unassign, which is why `owner.isActive` exists in the DTOs.

**Response 200** - the IT Staff Ticket DTO with the new `owner`, or null.

| Status | Condition |
|---|---|
| 200 | Assigned, reassigned or unassigned |
| 400 | `id` is not a positive integer; or `ownerId` absent, or neither `null` nor a positive integer |
| 401 | No session |
| 403 | Gate set; or the caller is a Requester |
| 404 | No such Ticket |
| 409 | `ownerId: null` while the status is a worked one, `OWNER_REQUIRED` (AC-111) |
| 422 | The named assignee is a Requester, inactive or unknown, `ASSIGNEE_NOT_ELIGIBLE` (AC-73) |
| 500 | Unexpected error |

The 409 / 422 split on this one endpoint is C-100's line applied twice: the unassign refusal
depends on the **state of the Ticket**, so 409; the eligibility refusal depends on the **value
submitted**, so 422.

### 8.5 `PATCH /api/staff/tickets/:id/it-priority`

**New.** IT Priority is the priority IT assigns, distinct from the Requester's Requested
Priority, which is never editable after creation by anyone (BR-51, FR-47).

**Request body**

```json
{ "itPriority": "HIGH" }
```

| Field | Rule | Trace |
|---|---|---|
| `itPriority` | Required; one of `LOW`, `MEDIUM`, `HIGH`. Never null (BR-49) | BR-50 |

Setting it to the value it already holds is **200**, not 400. The same-status 400 of C-77 is a
status rule and is not extended here: a priority is a plain value with no transition matrix
behind it, and the UI select can legitimately re-submit the current value.

**Response 200** - the IT Staff Ticket DTO.

| Status | Condition |
|---|---|
| 200 | Stored |
| 400 | `id` is not a positive integer, or `itPriority` is absent or out of set |
| 401 | No session |
| 403 | Gate set; or the caller is a Requester, `FORBIDDEN_ROLE` (BR-50, AC-76) |
| 404 | No such Ticket |
| 500 | Unexpected error |

No ownership requirement: any active staff user may re-prioritise any Ticket (BR-96, AC-110).

### 8.6 `PATCH /api/staff/tickets/:id/status`

**New, and the endpoint carrying the most rules in this document.** `specification.md` section
5.1 is the authority on which transitions are permitted; this section is the authority on the
codes.

**Request body**

```json
{ "currentStatus": "IN_PROGRESS" }
```

| Field | Rule | Trace |
|---|---|---|
| `currentStatus` | Required; one of the eight `TicketStatus` values | BR-52 |

The field is named `currentStatus`, matching the glossary and the queue filter token, so one
name means one thing across the whole API (`L2 C-40`, C-92).

**Evaluation order**, which fixes the code for every case:

1. Out-of-set value -> 400 `VALIDATION_FAILED`.
2. Target equals the current status -> **400 `SAME_STATUS`** (BR-56, C-77, AC-78). The UI never
   offers it, so the request is a client error and a silent success would hide a bug.
3. Not permitted from the current status by the section 5.1 matrix -> **409
   `INVALID_STATUS_TRANSITION`**, the Ticket unchanged (BR-55, AC-77). This covers every move
   out of `CLOSED` and `CANCELLED`, both terminal, and every move to `REOPENED` from anything
   but `RESOLVED` (BR-58, BR-98, C-98, AC-81, AC-112).
4. Target is `IN_PROGRESS`, `WAITING_FOR_REQUESTER` or `RESOLVED` and the Ticket has **no
   owner** -> **409 `OWNER_REQUIRED`**, the Ticket unchanged (BR-97, C-93, AC-109).
5. Otherwise the move is applied.

**Step 3 before step 4** matters: an unowned `CLOSED` Ticket asked to move to `IN_PROGRESS`
answers `INVALID_STATUS_TRANSITION`, not `OWNER_REQUIRED`. The transition is refused on its own
merits before the owner requirement is consulted, so the code always names the first reason the
request was wrong.

**Side effect.** A move to `RESOLVED`, `CLOSED` or `CANCELLED` **clears
`requesterResolvedAt`**, and only these three do (BR-61, C-76, AC-59). No automatic Public
Comment is posted.

The confirmation step for Resolved, Closed and Cancelled is a **UI** obligation (BR-57, FR-48,
AC-80); the API has no `confirmed` flag, because a client-supplied confirmation would prove
nothing.

**Response 200** - the IT Staff Ticket DTO.

| Status | Condition |
|---|---|
| 200 | Moved |
| 400 | `id` is not a positive integer; `currentStatus` absent or out of set; or the target equals the current status, `SAME_STATUS` |
| 401 | No session |
| 403 | Gate set; or **the caller is a Requester**, `FORBIDDEN_ROLE` - including Resolved and Closed, which BR-05 reserves to staff absolutely (BR-54, AC-79) |
| 404 | No such Ticket |
| 409 | `INVALID_STATUS_TRANSITION` or `OWNER_REQUIRED` |
| 500 | Unexpected error |

A Requester's "Problem Appears Resolved" indication (4.4) appears nowhere in this endpoint's
rules, by design (BR-59). It is a flag on the Ticket, not a transition, and it neither enables
nor blocks any move here.

### 8.7 `GET /api/staff/assignable-users`

**New, settled by C-105.** FR-45 requires the staff detail screen to offer assign and reassign
"choosing from active IT Staff and Administrator users only", and BR-71 lets the queue filter by
`owner` naming a user id. Both need a list of eligible users, and an Administrator could read
`GET /api/users` (9.1) but **IT Staff may not** - BR-39 and C-66 give IT Staff no
user-administration permission whatsoever. C-105 therefore adds this endpoint rather than
widening 9.1: *the owner picker needs the list, and the user-admin API is Administrator-only.*

| | |
|---|---|
| **Method and path** | `GET /api/staff/assignable-users` |
| **Role** | IT Staff, Administrator. A Requester receives 403 |
| **Query parameters** | None |
| **Serves** | FR-35 (the `owner` filter), FR-45 (assign and reassign) |
| **Verified by** | SEC-27, API-116 |

**Response 200** - active `IT_STAFF` and `ADMINISTRATOR` users only, ascending by name,
unpaginated.

```json
[ { "id": 7, "name": "Siriporn Chai", "role": "IT_STAFF" } ]
```

Three keys and no more (BR-104). **No email address**, because the screen needs a label and an
id, and this list is readable by IT Staff, who hold no user-administration permission. Inactive
users are absent, because an inactive user cannot be assigned (BR-30) - which is also why a
Ticket's existing inactive owner comes from the Ticket DTO's `owner.isActive`, not from this
list.

| Status | Condition |
|---|---|
| 200 | IT Staff or Administrator |
| 401 | No session |
| 403 | Gate set; or the caller is a Requester |
| 500 | Unexpected error |

---

## 9. Administrator endpoints

**Administrator only.** IT Staff and Requesters both receive 403 `FORBIDDEN_ROLE` on every
route in this section (BR-39, AC-96, AC-97). No permission crosses this boundary in either
direction: an Administrator holds every IT Staff ticket permission, and IT Staff hold no
user-administration permission at all (C-66).

Four routes, no more. `LS 8.5` asks for one User Management screen, and `LS 4.2` excludes user
deletion, bulk operations, import, export, pagination, lockout, recovery and approval
workflows - so there is no delete route, no bulk route and no import or export route to
document (BR-81, BR-84, FR-66, AC-98).

**Administrator management of reference data does not exist.** There is no route to create or
edit a Category or a Related System: `LS 8.5` asks for one User Management screen only
(`CLAUDE.md` never-add list).

### 9.1 `GET /api/users`

Replaces the removed `GET /api/requesters` (section 1.7, BR-93).

| | |
|---|---|
| **Role** | Administrator only |
| **Serves** | FR-56, FR-57, FR-58 |
| **Verified by** | AC-82, AC-83, AC-84, AC-96 |

**Query parameters**

| Parameter | Required | Default | Permitted values | Trace |
|---|---|---|---|---|
| `search` | No | - | Free text. Matches name **or** email address, case-insensitively by substring | FR-57, AC-83 |
| `role` | No | - | One of `REQUESTER`, `IT_STAFF`, `ADMINISTRATOR`. **The single optional filter** | FR-58, BR-84 |

**No `page`, no `pageSize`, no `sort`.** The list is unpaginated by BR-84 and FR-66, and its
order is **fixed by C-107: `name` ascending, then `id` ascending** as the tiebreak. There is no
user-controlled sort and no sort parameter to supply - `LS 8.5` does not ask for sorting, and a
fixed order keeps tests and screenshots stable (BR-106).

A `sort` parameter, if supplied, is ignored rather than refused: there is no sort contract for it
to violate.

Both active and inactive users are returned - Status is a column on the screen, not a filter
(FR-56). A second simultaneous filter is excluded by `LS 4.2`.

**Response 200** - a bare array, not the paginated envelope, because there is no paging to
report.

```json
[
  { "id": 7, "name": "Siriporn Chai", "email": "it@toktickit.local",
    "role": "IT_STAFF", "isActive": true,
    "mustChangePassword": false,
    "createdAt": "2026-08-01T03:00:00.000Z",
    "updatedAt": "2026-09-20T07:41:00.000Z" }
]
```

`mustChangePassword` is exposed so the screen can show that an initial password is outstanding.
**No `passwordHash`, and no field derived from it** - not a length, not a "has password"
boolean, not a `passwordSetAt` (BR-88, FR-70).

| Status | Condition |
|---|---|
| 200 | Administrator; `[]` when the search or filter matches nothing |
| 400 | `role` out of set, `INVALID_QUERY_PARAM` |
| 401 | No session |
| 403 | Gate set; or the caller is a Requester or IT Staff (AC-96) |
| 500 | Unexpected error |

The screen distinguishes the empty state from the no-results state by whether a search or
filter is active, as My Tickets does (`L2 C-28`).

### 9.2 `POST /api/users`

| | |
|---|---|
| **Role** | Administrator only |
| **Serves** | FR-59, FR-62 |
| **Verified by** | AC-85, AC-86, AC-87, AC-88, AC-113, AC-114 |

**Request body**

```json
{
  "name": "Ratchada Somsri",
  "email": "Ratchada@TokTickIT.local",
  "role": "IT_STAFF",
  "isActive": true,
  "initialPassword": "…"
}
```

| Field | Rule | Trace |
|---|---|---|
| `name` | Required; trimmed; 1 to 100 characters after trimming | BR-99, C-94, AC-113 |
| `email` | Required; trimmed; **lower-cased before storing and before the uniqueness check**; valid format; at most 254 characters | BR-06, BR-99, C-94, AC-114 |
| `role` | Required; exactly one of `REQUESTER`, `IT_STAFF`, `ADMINISTRATOR` | BR-35, BR-75 |
| `isActive` | Required boolean. Not defaulted - `LS 8.5` names activation state as a field of the create form, so the Administrator states it | FR-59 |
| `initialPassword` | Required; the **same validator** as 3.2's `newPassword` - 8 to 128 characters, upper, lower, digit, special | BR-12, BR-14, C-60 |

`role` accepts one value, never an array: a user holds exactly one role and multiple roles per
user do not exist (BR-35, `LS 4.2`).

**The created user is marked `mustChangePassword: true`**, always, with no way to opt out
(BR-16, C-79, AC-85). Their first login therefore reaches Change Password before any other
screen (AC-86).

There is **no email of any kind** - no invitation, no notification, no initial password by mail
(`LS 4.2`). The Administrator types the password and communicates it out of band, which is the
whole of this lab's account provisioning.

**Response 201** - the created user in the 9.1 row shape. `initialPassword` is not echoed
back, in any form (BR-88).

| Status | Condition |
|---|---|
| 201 | Created |
| 400 | `VALIDATION_FAILED`, `fields` naming each offending field |
| 401 | No session |
| 403 | Gate set; or the caller is a Requester or IT Staff |
| 409 | The email address is already held, `EMAIL_TAKEN`, presented at the email field (BR-77, FR-62, AC-87) |
| 500 | Unexpected error |

The duplicate check is **case-insensitive against the stored lower-case value**, so an address
differing only in case is a duplicate (BR-77, AC-88). This is the same normalisation login uses
(BR-06), which is why the two can never disagree about whether an account exists.

`EMAIL_TAKEN` is 409, not 422: it conflicts with existing data rather than being malformed
input (C-82, C-100).

### 9.3 `PATCH /api/users/:id`

| | |
|---|---|
| **Role** | Administrator only |
| **Serves** | FR-60, FR-63, FR-64 |
| **Verified by** | AC-89, AC-90, AC-92, AC-93, AC-94, AC-95 |

**Request body** - any subset of exactly four fields. A field absent is a field unchanged.

```json
{ "name": "…", "email": "…", "role": "ADMINISTRATOR", "isActive": false }
```

| Field | Rule |
|---|---|
| `name` | Same rule as 9.2 |
| `email` | Same rule as 9.2, including the case-insensitive uniqueness check against every **other** user |
| `role` | Same rule as 9.2 |
| `isActive` | Boolean |

**No other field is editable, and none is accepted.** Not `passwordHash`, not
`mustChangePassword`, not `createdAt`, not `id`. A password is changed only by the user (3.2)
or reset by 9.4 (BR-76, FR-60, AC-89). There is no extended profile, no department, no photo
(`LS 4.2`).

An empty body is 400: a PATCH that changes nothing is a client defect, not a no-op success.

**Three refusals, and their codes are the ones C-100 draws:**

| Refusal | Code | Status | Why this status |
|---|---|---|---|
| Deactivating **your own** account | `SELF_DEACTIVATION` | **422** | It depends only on who the caller is and what they submitted (BR-79, C-81, AC-92) |
| Leaving **no active Administrator** | `LAST_ADMINISTRATOR` | **409** | It depends on the state of the other `User` rows, so by C-100's line it is a conflict (BR-80, AC-93, AC-94) |
| An email address held by another user | `EMAIL_TAKEN` | **409** | As 9.2 |

**`LAST_ADMINISTRATOR` is enforced on deactivation and on role change alike** (BR-80, C-80).
Both reach the same hole from different directions: the sole Administrator demoting themselves,
or two Administrators deactivating each other at the same moment.

**The check runs inside a transaction that locks the active-Administrator rows**
(`SELECT … WHERE role = 'ADMINISTRATOR' AND "isActive" = true FOR UPDATE`), so two simultaneous
deactivations cannot both pass their own count check. Exactly one succeeds and at least one
active Administrator remains (C-80, AC-95). Without the lock the race leaves zero.

**Self role change is permitted** (BR-82, C-81). Blocking it would make `LAST_ADMINISTRATOR`
unreachable from the UI, and `LS 14` Part 8 has to demonstrate it. Self **deactivation** is
blocked; the two are deliberately different.

**Session effects.** A **role change revokes every session of that user**, so the new role takes
effect at once rather than at their next login (BR-83, C-55, AC-90). A **deactivation** revokes
them too (BR-24, AC-18). A name or email change revokes nothing.

**Response 200** - the updated user in the 9.1 row shape.

| Status | Condition |
|---|---|
| 200 | Updated |
| 400 | `id` not a positive integer; `VALIDATION_FAILED` on any field; or an empty body |
| 401 | No session |
| 403 | Gate set; or the caller is a Requester or IT Staff |
| 404 | No User with that id, `USER_NOT_FOUND` |
| 409 | `EMAIL_TAKEN`, or `LAST_ADMINISTRATOR` |
| 422 | `SELF_DEACTIVATION` |
| 500 | Unexpected error |

**Users are deactivated, never deleted.** There is no `DELETE /api/users/:id`, and an inactive
user's Tickets, Attachments, Public Comments and Internal Notes are all retained (BR-29, BR-81,
`L2 LC-01`, AC-98).

### 9.4 `POST /api/users/:id/initial-password`

| | |
|---|---|
| **Role** | Administrator only |
| **Serves** | FR-61 |
| **Verified by** | AC-91 |

**Request body**

```json
{ "initialPassword": "…" }
```

Validated by the **same validator** as 3.2 and 9.2 - one validator, one test set, three call
sites (BR-14, C-60, FR-17).

**Three effects, all of them at once** (BR-78, C-79, AC-91):

1. The password hash is replaced.
2. `mustChangePassword` is set to `true`, so the user must replace it at their next login.
3. **Every session of that user is deleted**, so a session opened before the reset cannot
   survive it.

This is the **only account-recovery path in the lab**. There is no password-reset email, no
self-service recovery, no security question and no unlock, because `LS 4.2` excludes all of
them - and no lockout exists to need unlocking (BR-08). The mock-up's "send reset email"
checkbox is excluded (C-79).

An Administrator may run this against their own account. It is not self-deactivation and BR-79
does not apply: the account stays active, and the Administrator simply changes their password
at the next login like anyone else.

**Response 200** - the updated user in the 9.1 row shape, with `mustChangePassword` now true.
The password is not echoed back (BR-88).

| Status | Condition |
|---|---|
| 200 | Set; user flagged; that user's sessions revoked |
| 400 | `id` not a positive integer, or `VALIDATION_FAILED` on `initialPassword` |
| 401 | No session |
| 403 | Gate set; or the caller is a Requester or IT Staff |
| 404 | No User with that id, `USER_NOT_FOUND` |
| 500 | Unexpected error |

---

## 10. Response shapes

Seven shapes. **Two Ticket DTOs, not one** (`specification.md` section 8): one DTO shaped by
the caller's role could be widened by a refactor into leaking Internal Notes to a Requester, and
BR-70 is not a rule to defend with a conditional.

### 10.1 `User` - the authenticated identity

Returned by 2.4, 3.1 and 3.2. Exactly six keys.

| Key | Type | Notes |
|---|---|---|
| `id` | number | |
| `name` | string | |
| `email` | string | Stored lower-case |
| `role` | `REQUESTER` \| `IT_STAFF` \| `ADMINISTRATOR` | One value, never an array (BR-35) |
| `isActive` | boolean | |
| `mustChangePassword` | boolean | Drives the client's gate (FR-14) |

Never `passwordHash`, never a token, never a session id, on any path (BR-88, FR-70, AC-12).

### 10.2 Requester Ticket DTO

Returned by 4.1, 4.3 and 4.4.

| Key | Type | Notes |
|---|---|---|
| `id`, `ticketNumber` | number, string | |
| `requester` | `{ id, name }` | The authenticated Requester's own identity |
| `category`, `relatedSystem` | `{ id, name }` | |
| `summary`, `description` | string | |
| `requestedPriority` | enum | Never editable after creation (BR-51) |
| `itPriority` | enum | **Never null** (BR-49). The badge always renders (FR-31) |
| `currentStatus` | enum | One of eight (BR-52) |
| `owner` | `{ name }` \| null | **Name only, never the email address** (BR-100, C-95, AC-115) |
| `requesterResolvedAt` | ISO string \| null | The C-76 flag, never a status (BR-59) |
| `createdAt`, `updatedAt` | ISO string | |
| `attachments` | array | Section 10.6. Active and removed both present |
| `publicComments` | array | Section 10.7, newest first |

**`requesterId` is not a key of this DTO.** Lab 2 returned it (`ticket-dto.ts:33`); it is
removed, because the only consumer was the selector's ownership display and the authenticated
client already knows who it is. The **column** keeps its name (C-68) - that is storage, not
contract.

**No Internal Note key exists, under any name, not as null and not as an empty array**
(FR-29, BR-70, AC-47).

### 10.3 Requester Ticket list row

Returned in `data[]` by 4.2. The 10.2 shape minus `description`, `attachments`,
`publicComments`, `owner` and `requester`, plus nothing. `description` is omitted because the
list does not search it and the detail endpoint returns it (`L2 BR-23`).

### 10.4 Queue row

Returned in `data[]` by 8.1. Carries exactly the nine columns FR-39 names, plus the two markers
the queue must show:

`id`, `ticketNumber`, `summary`, `category`, `requestedPriority`, `itPriority`,
`currentStatus`, `owner` (`{ id, name, isActive }` or null), `requesterResolvedAt`,
`createdAt`, `updatedAt`.

**No `requester` key.** FR-39 does not list a Requester column, and the queue is not the place
to publish who raised every Ticket. The staff detail screen (8.2) carries it.

`owner.isActive` false renders "(inactive)" (BR-30, AC-75); `requesterResolvedAt` non-null
renders the resolution badge (BR-62, AC-60).

### 10.5 IT Staff Ticket DTO

Returned by 8.2, 8.3, 8.4, 8.5 and 8.6 - every staff write returns the whole Ticket, so the
screen never needs a second request to refresh after an action.

The 10.2 shape, with three differences:

| Difference | Value |
|---|---|
| `requester` | `{ id, name, email }` - staff need to contact the Requester |
| `owner` | `{ id, name, role, isActive }` \| null - the id drives the assign control, `isActive` the marker |
| `internalNotes` | array, section 10.7, newest first. **Present only in this DTO** |

### 10.6 Attachment metadata

Unchanged from Lab 2. `id`, `originalFilename`, `mimeType`, `sizeBytes`, `uploadedAt`,
`isRemoved`, `removedAt`, `removalReason`.

`storedFilename` is never returned: it is internal storage detail, and exposing it would work
against the rule that bytes are reachable only through the checked route (`L2 BR-53`,
`L2 BR-54`).

### 10.7 Comment and note row

One shape for both tables (6.1, 7.1), which is why the two composers can share a component
while the two lists stay visually distinct (`ui-spec.md`).

| Key | Type | Notes |
|---|---|---|
| `id` | number | |
| `body` | string | Stored as typed, trimmed. Rendered as plain text (BR-66) |
| `author` | `{ id, name, role }` | Server-set from the session (BR-65). **No email address** |
| `createdAt` | ISO string | Server-set (BR-65) |

No `updatedAt` and no `deletedAt`, in the response or in the table - append-only is enforced by
the absence of the column as much as by the absence of the route (BR-63, `specification.md`
section 7).

---

## 11. Traceability

### 11.1 Endpoint inventory against the authorization matrix

Every endpoint, mapped to the `specification.md` section 5.2 row that authorises it. A row of
this table with no matrix row is a defect. There are none: section 8.7 gained its matrix row with
C-105.

| § | Endpoint | Matrix row | Status |
|---|---|---|---|
| 2.1 | `GET /api/health` | Health, Categories, Related Systems (public) | Unchanged from Lab 1 |
| 2.2 | `GET /api/categories` | same | Unchanged from Lab 1 |
| 2.3 | `GET /api/related-systems` | same | Unchanged from Lab 2 |
| 2.4 | `POST /api/auth/login` | Log in (public) | New |
| 3.1 | `GET /api/auth/me` | Retrieve current user | New |
| 3.2 | `POST /api/auth/change-password` | Change own password | New |
| 3.3 | `POST /api/auth/logout` | Log out | New |
| 4.1 | `POST /api/tickets` | Create Ticket | Changed from Lab 2 |
| 4.2 | `GET /api/tickets` | List own Tickets | Changed from Lab 2 |
| 4.3 | `GET /api/tickets/:id` | Read one Ticket, Requester view | Changed from Lab 2 |
| 4.4 | `POST /api/tickets/:id/requester-resolved` | Indicate "Problem Appears Resolved" | New |
| 5.1 | `GET /api/tickets/:id/attachments` | List Attachment metadata | Changed from Lab 2 |
| 5.2 | `POST /api/tickets/:id/attachments` | Upload or soft-remove an Attachment | Changed from Lab 2 |
| 5.3 | `GET /api/attachments/:id/download` | Download or preview an Attachment | Changed from Lab 2 |
| 5.4 | `DELETE /api/attachments/:id` | Upload or soft-remove an Attachment | Changed from Lab 2 |
| 6.1 | `GET /api/tickets/:id/public-comments` | List or post Public Comments | New |
| 6.2 | `POST /api/tickets/:id/public-comments` | same | New |
| 7.1 | `GET /api/tickets/:id/internal-notes` | List or create Internal Notes | New |
| 7.2 | `POST /api/tickets/:id/internal-notes` | same | New |
| 8.1 | `GET /api/staff/tickets` | IT Staff Ticket Queue | New |
| 8.2 | `GET /api/staff/tickets/:id` | Read one Ticket, IT Staff view | New |
| 8.3 | `POST /api/staff/tickets/:id/claim` | Claim a Ticket | New |
| 8.4 | `PATCH /api/staff/tickets/:id/owner` | Assign, reassign or unassign | New |
| 8.5 | `PATCH /api/staff/tickets/:id/it-priority` | Set IT Priority | New |
| 8.6 | `PATCH /api/staff/tickets/:id/status` | Change Current Status | New |
| 8.7 | `GET /api/staff/assignable-users` | List assignable users (C-105) | New |
| 9.1 | `GET /api/users` | List users, with search and role filter | New; replaces `GET /api/requesters` |
| 9.2 | `POST /api/users` | Create a user | New |
| 9.3 | `PATCH /api/users/:id` | Update name, email, role, activation | New |
| 9.4 | `POST /api/users/:id/initial-password` | Set a new initial password for a user | New |

**Thirty endpoints against twenty-five matrix rows.** The matrix gained its twenty-fifth row,
"List assignable users", with C-105. It names capabilities, not routes, so four of its rows cover
more than one endpoint each:

| Matrix row | Endpoints | Count |
|---|---|---|
| Health, Categories, Related Systems | 2.1, 2.2, 2.3 | 3 |
| Upload or soft-remove an Attachment | 5.2, 5.4 | 2 |
| List or post Public Comments | 6.1, 6.2 | 2 |
| List or create Internal Notes | 7.1, 7.2 | 2 |

Those four rows cover nine endpoints. The remaining **twenty-one** matrix rows map one-to-one
onto the remaining twenty-one endpoints. Every endpoint has a matrix row and every matrix row has
an endpoint.

Every matrix row is served by at least one endpoint above. No matrix row is unimplemented.

### 11.2 Requirement coverage

| Requirement group | Served by |
|---|---|
| FR-01 to FR-08 - login, session, logout | 2.4, 3.1, 3.3, section 1.5 |
| FR-09 to FR-12 - shell, no browser-stored identity | 3.1, 3.3, and `ui-spec.md` |
| FR-13 - `Origin` check | Section 1.6 |
| FR-14 to FR-19 - the password-change gate | 3.1, 3.2, section 1.4 step 2 |
| FR-20 to FR-24 - authorization | Section 1.4, and the role line of every endpoint |
| FR-25 to FR-32 - Requester regression, comments, resolution | 4.1 to 4.4, 5.1 to 5.4, 6.1, 6.2 |
| FR-33 to FR-42 - the queue | 8.1 |
| FR-43 to FR-50 - staff detail | 8.2 to 8.7, 5.1, 5.3 |
| FR-51 to FR-55 - comments and notes | 6.1, 6.2, 7.1, 7.2 |
| FR-56 to FR-66 - user management | 9.1 to 9.4 |
| FR-67 to FR-70 - cross-cutting | Sections 1.1, 1.2, 1.3, and `ui-spec.md` |

**Every requirement in this table is fully served.** FR-45's dependency on section 8.7 was the
one unresolved entry, and C-105 closed it.

### 11.3 Cross-cutting statuses

Applied by the shared middleware chain to every route outside section 2, so they are not
repeated in each endpoint's own table beyond a one-line entry:

| Status | Code | Every protected route |
|---|---|---|
| 401 | `AUTH_REQUIRED` | No valid session (AC-43) |
| 403 | `PASSWORD_CHANGE_REQUIRED` | The gate is set, except on 3.1, 3.2 and 3.3 (AC-21) |
| 403 | `FORBIDDEN_ROLE` | The role may never perform the operation, before the resource loads (AC-36, AC-37, AC-96) |
| 403 | `ORIGIN_NOT_ALLOWED` | `POST`, `PATCH`, `DELETE` with a foreign `Origin` (AC-19) |
| 500 | `INTERNAL_ERROR` | Anything unhandled, safely (AC-105) |

---

## 12. Rules this document needed and could not find - all closed

Three items were declared here when this document was first written. `CLAUDE.md` requires that a
behaviour none of the contract documents covers is escalated rather than invented, so each was
recorded with options and a recommendation and **none was resolved on this document's
authority**. All three are now closed by decision rows, and the sections above cite those rows
directly. The table is kept as the record of what was open and what closed it.

| # | Gap | Closed by | Answer |
|---|---|---|---|
| 1 | **No endpoint lists the users a Ticket may be assigned to.** FR-45 requires the staff screen to choose from active IT Staff and Administrator users, and BR-71 lets the queue filter by a named owner id. `GET /api/users` is Administrator-only by BR-39 and C-66, so IT Staff cannot use it | **C-105** | `GET /api/staff/assignable-users` (section 8.7): IT Staff and Administrator only, active `IT_STAFF` and `ADMINISTRATOR` users as `{ id, name, role }`, never an email address (BR-104) |
| 2 | **No status or code for a wrong `currentPassword`** on 3.2. AC-27 requires the refusal; nothing fixed its code | **C-106** | **422 `CURRENT_PASSWORD_INCORRECT`**, presented at the current-password field, never 401 - the client treats 401 as an expired session and would send the user to Login (BR-105). This document had recommended 400; the decision took 422, which is where C-100 already draws the line for a refusal about the submitted value |
| 3 | **The user list's single sort column is unnamed.** BR-84 says "one sort column" without saying which | **C-107** | Fixed order, `name` ascending then `id`, with no user-controlled sort at all (section 9.1, BR-106) |

A fourth item was declared by `ui-spec.md` section 25 rather than here - the queue's tablet
columns, where `specification.md` section 6 disagreed with FR-39 - and is closed by **C-108**,
which corrected section 6 at its source.

Two further readings were **narrow enough to take without a decision row**, and are recorded
here so an auditor can see they were noticed rather than missed:

- **"Simple queue counts"** (`LS 8.3`, `specification.md` section 3) is discharged by
  `meta.total` alone (section 8.1). Returning a per-status count object would be the first step
  of the dashboard `LS 4.2` excludes, so the narrower reading is the safe one.
- **Comment and note lists are unpaginated** (6.1, 7.1). No clause asks for pagination, and
  `LS 4.2` excludes user-list pagination as over-build; extending paging to comments would add
  a parameter no requirement names.
